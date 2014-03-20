module.exports = Point;

function Point(x,y,z,a) {
  this.x = x;
  this.y = y;
  this.z = z;
  this.a = a;
};

Point.prototype = {
  clone: function() {
    return new Point(this.x,this.y);
  },

  round: function() {
    return new Point(Math.round(this.x),Math.round(this.y));
  },

  each: function(f) {
    return new Point(f(this.x),f(this.y));
  },

  /**
   * Check whether two points are equal. The x and y values must be exactly
   * equal for this method to return true.
   * @name equal
   * @methodOf Point#
   *
   * @param {Point} other The point to check for equality.
   * @returns true if this point is equal to the other point, false
   * otherwise.
   * @type Boolean
   */
  equal: function(other) {
    return this.x === other.x && this.y === other.y;
  },
  /**
   * Adds a point to this one and returns the new point.
   * @name add
   * @methodOf Point#
   *
   * @param {Point} other The point to add this point to.
   * @returns A new point, the sum of both.
   * @type Point
   */
  add: function(other) {
    return new Point(this.x + other.x, this.y + other.y);
  },
  /**
   * Subtracts a point from this one and returns the new point.
   * @name sub
   * @methodOf Point#
   *
   * @param {Point} other The point to subtract from this point.
   * @returns A new point, the difference of both.
   * @type Point
   */
  sub: function(other) {
    return new Point(this.x - other.x, this.y - other.y);
  },
  /**
   * Multiplies this point by a scalar value and returns the new point.
   * @name scale
   * @methodOf Point#
   *
   * @param {Point} scalar The value to scale this point by.
   * @returns A new point with x and y multiplied by the scalar value.
   * @type Point
   */
  scale: function(scalar) {
    return new Point(this.x * scalar, this.y * scalar);
  },

  /**
   * Returns the distance of this point from the origin. If this point is
   * thought of as a vector this distance is its magnitude.
   * @name magnitude
   * @methodOf Point#
   *
   * @returns The distance of this point from the origin.
   * @type Number
   */
  magnitude: function(/* newMagnitude */) {
    if(arguments[0] === undefined) 
      return Math.sqrt(this.x*this.x + this.y*this.y);

    return this.toUnit().multiply(arguments[0]);
  },
  
  multiply: function(d) {
    return new Point(this.x * d, this.y * d);
  },

  normalize: function() {
    return this.multiply(1/this.magnitude());
  },

  set: function(x,y) {
    this.x = x;
    this.y = y;
  },

  dot: function(other) {
    return this.x * other.x + this.y * other.y;
  }, 

  translate: function(x,y) {
    return new Point(this.x + x, this.y + y);
  }, 


  rotate: function(a) {
    // Return a new vector that's a copy of this vector rotated by a radians
    return new Vector(this.x * Math.cos(a) - this.y*Math.sin(a),
                    this.x * Math.sin(a) + this.y*Math.cos(a));
  },


  angleTo: function(other) {
    return Math.acos(this.dot(other) / (Math.abs(this.dist()) * Math.abs(other.dist())));
  },

  toUnit: function() {
    return this.multiply(1/this.magnitude());
  }
};


/**
 * @param {Point} p1
 * @param {Point} p2
 * @returns The Euclidean distance between two points.
 */
Point.distance = function(p1, p2) {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

/**
 * If you have two dudes, one standing at point p1, and the other
 * standing at point p2, then this method will return the direction
 * that the dude standing at p1 will need to face to look at p2.
 * @param {Point} p1 The starting point.
 * @param {Point} p2 The ending point.
 * @returns The direction from p1 to p2 in radians.
 */
Point.direction = function(p1, p2) {
  return Math.atan2(
    p2.y - p1.y,
    p2.x - p1.x
  );
};
