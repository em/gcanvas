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
, _ensure: function(x,y) {
    if(this.subPaths.length === 0) {
      this.moveTo(x,y);
    }
  }

, close: function() {
    if(!this.current) return false;
    this.current.close();
  }

/*
 * Pass all curves straight through
 * */
, lineTo: function(x,y) {
    this._ensure(x,y);
    this.current.lineTo.apply(this.current, arguments);
  }
, arc: function(x, y, rad,
									  astart, aend, ccw) {
    this.ellipse(x,y,rad,rad,astart,aend,ccw);
  }
, ellipse: function(x, y, xrad, yrad,
									  astart, aend, ccw) {

    var points = utils.arcToPoints(x, y,
                                   astart,
                                   aend,
                                   xrad);

    // this._ensure(points.start.x, points.start.y);
    
    if(!this.current || !utils.samePos(this.current.lastPoint(), points.start)) {
      this.lineTo(points.start.x, points.start.y);
    }

    this.current.ellipse.apply(this.current, arguments);
  }
, quadraticCurveTo: function() {
    this.current.quadraticCurveTo.apply(this.current, arguments);
  }
, bezierCurveTo: function() {
    this.current.bezierCurveTo.apply(this.current, arguments);
  }
, rect: function(x,y,w,h) {
    this.moveTo(x,y);
    this.lineTo(x+w,y);
    this.lineTo(x+w,y+h);
    this.lineTo(x,y+h);
    this.lineTo(x,y);
  }

, toPolys: function(scale,divisions) {
    if(!scale) throw 'NO SCALE!';

    return this.subPaths.map(function(subPath) {
      return subPath.toPoly(scale,divisions);
    });
  }
, fromPolys: function(polygons, scale) {
    if(!scale) throw 'NO SCALE!';

    this.subPaths = [];

    for(var i=0,l=polygons.length; i < l; ++i) {
      var subPath = new SubPath();
      subPath.fromPoly(polygons[i], scale);
      this.subPaths.push(subPath);
      this.current = subPath;
    }

    return this;
  }
, clip: function(clipRegion, clipType, divisions) {
    if(!clipRegion) return this;

    clipType = clipType || 0;

    var scale = 1000;

    // this.close();
    // clipRegion.close();

    var subjPolys = this.toPolys(scale, divisions);
    var clipPolys = clipRegion.toPolys(scale);

    // Clean both
    // var subjPolys = ClipperLib.Clipper.CleanPolygons(subjPolys, 1);
    // var clipPolys = ClipperLib.Clipper.CleanPolygons(clipPolys, 1);

    // var subjPolys = ClipperLib.Clipper.SimplifyPolygons(subjPolys, ClipperLib.PolyFillType.pftNonZero);

    // var clipPolys = ClipperLib.Clipper.SimplifyPolygons(clipPolys, ClipperLib.PolyFillType.pftNonZero);

    var cpr = new ClipperLib.Clipper();
    // cpr.PreserveCollinear = true;
    // cpr.ReverseSolution = true;

    cpr.AddPaths(subjPolys, ClipperLib.PolyType.ptSubject,true);
    cpr.AddPaths(clipPolys, ClipperLib.PolyType.ptClip, true);

    var clipped = [];
    cpr.Execute(clipType, clipped);

    var tmp;

    var path = new Path();
    path.fromPolys(clipped, scale);
    return path;
  }

, translate: function(x,y) {
    var result = new Path();
    this.subPaths.forEach(function(subPath) {
      var pts = subPath.getPoints();
      result.moveTo(pts[0].x+x, pts[0].y+y);
      pts.slice(1).forEach(function(p) {
        // p.x += x;
        // p.y += y;
        result.lineTo(p.x+x, p.y+y);
      });
    });
    return result;
  }

, clipToBounds: function(bounds) {
    var result = new Path();
    var p0 = new Point(0,0,0);
    var p0u = p0.clone();
    var p1u;

    this.subPaths.forEach(function(subPath) {
      var pts = subPath.getPoints();

      pts.forEach(function(p1, i) {
        p1 = p1.clone();
        p1u = p1.clone();

        // if(p1.y < bounds.top && p0.y < bounds.top) {
        //   return;
        // }
        // if(p1.x > bounds.right && p0.x > bounds.right) {
        //   return;
        // }

        if(p1.y < bounds.top) {
          var m = (p1.x - p0.x) / (p1.y - p0.y);
          p1.x += (m * (bounds.top - p1.y)) || 0;
          p1.y = bounds.top;


        }
        else if(p0u.y < bounds.top) {
          var m = (p1.x - p0u.x) / (p1.y - p0u.y);
          var x = (m * (bounds.top - p1.y)) || 0;

          result.moveTo(p1.x+x, bounds.top);
        }

        // if(p1.x < bounds.left) {
        //   var m = (p1.y - p0.y) / (p1.x - p0.x);
        //   p1.y += m * (bounds.left - p1.x);
        //   p1.x = bounds.left;
        // }
        // else if(p0u.x < bounds.left) {
        //   var m = (p1.y - p0u.y) / (p1.x - p0u.x);
        //   var y = m * (bounds.left - p1.x);
        //   // result.moveTo(bounds.left, bounds.top);
        // }

        if(p1.x > bounds.right) {
          var m = (p1.y - p0.y) / (p1.x - p0.x);
          p1.y += m * (bounds.right - p1.x);
          p1.x = bounds.right;

        }
        else if(p0u.x > bounds.right) {
       
          var m = (p1.y - p0u.y) / (p1.x - p0u.x);
          var y = m * (bounds.right - p1.x);

          // result.moveTo(bounds.right, p1.y-y);
        }


        if(i === 0)
          result.moveTo(p1.x, p1.y);
        else
          result.lineTo(p1.x, p1.y);
 
        p0 = p1;
        p0u = p1u;
      });
    });

    return result;
  }

, simplify: function(windingRule, divisions) {

    // Special case for single ellipse
    // just change the radius.
    // if(this.is('ellipse')) {
    //     var result = new Path();
    //     var args = this.subPaths[0].actions[1].args;

    //     result.ellipse(
    //       args[0],
    //       args[1],
    //       args[2],
    //       args[3],
    //       args[4],
    //       args[5],
    //       args[6]
    //     );

    //     return result;
    // }


    var scale = 1000;
    var polys = this.toPolys(scale, divisions); 
    var type = ClipperLib.PolyFillType.pftNonZero;

    if(windingRule === 'evenodd') {
      type = ClipperLib.PolyFillType.pftEvenOdd;
    }

    polys = ClipperLib.Clipper.SimplifyPolygons(polys, type);

    var result = new Path();
    result.fromPolys(polys, scale);

    return result;
  }

, is: function(action) {
    if(this.subPaths.length == 1
      && this.subPaths[0].actions.length == 2
      && this.subPaths[0].actions[1].action === action) {
        return true;
    }

    return false;
  }

, offset: function(delta, divisions) {
    if(delta === 0) {
      return this;
    }

    // Special case for single ellipse
    // just change the radius.
    if(this.is('ellipse')) {
        var result = new Path();
        var args = this.subPaths[0].actions[1].args;

        if(args[2] + delta < 0)
          return false;

        result.ellipse(
          args[0],
          args[1],
          args[2] + delta,
          args[3] + delta,
          args[4],
          args[5],
          args[6]
        );

        return result;
    }

    var scale = 1000;
    var cleandelta = 0.1;

    var polygons = this.toPolys(scale, divisions);

    // offset
    var miterLimit = 1000*scale;

    var co = new ClipperLib.ClipperOffset();
    // co.PreserveCollinear = true;
    // co.ReverseSolution = true;

    co.AddPaths(polygons, 
             ClipperLib.JoinType.jtMiter,
             ClipperLib.EndType.etClosedPolygon);

    var solution = [];

    try {
      co.Execute(solution, delta*scale);
    }
    catch(err) {
      return false;
    }


    if(!solution || solution.length === 0
      || solution[0].length === 0) return false;

    var result = new Path();
    result.fromPolys(solution, scale);

    result.close(); // Not sure why I need to do this now
    return result;
  }

, ramp: function(depth) {
  }

, addPath: function(path2) {
    this.subPaths = this.subPaths.concat(path2.subPaths);
  }

, estimateMaxOffset: function(divisions) {
    var bounds = this.getBounds();
    var width = Math.abs(bounds.right - bounds.left)
    var height = Math.abs(bounds.bottom - bounds.top)
    var lt = Math.min(width, height) / 2;

    var gt = 0;

    for(var i = 0; i < 5; ++i) {
      var test = gt+(lt-gt)/2;
      var offset = this.offset(-test,3);

      if(offset) {
        gt = test
      }
      else {
        lt = test;
      }
    }

    return {lt: lt, gt: gt};
  }

, fillPath: function(diameter, divisions) {
    var result = new Path();
    var overlap = Math.sin(Math.PI/4);

    // this.subPaths.forEach(function(sp) {
      // var path = sp.toPath();
      var path = this;

      var max = path.estimateMaxOffset(5).lt;
      max -= diameter/2; 

      for(var i = -max; i < -diameter/2; i += diameter*overlap) {
        var offsetPath = path.offset(i, divisions);
        if(!offsetPath) break;
        offsetPath = offsetPath.reverse();
        result.addPath(offsetPath);
      }

      // Finishing pass
      var finish = path.offset( -diameter/2, divisions );
      if(finish)
        result.addPath( finish.reverse() );
    // });

    return result;
  }

, connectEnds: function(diameter) {
    for(var i=this.subPaths.length-1; i > 0; --i) {
      var sp1 = this.subPaths[i-1];
      var sp2 = this.subPaths[i];

      var p1 = sp1.lastPoint();
      var nearest = sp2.nearestPoint(p1);
      var p2 = nearest.point;

      if(nearest.distance < diameter*2) {
        sp2 = sp2.shift(nearest.i);
        sp1.lineTo(p2.x, p2.y);
        sp2.actions[0].action = Path.actions.LINE_TO;
        sp1.actions = sp1.actions.concat( sp2.actions );
        this.subPaths.splice(i,1);
      }
    }

    return this;
  }

, reverse: function() {
    if(this.is('ellipse')) {
      var result = new Path();
      var args = this.subPaths[0].actions[1].args;

      result.ellipse(
        args[0],
        args[1],
        args[2],
        args[3],
        args[5], // end as start
        args[4], // start as end
        !args[6] // invert ccw
      );

      return result;
    }

    var result = new Path();

    result.subPaths = this.subPaths.map(function(sp) {
      return sp.reverse();
    }).reverse();

    return result;
  }

, sort: function() { 
    if(this.subPaths.length === 0) return this;

    var copy = new Path();

    var p0 = this.subPaths[0].lastPoint();

    copy.subPaths = this.subPaths.sort(function(a, b) {
      var p1 = a.lastPoint();
      var p2 = b.firstPoint();

      var d1 = Point.distance(p1,p0);
      var d2 = Point.distance(p2,p0);

      // Moving target
      p0 = b.lastPoint();

      if(d1 < d2) return -1;
      if(d1 > d2) return 1;

      return 0;
    });

    return copy;
  }

, firstPoint: function() {
    if(!this.current) return false;
    return this.subPaths[0].firstPoint();
  }

, lastPoint: function() {
    if(!this.current) return false;
    return this.subPaths[this.subPaths.length-1].lastPoint();
  }

, getPoints: function(divisions) {
    var pts = [];
    this.subPaths.forEach(function(sp) {
      pts.push.apply(pts, sp.getPoints(divisions));
    });
    return pts;
  }

, getBounds: function() {
    var pts = this.getPoints();
    var p0 = this.firstPoint();
    var res = {
      left: p0.x,
      top: p0.y,
      right: p0.x,
      bottom: p0.y
    };

    pts.forEach(function(p) {
      res.left = Math.min(res.left, p.x);
      res.top = Math.min(res.top, p.y);
      res.right = Math.max(res.right, p.x);
      res.bottom = Math.max(res.bottom, p.y);
    });

    return res;
  }
}

var NON_ZERO = ClipperLib.PolyFillType.pftNonZero;
var EVEN_ODD = ClipperLib.PolyFillType.pftEvenOdd;
