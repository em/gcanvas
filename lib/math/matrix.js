module.exports = Matrix;

var Point = require('./point');

/**
 * <pre>
 *  _        _
 * | a  c tx  |
 * | b  d ty  |
 * |_0  0  1 _|
 * </pre>
 * Creates a matrix for 2d affine transformations.
 *
 * concat, inverse, rotate, scale and translate return new matrices with the
 * transformations applied. The matrix is not modified in place.
 *
 * Returns the identity matrix when called with no arguments.
 * @name Matrix
 * @param {Number} [a]
 * @param {Number} [b]
 * @param {Number} [c]
 * @param {Number} [d]
 * @param {Number} [tx]
 * @param {Number} [ty]
 * @constructor
 */
function Matrix(a, b, c, d, tx, ty) {
  this.a = a !== undefined ? a : 1;
  this.b = b || 0;
  this.c = c || 0;
  this.d = d !== undefined ? d : 1;
  this.tx = tx || 0;
  this.ty = ty || 0;
}

Matrix.prototype = {

  clone: function() {
    return new Matrix(
      this.a,
      this.b,
      this.c,
      this.d,
      this.tx,
      this.ty
    );
  },

  /**
   * Returns the result of this matrix multiplied by another matrix
   * combining the geometric effects of the two. In mathematical terms, 
   * concatenating two matrixes is the same as combining them using matrix multiplication.
   * If this matrix is A and the matrix passed in is B, the resulting matrix is A x B
   * http://mathworld.wolfram.com/MatrixMultiplication.html
   * @name concat
   * @methodOf Matrix#
   *
   * @param {Matrix} matrix The matrix to multiply this matrix by.
   * @returns The result of the matrix multiplication, a new matrix.
   * @type Matrix
   */
  concat: function(matrix) {
    return new Matrix(
      this.a * matrix.a + this.c * matrix.b,
      this.b * matrix.a + this.d * matrix.b,
      this.a * matrix.c + this.c * matrix.d,
      this.b * matrix.c + this.d * matrix.d,
      this.a * matrix.tx + this.c * matrix.ty + this.tx,
      this.b * matrix.tx + this.d * matrix.ty + this.ty
    );
  },

  /**
   * Given a point in the pretransform coordinate space, returns the coordinates of 
   * that point after the transformation occurs. Unlike the standard transformation 
   * applied using the transformnew Point() method, the deltaTransformnew Point() method's 
   * transformation does not consider the translation parameters tx and ty.
   * @name deltaTransformPoint
   * @methodOf Matrix#
   * @see #transformPoint
   *
   * @return A new point transformed by this matrix ignoring tx and ty.
   * @type Point
   */
  deltaTransformPoint: function(point) {
    return new Point(
      this.a * point.x + this.c * point.y,
      this.b * point.x + this.d * point.y
    );
  },

  /**
   * Returns the inverse of the matrix.
   * http://mathworld.wolfram.com/MatrixInverse.html
   * @name inverse
   * @methodOf Matrix#
   *
   * @returns A new matrix that is the inverse of this matrix.
   * @type Matrix
   */
  inverse: function() {
    var determinant = this.a * this.d - this.b * this.c;
    return new Matrix(
      this.d / determinant,
      -this.b / determinant,
      -this.c / determinant,
      this.a / determinant,
      (this.c * this.ty - this.d * this.tx) / determinant,
      (this.b * this.tx - this.a * this.ty) / determinant
    );
  },

  /**
   * Returns a new matrix that corresponds this matrix multiplied by a
   * a rotation matrix.
   * @name rotate
   * @methodOf Matrix#
   * @see Matrix.rotation
   *
   * @param {Number} theta Amount to rotate in radians.
   * @param {Point} [aboutPoint] The point about which this rotation occurs. Defaults to (0,0).
   * @returns A new matrix, rotated by the specified amount.
   * @type Matrix
   */
  rotate: function(theta, aboutPoint) {
    return this.concat(Matrix.rotation(theta, aboutPoint));
  },

  /**
   * Returns a new matrix that corresponds this matrix multiplied by a
   * a scaling matrix.
   * @name scale
   * @methodOf Matrix#
   * @see Matrix.scale
   *
   * @param {Number} sx
   * @param {Number} [sy]
   * @param {Point} [aboutPoint] The point that remains fixed during the scaling
   * @type Matrix
   */
  scale: function(sx, sy, aboutPoint) {
    return this.concat(Matrix.scale(sx, sy, aboutPoint));
  },

  /**
   * Returns the result of applying the geometric transformation represented by the 
   * Matrix object to the specified point.
   * @name transformPoint
   * @methodOf Matrix#
   * @see #deltaTransformPoint
   *
   * @returns A new point with the transformation applied.
   * @type Point
   */
  transformPoint: function(point) {
    return new Point(
      this.a * point.x + this.c * point.y + this.tx,
      this.b * point.x + this.d * point.y + this.ty
    );
  },

  /**
   * Translates the matrix along the x and y axes, as specified by the tx and ty parameters.
   * @name translate
   * @methodOf Matrix#
   * @see Matrix.translation
   *
   * @param {Number} tx The translation along the x axis.
   * @param {Number} ty The translation along the y axis.
   * @returns A new matrix with the translation applied.
   * @type Matrix
   */
  translate: function(tx, ty) {
    return this.concat(Matrix.translation(tx, ty));
  }
};

/**
 * Creates a matrix transformation that corresponds to the given rotation,
 * around (0,0) or the specified point.
 * @see Matrix#rotate
 *
 * @param {Number} theta Rotation in radians.
 * @param {Point} [aboutPoint] The point about which this rotation occurs. Defaults to (0,0).
 * @returns 
 * @type Matrix
 */
Matrix.rotation = function(theta, aboutPoint) {
  var rotationMatrix = new Matrix(
    Math.cos(theta),
    Math.sin(theta),
    -Math.sin(theta),
    Math.cos(theta)
  );

  if(aboutPoint) {
    rotationMatrix =
      Matrix.translation(aboutPoint.x, aboutPoint.y).concat(
        rotationMatrix
      ).concat(
        Matrix.translation(-aboutPoint.x, -aboutPoint.y)
      );
  }

  return rotationMatrix;
};

/**
 * Returns a matrix that corresponds to scaling by factors of sx, sy along
 * the x and y axis respectively.
 * If only one parameter is given the matrix is scaled uniformly along both axis.
 * If the optional aboutPoint parameter is given the scaling takes place
 * about the given point.
 * @see Matrix#scale
 *
 * @param {Number} sx The amount to scale by along the x axis or uniformly if no sy is given.
 * @param {Number} [sy] The amount to scale by along the y axis.
 * @param {Point} [aboutPoint] The point about which the scaling occurs. Defaults to (0,0).
 * @returns A matrix transformation representing scaling by sx and sy.
 * @type Matrix
 */
Matrix.scale = function(sx, sy, aboutPoint) {
  sy = sy || sx;

  var scaleMatrix = new Matrix(sx, 0, 0, sy);

  if(aboutPoint) {
    scaleMatrix =
      Matrix.translation(aboutPoint.x, aboutPoint.y).concat(
        scaleMatrix
      ).concat(
        Matrix.translation(-aboutPoint.x, -aboutPoint.y)
      );
  }

  return scaleMatrix;
};

/**
 * Returns a matrix that corresponds to a translation of tx, ty.
 * @see Matrix#translate
 *
 * @param {Number} tx The amount to translate in the x direction.
 * @param {Number} ty The amount to translate in the y direction.
 * @return A matrix transformation representing a translation by tx and ty.
 * @type Matrix
 */
Matrix.translation = function(tx, ty) {
  return new Matrix(1, 0, 0, 1, tx, ty);
};

/**
 * A constant representing the identity matrix.
 * @name IDENTITY
 * @fieldOf Matrix
 */
Matrix.IDENTITY = new Matrix();
/**
 * A constant representing the horizontal flip transformation matrix.
 * @name HORIZONTAL_FLIP
 * @fieldOf Matrix
 */
Matrix.HORIZONTAL_FLIP = new Matrix(-1, 0, 0, 1);
/**
 * A constant representing the vertical flip transformation matrix.
 * @name VERTICAL_FLIP
 * @fieldOf Matrix
 */
Matrix.VERTICAL_FLIP = new Matrix(1, 0, 0, -1);
