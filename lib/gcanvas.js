module.exports = GCanvas;

var Path = require('./path')
  , Motion = require('./motion')
  , GCodeDriver = require('./drivers/gcode')
  , Point = require('./math/point')
  , Matrix = require('./math/matrix')
  , ClipperLib = require('./clipper')
  , Font = require('./font')
  , parseFont = require('./parsefont')
  , utils = require('./utils');

function GCanvas(driver, width, height) {
  this.canvas = {
    width: width,
    height: height
  };

  this.font = "7pt Helvetiker";
  this.matrix = new Matrix();
  this.rotation = 0; 
  this.depth = 1;
  this.depthOfCut = 0;
  this.toolDiameter = 5;
  this.fillStrategy = 'crosshatch';
  this.driver = driver || new GCodeDriver();
  this.stack = [];
  this.motion = new Motion(this);

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
    this.prevSubPaths = this.subPaths;
    this.path = new Path();
    this.subPaths = [this.path];
  }
, _restorePath: function() {
    this.subPaths = this.prevSubPaths;
    this.path = this.subPaths[this.subPaths.length-1] || new Path();
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
    if(this.path.actions.length === 0) {
      this.path.moveTo(x,y);
    }
  }
, moveTo: function(x,y) {
    this._transformPoint(arguments);
    this.path = new Path();
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

, _offsetStroke: function(delta) {
    var cpr = new ClipperLib.Clipper();
    var polygons = [];
    this.subPaths.forEach(function(path) {
      if(path.actions.length !== 0)
        polygons.push( path.getPoints(40).map(function(p) {
          return {X: p.x, Y: p.y};
        }) );
    });

    function path2poly(paths) {
      var poly = [];
      paths.forEach(function(path) {
        if(path.actions.length !== 0)
          poly.push( path.getPoints(40).map(function(p) {
            return {X: p.x, Y: p.y};
          }) );
      }); 
      return poly;
    }

    polygons = ClipperLib.Clean(polygons, cleandelta * scale);
    polygons = cpr.SimplifyPolygons(polygons, ClipperLib.PolyFillType.pftNonZero);
    cpr.AddPolygons(polygons, ClipperLib.PolyType.ptSubject);

    if(this.clipRegion) {
      var cpr = new ClipperLib.Clipper();
      var subject_fillType = 1;
      var clip_fillType = 1;
      var clip_polygons = path2poly(this.clipRegion);
      var clipType = 0;
      cpr.AddPolygons(polygons, ClipperLib.PolyType.ptSubject);
      cpr.AddPolygons(clip_polygons, ClipperLib.PolyType.ptClip);
      var result = [];
      var succeeded = cpr.Execute(clipType, result, subject_fillType, clip_fillType);
      polygons = result;
    }

    scaleup(polygons, 1000);

    delta *= 1000;

    var scale = 1;
    var cleandelta = 0.1; // 0.1 should be the appropriate delta in different cases

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
      var path = new Path(), i, j;
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

    this.motion.followPath(polys2path(offsetted_polygon));
  }
, clip: function() {
    this.clipRegion = this.subPaths.slice(0,-1);
    this.clipRegion.push(this.path.clone());
  }
, fill: function() {
    for(var i = - this.toolDiameter/2; i > -1000; i -= this.toolDiameter) {
      var done = this._offsetStroke(i);
      if(done) return;
    }
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
    this.layers(function() {
      this.motion.followPath(this.subPaths);
    });
  }
, layers: function(fn) {
    if(this.depth <= this.depthOfCut || this.depthOfCut === 0) {
      this.motion.targetDepth = this.depth;
      fn.call(this);
      return;
    }

    for(var depth=this.depthOfCut; depth <= this.depth; depth += this.depthOfCut) {
      this.motion.targetDepth = Math.min(depth, this.depth);
      fn.call(this);
    }
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
    this.layers(function() {
      var fontProps = parseFont(this.font);
      var font = new Font(fontProps);

      this.beginPath();
      this.save();
      this.translate(x, y);
      font.drawText(this, text);
      this.stroke();
      this.restore();
      this._restorePath();
    });
  }
};

GCanvas.Filter = require('./drivers/filter');
GCanvas.Simulator = require('./drivers/simulator');

var helvetiker = require('./fonts/helvetiker_regular.typeface');
Font.load(helvetiker);
