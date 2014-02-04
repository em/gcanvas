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
  this.strokeAlign = 'center';
  this.feed = 1000;
  this.driver = driver || new GcodeDriver();
  this.driver.src = this;
  this.stack = [];
  this.motion = new Motion(this);
  this.surfaceTolerance = 0;

  this.beginPath();
}

GCanvas.prototype = {
  save: function() {
    this.stack.push({
      matrix: this.matrix.clone(),
      rotation: this.rotation
    });
  }
, restore: function() {
    var prev = this.stack.pop();
    if(!prev) return;
    this.matrix = prev.matrix;
    this.rotation = prev.rotation;
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
    else if(a.x) {
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

    if(x === 0) x = 0.0000000001;
    if(y === 0) y = 0.0000000001;

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
    // this.clipRegion = this.subPaths.slice(0,-1);
    // this.clipRegion.push(this.path.clone());
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
    if(this.strokeAlign === 'outset') {
      offset = this.toolDiameter/2;
    }
    if(this.strokeAlign === 'inset') {
      offset = -this.toolDiameter/2;
    }

    var path = this.path;
    path = path.offset(offset);

    if(path.subPaths)
    path.subPaths.forEach(function(subPath) {
      subPath = subPath.toPath();
      this._layer(function() {
        this.motion.followPath(subPath);
      });
    }, this);
  }
, fill: function(windingRule) {

    if(!this.toolDiameter) {
      throw 'You must set context.toolDiameter to use fill()'
    }

    path = this.path;
    path = path.simplify(windingRule);
    path = path.clip(this.clipRegion);
    path = path.fillPath(this.toolDiameter);

    if(path.subPaths)
    path.subPaths.forEach(function(subPath) {
      subPath = subPath.toPath();
      this._layer(function() {
        this.motion.followPath(subPath);
      });
    }, this);
  }

, arcTurn: function() {
    this.motion.filter = {
      linear: function(p) {
        this.arcCW(p);
      }
    };

    this.turn();
    this.motion.filter = false;
  }

, bore: function(pitch) {
    return this.turn(pitch, true);
  }

, outerThread: function(dmin, dmaj, depth, pitch, ccw) {
    this.latheAlign = 'outer';
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
    this.turn(pitch, ccw);
  }

, innerThread: function(dmin, dmaj, depth, pitch, ccw) {
    this.latheAlign = 'inner';
    this.beginPath();
    this.moveTo(dmin/2,depth);
    this.lineTo(dmaj/2,depth);
    this.lineTo(dmaj/2,0);
    this.turn(pitch);
  }

, turn: function(pitch, diameter, bore) {

    var virtual = !this.lathe;
    var inner = this.latheAlign == 'inner';

    var path = this.path;
    pitch = pitch || this.toolDiameter || 1;

    var bounds = path.getBounds();

    if(inner) {
      bounds.right += (this.toolDiameter||0)/2;
    }
    else {
      bounds.right += (this.toolDiameter||0)/2;
    }

    if(diameter)
      bounds.right = diameter/2;

    var motion = this.motion;
    var driver = this.driver;
    var height = bounds.bottom-bounds.top;
    var width = bounds.right-bounds.left;
    var a = 0;

    var range = bore ? height : width; 

    var depthOfCut = this.depthOfCut || range;

    var offset = range;
    while(offset > 0) {
      offset -= depthOfCut;
      offset = Math.max(offset, 0);


      var spiralAngle = 0;
      var pts = path.getPoints();
      var p0 = new Point(0,0,0);
      var p0b = new Point(0,0,0);

      var first = true;

      if(this.lathe) {
        motion.rapid({y:0});
      }
      else {
        motion.rapid({z:0});
      }


      pts.forEach(function(p1,pi) {
        p1 = p1.clone();
        var p1c = p1.clone();

        if(inner) {
          p1.x -= (this.toolDiameter||0)/2;
        }
        else {
          p1.x += (this.toolDiameter||0)/2;
        }

        if(bore) {
          p1.y -= offset;
        }
        else {
          if(inner) {
            p1.x -= offset;
          }
          else {
            p1.x += offset;
          }
        }

        // if(p0.y < bounds.top && p1.y < bounds.top)
        //   return;

        if(p1.y < bounds.top) {
          var m = (p1.x - p0.x) / (p1.y - p0.y);
          p1.x += m * (bounds.top - p1.y);
          var d = p1.y-bounds.top;
          p1.y = bounds.top;
        }

        // if(p1.x < bounds.left) {
        //   var m = (p1.y - p0.y) / (p1.x - p0.x);
        //   p1.y += m * (bounds.left - p1.x);
        //   var d = p1.x-bounds.left;
        //   p1.x = bounds.left;
        // }

        if(p1.x > bounds.right) {
          var m = (p1.y - p0.y) / (p1.x - p0.x);
          p1.y += m * (bounds.right - p1.x);
          var d = p1.x-bounds.right;
          p1.x = bounds.right;
        }

        if(virtual) {
          var r0 = p0.x;
          var z0 = p0.y;
          var r1 = p1.x;
          var z1 = p1.y;

            if(false && pi == 0) {
              // motion.rapid({z:0});
              // motion.rapid({x:0,y:0});
            }
            else {

              // var spiralPitch = (r1-r0)/(z1-z0)*pitch;

              var xo = p1.x-p0.x;
              var yo = p1.y-p0.y;
              var dist = Math.sqrt(xo*xo + yo*yo);
              var loops = dist/pitch;

              if(z0 <= bounds.top && z1 <= bounds.top) {
                // spiralAngle = conicSpiral(r0, r1, loops, spiralAngle, function(x,y,t) {
                //   motion.rapid({
                //     x: x,
                //     y: y
                //   });
                // }, true);
              }
              else {
                spiralAngle = conicSpiral(r0, r1, loops, spiralAngle, function(x,y,t) {
                  motion.linear({
                    x: x,
                    y: y,
                    z: z0+(z1-z0)*t 
                  });
                });
              }

              function conicSpiral(r0,r1,loops,start,callback,last) {
                if(loops == 0) return start;

                var divisions = 40;
                var end = Math.abs(loops) * divisions * 2;
                var delta = r1-r0;
                var pitch = divisions/end*delta;
                var a = r0;
                var b = pitch/Math.PI;
                var stepAngle = Math.PI/divisions;
                start = start || 0;
                var x,y,t;
                var angle;

                for(var i = 0; i < end; i++) {
                  if(last) i = end;

                  angle = stepAngle * i;
                  x = (a + b * angle) * Math.cos(angle+start);
                  y = (a + b * angle) * Math.sin(angle+start);
                  t = i/end; 

                  var proceed = callback(x, y, t);
                  if(proceed === false) {
                    break;
                  }
                }

                return angle+start+stepAngle;
              }
            }
        }
        else {
          a = p1.x/pitch*360;
          motion.linear({x: p1.x, y: p1.y, a: a});
        }

        p0 = p1.clone();
        p0b = p1c.clone();
        first = false;
      }, this);

      a = Math.round(a / 360) * 360;

      if(virtual) {
        // motion.rapid({z:0});
        // motion.rapid({x:0,y:0});
      }
      else {
        motion.rapid({y: bounds.top});
        motion.rapid({x: bounds.left, a:a});
        driver.zero({a:0});
      }
    }

    // motion.arcCW({
    //   x: 0,
    //   y: 0,
    //   i:-p1.x,
    //   j:-p1.y
    // });

    motion.rapid({z:0});
    // motion.rapid({x:0,y:0});
  }
, peckDrill: function(depth, peck) {
    var prevZ = 0;
    peck = peck || ctx.toolDiameter;

    var mtn = this.motion;

    for(var z=peck; z < depth; z += peck) {
      z = Math.min(z, depth); // Cap to exact depth
      mtn.rapid({z:prevZ}); // Rapid to current depth
      mtn.linear({z:z}); // Drill a bit further
      mtn.rapid({z:0}); // Rapid all the way out 
      prevZ = z;
    }
  }
, thread: function(cx,cy,dmaj,pitch,toolDiameter,depth) {
    toolDiameter = toolDiameter || this.toolDiameter;
    depth = depth || this.depth;
    this.beginPath();
    this.moveTo(dmaj/2,0);
    this.lineTo(dmaj/2,depth);
    this.turn(pitch,cx,cy);
  }

, taper: function(cx,cy,dmin,dmaj,depth,pitch) {
    this.beginPath();
    this.moveTo(dmin/2,0);
    this.lineTo(dmaj/2,depth);
    this.turn(pitch,cx,cy);
  }
, bowl: function(cx,cy,r1,r2) {
    var mtn = this.motion;
  }
, hole: function(x,y,d,depth) {
    this.save();
    this.beginPath();
    this.depth = depth || this.depth;
    this.arc(x,y,d/2,0,Math.PI*2);
    this.fill();
    this.restore();
  }
, _layer: function(fn) {
    var depthOfCut = this.depthOfCut || this.depth;
    var start = this.top + depthOfCut;

    if(depthOfCut === 0) {
      this.motion.targetDepth = start;
      fn.call(this);
      return;
    }

    var layers = Math.ceil((this.top+this.depth) / depthOfCut);

    for(var i=1; i < layers+2; ++i) {
      var depth = this.top + depthOfCut * i;
    // for(var depth=start;
    //     depth <= this.top+this.depth;
    //     depth += depthOfCut) {
      // Clip to actual depth
      depth = Math.min(depth, this.top+this.depth);
      // Set new target depth in motion

      this.motion.targetDepth = depth;
      // Remove the material at this depth
      fn.call(this, depth);
    }


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
