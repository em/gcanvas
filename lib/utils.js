var Point = require('./math/point');

var EPSILON = 0.000001;

module.exports = {
  /*
   * Convert start+end angle arc to start/end points.
   * */
  arcToPoints: function(x, y, astart, aend, radius) {
    astart = astart % (Math.PI*2);
    aend = aend % (Math.PI*2);

    var a = new Point(), // start point
        b = new Point(); // end point

    a.x = radius * Math.cos(astart) + x
    a.y = radius * Math.sin(astart) + y

    b.x = radius * Math.cos(aend) + x
    b.y = radius * Math.sin(aend) + y

    return {
      start: a,
      end: b
    };
  }

  /*
   * Convert start/end/center point arc to start/end angle arc.
   * ex:
   * */
, pointsToArc: function(center, start, end) {

    center = new Point(center.x, center.y);
    start = new Point(start.x, start.y);
    end = new Point(end.x, end.y);

    var astart = Math.atan2(start.y - center.y, start.x - center.x),
        aend = Math.atan2(end.y - center.y, end.x - center.x),
        radius = center.sub(start).magnitude();

    // Always assume a full circle
    // if they are the same 
    // Handling of 0,0 optimized in the usage
    if(aend === astart) {
      aend += Math.PI*2;
    }

    return {
      start: astart
    , end: aend
    , radius: radius 
    }
  }

  /*
  * Given an angle in radians, will return an equivalent angle between
  * [-pi, pi]
  * We have to work around Javascript's STUPID modulo bug: -2 % 3 is not -2,
  * it is 1. That's why we're calling modulo twice.
  * */
, normalizeAngle: function(angle) {
    var a = angle + Math.PI;
    return (a%(2*Math.PI) + 2*Math.PI) % (2*Math.PI) - Math.PI;
  }

, sameFloat: function(a, b, epsilon) {

    if(Math.abs(a-b) < EPSILON)
      return true;

		var absA = Math.abs(a)
      , absB = Math.abs(b)
      , diff = Math.abs(a - b)

    epsilon = epsilon || EPSILON;

		if (a == b) { // shortcut, handles infinities
			return true;
		} else if (a == 0 || b == 0 || diff < Number.MIN_VALUE) {
			// a or b is zero or both are extremely close to it
			// relative error is less meaningful here
			return diff < (epsilon * Number.MIN_VALUE);
		} else { // use relative error
			return diff / (absA + absB) < epsilon;
		}
	}
, samePos: function(a, b) {
    return this.sameFloat(a.x, b.x)
        && this.sameFloat(a.y, b.y)
        && this.sameFloat(a.z, b.z)
        && this.sameFloat(a.a, b.a);
  }
, squeeze: function() {
  }
, spiral: function(divisions,r0,r1,loops,start,ccw,callback) {
    if(loops == 0 || loops == Infinity) {
      if(loops)
        debugger;
      return start;
    }

    // var divisions = 40;
    var end = Math.abs(loops) * divisions * 2;
    var delta = r1-r0;
    var pitch = divisions/end*delta;
    var a = r0;
    var b = pitch/Math.PI;
    var stepAngle = Math.PI/divisions;
    start = start || 0;
    var x,y,t;
    var angle;

    for(var i = 1; i < end; i++) {
      angle = stepAngle * i;
      if(ccw) {
        x = (a + b * angle) * Math.sin(angle+start);
        y = (a + b * angle) * Math.cos(angle+start);
      }
      else {
        x = (a + b * angle) * Math.cos(angle+start);
        y = (a + b * angle) * Math.sin(angle+start);
      }

      t = i/end; 

      var proceed = callback(x, y, t);
      if(proceed === false) {
        break;
      }
    }

    return angle+start;
  }
};
