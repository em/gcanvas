module.exports = GCanvas;

var three = require('./three.custom')
  , Motion = require('./motion')
  , GCodeDriver = require('./drivers/gcode')
  , parseFont = require('./parsefont')
  , ClipperLib = require('./clipper')
  , utils = require('./utils');

var helvetiker = require('./fonts/helvetiker_regular.typeface')
three.FontUtils.loadFace(helvetiker);

if(typeof window !== 'undefined')
  window.THREE = three;

function GCanvas(driver, width, height) {
  this.canvas = {
    width: width,
    height: height
  };

  this.font = "7pt Helvetiker";
  this.matrix = new three.Matrix4();
  this.rotation = 0; 
  this.depth = 1;
  this.depthOfCut = 0.25;
  this.toolDiameter = 5;
  this.fillStrategy = 'crosshatch';
  this.driver = driver || new GCodeDriver();
  this.position = new three.Vector3(0,0,0);
  this.postProcs = [];
  this.postProcessApply = function(params) {
    this.postProcs.forEach(function(t) {
      t.call(this, params);
    }, this);
  };
  this.stack = [];

  this.motion = new Motion(this);

  this.beginPath();

}

three.Vector3.prototype.rotated = function(angle) {
  var axis = new three.Vector3(0,0,1);
  rotationMatrix = new three.Matrix4();
  rotationMatrix.makeRotationAxis(axis, angle);
  return this.clone().applyMatrix4(rotationMatrix);
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
, postProc: function() {
  }
, beginPath: function() {
    this.path = new three.Path();
    this.subPaths = [this.path];
  }
, rotate: function(angle) {
    var axis = new three.Vector3(0,0,1);
    rotationMatrix = new three.Matrix4();
    rotationMatrix.makeRotationAxis(axis, angle);
    this.matrix.multiply(rotationMatrix);
    this.rotation += angle;
  }
, translate: function(x,y) {
    var trans = new three.Matrix4();
    trans.makeTranslation(x, y, 0 )
    this.matrix.multiply(trans);
  }
, scale: function(x,y) {
    var scale = new three.Matrix4();
    scale.makeScale(x, y, 1 )
    this.matrix.multiply(scale);
  }
, _transformPoint: function(a, i) {
    i = i || 0;
    if(a.length) {
      var v = new three.Vector3(a[i], a[i+1], 0);
      v.applyMatrix4(this.matrix);
      a[i] = v.x; 
      a[i+1] = v.y; 
    }
    else if(a.x) {
      var v = new three.Vector3(a.x, a.y, 0);
      v.applyMatrix4(this.matrix);
      a.x = v.x; 
      a.y = v.y; 
    }
  }
, _ensurePath: function(x,y) {
    if(this.path.actions.length === 0) {
      this.path.moveTo(x,y);
    }
  }
, moveTo: function(x,y) {
    this._transformPoint(arguments);
    this.path = new three.Path();
    this.path.moveTo(x,y);
    this.subPaths.push( this.path );
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
      this.lineTo();
      return;
    }

    // See portal2 example
    if(aEndAngle-aStartAngle === -Math.PI*2)
      aEndAngle = Math.PI*2;

    var center = new three.Vector3(x, y, 0);
    var points = utils.arcToPoints(center,
                                   aStartAngle,
                                   aEndAngle,
                                   radius);
    center.applyMatrix4(this.matrix);
    points.start.applyMatrix4(this.matrix);
    points.end.applyMatrix4(this.matrix);

    var res = utils.pointsToArc(center,
                                points.start,
                                points.end);

    this._ensurePath(points.start.x, points.start.y);
    this.path.absarc(center.x, center.y, res.radius, res.start, res.end, aClockwise);
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

, _offsetStroke: function(delta) {
    var cpr = new ClipperLib.Clipper();
    var polygons = [];
    this.subPaths.forEach(function(path) {
      if(path.actions.length !== 0)
        polygons.push( path.getPoints().map(function(p) {
          return {X: p.x, Y: p.y};
        }) );
    });

    scaleup(polygons, 1000);

    delta *= 1000;

    var scale = 1;
    var cleandelta = 1; // 0.1 should be the appropriate delta in different cases

    polygons = ClipperLib.Clean(polygons, cleandelta * scale);

    cpr.AddPolygons(polygons, ClipperLib.PolyType.ptSubject);

    var joinType = ClipperLib.JoinType.jtSquare;
    var miterLimit = 1;
    var AutoFix = true;

    var offsetted_polygon = cpr.OffsetPolygons(polygons, delta, joinType, miterLimit, AutoFix);


    scaleup(offsetted_polygon, 1/1000);

    function scaleup(poly, scale) {
      var i, j;
      if (!scale) scale = 1;
      for(i = 0; i < poly.length; i++) {
        for(j = 0; j < poly[i].length; j++) {
          poly[i][j].X *= scale;
          poly[i][j].Y *= scale;
        }
      }
      return poly;
    }

    // converts polygons to SVG path string
    function polys2path (poly, scale) {
      var path = new three.Path(), i, j;
      if (!scale) scale = 1;
      for(i = 0; i < poly.length; i++) {
        path.moveTo(poly[i][0].X, poly[i][0].Y);

        for(j = 1; j < poly[i].length; j++){
          path.lineTo(poly[i][j].X, poly[i][j].Y);
        }

        path.lineTo(poly[i][0].X, poly[i][0].Y);
      }
      // console.log(path);
      return path;
    }

    // console.log(offsetted_polygon);

    if(offsetted_polygon.length === 0
      || offsetted_polygon[0].length === 0) return true;

    this._strokePath(polys2path(offsetted_polygon));
  }
, clip: function() {
  }
, fill: function() {
    for(var i = - this.toolDiameter/2; i > -1000; i -= this.toolDiameter) {
      var done = this._offsetStroke(i);
      if(done) return;
    }
  }
, fillRect: function(x,y,w,h) { 
    this.beginPath();
    this.moveTo(x,y);
    this.lineTo(x+w,y);
    this.lineTo(x+w,y+h);
    this.lineTo(x,y+h);
    this.lineTo(x,y);
    this.fill();
  }
, measureText: function(text) {
    var width=0, height=0;
    var paths = three.FontUtils.drawText(text).paths;
    paths.forEach(function(path) {
      var box = path.getBoundingBox();
      width += box.maxX;
      height = Math.max(height, box.maxY);
    });

    // console.log(width, height);
    return {width: width, height: height};
  }
, stroke: function() {
    this.layers(function() {
      this.subPaths.forEach(this._strokePath, this);
    });

  }
, _strokePath: function(path) {
    var each = {};
    var motion = this.motion;
    var driver = this.driver;
    var item;

    each[three.PathActions.MOVE_TO] = function(x,y) {
      motion.retract();
      motion.rapid({x:x,y:y});
    };

    each[three.PathActions.LINE_TO] = function(x,y) {
      motion.plunge();
      motion.linear({x:x,y:y});
    };

    // 3js just converts a bunch of stuff to absellipse
    // but for our purposes this weird lossiness works
    // fine since we should detect ellipses that are arcs
    // and optimizing by using the native methods anyway.
    each[three.PathActions.ELLIPSE] = function(x, y, rx, ry,
									  aStart, aEnd, aClockwise , mx, my) {
      motion.plunge();

      // Detect plain arc
      if(utils.sameFloat(rx,ry) &&
        (driver.arcCW && !aClockwise) ||
        (driver.arcCCW && aClockwise) ) {
          var center = new three.Vector3(x, y);
          var points = utils.arcToPoints(center,
                                         aStart,
                                         aEnd,
                                         rx);
          var params = {
            x: points.end.x, y: points.end.y,
            i: x, j: y
          };

          if(aClockwise)
            motion.arcCCW(params);
          else
            motion.arcCW(params);
      }
      else {
        this._interpolate('absellipse', arguments, i === 0);
      }
    };

    each[three.PathActions.BEZIER_CURVE_TO] = function() {
      this._interpolate('bezierCurveTo', arguments);
    };

    each[three.PathActions.QUADRATIC_CURVE_TO] = function() {
      this._interpolate('quadraticCurveTo', arguments);
    };

    for(var i = 0, l = path.actions.length; i < l; ++i) {
      item = path.actions[i]
      each[item.action].apply(this, item.args);
    }

  }
, layers: function(fn) {
     // this.motion.linear({z: this.position.z + this.depthOfCut});
     // while(this.position.z < this.depth) {
     //   this.motion.linear({z: this.position.z + this.depthOfCut});
     // }
     fn.call(this);
  }
, fillText: function(text, x, y, params) {
    this.layers(function() {
      this.beginPath();
      var fontProps = parseFont(this.font);
      three.FontUtils.weight = fontProps.weight;
      three.FontUtils.style = fontProps.style;
      three.FontUtils.size = fontProps.size;
      three.FontUtils.face = three.FontUtils.faces[fontProps.family] ? fontProps.family : 'helvetiker';

      var paths = three.FontUtils.drawText(text).paths;

      this.save();
      this.translate(x, y);

      paths.forEach(function(path,i) {
        path.actions.forEach(function(action) {
          this[action.action].apply(this, action.args);
        }, this);
      }, this);
      this.fill();

      this.restore();
    });
  }

, strokeText: function(text, x, y, params) {
    this.layers(function() {

      var fontProps = parseFont(this.font);
      three.FontUtils.weight = fontProps.weight;
      three.FontUtils.style = fontProps.style;
      three.FontUtils.size = fontProps.size;
      three.FontUtils.face = three.FontUtils.faces[fontProps.family] ? fontProps.family : 'helvetiker';

      var paths = three.FontUtils.drawText(text).paths;

      this.save();
      this.translate(x, y);

      paths.forEach(function(path,i) {
        path.actions.forEach(function(action) {
          this[action.action].apply(this, action.args);
        }, this);
      }, this);

      this.stroke();
      this.restore();
    });
  }

/**
 *   
 * */
, _interpolate: function(name, args, moveToFirst) {
    var path = new three.Path([this.position]);
    path[name].apply(path, args);

    var pts = path.getPoints(40);
    for(var i=0,l=pts.length; i < l; ++i) {
      var p=pts[i];
      if(i === 0 && moveToFirst)
        this.motion.rapid({x:p.x, y:p.y});
      else
        this.motion.linear({x:p.x, y:p.y});
    };

    // close it
    // this.motion.linear({x:p.x, y:p.y});
  }
};

GCanvas.Filter = require('./drivers/filter');
GCanvas.Simulator = require('./drivers/simulator');
