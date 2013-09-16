module.exports = Vector;

function Vector(x, y) {
  this.x = x;
  this.y = y;
  this.hold = 0;
}

Vector.prototype.set = function(x, y) {
  this.x = x;
  this.y = y;
};

Vector.prototype.add = function(other) {
  // Return a copy of this added to other
  return new Vector(this.x + other.x, this.y + other.y);
};

Vector.prototype.sub = function(other) {
  return new Vector(this.x - other.x, this.y - other.y);
};

Vector.prototype.multiply = function(d) {
  return new Vector(this.x * d, this.y * d);
};

Vector.prototype.dot = function(other) {
  // Returns the dot product of this against the other
  return this.x * other.x + this.y * other.y;
};

Vector.prototype.distance = function() {
  if (typeof arguments[0] == 'undefined') {
    return Math.sqrt(this.x*this.x + this.y*this.y);
  } else {
    return this.toUnit().multiply(arguments[0]);
  }
};

Vector.prototype.toUnit = function() {
  // Returns a unit vector of us
  return this.multiply(1/this.distance());
};


Vector.prototype.angleTo = function(other) {
  // Dot product of A, B = |A||
  // => cos(θ) = D ÷ (|A||B|)
  // => θ = acos(D ÷ (|A||B|))
  return Math.acos(this.dot(other) / (Math.abs(this.dist()) * Math.abs(other.dist())));
};

Vector.prototype.clone = function() {
  // Return a copy of this vector
  return new Vector(this.x, this.y);
};

Vector.prototype.rotated = function(a) {
  // Return a new vector that's a copy of this vector rotated by a radians
  return new Vector(this.x * Math.cos(a) - this.y*Math.sin(a),
                    this.x * Math.sin(a) + this.y*Math.cos(a));
};

Vector.prototype.projectedOn = function(other) {
  // Return a copy of ourselves projected to another vector. This vector will
  // have other's direction, but the correct length.
  var u = other.toUnit();
  return u.dist(this, u);
};
