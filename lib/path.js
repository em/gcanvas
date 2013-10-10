module.exports = Path;

var SubPath = require('./subpath')
  , ClipperLib = require('./clipper')
  , utils = require('./utils')
  , Point = require('./math/point')

function Path() {
  this.subPaths = [];
}

Path.actions = SubPath.actions;

Path.prototype = {
  clone: function() {
    var copy = new Path();
    copy.subPaths = this.subPaths.slice(0);
    return copy;
  }
, moveTo: function(x,y) {
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

, addPath: function(path2) {
    this.subPaths = this.subPaths.concat(path2.subPaths);
  }

, fillPath: function(diameter) {
    var result = new Path();
    for(var i = -diameter/2; i > -1000; i -= diameter*0.75) {
      var offsetPath = this.offset(i);

      if(!offsetPath) {
        break;
      };

      result.addPath(offsetPath);
    }

    result = result.sort().connectEnds(diameter);

    return result;
  }

, connectEnds: function(diameter) {
    for(var i=this.subPaths.length-1; i > 0; --i) {
      var sp1 = this.subPaths[i-1];
      var sp2 = this.subPaths[i];

      var p1 = sp1.lastPoint();
      var p2 = sp2.firstPoint();
      var d = Point.distance(p1,p2);

      if(d < diameter*2) {
        sp1.lineTo(p2.x, p2.y);
        sp2.actions[0].action = Path.actions.LINE_TO;
        sp1.actions = sp1.actions.concat( sp2.actions );
        this.subPaths.splice(i,1);
      }
    }

    return this;
  }

, sort: function() { 
    if(this.subPaths.length === 0) return this;

    var copy = new Path();

    var p0 = this.subPaths[0].firstPoint();

    copy.subPaths = this.subPaths.sort(function(a, b) {
      var p1 = a.lastPoint();
      var p2 = b.firstPoint();

      var d1 = Point.distance(p1,p0);
      var d2 = Point.distance(p2,p0);

      // Moving target
      p0 = b.lastPoint();

      if(utils.sameFloat(d1,d2)) return 0;
      if(d1 < d2) return -1;
      if(d1 > d2) return 1;
    });

    return copy;
  }
}

var NON_ZERO = ClipperLib.PolyFillType.pftNonZero;
var EVEN_ODD = ClipperLib.PolyFillType.pftEvenOdd;
