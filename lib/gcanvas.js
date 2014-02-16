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
  this.aboveTop = 0;
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
      depthOfCut: this.depthOfCut,
      toolDiameter: this.toolDiameter,
      align: this.align,
      mode: this.mode,
      top: this.top,
      aboveTop: this.aboveTop,
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
, circle: function(x, y, diameter, ccw) {
    this.beginPath();
    this.arc(x, y, diameter/2, 0, Math.PI*2, ccw);
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
    this.lineTo(x,y);
  }
, fillRect: function(x,y,w,h) { 
    this.beginPath();
    this.rect.apply(this, arguments);
    this.fill();
  }
, measureText: function(text) {
    // Removed until I have cleaner way to do it
  }
, stroke: function() {
    var offset = 0;
    if(this.align === 'outer') {
      offset = this.toolDiameter/2;
    }
    if(this.align === 'inner') {
      offset = -this.toolDiameter/2;
    }

    var path = this.path;

    if(path.subPaths)
    path.subPaths.forEach(function(subPath) {
      subPath = subPath.toPath().offset(offset);

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

    motion.retract();
  }

, outerThread: function(dmin, dmaj, depth, pitch, ccw) {
    this.align = 'outer';
    this.beginPath();
    if(ccw) {
      this.moveTo(dmin/2,depth);
      this.lineTo(dmaj/2,depth);
      this.lineTo(dmaj/2,0);
    }
    else {
      this.moveTo(dmaj/2,0);
      this.lineTo(dmaj/2,depth);
      this.lineTo(dmin/2,depth);
    }
    this.spiral(pitch, ccw);
  }
, innerThread: function(dmin, dmaj, depth, pitch, ccw) {
    this.save();
    this.beginPath();
    this.rect(0,0,dmin/2,depth);
    this.innerLathe(pitch, !ccw);
    this.restore();
  }
, bore: function(pitch, ccw) {
    return this.spiral(pitch, true, ccw);
  }
, turn: function(pitch, ccw) {
    return this.spiral(pitch, false, ccw);
  }
, spiralIn: function(pitch, ccw) {
    return this.spiral(pitch, 'in', ccw);
  }
, spiralOut: function(pitch, ccw) {
    return this.spiral(pitch, 'out', ccw);
  }
, spiralDown: function(pitch, ccw) {
    return this.spiral(pitch, 'down', ccw);
  }
, spiral: function(pitch, attack, ccw) {
    var inPath = this.path.simplify();
    var toolR = this.toolDiameter/2 || 0;

    if(attack == 'out') { 
      inPath = inPath.translate(-this.toolDiameter/2,0);
    }
    if(attack == 'in') { 
      inPath = inPath.translate(this.toolDiameter/2,0);
    }

    var bounds = inPath.getBounds(); // Find bounds
    var height = bounds.bottom-bounds.top;
    var width = bounds.right-bounds.left;

    inPath = inPath.simplify();

    var path = new Path();
    // bounds.right += (this.toolDiameter||0);

    var s = this.depthOfCut || bounds.bottom;

    if(attack === 'down') {
      for(var i=0; i < height; i += s) {
        var clip = new Path();
        clip.rect(0,i,width,s);
        var sub = clip.clip(inPath,0);

        sub.subPaths = sub.subPaths.map(function(sp) {
          sp = sp.shiftToNearest(0,0);
          sp.actions.splice(-1,1);
          return sp;
        });

        path.addPath(sub);
      }
    }
    else if(attack === 'out') {
      for(var i=0; i < width; i += s) {
        var clip = new Path();
        clip.rect(i,0,s,height);
        var sub = clip.clip(inPath,0);

        sub.subPaths = sub.subPaths.map(function(sp) {
          sp = sp.shiftToNearest(0,0);
          sp.actions.splice(0,1);
          sp.actions.splice(-1,1);
          // sp.actions.splice(-2,2);
          return sp;
        });

        path.addPath(sub);
      }
    }
    else if(attack === 'in') {
      for(var i=width; i > 0; i -= s) {
        var clip = new Path();
        clip.rect(i,0,s,height);
        var sub = clip.clip(inPath,0);

        sub.subPaths = sub.subPaths.map(function(sp) {
          sp = sp.shiftToNearest(bounds.right,0);
          sp.actions.splice(0,1);
          sp.actions.splice(-2,2);
          // sp.actions.splice(-1,1);
          return sp;
        });

        path.addPath(sub);
      }
    }


    var virtual = this.mode == 'mill';
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

    // if(attack == 'in') {
    //   path.subPaths = path.subPaths.reverse();
    // }
// 
    // this.path = path;
    // this.stroke();
    // return;
// 
    // if(attack == 'out') {
    //   ccw = !ccw;
    // }

    var spiralAngle = 0;
    function reset() {
      // Return to start
      if(virtual) {
        switch(attack) {
          case 'out':
            motion.rapid({x:0, y:0});
            motion.rapid({z:0});
            break;
          case 'in':
            var safeX = (bounds.right+toolR) * Math.cos(spiralAngle);
            var safeY = (bounds.right+toolR) * Math.sin(spiralAngle);

            motion.linear({x:safeX, y:safeY});
            motion.rapid({z:0});
            break;
          case 'down':
            motion.rapid({z:0});
            break;
        }
      }
      else {
        motion.rapid({x: bounds.left});
        motion.rapid({y: bounds.top, a:a});
        // driver.zero({a:0});
      }
      spiralAngle = 0;
    }

    path.subPaths.forEach(function(subPath) {
      reset();

      var pts = subPath.getPoints();
      // pts = pts.slice(0,-1);

      var reverse = false;

      // These cancel eachother out
      // and must be done in series
      if(ccw) {
        reverse = !reverse;
      }

      if(attack == 'in' || attack == 'down') {
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

        var xo = p1.x-p0.x;
        var yo = p1.y-p0.y;
        var dist = Math.sqrt(xo*xo + yo*yo);

        if(virtual) {
          var r0 = p0.x;
          var z0 = p0.y;
          var r1 = p1.x;
          var z1 = p1.y;
          var loops = dist/pitch;

          spiralAngle = utils.spiral(40, r0, r1, loops,
                                     spiralAngle, attack=='out',
                                     function(x,y,t) {
            // if(z0 <= 0 && z1 <= 0) return false;
            // if(z0 >= height && z1 >= height) return false;

            var z = z0+(z1-z0)*t; 
            if(first) {
              // if(reverse) {
              //   // Leave the hole first
                // motion.rapid({z:z});
              // }

              motion.linear({
                x: x,
                y: y
              });

              // if(!reverse) {
              //   // Leave the hole first
              //   motion.rapid({z:z});
              // }

              first = false;
            }
            else {
              motion.linear({
                x: x,
                y: y,
                z: z 
              });
            }
          });
        }
        else {
          a = dist/pitch*360;
          motion.linear({x: p1.x, y: p1.y, a: a});
        }

        p0 = p1.clone();
        p0u = p1u.clone();
      }, this);

      a = Math.round(a / 360) * 360;

      if(!virtual) {
         driver.zero({a:0});
      }


    });

    reset();
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
, thread: function(cx,cy,dmaj,pitch,toolDiameter,depth) {
    toolDiameter = toolDiameter || this.toolDiameter;
    depth = depth || this.depth;
    this.beginPath();
    this.moveTo(dmaj/2,0);
    this.lineTo(dmaj/2,depth);
    this.spiral(pitch,cx,cy);
  }
, _layer: function(fn) {
    var depthOfCut = this.depthOfCut || this.depth;
    var start = this.top + depthOfCut;

    if(depthOfCut === 0) {
      fn.call(this, 0);
      return;
    }

    var offset = 0;
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

