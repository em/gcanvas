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
  this.feed = 1000;
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

    if(x === 0) x = 0;
    if(y === 0) y = 0;

    if(aStartAngle - aEndAngle === 0) {
      return;
    }

    // See portal2 example
    if(aEndAngle-aStartAngle === -Math.PI*2)
      aEndAngle = Math.PI*2;

    var center = new Point(x, y, 0);
    var points = utils.arcToPoints(center,
                                   aStartAngle,
                                   aEndAngle,
                                   radius);
    // center.applyMatrix(this.matrix);
    this._transformPoint(center);
    this._transformPoint(points.start);
    this._transformPoint(points.end);

    var res = utils.pointsToArc(center,
                                points.start,
                                points.end);

    this._ensurePath(points.start.x, points.start.y);

    this.path.arc(center.x, center.y, res.radius, res.start, res.end, aClockwise);
    
    // var tmp = new Path();
    // tmp.moveTo(points.start.x, points.start.y);
    // tmp.arc(center.x, center.y, radius, res.start, res.end, aClockwise);

    // tmp.getPoints(40).forEach(function(p) {
    //   this.lineTo(p.x,p.y);
    // },this);
  }
, circle: function(x, y, diameter) {
    this.beginPath();
    this.arc(x, y, diameter/2, 0, Math.PI*2);
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
, mask: function() {
    this.maskRegion = this.path;
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
  }
, fill: function(windingRule) {

    if(!this.toolDiameter) {
      throw 'You must set context.toolDiameter to use fill()'
    }

    var path = this.path;
    path = path.simplify(windingRule);
    path = path.clip(this.clipRegion,0);
    path = path.clip(this.maskRegion,2);
    path = path.fillPath(this.toolDiameter);
    var motion = this.motion;

    if(path.subPaths)
    path.subPaths.forEach(function(subPath) {
      this._layer(function(z) {
        this.motion.followPath(subPath, z);
      });
    }, this);
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
    this.align = 'inner';
    this.beginPath();
    this.moveTo(dmin/2,0);
    this.lineTo(dmaj/2,0);
    this.lineTo(dmaj/2,depth);
    this.lineTo(dmin/2,depth);
    this.closePath();
    this.turn(pitch, !ccw);
    this.restore();
  }
, bore: function(pitch, ccw) {
    return this.spiral(pitch, true, ccw);
  }
, turn: function(pitch, ccw) {
    return this.spiral(pitch, false, ccw);
  }
, spiral: function(pitch, bore, ccw) {

    // var basePath = this.path;

    var align = this.align;

    var inPath = this.path;

    if(align == 'inner') { 
      inPath = inPath.translate(-this.toolDiameter/2,0);
    }

    var bounds = inPath.getBounds(); // Find bounds

    var basePath = new Path();


    // bounds.right += (this.toolDiameter||0);

    if(align == 'center') {
      var s = this.depthOfCut || bounds.bottom;
      for(var i=bounds.top; i < bounds.bottom; i += s) {
        clipPath.moveTo(bounds.left-1,i);
        clipPath.lineTo(bounds.right+1,i);
        clipPath.lineTo(bounds.right+1,i+s);
        clipPath.lineTo(bounds.left-1,i+s);
        clipPath.close();
      }
    }
    else {
      var s = this.depthOfCut || bounds.right;
      for(var i=bounds.left; i < bounds.right; i += s) {
        var clipPath = new Path();
        clipPath.moveTo(i,bounds.top-1);
        clipPath.lineTo(i+s,bounds.top-1);
        clipPath.lineTo(i+s,bounds.bottom+1);
        clipPath.lineTo(i,bounds.bottom+1);
        clipPath.close();

        var tmp = inPath.clip(clipPath);
        basePath.addPath(tmp);
      }
    }


    // console.log(basePath,'');

    // console.log(clipPath);
    // this.path = basePath;
    // this.align = 'center';
    // this.stroke();
    // return;

    var virtual = this.mode == 'mill';
    var inner = this.align == 'inner';
    pitch = pitch || this.toolDiameter || 1;

    var fp = basePath.firstPoint();
    var lp = basePath.lastPoint();


    // if(!inner) {
      // bounds.left -= (this.toolDiameter||0)/2;
    // }

    var motion = this.motion;
    var driver = this.driver;
    var height = bounds.bottom-bounds.top;
    var width = bounds.right-bounds.left;
    var range = bore ? height : width; 
    var depthOfCut = this.depthOfCut || range;
    var offset = range;
    var a = 0;

      var path = basePath;

      // Remove the first 0 plane
      // path.subPaths[0]
      // .actions.splice(-1,1);

      // path.subPaths[0]
      // .actions[0].action = 'moveTo';


      var spiralAngle = 0;
      path.subPaths.forEach(function(subPath) {
        var pts = subPath.getPoints();
        pts = pts.slice(1);

        if(!ccw) {
          pts = pts.reverse()
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
                                       spiralAngle, ccw,
                                       function(x,y,t) {
              if(z0 <= 0.0001 && z1 <= 0.0001) return;

              var z = z0+(z1-z0)*t; 
              if(first) {
                // Todo: different for inner/outer?
                motion.rapid({z:z});
                motion.linear({
                  x: x,
                  y: y,
                });
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

        // Return to start
        if(virtual) {
          if(bore) {
            // motion.rapid({z:0});
          }
          else if(inner) {
            motion.rapid({x:0, y:0});
            motion.rapid({z:0});
          }
          else {
            var safeX = (bounds.right+2) * Math.cos(spiralAngle);
            var safeY = (bounds.right+2) * Math.sin(spiralAngle);

            motion.linear({x:safeX, y:safeY});
            motion.rapid({z:0});
          }
        }
        else {
          // motion.rapid({x: bounds.right});
          // motion.rapid({y: bounds.top, a:a});
          // driver.zero({a:0});
        }
    });

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

