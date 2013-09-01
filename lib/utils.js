var three = require('./three.custom');

var EPSILON = 0.0000000001;

module.exports = {
  /*
   * Convert start+end angle arc to start/end points.
   * */
  arcToPoints: function(center, astart, aend, radius) {
    // center = new three.Vector3(center.x, center.y, center.z);
    var x = center.x,
        y = center.y,
        a = new three.Vector3(), // start point
        b = new three.Vector3(); // end point

      a.x = radius * Math.cos(astart) + center.x
      a.y = radius * Math.sin(astart) + center.y

      b.x = radius * Math.cos(aend) + center.x
      b.y = radius * Math.sin(aend) + center.y

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

    center = new three.Vector2(center.x, center.y);
    start = new three.Vector2(start.x, start.y);
    end = new three.Vector2(end.x, end.y);

    var astart = Math.atan2(start.y - center.y, start.x - center.x),
        aend = Math.atan2(end.y - center.y, end.x - center.x),
        radius = start.clone().sub(center).length();

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
        && this.sameFloat(a.z, b.z);
  }
, squeeze: function() {
  }
};
