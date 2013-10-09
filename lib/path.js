module.exports = Path;

var SubPath = require('./subpath')
  , ClipperLib = require('./clipper')

function Path() {
  this.subPaths = [];
}

Path.actions = SubPath.actions;

Path.prototype = {
  moveTo: function(x,y) {
    var subPath = new SubPath();
    subPath.moveTo(x,y);
    this.subPaths.push(subPath);
    this.current = subPath;
  }
, close: function() {
    if(this.current) {
      this.current.closed = true;
      var curStart = this.current.actions[0].args;
      this.moveTo.apply(this, curStart);
    }
  }

/*
 * Pass all curves straight through
 * */
, lineTo: function() {
    this.current.lineTo.apply(this.current, arguments);
  }
, arc: function() {
    this.current.arc.apply(this.current, arguments);
  }
, ellipse: function() {
    this.current.ellipse.apply(this.current, arguments);
  }
, quadraticCurveTo: function() {
    this.current.quadraticCurveTo.apply(this.current, arguments);
  }
, bezierCurveTo: function() {
    this.current.bezierCurveTo.apply(this.current, arguments);
  }
, toPolys: function(scale) {
    if(!scale) throw 'NO SCALE!';

    return this.subPaths.map(function(subPath) {
      return subPath.toPoly(scale);
    });
  }
, fromPolys: function(polygons, scale) {
    if(!scale) throw 'NO SCALE!';

    for(var i=0,l=polygons.length; i < l; ++i) {
      var subPath = new SubPath();
      subPath.fromPoly(polygons[i], scale);
      this.subPaths.push(subPath);
      this.current = subPath;
    }

    return this;
  }
, clip: function(clipRegion) {
    if(!clipRegion) return this;

    var scale = 1000;
    var subjPolys = this.toPolys(scale);
    var clipPolys = clipRegion.toPolys(scale);

    var subject_fillType = 1;
    var clip_fillType = 1;
    var clipType = 0;

    var cpr = new ClipperLib.Clipper();
    cpr.AddPolygons(subjPolys, ClipperLib.PolyType.ptSubject);
    cpr.AddPolygons(clipPolys, ClipperLib.PolyType.ptClip);

    var result = [];
    var succeeded = cpr.Execute(clipType, result, subject_fillType, clip_fillType);
    var polygons = result;

    var path = new Path();
    path.fromPolys(polygons, 1000);
    return path;
  }

, simplify: function(windingRule) {
    var scale = 1000;
    var cleandelta = 0.1;
    var polygons = this.toPolys(scale); 

    // Convert to ClipperLib's IDs
    if(windingRule === 'evenodd')
      windingRule = EVEN_ODD;
    else
      windingRule = NON_ZERO;

    var cpr = new ClipperLib.Clipper();
    polygons = ClipperLib.Clean(polygons, cleandelta * scale);
    polygons = cpr.SimplifyPolygons(polygons,
                                 windingRule);

    var path = new Path();
    path.fromPolys(polygons, scale);
    return path;
  }

, offset: function(delta) {
    if(delta === 0) {
      return this;
    }

    var scale = 1000;
    var cleandelta = 0.1;

    var cpr = new ClipperLib.Clipper();
    var polygons = this.toPolys(scale);

    // offset
    var joinType = 2;
    var miterLimit = scale;
    var AutoFix = true;
    polygons = cpr.OffsetPolygons(polygons, delta*scale, joinType, miterLimit, AutoFix);

    if(polygons.length === 0
      || polygons[0].length === 0) return false;

    var result = new Path();
    result.fromPolys(polygons, scale);
    return result;
  }

}

var NON_ZERO = ClipperLib.PolyFillType.pftNonZero;
var EVEN_ODD = ClipperLib.PolyFillType.pftEvenOdd;
