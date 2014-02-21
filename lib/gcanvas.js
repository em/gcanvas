module.exports = GCanvas;

var Path = require('./path')
  , Motion = require('./motion')
  , GcodeDriver = require('./drivers/gcode')
  , Point = require('./math/point')
  , Matrix = require('./math/matrix')
  , Font = require('./font')
  , parseFont = require('./parsefont')
  , utils = require('./utils');

function GCanvas(driver, width, height) {
  var self = this;
  this.canvas = {
    width: width,
    height: height,
    getContext: function() {
      return self;
    }
  };

  this.font = "7pt Helvetiker";
  this.matrix = new Matrix();
  this.rotation = 0; 
  this.depth = 0;
  this.depthOfCut = 0;
  this.top = 0;
  this.align = 'center';
  this.feed = 100;
  this.mode = 'mill';
  this.driver = driver || new GcodeDriver();
  this.driver.src = this;
  this.stack = [];
  this.motion = new Motion(this);
  this.filters = [];

  this.beginPath();
}

GCanvas.prototype = {
  save: function() {
    this.stack.push({
      matrix: this.matrix.clone(),
      font: this.font,
      speed: this.speed,
      feed: this.feed,
      depth: this.depth,
      depthOfCut: this.depthOfCut,
      toolDiameter: this.toolDiameter,
      align: this.align,
      mode: this.mode,
      top: this.top,
      filters: this.filters.slice()
    });
  }
, restore: function() {
    var prev = this.stack.pop();
    for(var k in prev) {
      if(prev.hasOwnProperty(k)) {
        this[k] = prev[k];
      }
    }
  }
, filter: function(fn) {
    this.filters.push(fn);
  }
, map: function(from, to) {
    if(arguments.length == 1) {
      to = from;
      from = 'xyza';
    }

    from = from.split('');
    to = to.split('');

    this.filter(function(p) {
      var tmp = {};
      var negative = false;
      var i = 0;

      to.forEach(function(d) {
        if(d == '-') {
          negative = true;
        }
        else {
          tmp[d] = p[ from[i] ];

          if(negative) {
            tmp[d] = -tmp[d];
          }

          negative = false;
          i++;
        }
      });

      return tmp;
    });
  }
, beginPath: function() {
    // this.prevsubPaths = this.subPaths;
    this.path = new Path();
    // this.subPaths = [this.path];
  }
, _restorePath: function() {
    this.subPaths = this.prevsubPaths;
    this.path = this.subPaths[this.subPaths.length-1] || new Path();
  }
, transform: function(a, b, c, d, e, f) {
    this.matrix = this.matrix.concat(
      new Matrix(a, b, c, d, e, f)
    );
  }
, setTransform: function(a, b, c, d, e, f) {
    this.matrix = new Matrix(a, b, c, d, e, f);
  }
, resetTransform: function() {
    this.matrix = new Matrix();
  }
, rotate: function(angle) {
    this.matrix = this.matrix.rotate(angle);
  }
, translate: function(x,y) {
    this.matrix = this.matrix.translate(x,y);
  }
, scale: function(x,y) {
    this.matrix = this.matrix.scale(x,y);
  }
  // TODO: clean up
, _transformPoint: function(a, i) {
    i = i || 0;
    if(a.length) {
      var v = new Point(a[i], a[i+1]);
      v = this.matrix.transformPoint(v);
      a[i] = v.x; 
      a[i+1] = v.y; 
    }
    else if(a.x !== undefined) {
      var v = new Point(a.x, a.y);
      v = this.matrix.transformPoint(v);
      a.x = v.x; 
      a.y = v.y; 
    }
  }
, _ensurePath: function(x,y) {
    if(this.path.subPaths.length === 0) {
      this.path.moveTo(x,y);
    }
  }
, moveTo: function(x,y) {
    this._transformPoint(arguments);
    // this.path = new Path();
    this.path.moveTo(x,y);
    // this.subPaths.push( this.path );
  }
, lineTo: function(x,y) {
    this._transformPoint(arguments);
    this._ensurePath(x,y);
    this.path.lineTo(x,y);
  }
, arc: function (x, y, radius,
									  aStartAngle,
                    aEndAngle,
                    aClockwise ) {
    // In the conversion to points we lose the distinction
    // between 0 and pi2 so we must optimize out 0 here 
    // or else they will be treated as full circles.

    if(aStartAngle - aEndAngle === 0) {
      return;
    }

    // See portal2 example
    if(aEndAngle-aStartAngle === -Math.PI*2)
      aEndAngle = Math.PI*2;

    var center = new Point(x, y);
    var points = utils.arcToPoints(x, y,
                                   aStartAngle,
                                   aEndAngle,
                                   radius);

    this._transformPoint(center);
    this._transformPoint(points.start);
    this._transformPoint(points.end);

    var res = utils.pointsToArc(center,
                                points.start,
                                points.end);

    // this._ensurePath(points.start.x, points.start.y);

    this.path.arc(center.x, center.y, res.radius, res.start, res.end, aClockwise);
    
    // var tmp = new Path();
    // tmp.moveTo(points.start.x, points.start.y);
    // tmp.arc(center.x, center.y, radius, res.start, res.end, aClockwise);

    // tmp.getPoints(40).forEach(function(p) {
    //   this.lineTo(p.x,p.y);
    // },this);
  }
, circle: function(x, y, rad, ccw) {
    this.beginPath();
    this.arc(x, y, rad, 0, Math.PI*2, ccw);
  }
, bezierCurveTo: function( aCP1x, aCP1y,
                           aCP2x, aCP2y,
                           aX, aY ) {

    this._transformPoint(arguments, 0);
    this._transformPoint(arguments, 2);
    this._transformPoint(arguments, 4);

    this.path.bezierCurveTo.apply(this.path, arguments);
  }
, quadraticCurveTo: function( aCPx, aCPy, aX, aY ) {
    this._transformPoint(arguments, 0);
    this._transformPoint(arguments, 2);

    this.path.quadraticCurveTo.apply(this.path, arguments);
  }
, clip: function() {
    this.clipRegion = this.path;
  }
, rect: function(x,y,w,h) {
    this.moveTo(x,y);
    this.lineTo(x+w,y);
    this.lineTo(x+w,y+h);
    this.lineTo(x,y+h);
    this.closePath();
  }
, fillRect: function(x,y,w,h,depth) { 
    this.save();
    this.beginPath();
    this.depth = depth || this.depth;
    this.rect(x,y,w,h);
    this.fill();
    this.restore();
  }
, fillCircle: function(x,y,rad,depth) { 
    this.save();
    this.beginPath();
    this.depth = depth || this.depth;
    this.circle(x,y,rad);
    this.fill();
    this.restore();
  }
, measureText: function(text) {
    // Removed until I have cleaner way to do it
  }
, stroke: function(align) {
    var offset = 0;

    align = align || this.align;

    if(align === 'outer') {
      offset = this.toolDiameter/2;
    }
    if(align === 'inner') {
      offset = -this.toolDiameter/2;
    }

    var path = this.path;
    path = path.simplify();


    // path = path.clip(this.clipRegion,0);


    if(path.subPaths)
    path.subPaths.forEach(function(subPath) {
      subPath = subPath.toPath().offset(offset);

      // Climb milling
      if(align == 'inner') {
        subPath = subPath.reverse();
      }

      this._layer(function(z) {
        this.motion.followPath(subPath,z);
      });
    }, this);

    this.motion.retract();
  }
, fill: function(windingRule) {

    if(!this.toolDiameter) {
      throw 'You must set context.toolDiameter to use fill()'
    }

    var path = this.path;
    path = path.simplify(windingRule);
    path = path.clip(this.clipRegion,0);
    path = path.fillPath(this.toolDiameter);
    var motion = this.motion;

    if(path.subPaths)
    path.subPaths.forEach(function(subPath) {
      this._layer(function(z) {
        this.motion.followPath(subPath, z);
      });
    }, this);

    this.motion.retract();
  }

// , outerThread: function(dmin, dmaj, depth, pitch, ccw) {
//     this.align = 'outer';
//     this.beginPath();
//     if(ccw) {
//       this.moveTo(dmin/2,depth);
//       this.lineTo(dmaj/2,depth);
//       this.lineTo(dmaj/2,0);
//     }
//     else {
//       this.moveTo(dmaj/2,0);
//       this.lineTo(dmaj/2,depth);
//       this.lineTo(dmin/2,depth);
//     }
//     this.spiral(pitch, ccw);
//   }
, thread: function(attack, dmin, dmaj, pitch, start, length, ccw, virtual) {
    this.save();
    this.beginPath();
    this.rect(dmin/2,start,dmaj/2-dmin/2,length);
    this.lathe(attack, pitch, ccw, virtual);
    this.restore();
  }
, threadMill: function(attack, dmin, dmaj, pitch, start, length, ccw) {
    return this.thread(attack, dmin, dmaj, pitch, start, length, ccw, true);
  }
, latheMill: function(pitch, attack, ccw) {
    return this.lathe(pitch, attack, ccw, true);
  }
, lathe: function(attack, pitch, ccw, virtual) {
    // var inPath = this.path.simplify();
    var inPath = this.path;
    var toolR = this.toolDiameter/2 || 0;
    attack = attack || 'outer';

    if(toolR) {
      if(attack == 'inner') { 
        inPath = inPath.translate(-this.toolDiameter/2,0);
      }
      if(attack == 'outer') { 
        inPath = inPath.translate(this.toolDiameter/2,0);
      }
    }

    var bounds = inPath.getBounds(); // Find bounds
    var height = bounds.bottom-bounds.top;
    var width = bounds.right-bounds.left;

    inPath = inPath.simplify();

    var path = new Path();
    // bounds.right += (this.toolDiameter||0);

    var s = this.depthOfCut || 1000;

    if(attack === 'down') {
      for(var i=0; i < height; i += s) {
        var clip = new Path();
        clip.rect(0,i,width,s);
        var sub = clip.clip(inPath,0);

        sub.subPaths = sub.subPaths.map(function(sp) {
          sp = sp.shiftToNearest(0,0);
          return sp;
        });

        path.addPath(sub);
      }
    }
    else if(attack === 'outer') {
      for(var i=bounds.left; i < bounds.right; i += s) {
        var clip = new Path();
        clip.rect(0,-10,i,height+10);
        var sub = clip.clip(inPath,0);

        sub.subPaths = sub.subPaths.map(function(sp) {
          sp = sp.shiftToNearest(0,0);
          return sp;
        });

        path.addPath(sub);
      }
    }
    else if(attack === 'inner') {
      // var sub = inPath;
      for(var i=bounds.right+10; i >= bounds.left; i -= s) {
        var clip = new Path();
        clip.rect(i,-10,bounds.right-i,height+10);
        var sub = clip.clip(inPath,0);

        sub.subPaths = sub.subPaths.map(function(sp) {
          sp = sp.shiftToNearest(bounds.right+10,0);
          return sp;
        });

        path.addPath(sub);
      }
    }

    // path.addPath(inPath);


    var inner = this.align == 'inner';
    pitch = pitch || this.toolDiameter || 1;

    var motion = this.motion;
    var driver = this.driver;
    var range = (attack == 'down') ? height : width; 
    var depthOfCut = this.depthOfCut || range;
    var offset = range;
    var a = 0;


    // Remove the first 0 plane
    // path.subPaths[path.subPaths.length-1]
    // .actions.splice(-1,1);
    // path.subPaths[0]
    // .actions[0].action = 'moveTo';
    // path.subPaths.splice(-1,1);
    // path = path.simplify('evenodd');

    // if(attack == 'outer') {
    //   path.subPaths = path.subPaths.reverse();
    // }
// 
    // this.depth = 0;
    // this.path = path;
    // this.stroke();
    // return;
// 
    // if(attack == 'inner') {
    //   ccw = !ccw;
    // }

    var spiralAngle = 0;


    path.subPaths.forEach(function(subPath) {
      // reset();

      driver.zero({a:0});
      var a = 0;

      var pts = subPath.getPoints();
      // pts = pts.slice(0,-1);

      var reverse = false;

      // These cancel eachother inner
      // and must be done in series
      if(ccw) {
        reverse = !reverse;
      }

      if(attack == 'outer' || attack == 'down') {
        reverse = !reverse;
      }

      if(reverse) {
        pts = pts.reverse();
      }


      var p0u = pts[0].clone();
      var p0 = p0u.clone();
      var first = true;
      pts.forEach(function(p1,pi) {
        p1 = p1.clone();
        p1u = p1.clone();

        p1.x = bounds.left+bounds.right-p1.x;
        // p1.x = -p1.x;

        var xo = p1u.x-p0u.x;
        var yo = p1u.y-p0u.y;
        var dist = Math.sqrt(xo*xo + yo*yo);

        if(virtual) {
          var r0 = p0.x;
          var z0 = p0.y;
          var r1 = p1.x;
          var z1 = p1.y;
          var loops = dist/pitch;

          if(attack == 'inner' && p1.x <= bounds.left) {
            var startX = (r1) * Math.sin(spiralAngle);
            var startY = (r1) * Math.cos(spiralAngle);
            motion.rapid({x: startX, y: startY});
            motion.rapid({z: z1});
          }
          else if(attack == 'outer' && p0u.x >= bounds.right && p1u.x >= bounds.right) {
            motion.rapid({x: r1});
            motion.rapid({z: z1});
          }
          else
          spiralAngle = utils.spiral(40, r0, r1, loops,
                                     spiralAngle, attack=='inner',
                                     function(x,y,t) {
            // if(z0 <= 0 && z1 <= 0) return false;
            // if(z0 >= height && z1 >= height) return false;

            var z = z0+(z1-z0)*t; 

            motion.linear({
              x: x,
              y: y,
              z: z 
            });
          });
        }
        else {

          if(attack == 'outer' && p1.x <= bounds.left) {
            motion.rapid({x: p1.x, y: p1.y});
          }
          else if(attack == 'inner' && p0u.x >= bounds.right && p1u.x >= bounds.right) {
            motion.rapid({x: p1.x, y: p1.y});
          }
          else if(attack == 'down' && p1.x >= bounds.right) {
            motion.rapid({x: p1.x, y: p1.y, a: a});
          }
          else {
            a += dist/pitch*360;
            motion.linear({x: p1.x, y: p1.y, a: a});
          }
        }

        p0 = p1.clone();
        p0u = p1u.clone();
      }, this);

      // a = Math.round(a / 360) * 360;

    });

    // a = a % 360;
    // if(!virtual) {
    // }

    driver.zero({a:0});

    // reset();
    // Always finish with an arc?
    // motion.arcCW({
    //   x: 0,
    //   y: 0,
    //   i:-p1.x,
    //   j:-p1.y
    // });

    motion.rapid({z:0});
    // motion.rapid({x:0,y:0});
  }
, peckDrill: function(x, y, depth, peck) {

    this._transformPoint(arguments);

    if(arguments.length <= 2) {
      depth = arguments[0];
      peck = arguments[1];
      x = 0;
      y = 0;
    }

    var prevZ = 0;
    var mtn = this.motion;
    peck = peck || this.toolDiameter;

    // We need a tad bit of play
    // to avoid rapid plunging into 
    // the previous peck's bur
    // and to pull out a little further
    // than the surface in case it started
    // out too close
    var tad = peck/2 || depth/10;

    mtn.rapid({x:x,y:y});

    for(var z=peck; prevZ < depth; z += peck) {
      z = Math.min(z, depth); // Cap to exact depth
      mtn.rapid({z:prevZ-tad}); // Rapid to prev depth - tad
      mtn.linear({z:z}); // Drill a bit further
      mtn.rapid({z:-tad}); // Rapid all the way out 
      prevZ = z;
    }
  }
, _layer: function(fn) {
    var depthOfCut = this.depthOfCut || this.depth;
    var start = this.top + depthOfCut;

    if(depthOfCut === 0) {
      fn.call(this, 0);
      return;
    }

    var offset = this.top;
    while(offset < this.depth) {
      offset += depthOfCut;

      // Clip to actual depth
      offset = Math.min(offset, this.depth);

      // Remove the material at this depth
      fn.call(this, offset);
    }

    // Finishing pass
    fn.call(this, this.depth);
  }
, text: function(text, x, y, params) {
      var fontProps = parseFont(this.font);
      var font = new Font(fontProps);

      this.beginPath();
      this.save();
      this.translate(x, y);
      font.drawText(this, text);
      this.restore();
  }
, fillText: function(text, x, y, params) {
      var fontProps = parseFont(this.font);
      var font = new Font(fontProps);

      this.beginPath();
      this.save();
      this.translate(x, y);
      font.drawText(this, text);
      this.fill();
      this.restore();
  }
, strokeText: function(text, x, y, params) {
    this._layer(function() {
      var fontProps = parseFont(this.font);
      var font = new Font(fontProps);

      this.beginPath();
      this.save();
      this.translate(x, y);
      font.drawText(this, text);
      this.stroke();
      this.restore();
    });
  }
, clearRect: function() {}
, closePath: function() {
    this.path.close();
  }
};

GCanvas.Filter = require('./drivers/filter');
GCanvas.Simulator = require('./drivers/simulator');
GCanvas.GcodeDriver = GcodeDriver;

var helvetiker = require('./fonts/helvetiker_regular.typeface');
Font.load(helvetiker);

