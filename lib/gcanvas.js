module.exports = GCanvas;

var Path = require('./path')
  , Motion = require('./motion')
  , GcodeDriver = require('./drivers/gcode')
  , NullDriver = require('./drivers/null')
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

  if(driver === null) {
    driver = new NullDriver();
  }

  this.font = "7pt Helvetiker";
  this.matrix = new Matrix();
  this.rotation = 0; 
  this.depth = 0;
  this.depthOfCut = 0;
  this.top = 0;
  this.retract = 0;
  this.align = 'center';
  this.driver = driver || new GcodeDriver();
  this.driver.src = this;
  this.stack = [];
  this.motion = new Motion(this);
  this.filters = [];
  this.precision = 20;
  this.ramping = true;
  this.strokeStyle = '#000000';
  this.fillStyle = '#000000';

  if(this.driver.init)
    this.driver.init();

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
      top: this.top,
      filters: this.filters.slice(),
      strokeStyle: this.strokeStyle,
      fillStyle: this.fillStyle
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

          if(tmp[d] != undefined && negative) {
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
    this.path.moveTo(x,y);
  }
, lineTo: function(x,y) {
    this._transformPoint(arguments);
    this._ensurePath(x,y);
    this.path.lineTo(x,y);
  }
, arcTo: function(x1, y1, x2, y2, radius) {
    this._transformPoint(arguments,0);
    this._transformPoint(arguments,2);
    this._ensurePath(x1,y1);

    var p0 = this.path.lastPoint();
    var p1 = new Point(x1,y1);
    var p2 = new Point(x2,y2);
    var v01 = p0.sub(p1);
    var v21 = p2.sub(p1);

    // sin(A - B) = sin(A) * cos(B) - sin(B) * cos(A)
    var cross = v01.x * v21.y - v01.y * v21.x;

    if (Math.abs(cross) < 1E-10) {
        // on one line
        this.lineTo(x1,y1);
        return;
    }

    var d01 = v01.magnitude();
    var d21 = v21.magnitude();
    var angle = (Math.PI - Math.abs(Math.asin(cross / (d01 * d21)))) / 2;
    var span = radius * Math.tan(angle);
    var rate = span / d01;

    var startPoint = new Point(
      p1.x + v01.x * rate,
      p1.y + v01.y * rate
    );

    rate = span / d21; 

    var endPoint = new Point(
      p1.x + v21.x * rate,
      p1.y + v21.y * rate
    );

    var midPoint = new Point(
      (startPoint.x + endPoint.x) / 2,
      (startPoint.y + endPoint.y) / 2
    );

    var vm1 = midPoint.sub(p1);
    var dm1 = vm1.magnitude();
    var d = Math.sqrt(radius*radius + span*span);

    var centerPoint = new Point();
    rate = d / dm1;
    centerPoint.x = p1.x + vm1.x * rate;
    centerPoint.y = p1.y + vm1.y * rate;

    var arc = utils.pointsToArc(centerPoint, startPoint, endPoint);

    this.path.lineTo(startPoint.x, startPoint.y);
    this.path.arc(centerPoint.x, centerPoint.y, arc.radius, arc.start, arc.end, cross > 0);
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
, clone: function(driver) {
    var copy = new GCanvas(driver);
    this.save();
    copy.stack[0] = this.stack[0];
    copy.restore();
    return copy;
  }
, measureText: function(text) {
    var copy = this.clone(null);
    copy.text(text);
    var b = copy.path.getBounds();

    b.width = b.right - b.left;
    b.height = b.bottom - b.top;

    return b;
  }
, _isOpaque: function(color) {
    if(color == 'transparent') return false;
    if(color == 'none') return false;

    if(typeof color == 'string' &&
       color.match(/rgba\((?:.*,){3}[0\.]*\)/)) {
      return false;
    }

    return true;
  }
, stroke: function(align, depth) {
    if(!this._isOpaque(this.strokeStyle)) return;

    this.save();

    if(typeof align === 'number') {
      depth = align;
      align = undefined;
    }

    if(depth) {
      this.depth = depth;
    }

    var offset = 0;

    align = align || this.align;

    if(align === 'outer') {
      offset = this.toolDiameter/2;
    }
    if(align === 'inner') {
      offset = -this.toolDiameter/2;
    }

    var path = this.path;

    if(align != 'center') {
      path = path.simplify('evenodd', this.precision);
      path = path.offset(offset);
    }

    if(path.subPaths)
    path.subPaths.forEach(function(subPath) {

      // Climb milling
      if(align == 'inner') {
        subPath = subPath.reverse();
      }

      this._layer(subPath, function(z) {
        this.motion.followPath(subPath,z);
      });
    }, this);

    this.motion.retract();
    this.restore();
  }
, fill: function(windingRule, depth) {
    if(!this._isOpaque(this.fillStyle)) return;

    this.save();

    if(typeof windingRule === 'number') {
      depth = windingRule;
      windingRule = 'nonzero';
    }

    if(depth) {
      this.depth = depth;
    }

    if(!this.toolDiameter) {
      throw 'You must set context.toolDiameter to use fill()'
    }

    var path = this.path;
    path = path.simplify(windingRule, this.precision);
    path = path.clip(this.clipRegion, 0, this.precision);
    path = path.fillPath(this.toolDiameter, this.precision);
    var motion = this.motion;

    if(path.subPaths)
    path.subPaths.forEach(function(subPath) {
      this._layer(subPath, function(z) {
        this.motion.followPath(subPath, z);
      });
    }, this);

    this.motion.retract();
    this.restore();
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
, thread: function(x, y, attack, dmin, dmaj, pitch, start, length, ccw, virtual) {
    this.save();
    this.beginPath();
    this.rect(dmin/2,start,dmaj/2-dmin/2,length);
    this.lathe(x,y,attack, pitch, ccw, virtual);
    this.restore();
  }
, threadMill: function(x, y, attack, dmin, dmaj, pitch, start, length, ccw) {
    return this.thread(x, y, attack, dmin, dmaj, pitch, start, length, ccw, true);
  }
, latheMill: function(x, y, attack, pitch, ccw) {
    return this.lathe(x, y, attack, pitch, ccw, true);
  }
, lathe: function(x, y, attack, pitch, ccw, virtual) {

    this.save();

    this.filter(function(p) {
      if(p.x != undefined)
        p.x += x;
      if(p.y != undefined)
        p.y += y;
    });

    var inPath = this.path;
    var toolR = this.toolDiameter/2 || 0;

    if(virtual && toolR) {
      if(attack == 'inner') { 
        inPath = inPath.translate(-toolR,0);
      }
      if(attack == 'outer') { 
        inPath = inPath.translate(toolR,0);
      }
    }

    var bounds = inPath.getBounds(); // Find bounds
    var height = bounds.bottom-bounds.top;
    var width = bounds.right-bounds.left;
    inPath = inPath.simplify();

    var quad = new Path();
    quad.rect(0,0,bounds.right,bounds.bottom);
    inPath = inPath.clip(quad);

    var path = new Path();
    var s = this.depthOfCut || 1000;
    var top = virtual ? this.top : 0;

    // Build waterline path
    // for given attack.
    // Each subpath is a layer.
    if(attack === 'face') {
      for(var i=s; i <= bounds.bottom; i += s) {
        var clip = new Path();
        clip.rect(0, top, width, i);
        var layer = inPath.clip(clip,0);

        layer.subPaths = layer.subPaths.map(function(sp) {
          sp = sp.shiftToNearest(0,0);
          return sp;
        });

        path.addPath(layer);
      }
    }
    else if(attack === 'inner') {
      for(var i=bounds.left; i <= bounds.right; i += s) {
        var clip = new Path();
        clip.rect(0,top,i,height-top);
        var layer = inPath.clip(clip,0);

        layer.subPaths = layer.subPaths.map(function(sp) {
          sp = sp.shiftToNearest(0,0);
          return sp;
        });

        path.addPath(layer);
      }
    }
    else if(attack === 'outer') {
      for(var i=bounds.right;; i -= s) {
        i = Math.max(i, bounds.left);

        var clip = new Path();
        clip.rect(i,top,bounds.right+10,height-top);
        var layer = inPath.clip(clip,0);

        layer.subPaths = layer.subPaths.map(function(sp) {
          sp = sp.shiftToNearest(bounds.right,0);
          return sp;
        });

        path.addPath(layer);

        if(i == bounds.left) break;
      }
    }

    // path.addPath(inPath);

    var inner = this.align == 'inner';
    pitch = pitch || this.toolDiameter || 1;

    var motion = this.motion;
    var driver = this.driver;
    // var range = (attack == 'face') ? height : width; 
    // var depthOfCut = this.depthOfCut || range;
    // var offset = range;
    var a = 0;

    path.subPaths.forEach(function(subPath) {
      var spiralAngle = 0;
      driver.zero({a:0});
      var a = 0;

      var pts = subPath.getPoints();

      if(!ccw) {
        // CCW simply makes the path bottom-out.
        // The physical circular motion is
        // always determined by the attack
        // to ensure climb milling.
        pts = pts.reverse();
      }

      var p0u = motion.position;
      var p0 = p0u.clone();

      pts.forEach(function(p1,i) {
        p1 = p1.clone();
        p1u = p1.clone();

        var xo = p1u.x-p0u.x;
        var yo = p1u.y-p0u.y;
        var dist = Math.sqrt(xo*xo + yo*yo);

        if(virtual) {
          var r0 = p0.x;
          var z0 = p0.y;
          var r1 = p1.x;
          var z1 = p1.y;
          var loops = dist/pitch;

          // Entering and exiting are a part of the path
          // touching the bounds as a consequence
          // of the waterline clipping.
          // We just have to detect them and
          // behave a little differently.
          if(attack == 'inner' && p0.x <= bounds.left) {
            // Inner Entering
            var x = (r1) * Math.sin(spiralAngle);
            var y = (r1) * Math.cos(spiralAngle);
            if(i === 0)
              motion.rapid({x: x, y: y});
            else
              motion.linear({x: x, y: y});

            motion.rapid({z: z1});
          }
          else if(attack == 'inner' && p1.x <= bounds.left) {
            // Inner Exiting
            var x = (r1) * Math.sin(spiralAngle);
            var y = (r1) * Math.cos(spiralAngle);
            motion.rapid({x: x, y: y});
            motion.rapid({z: z1});
          }
          else if(attack == 'outer' && p0.x >= bounds.right) {
            // Outer Entering
            var x = (r1) * Math.cos(spiralAngle);
            var y = (r1) * Math.sin(spiralAngle);
            motion.linear({x: x, y: y});
          }
          else if(attack == 'outer' && p1.x >= bounds.right) {
            // Outer Exiting
            var x = (r1) * Math.cos(spiralAngle);
            var y = (r1) * Math.sin(spiralAngle);
            motion.rapid({x: x, y: y});
            motion.rapid({z: z1});
          }
          else if(attack == 'face' && p0.y <= bounds.top) {
            // Face Entering
            var x = (r1) * Math.cos(spiralAngle);
            var y = (r1) * Math.sin(spiralAngle);
            motion.rapid({x: x, y: y});
            motion.linear({z: z1});
          }
          else if(attack == 'face' && p1.y <= bounds.top) {
            // Outer Exiting
            var x = (r1) * Math.cos(spiralAngle);
            var y = (r1) * Math.sin(spiralAngle);
            motion.rapid({z: z1});
            motion.rapid({x: x, y: y});
          }
          else {
            spiralAngle = utils.spiral(this.precision, r0, r1, loops,
                                       spiralAngle, attack=='inner',
                                       function(x,y,t) {
              var z = z0+(z1-z0)*t; 

              motion.linear({
                x: x,
                y: y,
                z: z 
              });
            });
          }
        }
        else {

          if(attack == 'inner' && p1u.x <= bounds.left) {
            motion.rapid({x: p1.x, y: p1.y});
          }
          else if(attack == 'outer' && p1.x >= bounds.right) {
            motion.rapid({x: p1.x, y: p1.y});
          }
          else if(attack == 'face' && p1.y <= bounds.top) {
            motion.rapid({x: p1.x, y: p1.y});
          }
          else {
            a += dist/pitch*360;
            motion.linear({x: p1.x, y: p1.y, a: a});
          }
        }

        p0 = p1.clone();
        p0u = p1u.clone();
      }, this);

      // This is important to be done after
      // every subpath, for ctx.top
      if(virtual) {
        motion.rapid({z: 0});
      }
    }, this);

    driver.zero({a:0});

    // Always finish with an arc?
    // motion.arcCW({
    //   x: 0,
    //   y: 0,
    //   i:-p1.x,
    //   j:-p1.y
    // });

    this.restore();
  }
, peckDrill: function(x, y, depth, peck) {

    this._transformPoint(arguments);

    if(arguments.length <= 2) {
      depth = arguments[0];
      peck = arguments[1];
      x = 0;
      y = 0;
    }

    var prevZ = this.top;
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

    for(var z=this.top+peck; prevZ < depth; z += peck) {
      z = Math.min(z, depth); // Cap to exact depth
      mtn.rapid({z:prevZ-tad}); // Rapid to prev depth - tad
      mtn.linear({z:z}); // Drill a bit further
      mtn.retract();
      // mtn.rapid({z:-tad}); // Rapid all the way out 
      prevZ = z;
    }

    mtn.retract();
  }
, _layer: function(subPath, fn) {
    var depthOfCut = this.depthOfCut || this.depth;

    if(depthOfCut === 0) {
      fn.call(this, -this.top);
      return;
    }

    var invertedZ = this.depth < 0;
    if (invertedZ && depthOfCut > 0) {
      depthOfCut = -depthOfCut;
    }

    var steps = Math.ceil(Math.abs(this.depth/depthOfCut));


    var offset = -this.top;
    while(steps--) {
      offset -= depthOfCut;

      // Clip to actual depth
      if (invertedZ) {
        offset = Math.max(offset, this.top+this.depth);
      } else {
        offset = Math.max(offset, -this.top-this.depth);
      }

      // Remove the material at this depth
      fn.call(this, offset);
    }

    // Finishing pass
    if(this.ramping && subPath.isClosed()) {
      fn.call(this, offset);
    }
  }
, text: function(text, x, y, params) {
    var fontProps = parseFont(this.font);
    var font = new Font(fontProps);

    // this.beginPath();
    this.save();
    this.translate(x, y);
    font.drawText(this, text);
    this.restore();
  }
, fillText: function(text, x, y, params) {
    this.text(text, x, y, params);
    this.fill();
  }
, strokeText: function(text, x, y, params) {
    this.text(text, x, y, params);
    this.stroke();
  }
, clearRect: function() {}
, closePath: function() {
    this.path.close();
  }
};

GCanvas.GcodeDriver = GcodeDriver;

var helvetiker = require('./fonts/helvetiker_regular.typeface');
Font.load(helvetiker);

