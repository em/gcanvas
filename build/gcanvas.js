;(function(){

/**
 * Require the given path.
 *
 * @param {String} path
 * @return {Object} exports
 * @api public
 */

function require(path, parent, orig) {
  var resolved = require.resolve(path);

  // lookup failed
  if (null == resolved) {
    orig = orig || path;
    parent = parent || 'root';
    var err = new Error('Failed to require "' + orig + '" from "' + parent + '"');
    err.path = orig;
    err.parent = parent;
    err.require = true;
    throw err;
  }

  var module = require.modules[resolved];

  // perform real require()
  // by invoking the module's
  // registered function
  if (!module.exports) {
    module.exports = {};
    module.client = module.component = true;
    module.call(this, module.exports, require.relative(resolved), module);
  }

  return module.exports;
}

/**
 * Registered modules.
 */

require.modules = {};

/**
 * Registered aliases.
 */

require.aliases = {};

/**
 * Resolve `path`.
 *
 * Lookup:
 *
 *   - PATH/index.js
 *   - PATH.js
 *   - PATH
 *
 * @param {String} path
 * @return {String} path or null
 * @api private
 */

require.resolve = function(path) {
  if (path.charAt(0) === '/') path = path.slice(1);

  var paths = [
    path,
    path + '.js',
    path + '.json',
    path + '/index.js',
    path + '/index.json'
  ];

  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];
    if (require.modules.hasOwnProperty(path)) return path;
    if (require.aliases.hasOwnProperty(path)) return require.aliases[path];
  }
};

/**
 * Normalize `path` relative to the current path.
 *
 * @param {String} curr
 * @param {String} path
 * @return {String}
 * @api private
 */

require.normalize = function(curr, path) {
  var segs = [];

  if ('.' != path.charAt(0)) return path;

  curr = curr.split('/');
  path = path.split('/');

  for (var i = 0; i < path.length; ++i) {
    if ('..' == path[i]) {
      curr.pop();
    } else if ('.' != path[i] && '' != path[i]) {
      segs.push(path[i]);
    }
  }

  return curr.concat(segs).join('/');
};

/**
 * Register module at `path` with callback `definition`.
 *
 * @param {String} path
 * @param {Function} definition
 * @api private
 */

require.register = function(path, definition) {
  require.modules[path] = definition;
};

/**
 * Alias a module definition.
 *
 * @param {String} from
 * @param {String} to
 * @api private
 */

require.alias = function(from, to) {
  if (!require.modules.hasOwnProperty(from)) {
    throw new Error('Failed to alias "' + from + '", it does not exist');
  }
  require.aliases[to] = from;
};

/**
 * Return a require function relative to the `parent` path.
 *
 * @param {String} parent
 * @return {Function}
 * @api private
 */

require.relative = function(parent) {
  var p = require.normalize(parent, '..');

  /**
   * lastIndexOf helper.
   */

  function lastIndexOf(arr, obj) {
    var i = arr.length;
    while (i--) {
      if (arr[i] === obj) return i;
    }
    return -1;
  }

  /**
   * The relative require() itself.
   */

  function localRequire(path) {
    var resolved = localRequire.resolve(path);
    return require(resolved, parent, path);
  }

  /**
   * Resolve relative to the parent.
   */

  localRequire.resolve = function(path) {
    var c = path.charAt(0);
    if ('/' == c) return path.slice(1);
    if ('.' == c) return require.normalize(p, path);

    // resolve deps by returning
    // the dep in the nearest "deps"
    // directory
    var segs = parent.split('/');
    var i = lastIndexOf(segs, 'deps') + 1;
    if (!i) i = 0;
    path = segs.slice(0, i + 1).join('/') + '/deps/' + path;
    return path;
  };

  /**
   * Check if module is defined at `path`.
   */

  localRequire.exists = function(path) {
    return require.modules.hasOwnProperty(localRequire.resolve(path));
  };

  return localRequire;
};
require.register("gcanvas/index.js", Function("exports, require, module",
"module.exports = require('./lib/gcanvas')\n\
//@ sourceURL=gcanvas/index.js"
));
require.register("gcanvas/lib/gcanvas.js", Function("exports, require, module",
"module.exports = GCanvas;\n\
\n\
var Path = require('./path')\n\
  , Motion = require('./motion')\n\
  , GcodeDriver = require('./drivers/gcode')\n\
  , Point = require('./math/point')\n\
  , Matrix = require('./math/matrix')\n\
  , ClipperLib = require('./clipper')\n\
  , Font = require('./font')\n\
  , parseFont = require('./parsefont')\n\
  , utils = require('./utils');\n\
\n\
function GCanvas(driver, width, height) {\n\
  this.canvas = {\n\
    width: width,\n\
    height: height\n\
  };\n\
\n\
  this.font = \"7pt Helvetiker\";\n\
  this.matrix = new Matrix();\n\
  this.rotation = 0; \n\
  this.depth = 0;\n\
  this.depthOfCut = 0;\n\
  this.top = 0;\n\
  this.aboveTop = 0;\n\
  this.toolDiameter = 5;\n\
  this.strokeAlign = 'center';\n\
  this.driver = driver || new GcodeDriver();\n\
  this.stack = [];\n\
  this.motion = new Motion(this);\n\
\n\
  this.beginPath();\n\
}\n\
\n\
GCanvas.prototype = {\n\
  save: function() {\n\
    this.stack.push({\n\
      matrix: this.matrix.clone(),\n\
      rotation: this.rotation\n\
    });\n\
  }\n\
, restore: function() {\n\
    var prev = this.stack.pop();\n\
    if(!prev) return;\n\
    this.matrix = prev.matrix;\n\
    this.rotation = prev.rotation;\n\
  }\n\
, beginPath: function() {\n\
    this.prevSubPaths = this.subPaths;\n\
    this.path = new Path();\n\
    this.subPaths = [this.path];\n\
  }\n\
, _restorePath: function() {\n\
    this.subPaths = this.prevSubPaths;\n\
    this.path = this.subPaths[this.subPaths.length-1] || new Path();\n\
  }\n\
, rotate: function(angle) {\n\
    this.matrix = this.matrix.rotate(angle);\n\
  }\n\
, translate: function(x,y) {\n\
    this.matrix = this.matrix.translate(x,y);\n\
  }\n\
, scale: function(x,y) {\n\
    this.matrix = this.matrix.scale(x,y);\n\
  }\n\
  // TODO: clean up\n\
, _transformPoint: function(a, i) {\n\
    i = i || 0;\n\
    if(a.length) {\n\
      var v = new Point(a[i], a[i+1]);\n\
      v = this.matrix.transformPoint(v);\n\
      a[i] = v.x; \n\
      a[i+1] = v.y; \n\
    }\n\
    else if(a.x) {\n\
      var v = new Point(a.x, a.y);\n\
      v = this.matrix.transformPoint(v);\n\
      a.x = v.x; \n\
      a.y = v.y; \n\
    }\n\
  }\n\
, _ensurePath: function(x,y) {\n\
    if(this.path.actions.length === 0) {\n\
      this.path.moveTo(x,y);\n\
    }\n\
  }\n\
, moveTo: function(x,y) {\n\
    this._transformPoint(arguments);\n\
    this.path = new Path();\n\
    this.path.moveTo(x,y);\n\
    this.subPaths.push( this.path );\n\
  }\n\
, lineTo: function(x,y) {\n\
    this._transformPoint(arguments);\n\
    this._ensurePath(x,y);\n\
    this.path.lineTo(x,y);\n\
  }\n\
, arc: function (x, y, radius,\n\
\t\t\t\t\t\t\t\t\t  aStartAngle,\n\
                    aEndAngle,\n\
                    aClockwise ) {\n\
    // In the conversion to points we lose the distinction\n\
    // between 0 and pi2 so we must optimize out 0 here \n\
    // or else they will be treated as full circles.\n\
    if(aStartAngle - aEndAngle === 0) {\n\
      return;\n\
    }\n\
\n\
    // See portal2 example\n\
    if(aEndAngle-aStartAngle === -Math.PI*2)\n\
      aEndAngle = Math.PI*2;\n\
\n\
    var center = new Point(x, y, 0);\n\
    var points = utils.arcToPoints(center,\n\
                                   aStartAngle,\n\
                                   aEndAngle,\n\
                                   radius);\n\
    // center.applyMatrix(this.matrix);\n\
    this._transformPoint(center);\n\
    this._transformPoint(points.start);\n\
    this._transformPoint(points.end);\n\
\n\
    var res = utils.pointsToArc(center,\n\
                                points.start,\n\
                                points.end);\n\
\n\
    this._ensurePath(points.start.x, points.start.y);\n\
    this.path.arc(center.x, center.y, res.radius, res.start, res.end, aClockwise);\n\
  }\n\
, bezierCurveTo: function( aCP1x, aCP1y,\n\
                           aCP2x, aCP2y,\n\
                           aX, aY ) {\n\
\n\
    this._transformPoint(arguments, 0);\n\
    this._transformPoint(arguments, 2);\n\
    this._transformPoint(arguments, 4);\n\
\n\
    this.path.bezierCurveTo.apply(this.path, arguments);\n\
  }\n\
\n\
, quadraticCurveTo: function( aCPx, aCPy, aX, aY ) {\n\
    this._transformPoint(arguments, 0);\n\
    this._transformPoint(arguments, 2);\n\
\n\
    this.path.quadraticCurveTo.apply(this.path, arguments);\n\
  }\n\
\n\
, _offsetStroke: function(delta) {\n\
    // Much much faster followPath if no offset\n\
    if(delta === 0) {\n\
      this.motion.followPath(this.subPaths);\n\
      return;\n\
    }\n\
\n\
    var cpr = new ClipperLib.Clipper();\n\
    var polygons = [];\n\
    this.subPaths.forEach(function(path) {\n\
      if(path.actions.length !== 0)\n\
        polygons.push( path.getPoints(40).map(function(p) {\n\
          return {X: p.x, Y: p.y};\n\
        }) );\n\
    });\n\
\n\
    function path2poly(paths) {\n\
      var poly = [];\n\
      paths.forEach(function(path) {\n\
        if(path.actions.length !== 0)\n\
          poly.push( path.getPoints(40).map(function(p) {\n\
            return {X: p.x, Y: p.y};\n\
          }) );\n\
      }); \n\
      return poly;\n\
    }\n\
\n\
    polygons = ClipperLib.Clean(polygons, cleandelta * scale);\n\
    polygons = cpr.SimplifyPolygons(polygons, ClipperLib.PolyFillType.pftNonZero);\n\
    cpr.AddPolygons(polygons, ClipperLib.PolyType.ptSubject);\n\
\n\
    if(this.clipRegion) {\n\
      var cpr = new ClipperLib.Clipper();\n\
      var subject_fillType = 1;\n\
      var clip_fillType = 1;\n\
      var clip_polygons = path2poly(this.clipRegion);\n\
      var clipType = 0;\n\
      cpr.AddPolygons(polygons, ClipperLib.PolyType.ptSubject);\n\
      cpr.AddPolygons(clip_polygons, ClipperLib.PolyType.ptClip);\n\
      var result = [];\n\
      var succeeded = cpr.Execute(clipType, result, subject_fillType, clip_fillType);\n\
      polygons = result;\n\
    }\n\
\n\
    scaleup(polygons, 1000);\n\
\n\
    delta *= 1000;\n\
\n\
    var scale = 1;\n\
    var cleandelta = 0.1; // 0.1 should be the appropriate delta in different cases\n\
\n\
    // var joinType = ClipperLib.JoinType.jtSquare;\n\
    var joinType = 2;\n\
    var miterLimit = 10;\n\
    var AutoFix = true;\n\
\n\
    var offsetted_polygon = cpr.OffsetPolygons(polygons, delta, joinType, miterLimit, AutoFix);\n\
\n\
    scaleup(offsetted_polygon, 1/1000);\n\
\n\
    function scaleup(poly, scale) {\n\
      var i, j;\n\
      if (!scale) scale = 1;\n\
      for(i = 0; i < poly.length; i++) {\n\
        for(j = 0; j < poly[i].length; j++) {\n\
          poly[i][j].X *= scale;\n\
          poly[i][j].Y *= scale;\n\
        }\n\
      }\n\
      return poly;\n\
    }\n\
\n\
    // converts polygons to SVG path string\n\
    function polys2path (poly, scale) {\n\
      var path = new Path(), i, j;\n\
      if (!scale) scale = 1;\n\
      for(i = 0; i < poly.length; i++) {\n\
        path.moveTo(poly[i][0].X, poly[i][0].Y);\n\
\n\
        for(j = 1; j < poly[i].length; j++){\n\
          path.lineTo(poly[i][j].X, poly[i][j].Y);\n\
        }\n\
\n\
        path.lineTo(poly[i][0].X, poly[i][0].Y);\n\
      }\n\
      // console.log(path);\n\
      return path;\n\
    }\n\
\n\
    // console.log(offsetted_polygon);\n\
\n\
    if(offsetted_polygon.length === 0\n\
      || offsetted_polygon[0].length === 0) return true;\n\
\n\
    this.motion.followPath(polys2path(offsetted_polygon));\n\
  }\n\
, clip: function() {\n\
    this.clipRegion = this.subPaths.slice(0,-1);\n\
    this.clipRegion.push(this.path.clone());\n\
  }\n\
, fill: function() {\n\
    this.layers(function() {\n\
      for(var i = - this.toolDiameter/2; i > -1000; i -= this.toolDiameter*0.75) {\n\
        var done = this._offsetStroke(i);\n\
        if(done) return;\n\
      }\n\
    });\n\
  }\n\
, rect: function(x,y,w,h) {\n\
    this.moveTo(x,y);\n\
    this.lineTo(x+w,y);\n\
    this.lineTo(x+w,y+h);\n\
    this.lineTo(x,y+h);\n\
    this.lineTo(x,y);\n\
  }\n\
, fillRect: function(x,y,w,h) { \n\
    this.beginPath();\n\
    this.rect.apply(this, arguments);\n\
    this.fill();\n\
  }\n\
, measureText: function(text) {\n\
    // Removed until I have cleaner way to do it\n\
  }\n\
, stroke: function() {\n\
    var offset = 0;\n\
    if(this.strokeAlign === 'outset') {\n\
      offset = this.toolDiameter;\n\
    }\n\
    if(this.strokeAlign === 'inset') {\n\
      offset = -this.toolDiameter;\n\
    }\n\
\n\
    this.layers(function() {\n\
      // _offsetStroke optimizes 0 offset for us\n\
      this._offsetStroke(offset);\n\
    });\n\
  }\n\
  \n\
, layers: function(fn) {\n\
    if(this.depth <= this.depthOfCut || !this.depthOfCut) {\n\
      this.motion.targetDepth = this.depth;\n\
      fn.call(this);\n\
      return;\n\
    }\n\
\n\
    var start = this.top + this.depthOfCut;\n\
\n\
    for(var depth=start;\n\
        depth <= this.top+this.depth;\n\
        depth += this.depthOfCut) {\n\
      // Clip to actual depth\n\
      depth = Math.min(depth, this.top+this.depth);\n\
      // Set new target depth in motion\n\
      this.motion.targetDepth = depth;\n\
      // Run the callback\n\
      fn.call(this);\n\
    }\n\
  }\n\
, fillText: function(text, x, y, params) {\n\
      var fontProps = parseFont(this.font);\n\
      var font = new Font(fontProps);\n\
\n\
      this.beginPath();\n\
      this.save();\n\
      this.translate(x, y);\n\
      font.drawText(this, text);\n\
      this.fill();\n\
\n\
      this.restore();\n\
  }\n\
\n\
, strokeText: function(text, x, y, params) {\n\
    this.layers(function() {\n\
      var fontProps = parseFont(this.font);\n\
      var font = new Font(fontProps);\n\
\n\
      this.beginPath();\n\
      this.save();\n\
      this.translate(x, y);\n\
      font.drawText(this, text);\n\
      this.stroke();\n\
      this.restore();\n\
      this._restorePath();\n\
    });\n\
  }\n\
};\n\
\n\
GCanvas.Filter = require('./drivers/filter');\n\
GCanvas.Simulator = require('./drivers/simulator');\n\
GCanvas.GcodeDriver = GcodeDriver;\n\
\n\
var helvetiker = require('./fonts/helvetiker_regular.typeface');\n\
Font.load(helvetiker);\n\
//@ sourceURL=gcanvas/lib/gcanvas.js"
));
require.register("gcanvas/lib/math/point.js", Function("exports, require, module",
"module.exports = Point;\n\
\n\
function Point(x,y,z) {\n\
  this.x = x;\n\
  this.y = y;\n\
  this.z = z;\n\
};\n\
\n\
Point.prototype = {\n\
  clone: function() {\n\
    return new Point(this.x,this.y);\n\
  },\n\
\n\
  round: function() {\n\
    return new Point(Math.round(this.x),Math.round(this.y));\n\
  },\n\
\n\
  each: function(f) {\n\
    return new Point(f(this.x),f(this.y));\n\
  },\n\
\n\
  /**\n\
   * Check whether two points are equal. The x and y values must be exactly\n\
   * equal for this method to return true.\n\
   * @name equal\n\
   * @methodOf Point#\n\
   *\n\
   * @param {Point} other The point to check for equality.\n\
   * @returns true if this point is equal to the other point, false\n\
   * otherwise.\n\
   * @type Boolean\n\
   */\n\
  equal: function(other) {\n\
    return this.x === other.x && this.y === other.y;\n\
  },\n\
  /**\n\
   * Adds a point to this one and returns the new point.\n\
   * @name add\n\
   * @methodOf Point#\n\
   *\n\
   * @param {Point} other The point to add this point to.\n\
   * @returns A new point, the sum of both.\n\
   * @type Point\n\
   */\n\
  add: function(other) {\n\
    return new Point(this.x + other.x, this.y + other.y);\n\
  },\n\
  /**\n\
   * Subtracts a point from this one and returns the new point.\n\
   * @name sub\n\
   * @methodOf Point#\n\
   *\n\
   * @param {Point} other The point to subtract from this point.\n\
   * @returns A new point, the difference of both.\n\
   * @type Point\n\
   */\n\
  sub: function(other) {\n\
    return new Point(this.x - other.x, this.y - other.y);\n\
  },\n\
  /**\n\
   * Multiplies this point by a scalar value and returns the new point.\n\
   * @name scale\n\
   * @methodOf Point#\n\
   *\n\
   * @param {Point} scalar The value to scale this point by.\n\
   * @returns A new point with x and y multiplied by the scalar value.\n\
   * @type Point\n\
   */\n\
  scale: function(scalar) {\n\
    return new Point(this.x * scalar, this.y * scalar);\n\
  },\n\
\n\
  /**\n\
   * Returns the distance of this point from the origin. If this point is\n\
   * thought of as a vector this distance is its magnitude.\n\
   * @name magnitude\n\
   * @methodOf Point#\n\
   *\n\
   * @returns The distance of this point from the origin.\n\
   * @type Number\n\
   */\n\
  magnitude: function(/* newMagnitude */) {\n\
    if(arguments[0] === undefined) \n\
      return Math.sqrt(this.x*this.x + this.y*this.y);\n\
\n\
    return this.toUnit().multiply(arguments[0]);\n\
  },\n\
  \n\
  multiply: function(d) {\n\
    return new Point(this.x * d, this.y * d);\n\
  },\n\
\n\
  normalize: function() {\n\
    return this.multiply(1/this.magnitude());\n\
  },\n\
\n\
  set: function(x,y) {\n\
    this.x = x;\n\
    this.y = y;\n\
  },\n\
\n\
  dot: function(other) {\n\
    return this.x * other.x + this.y * other.y;\n\
  }, \n\
\n\
  translate: function(x,y) {\n\
    return new Point(this.x + x, this.y + y);\n\
  }, \n\
\n\
\n\
  rotate: function(a) {\n\
    // Return a new vector that's a copy of this vector rotated by a radians\n\
    return new Vector(this.x * Math.cos(a) - this.y*Math.sin(a),\n\
                    this.x * Math.sin(a) + this.y*Math.cos(a));\n\
  },\n\
\n\
\n\
  angleTo: function(other) {\n\
    return Math.acos(this.dot(other) / (Math.abs(this.dist()) * Math.abs(other.dist())));\n\
  },\n\
\n\
  toUnit: function() {\n\
    return this.multiply(1/this.magnitude());\n\
  }\n\
};\n\
\n\
\n\
/**\n\
 * @param {Point} p1\n\
 * @param {Point} p2\n\
 * @returns The Euclidean distance between two points.\n\
 */\n\
Point.distance = function(p1, p2) {\n\
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));\n\
};\n\
\n\
/**\n\
 * If you have two dudes, one standing at point p1, and the other\n\
 * standing at point p2, then this method will return the direction\n\
 * that the dude standing at p1 will need to face to look at p2.\n\
 * @param {Point} p1 The starting point.\n\
 * @param {Point} p2 The ending point.\n\
 * @returns The direction from p1 to p2 in radians.\n\
 */\n\
Point.direction = function(p1, p2) {\n\
  return Math.atan2(\n\
    p2.y - p1.y,\n\
    p2.x - p1.x\n\
  );\n\
};\n\
//@ sourceURL=gcanvas/lib/math/point.js"
));
require.register("gcanvas/lib/math/matrix.js", Function("exports, require, module",
"module.exports = Matrix;\n\
\n\
var Point = require('./point');\n\
\n\
/**\n\
 * <pre>\n\
 *  _        _\n\
 * | a  c tx  |\n\
 * | b  d ty  |\n\
 * |_0  0  1 _|\n\
 * </pre>\n\
 * Creates a matrix for 2d affine transformations.\n\
 *\n\
 * concat, inverse, rotate, scale and translate return new matrices with the\n\
 * transformations applied. The matrix is not modified in place.\n\
 *\n\
 * Returns the identity matrix when called with no arguments.\n\
 * @name Matrix\n\
 * @param {Number} [a]\n\
 * @param {Number} [b]\n\
 * @param {Number} [c]\n\
 * @param {Number} [d]\n\
 * @param {Number} [tx]\n\
 * @param {Number} [ty]\n\
 * @constructor\n\
 */\n\
function Matrix(a, b, c, d, tx, ty) {\n\
  this.a = a !== undefined ? a : 1;\n\
  this.b = b || 0;\n\
  this.c = c || 0;\n\
  this.d = d !== undefined ? d : 1;\n\
  this.tx = tx || 0;\n\
  this.ty = ty || 0;\n\
}\n\
\n\
Matrix.prototype = {\n\
\n\
  clone: function() {\n\
    return new Matrix(\n\
      this.a,\n\
      this.b,\n\
      this.c,\n\
      this.d,\n\
      this.tx,\n\
      this.ty\n\
    );\n\
  },\n\
\n\
  /**\n\
   * Returns the result of this matrix multiplied by another matrix\n\
   * combining the geometric effects of the two. In mathematical terms, \n\
   * concatenating two matrixes is the same as combining them using matrix multiplication.\n\
   * If this matrix is A and the matrix passed in is B, the resulting matrix is A x B\n\
   * http://mathworld.wolfram.com/MatrixMultiplication.html\n\
   * @name concat\n\
   * @methodOf Matrix#\n\
   *\n\
   * @param {Matrix} matrix The matrix to multiply this matrix by.\n\
   * @returns The result of the matrix multiplication, a new matrix.\n\
   * @type Matrix\n\
   */\n\
  concat: function(matrix) {\n\
    return new Matrix(\n\
      this.a * matrix.a + this.c * matrix.b,\n\
      this.b * matrix.a + this.d * matrix.b,\n\
      this.a * matrix.c + this.c * matrix.d,\n\
      this.b * matrix.c + this.d * matrix.d,\n\
      this.a * matrix.tx + this.c * matrix.ty + this.tx,\n\
      this.b * matrix.tx + this.d * matrix.ty + this.ty\n\
    );\n\
  },\n\
\n\
  /**\n\
   * Given a point in the pretransform coordinate space, returns the coordinates of \n\
   * that point after the transformation occurs. Unlike the standard transformation \n\
   * applied using the transformnew Point() method, the deltaTransformnew Point() method's \n\
   * transformation does not consider the translation parameters tx and ty.\n\
   * @name deltaTransformPoint\n\
   * @methodOf Matrix#\n\
   * @see #transformPoint\n\
   *\n\
   * @return A new point transformed by this matrix ignoring tx and ty.\n\
   * @type Point\n\
   */\n\
  deltaTransformPoint: function(point) {\n\
    return new Point(\n\
      this.a * point.x + this.c * point.y,\n\
      this.b * point.x + this.d * point.y\n\
    );\n\
  },\n\
\n\
  /**\n\
   * Returns the inverse of the matrix.\n\
   * http://mathworld.wolfram.com/MatrixInverse.html\n\
   * @name inverse\n\
   * @methodOf Matrix#\n\
   *\n\
   * @returns A new matrix that is the inverse of this matrix.\n\
   * @type Matrix\n\
   */\n\
  inverse: function() {\n\
    var determinant = this.a * this.d - this.b * this.c;\n\
    return new Matrix(\n\
      this.d / determinant,\n\
      -this.b / determinant,\n\
      -this.c / determinant,\n\
      this.a / determinant,\n\
      (this.c * this.ty - this.d * this.tx) / determinant,\n\
      (this.b * this.tx - this.a * this.ty) / determinant\n\
    );\n\
  },\n\
\n\
  /**\n\
   * Returns a new matrix that corresponds this matrix multiplied by a\n\
   * a rotation matrix.\n\
   * @name rotate\n\
   * @methodOf Matrix#\n\
   * @see Matrix.rotation\n\
   *\n\
   * @param {Number} theta Amount to rotate in radians.\n\
   * @param {Point} [aboutPoint] The point about which this rotation occurs. Defaults to (0,0).\n\
   * @returns A new matrix, rotated by the specified amount.\n\
   * @type Matrix\n\
   */\n\
  rotate: function(theta, aboutPoint) {\n\
    return this.concat(Matrix.rotation(theta, aboutPoint));\n\
  },\n\
\n\
  /**\n\
   * Returns a new matrix that corresponds this matrix multiplied by a\n\
   * a scaling matrix.\n\
   * @name scale\n\
   * @methodOf Matrix#\n\
   * @see Matrix.scale\n\
   *\n\
   * @param {Number} sx\n\
   * @param {Number} [sy]\n\
   * @param {Point} [aboutPoint] The point that remains fixed during the scaling\n\
   * @type Matrix\n\
   */\n\
  scale: function(sx, sy, aboutPoint) {\n\
    return this.concat(Matrix.scale(sx, sy, aboutPoint));\n\
  },\n\
\n\
  /**\n\
   * Returns the result of applying the geometric transformation represented by the \n\
   * Matrix object to the specified point.\n\
   * @name transformPoint\n\
   * @methodOf Matrix#\n\
   * @see #deltaTransformPoint\n\
   *\n\
   * @returns A new point with the transformation applied.\n\
   * @type Point\n\
   */\n\
  transformPoint: function(point) {\n\
    return new Point(\n\
      this.a * point.x + this.c * point.y + this.tx,\n\
      this.b * point.x + this.d * point.y + this.ty\n\
    );\n\
  },\n\
\n\
  /**\n\
   * Translates the matrix along the x and y axes, as specified by the tx and ty parameters.\n\
   * @name translate\n\
   * @methodOf Matrix#\n\
   * @see Matrix.translation\n\
   *\n\
   * @param {Number} tx The translation along the x axis.\n\
   * @param {Number} ty The translation along the y axis.\n\
   * @returns A new matrix with the translation applied.\n\
   * @type Matrix\n\
   */\n\
  translate: function(tx, ty) {\n\
    return this.concat(Matrix.translation(tx, ty));\n\
  }\n\
};\n\
\n\
/**\n\
 * Creates a matrix transformation that corresponds to the given rotation,\n\
 * around (0,0) or the specified point.\n\
 * @see Matrix#rotate\n\
 *\n\
 * @param {Number} theta Rotation in radians.\n\
 * @param {Point} [aboutPoint] The point about which this rotation occurs. Defaults to (0,0).\n\
 * @returns \n\
 * @type Matrix\n\
 */\n\
Matrix.rotation = function(theta, aboutPoint) {\n\
  var rotationMatrix = new Matrix(\n\
    Math.cos(theta),\n\
    Math.sin(theta),\n\
    -Math.sin(theta),\n\
    Math.cos(theta)\n\
  );\n\
\n\
  if(aboutPoint) {\n\
    rotationMatrix =\n\
      Matrix.translation(aboutPoint.x, aboutPoint.y).concat(\n\
        rotationMatrix\n\
      ).concat(\n\
        Matrix.translation(-aboutPoint.x, -aboutPoint.y)\n\
      );\n\
  }\n\
\n\
  return rotationMatrix;\n\
};\n\
\n\
/**\n\
 * Returns a matrix that corresponds to scaling by factors of sx, sy along\n\
 * the x and y axis respectively.\n\
 * If only one parameter is given the matrix is scaled uniformly along both axis.\n\
 * If the optional aboutPoint parameter is given the scaling takes place\n\
 * about the given point.\n\
 * @see Matrix#scale\n\
 *\n\
 * @param {Number} sx The amount to scale by along the x axis or uniformly if no sy is given.\n\
 * @param {Number} [sy] The amount to scale by along the y axis.\n\
 * @param {Point} [aboutPoint] The point about which the scaling occurs. Defaults to (0,0).\n\
 * @returns A matrix transformation representing scaling by sx and sy.\n\
 * @type Matrix\n\
 */\n\
Matrix.scale = function(sx, sy, aboutPoint) {\n\
  sy = sy || sx;\n\
\n\
  var scaleMatrix = new Matrix(sx, 0, 0, sy);\n\
\n\
  if(aboutPoint) {\n\
    scaleMatrix =\n\
      Matrix.translation(aboutPoint.x, aboutPoint.y).concat(\n\
        scaleMatrix\n\
      ).concat(\n\
        Matrix.translation(-aboutPoint.x, -aboutPoint.y)\n\
      );\n\
  }\n\
\n\
  return scaleMatrix;\n\
};\n\
\n\
/**\n\
 * Returns a matrix that corresponds to a translation of tx, ty.\n\
 * @see Matrix#translate\n\
 *\n\
 * @param {Number} tx The amount to translate in the x direction.\n\
 * @param {Number} ty The amount to translate in the y direction.\n\
 * @return A matrix transformation representing a translation by tx and ty.\n\
 * @type Matrix\n\
 */\n\
Matrix.translation = function(tx, ty) {\n\
  return new Matrix(1, 0, 0, 1, tx, ty);\n\
};\n\
\n\
/**\n\
 * A constant representing the identity matrix.\n\
 * @name IDENTITY\n\
 * @fieldOf Matrix\n\
 */\n\
Matrix.IDENTITY = new Matrix();\n\
/**\n\
 * A constant representing the horizontal flip transformation matrix.\n\
 * @name HORIZONTAL_FLIP\n\
 * @fieldOf Matrix\n\
 */\n\
Matrix.HORIZONTAL_FLIP = new Matrix(-1, 0, 0, 1);\n\
/**\n\
 * A constant representing the vertical flip transformation matrix.\n\
 * @name VERTICAL_FLIP\n\
 * @fieldOf Matrix\n\
 */\n\
Matrix.VERTICAL_FLIP = new Matrix(1, 0, 0, -1);\n\
//@ sourceURL=gcanvas/lib/math/matrix.js"
));
require.register("gcanvas/lib/path.js", Function("exports, require, module",
"/**\n\
 * Derived from code originally written by zz85 for three.js\n\
 * http://www.lab4games.net/zz85/blog\n\
 * Thanks zz85!\n\
 **/\n\
\n\
module.exports = Path;\n\
\n\
var Point = require('./math/point');\n\
\n\
function Path( points ) {\n\
\tthis.actions = [];\n\
\n\
\tif ( points ) {\n\
\t\tthis.fromPoints( points );\n\
\t}\n\
};\n\
\n\
Path.actions = {\n\
\tMOVE_TO: 'moveTo',\n\
\tLINE_TO: 'lineTo',\n\
\tQUADRATIC_CURVE_TO: 'quadraticCurveTo',\n\
\tBEZIER_CURVE_TO: 'bezierCurveTo',\n\
\tELLIPSE: 'ellipse'\n\
};\n\
\n\
Path.prototype = {\n\
  clone: function() {\n\
    var path = new Path();\n\
    path.actions = this.actions.slice(0);\n\
    return path;\n\
  }\n\
\n\
, fromPoints: function ( points ) {\n\
    this.moveTo( points[ 0 ].x, points[ 0 ].y );\n\
\n\
    for ( var v = 1, vlen = points.length; v < vlen; v ++ ) {\n\
      this.lineTo( points[ v ].x, points[ v ].y );\n\
    };\n\
  }\n\
\n\
, moveTo: function ( x, y ) {\n\
    this.actions.push( { action: Path.actions.MOVE_TO, args: arguments } );\n\
  }\n\
\n\
, lineTo: function ( x, y ) {\n\
    this.actions.push( { action: Path.actions.LINE_TO, args: arguments } );\n\
  }\n\
\n\
, quadraticCurveTo: function( aCPx, aCPy, aX, aY ) {\n\
    this.actions.push( { action: Path.actions.QUADRATIC_CURVE_TO, args: arguments } );\n\
  }\n\
\n\
, bezierCurveTo: function( aCP1x, aCP1y,\n\
                           aCP2x, aCP2y,\n\
                           aX, aY ) {\n\
    this.actions.push( { action: Path.actions.BEZIER_CURVE_TO, args: arguments } );\n\
  }\n\
\n\
, arc: function ( aX, aY, aRadius, aStartAngle, aEndAngle, aClockwise ) {\n\
    this.ellipse(aX, aY, aRadius, aRadius, aStartAngle, aEndAngle, aClockwise);\n\
  }\n\
\n\
, ellipse: function ( aX, aY, xRadius, yRadius, aStartAngle, aEndAngle, aClockwise ) {\n\
    this.actions.push( { action: Path.actions.ELLIPSE, args: arguments } );\n\
  }\n\
\n\
, getPoints: function( divisions, closedPath ) {\n\
    divisions = divisions || 12;\n\
\n\
    var points = [];\n\
\n\
    var i, il, item, action, args;\n\
    var cpx, cpy, cpx2, cpy2, cpx1, cpy1, cpx0, cpy0,\n\
      laste, j,\n\
      t, tx, ty;\n\
\n\
    for ( i = 0, il = this.actions.length; i < il; i ++ ) {\n\
\n\
      item = this.actions[ i ];\n\
\n\
      action = item.action;\n\
      args = item.args;\n\
\n\
      switch( action ) {\n\
\n\
      case Path.actions.MOVE_TO:\n\
\n\
        points.push( new Point( args[ 0 ], args[ 1 ] ) );\n\
\n\
        break;\n\
\n\
      case Path.actions.LINE_TO:\n\
\n\
        points.push( new Point( args[ 0 ], args[ 1 ] ) );\n\
\n\
        break;\n\
\n\
      case Path.actions.QUADRATIC_CURVE_TO:\n\
\n\
        cpx  = args[ 2 ];\n\
        cpy  = args[ 3 ];\n\
\n\
        cpx1 = args[ 0 ];\n\
        cpy1 = args[ 1 ];\n\
\n\
        if ( points.length > 0 ) {\n\
\n\
          laste = points[ points.length - 1 ];\n\
\n\
          cpx0 = laste.x;\n\
          cpy0 = laste.y;\n\
\n\
        } else {\n\
\n\
          laste = this.actions[ i - 1 ].args;\n\
\n\
          cpx0 = laste[ laste.length - 2 ];\n\
          cpy0 = laste[ laste.length - 1 ];\n\
\n\
        }\n\
\n\
        for ( j = 1; j <= divisions; j ++ ) {\n\
\n\
          t = j / divisions;\n\
\n\
          tx = b2( t, cpx0, cpx1, cpx );\n\
          ty = b2( t, cpy0, cpy1, cpy );\n\
\n\
          points.push( new Point( tx, ty ) );\n\
\n\
        }\n\
\n\
        break;\n\
\n\
      case Path.actions.BEZIER_CURVE_TO:\n\
\n\
        cpx  = args[ 4 ];\n\
        cpy  = args[ 5 ];\n\
\n\
        cpx1 = args[ 0 ];\n\
        cpy1 = args[ 1 ];\n\
\n\
        cpx2 = args[ 2 ];\n\
        cpy2 = args[ 3 ];\n\
\n\
        if ( points.length > 0 ) {\n\
\n\
          laste = points[ points.length - 1 ];\n\
\n\
          cpx0 = laste.x;\n\
          cpy0 = laste.y;\n\
\n\
        } else {\n\
\n\
          laste = this.actions[ i - 1 ].args;\n\
\n\
          cpx0 = laste[ laste.length - 2 ];\n\
          cpy0 = laste[ laste.length - 1 ];\n\
\n\
        }\n\
\n\
        for ( j = 1; j <= divisions; j ++ ) {\n\
\n\
          t = j / divisions;\n\
\n\
          tx = b3( t, cpx0, cpx1, cpx2, cpx );\n\
          ty = b3( t, cpy0, cpy1, cpy2, cpy );\n\
\n\
          points.push( new Point( tx, ty ) );\n\
\n\
        }\n\
\n\
        break;\n\
\n\
      case Path.actions.ELLIPSE:\n\
\n\
        var aX = args[ 0 ], aY = args[ 1 ],\n\
          xRadius = args[ 2 ],\n\
          yRadius = args[ 3 ],\n\
          aStartAngle = args[ 4 ], aEndAngle = args[ 5 ],\n\
          aClockwise = !!args[ 6 ];\n\
\n\
        var deltaAngle = aEndAngle - aStartAngle;\n\
        var angle;\n\
\n\
        for ( j = 0; j <= divisions; j ++ ) {\n\
          t = j / divisions;\n\
\n\
          if(deltaAngle === -Math.PI*2) {\n\
            deltaAngle = Math.PI*2;\n\
          }\n\
\n\
          if(deltaAngle < 0) {\n\
            deltaAngle += Math.PI*2;\n\
          }\n\
\n\
          if(deltaAngle > Math.PI*2) {\n\
            deltaAngle -= Math.PI*2;\n\
          }\n\
\n\
          if ( aClockwise ) {\n\
            // sin(pi) and sin(0) are the same\n\
            // So we have to special case for full circles\n\
            if(deltaAngle === Math.PI*2) {\n\
              deltaAngle = 0;\n\
            }\n\
\n\
            angle = aEndAngle + ( 1 - t ) * ( Math.PI * 2 - deltaAngle );\n\
          } else {\n\
            angle = aStartAngle + t * deltaAngle;\n\
          }\n\
\n\
          var tx = aX + xRadius * Math.cos( angle );\n\
          var ty = aY + yRadius * Math.sin( angle );\n\
\n\
          points.push( new Point( tx, ty ) );\n\
\n\
        }\n\
\n\
        break;\n\
\n\
      } // end switch\n\
\n\
    }\n\
\n\
\t// Normalize to remove the closing point by default.\n\
\t// var lastPoint = points[ points.length - 1];\n\
\t// var EPSILON = 0.0000000001;\n\
\t// if ( Math.abs(lastPoint.x - points[ 0 ].x) < EPSILON &&\n\
\t// \t\t Math.abs(lastPoint.y - points[ 0 ].y) < EPSILON)\n\
\t// \tpoints.splice( points.length - 1, 1);\n\
\t// if ( closedPath ) {\n\
\n\
\t// \tpoints.push( points[ 0 ] );\n\
\n\
\t// }\n\
\n\
\treturn points;\n\
\n\
  }\n\
};\n\
\n\
\n\
// Bezier Curves formulas obtained from\n\
// http://en.wikipedia.org/wiki/B%C3%A9zier_curve\n\
\n\
// Quad Bezier Functions\n\
function b2p0 ( t, p ) {\n\
  var k = 1 - t;\n\
  return k * k * p;\n\
}\n\
\n\
function b2p1 ( t, p ) {\n\
  return 2 * ( 1 - t ) * t * p;\n\
}\n\
\n\
function b2p2 ( t, p ) {\n\
  return t * t * p;\n\
}\n\
\n\
function b2 ( t, p0, p1, p2 ) {\n\
  return b2p0( t, p0 ) + b2p1( t, p1 ) + b2p2( t, p2 );\n\
}\n\
\n\
// Cubic Bezier Functions\n\
function b3p0 ( t, p ) {\n\
  var k = 1 - t;\n\
  return k * k * k * p;\n\
}\n\
\n\
function b3p1 ( t, p ) {\n\
  var k = 1 - t;\n\
  return 3 * k * k * t * p;\n\
}\n\
\n\
function b3p2 ( t, p ) {\n\
  var k = 1 - t;\n\
  return 3 * k * t * t * p;\n\
}\n\
\n\
function b3p3 ( t, p ) {\n\
  return t * t * t * p;\n\
}\n\
\n\
function b3 ( t, p0, p1, p2, p3 ) {\n\
  return b3p0( t, p0 ) + b3p1( t, p1 ) + b3p2( t, p2 ) +  b3p3( t, p3 );\n\
}\n\
//@ sourceURL=gcanvas/lib/path.js"
));
require.register("gcanvas/lib/font.js", Function("exports, require, module",
"/**\n\
 * Derived from code originally written by zz85 for three.js\n\
 * http://www.lab4games.net/zz85/blog\n\
 * Thanks zz85!\n\
 **/\n\
\n\
module.exports = Font;\n\
\n\
var Path = require('./path');\n\
\n\
function Font(props) {\n\
  this.face = Font.faces[props.family] ? props.family : 'helvetiker';\n\
\tthis.weight = props.weight || \"normal\";\n\
\tthis.style = props.style || \"normal\";\n\
  this.size = props.size || 20;\n\
  this.divisions = 10;\n\
}\n\
\n\
Font.faces = {}; // cache\n\
\n\
Font.prototype = {\n\
\tgetFace : function() {\n\
\t\treturn Font.faces[ this.face ][ this.weight ][ this.style ];\n\
\t},\n\
\n\
\tdrawText : function(ctx, text) {\n\
\t\tvar i, p,\n\
\t\t\tface = this.getFace(),\n\
\t\t\tscale = this.size / face.resolution,\n\
\t\t\toffset = 0,\n\
\t\t\tchars = String( text ).split( '' ),\n\
\t\t\tlength = chars.length;\n\
\n\
\t\tvar fontPaths = [];\n\
\n\
\t\tfor ( i = 0; i < length; i ++ ) {\n\
\t\t\tvar ret = this.extractGlyphPoints( chars[ i ], face, scale, offset, ctx );\n\
\t\t\toffset += ret.offset;\n\
\t\t}\n\
\n\
\t\tvar width = offset / 2;\n\
\t\t\n\
\t\treturn { paths : fontPaths, offset : width };\n\
\t},\n\
\n\
\textractGlyphPoints : function( c, face, scale, offset, path ) {\n\
\n\
\t\tvar pts = [];\n\
\n\
\t\tvar i, i2, divisions,\n\
\t\t\toutline, action, length,\n\
\t\t\tscaleX, scaleY,\n\
\t\t\tx, y, cpx, cpy, cpx0, cpy0, cpx1, cpy1, cpx2, cpy2,\n\
\t\t\tlaste,\n\
\t\t\tglyph = face.glyphs[ c ] || face.glyphs[ '?' ];\n\
\n\
\t\tif ( !glyph ) return;\n\
\n\
\t\tif ( glyph.o ) {\n\
\n\
\t\t\toutline = glyph._cachedOutline || ( glyph._cachedOutline = glyph.o.split( ' ' ) );\n\
\t\t\tlength = outline.length;\n\
\n\
\t\t\tscaleX = scale;\n\
\t\t\tscaleY = -scale;\n\
\n\
\t\t\tfor ( i = 0; i < length; ) {\n\
\n\
\t\t\t\taction = outline[ i ++ ];\n\
\n\
\t\t\t\t//console.log( action );\n\
\n\
\t\t\t\tswitch( action ) {\n\
\n\
\t\t\t\tcase 'm':\n\
\n\
\t\t\t\t\t// Move To\n\
\n\
\t\t\t\t\tx = outline[ i++ ] * scaleX + offset;\n\
\t\t\t\t\ty = outline[ i++ ] * scaleY;\n\
\n\
\t\t\t\t\tpath.moveTo( x, y );\n\
\t\t\t\t\tbreak;\n\
\n\
\t\t\t\tcase 'l':\n\
\n\
\t\t\t\t\t// Line To\n\
\n\
\t\t\t\t\tx = outline[ i++ ] * scaleX + offset;\n\
\t\t\t\t\ty = outline[ i++ ] * scaleY;\n\
\t\t\t\t\tpath.lineTo(x,y);\n\
\t\t\t\t\tbreak;\n\
\n\
\t\t\t\tcase 'q':\n\
\n\
\t\t\t\t\t// QuadraticCurveTo\n\
\n\
\t\t\t\t\tcpx  = outline[ i++ ] * scaleX + offset;\n\
\t\t\t\t\tcpy  = outline[ i++ ] * scaleY;\n\
\t\t\t\t\tcpx1 = outline[ i++ ] * scaleX + offset;\n\
\t\t\t\t\tcpy1 = outline[ i++ ] * scaleY;\n\
\n\
\t\t\t\t\tpath.quadraticCurveTo(cpx1, cpy1, cpx, cpy);\n\
\n\
\t\t\t\t\tlaste = pts[ pts.length - 1 ];\n\
\n\
\t\t\t\t\tif ( laste ) {\n\
\n\
\t\t\t\t\t\tcpx0 = laste.x;\n\
\t\t\t\t\t\tcpy0 = laste.y;\n\
\n\
\t\t\t\t\t\tfor ( i2 = 1, divisions = this.divisions; i2 <= divisions; i2 ++ ) {\n\
\n\
\t\t\t\t\t\t\tvar t = i2 / divisions;\n\
\t\t\t\t\t\t\tvar tx = Shape.Utils.b2( t, cpx0, cpx1, cpx );\n\
\t\t\t\t\t\t\tvar ty = Shape.Utils.b2( t, cpy0, cpy1, cpy );\n\
\t\t\t\t\t  }\n\
\n\
\t\t\t\t  }\n\
\n\
\t\t\t\t  break;\n\
\n\
\t\t\t\tcase 'b':\n\
\n\
\t\t\t\t\t// Cubic Bezier Curve\n\
\n\
\t\t\t\t\tcpx  = outline[ i++ ] *  scaleX + offset;\n\
\t\t\t\t\tcpy  = outline[ i++ ] *  scaleY;\n\
\t\t\t\t\tcpx1 = outline[ i++ ] *  scaleX + offset;\n\
\t\t\t\t\tcpy1 = outline[ i++ ] * -scaleY;\n\
\t\t\t\t\tcpx2 = outline[ i++ ] *  scaleX + offset;\n\
\t\t\t\t\tcpy2 = outline[ i++ ] * -scaleY;\n\
\n\
\t\t\t\t\tpath.bezierCurveTo( cpx, cpy, cpx1, cpy1, cpx2, cpy2 );\n\
\n\
\t\t\t\t\tlaste = pts[ pts.length - 1 ];\n\
\n\
\t\t\t\t\tif ( laste ) {\n\
\n\
\t\t\t\t\t\tcpx0 = laste.x;\n\
\t\t\t\t\t\tcpy0 = laste.y;\n\
\n\
\t\t\t\t\t\tfor ( i2 = 1, divisions = this.divisions; i2 <= divisions; i2 ++ ) {\n\
\n\
\t\t\t\t\t\t\tvar t = i2 / divisions;\n\
\t\t\t\t\t\t\tvar tx = Shape.Utils.b3( t, cpx0, cpx1, cpx2, cpx );\n\
\t\t\t\t\t\t\tvar ty = Shape.Utils.b3( t, cpy0, cpy1, cpy2, cpy );\n\
\n\
\t\t\t\t\t\t}\n\
\n\
\t\t\t\t\t}\n\
\n\
\t\t\t\t\tbreak;\n\
\n\
\t\t\t\t}\n\
\n\
\t\t\t}\n\
\t\t}\n\
\n\
\t\treturn { offset: glyph.ha*scale, path:path};\n\
\t}\n\
\n\
};\n\
\n\
Font.load = function( data ) {\n\
  var family = data.familyName.toLowerCase();\n\
  Font.faces[ family ] = Font.faces[ family ] || {};\n\
  Font.faces[ family ][ data.cssFontWeight ] = Font.faces[ family ][ data.cssFontWeight ] || {};\n\
  Font.faces[ family ][ data.cssFontWeight ][ data.cssFontStyle ] = data;\n\
  var face = Font.faces[ family ][ data.cssFontWeight ][ data.cssFontStyle ] = data;\n\
  return data;\n\
};\n\
\n\
//@ sourceURL=gcanvas/lib/font.js"
));
require.register("gcanvas/lib/clipper.js", Function("exports, require, module",
"/*******************************************************************************\n\
*                                                                              *\n\
* Author    :  Angus Johnson                                                   *\n\
* Version   :  5.0.2                                                           *\n\
* Date      :  30 December 2012                                                *\n\
* Website   :  http://www.angusj.com                                           *\n\
* Copyright :  Angus Johnson 2010-2012                                         *\n\
*                                                                              *\n\
* License:                                                                     *\n\
* Use, modification & distribution is subject to Boost Software License Ver 1. *\n\
* http://www.boost.org/LICENSE_1_0.txt                                         *\n\
*                                                                              *\n\
* Attributions:                                                                *\n\
* The code in this library is an extension of Bala Vatti's clipping algorithm: *\n\
* \"A generic solution to polygon clipping\"                                     *\n\
* Communications of the ACM, Vol 35, Issue 7 (July 1992) pp 56-63.             *\n\
* http://portal.acm.org/citation.cfm?id=129906                                 *\n\
*                                                                              *\n\
* Computer graphics and geometric modeling: implementation and algorithms      *\n\
* By Max K. Agoston                                                            *\n\
* Springer; 1 edition (January 4, 2005)                                        *\n\
* http://books.google.com/books?q=vatti+clipping+agoston                       *\n\
*                                                                              *\n\
* See also:                                                                    *\n\
* \"Polygon Offsetting by Computing Winding Numbers\"                            *\n\
* Paper no. DETC2005-85513 pp. 565-575                                         *\n\
* ASME 2005 International Design Engineering Technical Conferences             *\n\
* and Computers and Information in Engineering Conference (IDETC/CIE2005)      *\n\
* September 24�28, 2005 , Long Beach, California, USA                          *\n\
* http://www.me.berkeley.edu/~mcmains/pubs/DAC05OffsetPolygon.pdf              *\n\
*                                                                              *\n\
*******************************************************************************/\n\
\n\
/*******************************************************************************\n\
*                                                                              *\n\
* Author    :  Timo                                                            *\n\
* Version   :  5.0.2.2                                                         *\n\
* Date      :  11 September 2013                                               *\n\
*                                                                              *\n\
* This is a translation of the C# Clipper library to Javascript.               *\n\
* Int128 struct of C# is implemented using JSBN of Tom Wu.                     *\n\
* Because Javascript lacks support for 64-bit integers, the space              *\n\
* is a little more restricted than in C# version.                              *\n\
*                                                                              *\n\
* C# version has support for coordinate space:                                 *\n\
* +-4611686018427387903 ( sqrt(2^127 -1)/2 )                                   *\n\
* while Javascript version has support for space:                              *\n\
* +-4503599627370495 ( sqrt(2^106 -1)/2 )                                      *\n\
*                                                                              *\n\
* Tom Wu's JSBN proved to be the fastest big integer library:                  *\n\
* http://jsperf.com/big-integer-library-test                                   *\n\
*                                                                              *\n\
* This class can be made simpler when (if ever) 64-bit integer support comes.  *\n\
*                                                                              *\n\
*******************************************************************************/\n\
\n\
/*******************************************************************************\n\
*                                                                              *\n\
* Basic JavaScript BN library - subset useful for RSA encryption.              *\n\
* http://www-cs-students.stanford.edu/~tjw/jsbn/                               *\n\
* Copyright (c) 2005  Tom Wu                                                   *\n\
* All Rights Reserved.                                                         *\n\
* See \"LICENSE\" for details:                                                   *\n\
* http://www-cs-students.stanford.edu/~tjw/jsbn/LICENSE                        *\n\
*                                                                              *\n\
*******************************************************************************/\n\
\n\
  // \"use strict\";\n\
  // Browser test to speedup performance critical functions\n\
  // var nav = navigator.userAgent.toString().toLowerCase();\n\
  var nav = 'chrome';\n\
\n\
  var browser = {};\n\
  if ( nav.indexOf(\"chrome\") != -1 && nav.indexOf(\"chromium\") == -1 ) browser.chrome = 1; else browser.chrome = 0;\n\
  if ( nav.indexOf(\"chromium\") != -1 ) browser.chromium = 1; else browser.chromium = 0;\n\
  if ( nav.indexOf(\"safari\") != -1 && nav.indexOf(\"chrome\") == -1 && nav.indexOf(\"chromium\") == -1 ) browser.safari = 1; else browser.safari = 0;\n\
  if ( nav.indexOf(\"firefox\") != -1 ) browser.firefox = 1; else browser.firefox = 0;\n\
  if ( nav.indexOf(\"firefox/17\") != -1 ) browser.firefox17 = 1; else browser.firefox17 = 0;   \n\
  if ( nav.indexOf(\"firefox/15\") != -1 ) browser.firefox15 = 1; else browser.firefox15 = 0;\n\
  if ( nav.indexOf(\"firefox/3\") != -1 ) browser.firefox3 = 1; else browser.firefox3 = 0;\n\
  if ( nav.indexOf(\"opera\") != -1 ) browser.opera = 1; else browser.opera = 0;\n\
  if ( nav.indexOf(\"msie 10\") != -1 ) browser.msie10 = 1; else browser.msie10 = 0;\n\
  if ( nav.indexOf(\"msie 9\") != -1 ) browser.msie9 = 1; else browser.msie9 = 0;\n\
  if ( nav.indexOf(\"msie 8\") != -1 ) browser.msie8 = 1; else browser.msie8 = 0;\n\
  if ( nav.indexOf(\"msie 7\") != -1 ) browser.msie7 = 1; else browser.msie7 = 0;\n\
  if ( nav.indexOf(\"msie \") != -1 ) browser.msie = 1; else browser.msie = 0;\n\
\n\
  var ClipperLib = {};\n\
  ClipperLib.biginteger_used = null;\n\
  \n\
  // Bits per digit\n\
  var dbits;\n\
  // JavaScript engine analysis\n\
  var canary = 0xdeadbeefcafe;\n\
  var j_lm = ((canary & 0xffffff) == 0xefcafe);\n\
  // (public) Constructor\n\
  function Int128(a, b, c)\n\
  {\n\
    // This test variable can be removed,\n\
    // but at least for performance tests it is useful piece of knowledge\n\
    // This is the only ClipperLib related variable in Int128 library\n\
    ClipperLib.biginteger_used = 1;\n\
    if (a != null) if (\"number\" == typeof a)\n\
    {\n\
    \tthis.fromString(Math.floor(a)\n\
        .toString(), 10); //this.fromNumber(a,b,c);\n\
    }\n\
    else if (b == null && \"string\" != typeof a) this.fromString(a, 256);\n\
    else\n\
    {\n\
      if (a.indexOf(\".\") != -1) a = a.substring(0, a.indexOf(\".\"));\n\
      this.fromString(a, b);\n\
    }\n\
  }\n\
  // return new, unset Int128\n\
  function nbi()\n\
  {\n\
    return new Int128(null);\n\
  }\n\
  // am: Compute w_j += (x*this_i), propagate carries,\n\
  // c is initial carry, returns final carry.\n\
  // c < 3*dvalue, x < 2*dvalue, this_i < dvalue\n\
  // We need to select the fastest one that works in this environment.\n\
  // am1: use a single mult and divide to get the high bits,\n\
  // max digit bits should be 26 because\n\
  // max internal value = 2*dvalue^2-2*dvalue (< 2^53)\n\
  function am1(i, x, w, j, c, n)\n\
  {\n\
    while (--n >= 0)\n\
    {\n\
      var v = x * this[i++] + w[j] + c;\n\
      c = Math.floor(v / 0x4000000);\n\
      w[j++] = v & 0x3ffffff;\n\
    }\n\
    return c;\n\
  }\n\
  // am2 avoids a big mult-and-extract completely.\n\
  // Max digit bits should be <= 30 because we do bitwise ops\n\
  // on values up to 2*hdvalue^2-hdvalue-1 (< 2^31)\n\
  function am2(i, x, w, j, c, n)\n\
  {\n\
    var xl = x & 0x7fff,\n\
      xh = x >> 15;\n\
    while (--n >= 0)\n\
    {\n\
      var l = this[i] & 0x7fff;\n\
      var h = this[i++] >> 15;\n\
      var m = xh * l + h * xl;\n\
      l = xl * l + ((m & 0x7fff) << 15) + w[j] + (c & 0x3fffffff);\n\
      c = (l >>> 30) + (m >>> 15) + xh * h + (c >>> 30);\n\
      w[j++] = l & 0x3fffffff;\n\
    }\n\
    return c;\n\
  }\n\
  // Alternately, set max digit bits to 28 since some\n\
  // browsers slow down when dealing with 32-bit numbers.\n\
  function am3(i, x, w, j, c, n)\n\
  {\n\
    var xl = x & 0x3fff,\n\
      xh = x >> 14;\n\
    while (--n >= 0)\n\
    {\n\
      var l = this[i] & 0x3fff;\n\
      var h = this[i++] >> 14;\n\
      var m = xh * l + h * xl;\n\
      l = xl * l + ((m & 0x3fff) << 14) + w[j] + c;\n\
      c = (l >> 28) + (m >> 14) + xh * h;\n\
      w[j++] = l & 0xfffffff;\n\
    }\n\
    return c;\n\
  }\n\
  // if (j_lm && (navigator.appName == \"Microsoft Internet Explorer\"))\n\
  // {\n\
  //   Int128.prototype.am = am2;\n\
  //   dbits = 30;\n\
  // }\n\
  // else if (j_lm && (navigator.appName != \"Netscape\"))\n\
  // {\n\
  //   Int128.prototype.am = am1;\n\
  //   dbits = 26;\n\
  // }\n\
  // else\n\
  { // Mozilla/Netscape seems to prefer am3\n\
    Int128.prototype.am = am3;\n\
    dbits = 28;\n\
  }\n\
  Int128.prototype.DB = dbits;\n\
  Int128.prototype.DM = ((1 << dbits) - 1);\n\
  Int128.prototype.DV = (1 << dbits);\n\
  var BI_FP = 52;\n\
  Int128.prototype.FV = Math.pow(2, BI_FP);\n\
  Int128.prototype.F1 = BI_FP - dbits;\n\
  Int128.prototype.F2 = 2 * dbits - BI_FP;\n\
  // Digit conversions\n\
  var BI_RM = \"0123456789abcdefghijklmnopqrstuvwxyz\";\n\
  var BI_RC = [];\n\
  var rr, vv;\n\
  rr = \"0\".charCodeAt(0);\n\
  for (vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;\n\
  rr = \"a\".charCodeAt(0);\n\
  for (vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;\n\
  rr = \"A\".charCodeAt(0);\n\
  for (vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;\n\
\n\
  function int2char(n)\n\
  {\n\
    return BI_RM.charAt(n);\n\
  }\n\
\n\
  function intAt(s, i)\n\
  {\n\
    var c = BI_RC[s.charCodeAt(i)];\n\
    return (c == null) ? -1 : c;\n\
  }\n\
  // (protected) copy this to r\n\
  function bnpCopyTo(r)\n\
  {\n\
    for (var i = this.t - 1; i >= 0; --i) r[i] = this[i];\n\
    r.t = this.t;\n\
    r.s = this.s;\n\
  }\n\
  // (protected) set from integer value x, -DV <= x < DV\n\
  function bnpFromInt(x)\n\
  {\n\
    this.t = 1;\n\
    this.s = (x < 0) ? -1 : 0;\n\
    if (x > 0) this[0] = x;\n\
    else if (x < -1) this[0] = x + this.DV;\n\
    else this.t = 0;\n\
  }\n\
  // return bigint initialized to value\n\
  function nbv(i)\n\
  {\n\
    var r = nbi();\n\
    r.fromInt(i);\n\
    return r;\n\
  }\n\
  // (protected) set from string and radix\n\
  function bnpFromString(s, b)\n\
  {\n\
    var k;\n\
    if (b == 16) k = 4;\n\
    else if (b == 8) k = 3;\n\
    else if (b == 256) k = 8; // byte array\n\
    else if (b == 2) k = 1;\n\
    else if (b == 32) k = 5;\n\
    else if (b == 4) k = 2;\n\
    else\n\
    {\n\
      this.fromRadix(s, b);\n\
      return;\n\
    }\n\
    this.t = 0;\n\
    this.s = 0;\n\
    var i = s.length,\n\
      mi = false,\n\
      sh = 0;\n\
    while (--i >= 0)\n\
    {\n\
      var x = (k == 8) ? s[i] & 0xff : intAt(s, i);\n\
      if (x < 0)\n\
      {\n\
        if (s.charAt(i) == \"-\") mi = true;\n\
        continue;\n\
      }\n\
      mi = false;\n\
      if (sh == 0) this[this.t++] = x;\n\
      else if (sh + k > this.DB)\n\
      {\n\
        this[this.t - 1] |= (x & ((1 << (this.DB - sh)) - 1)) << sh;\n\
        this[this.t++] = (x >> (this.DB - sh));\n\
      }\n\
      else this[this.t - 1] |= x << sh;\n\
      sh += k;\n\
      if (sh >= this.DB) sh -= this.DB;\n\
    }\n\
    if (k == 8 && (s[0] & 0x80) != 0)\n\
    {\n\
      this.s = -1;\n\
      if (sh > 0) this[this.t - 1] |= ((1 << (this.DB - sh)) - 1) << sh;\n\
    }\n\
    this.clamp();\n\
    if (mi) Int128.ZERO.subTo(this, this);\n\
  }\n\
  // (protected) clamp off excess high words\n\
  function bnpClamp()\n\
  {\n\
    var c = this.s & this.DM;\n\
    while (this.t > 0 && this[this.t - 1] == c)--this.t;\n\
  }\n\
  // (public) return string representation in given radix\n\
  function bnToString(b)\n\
  {\n\
    if (this.s < 0) return \"-\" + this.negate()\n\
      .toString(b);\n\
    var k;\n\
    if (b == 16) k = 4;\n\
    else if (b == 8) k = 3;\n\
    else if (b == 2) k = 1;\n\
    else if (b == 32) k = 5;\n\
    else if (b == 4) k = 2;\n\
    else return this.toRadix(b);\n\
    var km = (1 << k) - 1,\n\
      d, m = false,\n\
      r = \"\",\n\
      i = this.t;\n\
    var p = this.DB - (i * this.DB) % k;\n\
    if (i-- > 0)\n\
    {\n\
      if (p < this.DB && (d = this[i] >> p) > 0)\n\
      {\n\
        m = true;\n\
        r = int2char(d);\n\
      }\n\
      while (i >= 0)\n\
      {\n\
        if (p < k)\n\
        {\n\
          d = (this[i] & ((1 << p) - 1)) << (k - p);\n\
          d |= this[--i] >> (p += this.DB - k);\n\
        }\n\
        else\n\
        {\n\
          d = (this[i] >> (p -= k)) & km;\n\
          if (p <= 0)\n\
          {\n\
            p += this.DB;\n\
            --i;\n\
          }\n\
        }\n\
        if (d > 0) m = true;\n\
        if (m) r += int2char(d);\n\
      }\n\
    }\n\
    return m ? r : \"0\";\n\
  }\n\
  // (public) -this\n\
  function bnNegate()\n\
  {\n\
    var r = nbi();\n\
    Int128.ZERO.subTo(this, r);\n\
    return r;\n\
  }\n\
  // (public) |this|\n\
  function bnAbs()\n\
  {\n\
    return (this.s < 0) ? this.negate() : this;\n\
  }\n\
  // (public) return + if this > a, - if this < a, 0 if equal\n\
  function bnCompareTo(a)\n\
  {\n\
    var r = this.s - a.s;\n\
    if (r != 0) return r;\n\
    var i = this.t;\n\
    r = i - a.t;\n\
    if (r != 0) return (this.s < 0) ? -r : r;\n\
    while (--i >= 0) if ((r = this[i] - a[i]) != 0) return r;\n\
    return 0;\n\
  }\n\
  // returns bit length of the integer x\n\
  function nbits(x)\n\
  {\n\
    var r = 1,\n\
      t;\n\
    if ((t = x >>> 16) != 0)\n\
    {\n\
      x = t;\n\
      r += 16;\n\
    }\n\
    if ((t = x >> 8) != 0)\n\
    {\n\
      x = t;\n\
      r += 8;\n\
    }\n\
    if ((t = x >> 4) != 0)\n\
    {\n\
      x = t;\n\
      r += 4;\n\
    }\n\
    if ((t = x >> 2) != 0)\n\
    {\n\
      x = t;\n\
      r += 2;\n\
    }\n\
    if ((t = x >> 1) != 0)\n\
    {\n\
      x = t;\n\
      r += 1;\n\
    }\n\
    return r;\n\
  }\n\
  // (public) return the number of bits in \"this\"\n\
  function bnBitLength()\n\
  {\n\
    if (this.t <= 0) return 0;\n\
    return this.DB * (this.t - 1) + nbits(this[this.t - 1] ^ (this.s & this.DM));\n\
  }\n\
  // (protected) r = this << n*DB\n\
  function bnpDLShiftTo(n, r)\n\
  {\n\
    var i;\n\
    for (i = this.t - 1; i >= 0; --i) r[i + n] = this[i];\n\
    for (i = n - 1; i >= 0; --i) r[i] = 0;\n\
    r.t = this.t + n;\n\
    r.s = this.s;\n\
  }\n\
  // (protected) r = this >> n*DB\n\
  function bnpDRShiftTo(n, r)\n\
  {\n\
    for (var i = n; i < this.t; ++i) r[i - n] = this[i];\n\
    r.t = Math.max(this.t - n, 0);\n\
    r.s = this.s;\n\
  }\n\
  // (protected) r = this << n\n\
  function bnpLShiftTo(n, r)\n\
  {\n\
    var bs = n % this.DB;\n\
    var cbs = this.DB - bs;\n\
    var bm = (1 << cbs) - 1;\n\
    var ds = Math.floor(n / this.DB),\n\
      c = (this.s << bs) & this.DM,\n\
      i;\n\
    for (i = this.t - 1; i >= 0; --i)\n\
    {\n\
      r[i + ds + 1] = (this[i] >> cbs) | c;\n\
      c = (this[i] & bm) << bs;\n\
    }\n\
    for (i = ds - 1; i >= 0; --i) r[i] = 0;\n\
    r[ds] = c;\n\
    r.t = this.t + ds + 1;\n\
    r.s = this.s;\n\
    r.clamp();\n\
  }\n\
  // (protected) r = this >> n\n\
  function bnpRShiftTo(n, r)\n\
  {\n\
    r.s = this.s;\n\
    var ds = Math.floor(n / this.DB);\n\
    if (ds >= this.t)\n\
    {\n\
      r.t = 0;\n\
      return;\n\
    }\n\
    var bs = n % this.DB;\n\
    var cbs = this.DB - bs;\n\
    var bm = (1 << bs) - 1;\n\
    r[0] = this[ds] >> bs;\n\
    for (var i = ds + 1; i < this.t; ++i)\n\
    {\n\
      r[i - ds - 1] |= (this[i] & bm) << cbs;\n\
      r[i - ds] = this[i] >> bs;\n\
    }\n\
    if (bs > 0) r[this.t - ds - 1] |= (this.s & bm) << cbs;\n\
    r.t = this.t - ds;\n\
    r.clamp();\n\
  }\n\
  // (protected) r = this - a\n\
  function bnpSubTo(a, r)\n\
  {\n\
    var i = 0,\n\
      c = 0,\n\
      m = Math.min(a.t, this.t);\n\
    while (i < m)\n\
    {\n\
      c += this[i] - a[i];\n\
      r[i++] = c & this.DM;\n\
      c >>= this.DB;\n\
    }\n\
    if (a.t < this.t)\n\
    {\n\
      c -= a.s;\n\
      while (i < this.t)\n\
      {\n\
        c += this[i];\n\
        r[i++] = c & this.DM;\n\
        c >>= this.DB;\n\
      }\n\
      c += this.s;\n\
    }\n\
    else\n\
    {\n\
      c += this.s;\n\
      while (i < a.t)\n\
      {\n\
        c -= a[i];\n\
        r[i++] = c & this.DM;\n\
        c >>= this.DB;\n\
      }\n\
      c -= a.s;\n\
    }\n\
    r.s = (c < 0) ? -1 : 0;\n\
    if (c < -1) r[i++] = this.DV + c;\n\
    else if (c > 0) r[i++] = c;\n\
    r.t = i;\n\
    r.clamp();\n\
  }\n\
  // (protected) r = this * a, r != this,a (HAC 14.12)\n\
  // \"this\" should be the larger one if appropriate.\n\
  function bnpMultiplyTo(a, r)\n\
  {\n\
    var x = this.abs(),\n\
      y = a.abs();\n\
    var i = x.t;\n\
    r.t = i + y.t;\n\
    while (--i >= 0) r[i] = 0;\n\
    for (i = 0; i < y.t; ++i) r[i + x.t] = x.am(0, y[i], r, i, 0, x.t);\n\
    r.s = 0;\n\
    r.clamp();\n\
    if (this.s != a.s) Int128.ZERO.subTo(r, r);\n\
  }\n\
  // (protected) r = this^2, r != this (HAC 14.16)\n\
  function bnpSquareTo(r)\n\
  {\n\
    var x = this.abs();\n\
    var i = r.t = 2 * x.t;\n\
    while (--i >= 0) r[i] = 0;\n\
    for (i = 0; i < x.t - 1; ++i)\n\
    {\n\
      var c = x.am(i, x[i], r, 2 * i, 0, 1);\n\
      if ((r[i + x.t] += x.am(i + 1, 2 * x[i], r, 2 * i + 1, c, x.t - i - 1)) >= x.DV)\n\
      {\n\
        r[i + x.t] -= x.DV;\n\
        r[i + x.t + 1] = 1;\n\
      }\n\
    }\n\
    if (r.t > 0) r[r.t - 1] += x.am(i, x[i], r, 2 * i, 0, 1);\n\
    r.s = 0;\n\
    r.clamp();\n\
  }\n\
  // (protected) divide this by m, quotient and remainder to q, r (HAC 14.20)\n\
  // r != q, this != m.  q or r may be null.\n\
  function bnpDivRemTo(m, q, r)\n\
  {\n\
    var pm = m.abs();\n\
    if (pm.t <= 0) return;\n\
    var pt = this.abs();\n\
    if (pt.t < pm.t)\n\
    {\n\
      if (q != null) q.fromInt(0);\n\
      if (r != null) this.copyTo(r);\n\
      return;\n\
    }\n\
    if (r == null) r = nbi();\n\
    var y = nbi(),\n\
      ts = this.s,\n\
      ms = m.s;\n\
    var nsh = this.DB - nbits(pm[pm.t - 1]); // normalize modulus\n\
    if (nsh > 0)\n\
    {\n\
      pm.lShiftTo(nsh, y);\n\
      pt.lShiftTo(nsh, r);\n\
    }\n\
    else\n\
    {\n\
      pm.copyTo(y);\n\
      pt.copyTo(r);\n\
    }\n\
    var ys = y.t;\n\
    var y0 = y[ys - 1];\n\
    if (y0 == 0) return;\n\
    var yt = y0 * (1 << this.F1) + ((ys > 1) ? y[ys - 2] >> this.F2 : 0);\n\
    var d1 = this.FV / yt,\n\
      d2 = (1 << this.F1) / yt,\n\
      e = 1 << this.F2;\n\
    var i = r.t,\n\
      j = i - ys,\n\
      t = (q == null) ? nbi() : q;\n\
    y.dlShiftTo(j, t);\n\
    if (r.compareTo(t) >= 0)\n\
    {\n\
      r[r.t++] = 1;\n\
      r.subTo(t, r);\n\
    }\n\
    Int128.ONE.dlShiftTo(ys, t);\n\
    t.subTo(y, y); // \"negative\" y so we can replace sub with am later\n\
    while (y.t < ys) y[y.t++] = 0;\n\
    while (--j >= 0)\n\
    {\n\
      // Estimate quotient digit\n\
      var qd = (r[--i] == y0) ? this.DM : Math.floor(r[i] * d1 + (r[i - 1] + e) * d2);\n\
      if ((r[i] += y.am(0, qd, r, j, 0, ys)) < qd)\n\
      { // Try it out\n\
        y.dlShiftTo(j, t);\n\
        r.subTo(t, r);\n\
        while (r[i] < --qd) r.subTo(t, r);\n\
      }\n\
    }\n\
    if (q != null)\n\
    {\n\
      r.drShiftTo(ys, q);\n\
      if (ts != ms) Int128.ZERO.subTo(q, q);\n\
    }\n\
    r.t = ys;\n\
    r.clamp();\n\
    if (nsh > 0) r.rShiftTo(nsh, r); // Denormalize remainder\n\
    if (ts < 0) Int128.ZERO.subTo(r, r);\n\
  }\n\
  // (public) this mod a\n\
  function bnMod(a)\n\
  {\n\
    var r = nbi();\n\
    this.abs()\n\
      .divRemTo(a, null, r);\n\
    if (this.s < 0 && r.compareTo(Int128.ZERO) > 0) a.subTo(r, r);\n\
    return r;\n\
  }\n\
  // Modular reduction using \"classic\" algorithm\n\
  function Classic(m)\n\
  {\n\
    this.m = m;\n\
  }\n\
\n\
  function cConvert(x)\n\
  {\n\
    if (x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m);\n\
    else return x;\n\
  }\n\
\n\
  function cRevert(x)\n\
  {\n\
    return x;\n\
  }\n\
\n\
  function cReduce(x)\n\
  {\n\
    x.divRemTo(this.m, null, x);\n\
  }\n\
\n\
  function cMulTo(x, y, r)\n\
  {\n\
    x.multiplyTo(y, r);\n\
    this.reduce(r);\n\
  }\n\
\n\
  function cSqrTo(x, r)\n\
  {\n\
    x.squareTo(r);\n\
    this.reduce(r);\n\
  }\n\
  Classic.prototype.convert = cConvert;\n\
  Classic.prototype.revert = cRevert;\n\
  Classic.prototype.reduce = cReduce;\n\
  Classic.prototype.mulTo = cMulTo;\n\
  Classic.prototype.sqrTo = cSqrTo;\n\
  // (protected) return \"-1/this % 2^DB\"; useful for Mont. reduction\n\
  // justification:\n\
  //         xy == 1 (mod m)\n\
  //         xy =  1+km\n\
  //   xy(2-xy) = (1+km)(1-km)\n\
  // x[y(2-xy)] = 1-k^2m^2\n\
  // x[y(2-xy)] == 1 (mod m^2)\n\
  // if y is 1/x mod m, then y(2-xy) is 1/x mod m^2\n\
  // should reduce x and y(2-xy) by m^2 at each step to keep size bounded.\n\
  // JS multiply \"overflows\" differently from C/C++, so care is needed here.\n\
  function bnpInvDigit()\n\
  {\n\
    if (this.t < 1) return 0;\n\
    var x = this[0];\n\
    if ((x & 1) == 0) return 0;\n\
    var y = x & 3; // y == 1/x mod 2^2\n\
    y = (y * (2 - (x & 0xf) * y)) & 0xf; // y == 1/x mod 2^4\n\
    y = (y * (2 - (x & 0xff) * y)) & 0xff; // y == 1/x mod 2^8\n\
    y = (y * (2 - (((x & 0xffff) * y) & 0xffff))) & 0xffff; // y == 1/x mod 2^16\n\
    // last step - calculate inverse mod DV directly;\n\
    // assumes 16 < DB <= 32 and assumes ability to handle 48-bit ints\n\
    y = (y * (2 - x * y % this.DV)) % this.DV; // y == 1/x mod 2^dbits\n\
    // we really want the negative inverse, and -DV < y < DV\n\
    return (y > 0) ? this.DV - y : -y;\n\
  }\n\
  // Montgomery reduction\n\
  function Montgomery(m)\n\
  {\n\
    this.m = m;\n\
    this.mp = m.invDigit();\n\
    this.mpl = this.mp & 0x7fff;\n\
    this.mph = this.mp >> 15;\n\
    this.um = (1 << (m.DB - 15)) - 1;\n\
    this.mt2 = 2 * m.t;\n\
  }\n\
  // xR mod m\n\
  function montConvert(x)\n\
  {\n\
    var r = nbi();\n\
    x.abs()\n\
      .dlShiftTo(this.m.t, r);\n\
    r.divRemTo(this.m, null, r);\n\
    if (x.s < 0 && r.compareTo(Int128.ZERO) > 0) this.m.subTo(r, r);\n\
    return r;\n\
  }\n\
  // x/R mod m\n\
  function montRevert(x)\n\
  {\n\
    var r = nbi();\n\
    x.copyTo(r);\n\
    this.reduce(r);\n\
    return r;\n\
  }\n\
  // x = x/R mod m (HAC 14.32)\n\
  function montReduce(x)\n\
  {\n\
    while (x.t <= this.mt2) // pad x so am has enough room later\n\
    x[x.t++] = 0;\n\
    for (var i = 0; i < this.m.t; ++i)\n\
    {\n\
      // faster way of calculating u0 = x[i]*mp mod DV\n\
      var j = x[i] & 0x7fff;\n\
      var u0 = (j * this.mpl + (((j * this.mph + (x[i] >> 15) * this.mpl) & this.um) << 15)) & x.DM;\n\
      // use am to combine the multiply-shift-add into one call\n\
      j = i + this.m.t;\n\
      x[j] += this.m.am(0, u0, x, i, 0, this.m.t);\n\
      // propagate carry\n\
      while (x[j] >= x.DV)\n\
      {\n\
        x[j] -= x.DV;\n\
        x[++j]++;\n\
      }\n\
    }\n\
    x.clamp();\n\
    x.drShiftTo(this.m.t, x);\n\
    if (x.compareTo(this.m) >= 0) x.subTo(this.m, x);\n\
  }\n\
  // r = \"x^2/R mod m\"; x != r\n\
  function montSqrTo(x, r)\n\
  {\n\
    x.squareTo(r);\n\
    this.reduce(r);\n\
  }\n\
  // r = \"xy/R mod m\"; x,y != r\n\
  function montMulTo(x, y, r)\n\
  {\n\
    x.multiplyTo(y, r);\n\
    this.reduce(r);\n\
  }\n\
  Montgomery.prototype.convert = montConvert;\n\
  Montgomery.prototype.revert = montRevert;\n\
  Montgomery.prototype.reduce = montReduce;\n\
  Montgomery.prototype.mulTo = montMulTo;\n\
  Montgomery.prototype.sqrTo = montSqrTo;\n\
  // (protected) true iff this is even\n\
  function bnpIsEven()\n\
  {\n\
    return ((this.t > 0) ? (this[0] & 1) : this.s) == 0;\n\
  }\n\
  // (protected) this^e, e < 2^32, doing sqr and mul with \"r\" (HAC 14.79)\n\
  function bnpExp(e, z)\n\
  {\n\
    if (e > 0xffffffff || e < 1) return Int128.ONE;\n\
    var r = nbi(),\n\
      r2 = nbi(),\n\
      g = z.convert(this),\n\
      i = nbits(e) - 1;\n\
    g.copyTo(r);\n\
    while (--i >= 0)\n\
    {\n\
      z.sqrTo(r, r2);\n\
      if ((e & (1 << i)) > 0) z.mulTo(r2, g, r);\n\
      else\n\
      {\n\
        var t = r;\n\
        r = r2;\n\
        r2 = t;\n\
      }\n\
    }\n\
    return z.revert(r);\n\
  }\n\
  // (public) this^e % m, 0 <= e < 2^32\n\
  function bnModPowInt(e, m)\n\
  {\n\
    var z;\n\
    if (e < 256 || m.isEven()) z = new Classic(m);\n\
    else z = new Montgomery(m);\n\
    return this.exp(e, z);\n\
  }\n\
  // protected\n\
  Int128.prototype.copyTo = bnpCopyTo;\n\
  Int128.prototype.fromInt = bnpFromInt;\n\
  Int128.prototype.fromString = bnpFromString;\n\
  Int128.prototype.clamp = bnpClamp;\n\
  Int128.prototype.dlShiftTo = bnpDLShiftTo;\n\
  Int128.prototype.drShiftTo = bnpDRShiftTo;\n\
  Int128.prototype.lShiftTo = bnpLShiftTo;\n\
  Int128.prototype.rShiftTo = bnpRShiftTo;\n\
  Int128.prototype.subTo = bnpSubTo;\n\
  Int128.prototype.multiplyTo = bnpMultiplyTo;\n\
  Int128.prototype.squareTo = bnpSquareTo;\n\
  Int128.prototype.divRemTo = bnpDivRemTo;\n\
  Int128.prototype.invDigit = bnpInvDigit;\n\
  Int128.prototype.isEven = bnpIsEven;\n\
  Int128.prototype.exp = bnpExp;\n\
  // public\n\
  Int128.prototype.toString = bnToString;\n\
  Int128.prototype.negate = bnNegate;\n\
  Int128.prototype.abs = bnAbs;\n\
  Int128.prototype.compareTo = bnCompareTo;\n\
  Int128.prototype.bitLength = bnBitLength;\n\
  Int128.prototype.mod = bnMod;\n\
  Int128.prototype.modPowInt = bnModPowInt;\n\
  // \"constants\"\n\
  Int128.ZERO = nbv(0);\n\
  Int128.ONE = nbv(1);\n\
  // Copyright (c) 2005-2009  Tom Wu\n\
  // All Rights Reserved.\n\
  // See \"LICENSE\" for details.\n\
  // Extended JavaScript BN functions, required for RSA private ops.\n\
  // Version 1.1: new Int128(\"0\", 10) returns \"proper\" zero\n\
  // Version 1.2: square() API, isProbablePrime fix\n\
  // (public)\n\
  function bnClone()\n\
  {\n\
    var r = nbi();\n\
    this.copyTo(r);\n\
    return r;\n\
  }\n\
  // (public) return value as integer\n\
  function bnIntValue()\n\
  {\n\
    if (this.s < 0)\n\
    {\n\
      if (this.t == 1) return this[0] - this.DV;\n\
      else if (this.t == 0) return -1;\n\
    }\n\
    else if (this.t == 1) return this[0];\n\
    else if (this.t == 0) return 0;\n\
    // assumes 16 < DB < 32\n\
    return ((this[1] & ((1 << (32 - this.DB)) - 1)) << this.DB) | this[0];\n\
  }\n\
  // (public) return value as byte\n\
  function bnByteValue()\n\
  {\n\
    return (this.t == 0) ? this.s : (this[0] << 24) >> 24;\n\
  }\n\
  // (public) return value as short (assumes DB>=16)\n\
  function bnShortValue()\n\
  {\n\
    return (this.t == 0) ? this.s : (this[0] << 16) >> 16;\n\
  }\n\
  // (protected) return x s.t. r^x < DV\n\
  function bnpChunkSize(r)\n\
  {\n\
    return Math.floor(Math.LN2 * this.DB / Math.log(r));\n\
  }\n\
  // (public) 0 if this == 0, 1 if this > 0\n\
  function bnSigNum()\n\
  {\n\
    if (this.s < 0) return -1;\n\
    else if (this.t <= 0 || (this.t == 1 && this[0] <= 0)) return 0;\n\
    else return 1;\n\
  }\n\
  // (protected) convert to radix string\n\
  function bnpToRadix(b)\n\
  {\n\
    if (b == null) b = 10;\n\
    if (this.signum() == 0 || b < 2 || b > 36) return \"0\";\n\
    var cs = this.chunkSize(b);\n\
    var a = Math.pow(b, cs);\n\
    var d = nbv(a),\n\
      y = nbi(),\n\
      z = nbi(),\n\
      r = \"\";\n\
    this.divRemTo(d, y, z);\n\
    while (y.signum() > 0)\n\
    {\n\
      r = (a + z.intValue())\n\
        .toString(b)\n\
        .substr(1) + r;\n\
      y.divRemTo(d, y, z);\n\
    }\n\
    return z.intValue()\n\
      .toString(b) + r;\n\
  }\n\
  // (protected) convert from radix string\n\
  function bnpFromRadix(s, b)\n\
  {\n\
    this.fromInt(0);\n\
    if (b == null) b = 10;\n\
    var cs = this.chunkSize(b);\n\
    var d = Math.pow(b, cs),\n\
      mi = false,\n\
      j = 0,\n\
      w = 0;\n\
    for (var i = 0; i < s.length; ++i)\n\
    {\n\
      var x = intAt(s, i);\n\
      if (x < 0)\n\
      {\n\
        if (s.charAt(i) == \"-\" && this.signum() == 0) mi = true;\n\
        continue;\n\
      }\n\
      w = b * w + x;\n\
      if (++j >= cs)\n\
      {\n\
        this.dMultiply(d);\n\
        this.dAddOffset(w, 0);\n\
        j = 0;\n\
        w = 0;\n\
      }\n\
    }\n\
    if (j > 0)\n\
    {\n\
      this.dMultiply(Math.pow(b, j));\n\
      this.dAddOffset(w, 0);\n\
    }\n\
    if (mi) Int128.ZERO.subTo(this, this);\n\
  }\n\
  // (protected) alternate constructor\n\
  function bnpFromNumber(a, b, c)\n\
  {\n\
    if (\"number\" == typeof b)\n\
    {\n\
      // new Int128(int,int,RNG)\n\
      if (a < 2) this.fromInt(1);\n\
      else\n\
      {\n\
        this.fromNumber(a, c);\n\
        if (!this.testBit(a - 1)) // force MSB set\n\
        this.bitwiseTo(Int128.ONE.shiftLeft(a - 1), op_or, this);\n\
        if (this.isEven()) this.dAddOffset(1, 0); // force odd\n\
        while (!this.isProbablePrime(b))\n\
        {\n\
          this.dAddOffset(2, 0);\n\
          if (this.bitLength() > a) this.subTo(Int128.ONE.shiftLeft(a - 1), this);\n\
        }\n\
      }\n\
    }\n\
    else\n\
    {\n\
      // new Int128(int,RNG)\n\
      var x = [],\n\
        t = a & 7;\n\
      x.length = (a >> 3) + 1;\n\
      b.nextBytes(x);\n\
      if (t > 0) x[0] &= ((1 << t) - 1);\n\
      else x[0] = 0;\n\
      this.fromString(x, 256);\n\
    }\n\
  }\n\
  // (public) convert to bigendian byte array\n\
  function bnToByteArray()\n\
  {\n\
    var i = this.t,\n\
      r = [];\n\
    r[0] = this.s;\n\
    var p = this.DB - (i * this.DB) % 8,\n\
      d, k = 0;\n\
    if (i-- > 0)\n\
    {\n\
      if (p < this.DB && (d = this[i] >> p) != (this.s & this.DM) >> p) r[k++] = d | (this.s << (this.DB - p));\n\
      while (i >= 0)\n\
      {\n\
        if (p < 8)\n\
        {\n\
          d = (this[i] & ((1 << p) - 1)) << (8 - p);\n\
          d |= this[--i] >> (p += this.DB - 8);\n\
        }\n\
        else\n\
        {\n\
          d = (this[i] >> (p -= 8)) & 0xff;\n\
          if (p <= 0)\n\
          {\n\
            p += this.DB;\n\
            --i;\n\
          }\n\
        }\n\
        if ((d & 0x80) != 0) d |= -256;\n\
        if (k == 0 && (this.s & 0x80) != (d & 0x80))++k;\n\
        if (k > 0 || d != this.s) r[k++] = d;\n\
      }\n\
    }\n\
    return r;\n\
  }\n\
\n\
  function bnEquals(a)\n\
  {\n\
    return (this.compareTo(a) == 0);\n\
  }\n\
\n\
  function bnMin(a)\n\
  {\n\
    return (this.compareTo(a) < 0) ? this : a;\n\
  }\n\
\n\
  function bnMax(a)\n\
  {\n\
    return (this.compareTo(a) > 0) ? this : a;\n\
  }\n\
  // (protected) r = this op a (bitwise)\n\
  function bnpBitwiseTo(a, op, r)\n\
  {\n\
    var i, f, m = Math.min(a.t, this.t);\n\
    for (i = 0; i < m; ++i) r[i] = op(this[i], a[i]);\n\
    if (a.t < this.t)\n\
    {\n\
      f = a.s & this.DM;\n\
      for (i = m; i < this.t; ++i) r[i] = op(this[i], f);\n\
      r.t = this.t;\n\
    }\n\
    else\n\
    {\n\
      f = this.s & this.DM;\n\
      for (i = m; i < a.t; ++i) r[i] = op(f, a[i]);\n\
      r.t = a.t;\n\
    }\n\
    r.s = op(this.s, a.s);\n\
    r.clamp();\n\
  }\n\
  // (public) this & a\n\
  function op_and(x, y)\n\
  {\n\
    return x & y;\n\
  }\n\
\n\
  function bnAnd(a)\n\
  {\n\
    var r = nbi();\n\
    this.bitwiseTo(a, op_and, r);\n\
    return r;\n\
  }\n\
  // (public) this | a\n\
  function op_or(x, y)\n\
  {\n\
    return x | y;\n\
  }\n\
\n\
  function bnOr(a)\n\
  {\n\
    var r = nbi();\n\
    this.bitwiseTo(a, op_or, r);\n\
    return r;\n\
  }\n\
  // (public) this ^ a\n\
  function op_xor(x, y)\n\
  {\n\
    return x ^ y;\n\
  }\n\
\n\
  function bnXor(a)\n\
  {\n\
    var r = nbi();\n\
    this.bitwiseTo(a, op_xor, r);\n\
    return r;\n\
  }\n\
  // (public) this & ~a\n\
  function op_andnot(x, y)\n\
  {\n\
    return x & ~y;\n\
  }\n\
\n\
  function bnAndNot(a)\n\
  {\n\
    var r = nbi();\n\
    this.bitwiseTo(a, op_andnot, r);\n\
    return r;\n\
  }\n\
  // (public) ~this\n\
  function bnNot()\n\
  {\n\
    var r = nbi();\n\
    for (var i = 0; i < this.t; ++i) r[i] = this.DM & ~this[i];\n\
    r.t = this.t;\n\
    r.s = ~this.s;\n\
    return r;\n\
  }\n\
  // (public) this << n\n\
  function bnShiftLeft(n)\n\
  {\n\
    var r = nbi();\n\
    if (n < 0) this.rShiftTo(-n, r);\n\
    else this.lShiftTo(n, r);\n\
    return r;\n\
  }\n\
  // (public) this >> n\n\
  function bnShiftRight(n)\n\
  {\n\
    var r = nbi();\n\
    if (n < 0) this.lShiftTo(-n, r);\n\
    else this.rShiftTo(n, r);\n\
    return r;\n\
  }\n\
  // return index of lowest 1-bit in x, x < 2^31\n\
  function lbit(x)\n\
  {\n\
    if (x == 0) return -1;\n\
    var r = 0;\n\
    if ((x & 0xffff) == 0)\n\
    {\n\
      x >>= 16;\n\
      r += 16;\n\
    }\n\
    if ((x & 0xff) == 0)\n\
    {\n\
      x >>= 8;\n\
      r += 8;\n\
    }\n\
    if ((x & 0xf) == 0)\n\
    {\n\
      x >>= 4;\n\
      r += 4;\n\
    }\n\
    if ((x & 3) == 0)\n\
    {\n\
      x >>= 2;\n\
      r += 2;\n\
    }\n\
    if ((x & 1) == 0)++r;\n\
    return r;\n\
  }\n\
  // (public) returns index of lowest 1-bit (or -1 if none)\n\
  function bnGetLowestSetBit()\n\
  {\n\
    for (var i = 0; i < this.t; ++i)\n\
    if (this[i] != 0) return i * this.DB + lbit(this[i]);\n\
    if (this.s < 0) return this.t * this.DB;\n\
    return -1;\n\
  }\n\
  // return number of 1 bits in x\n\
  function cbit(x)\n\
  {\n\
    var r = 0;\n\
    while (x != 0)\n\
    {\n\
      x &= x - 1;\n\
      ++r;\n\
    }\n\
    return r;\n\
  }\n\
  // (public) return number of set bits\n\
  function bnBitCount()\n\
  {\n\
    var r = 0,\n\
      x = this.s & this.DM;\n\
    for (var i = 0; i < this.t; ++i) r += cbit(this[i] ^ x);\n\
    return r;\n\
  }\n\
  // (public) true iff nth bit is set\n\
  function bnTestBit(n)\n\
  {\n\
    var j = Math.floor(n / this.DB);\n\
    if (j >= this.t) return (this.s != 0);\n\
    return ((this[j] & (1 << (n % this.DB))) != 0);\n\
  }\n\
  // (protected) this op (1<<n)\n\
  function bnpChangeBit(n, op)\n\
  {\n\
    var r = Int128.ONE.shiftLeft(n);\n\
    this.bitwiseTo(r, op, r);\n\
    return r;\n\
  }\n\
  // (public) this | (1<<n)\n\
  function bnSetBit(n)\n\
  {\n\
    return this.changeBit(n, op_or);\n\
  }\n\
  // (public) this & ~(1<<n)\n\
  function bnClearBit(n)\n\
  {\n\
    return this.changeBit(n, op_andnot);\n\
  }\n\
  // (public) this ^ (1<<n)\n\
  function bnFlipBit(n)\n\
  {\n\
    return this.changeBit(n, op_xor);\n\
  }\n\
  // (protected) r = this + a\n\
  function bnpAddTo(a, r)\n\
  {\n\
    var i = 0,\n\
      c = 0,\n\
      m = Math.min(a.t, this.t);\n\
    while (i < m)\n\
    {\n\
      c += this[i] + a[i];\n\
      r[i++] = c & this.DM;\n\
      c >>= this.DB;\n\
    }\n\
    if (a.t < this.t)\n\
    {\n\
      c += a.s;\n\
      while (i < this.t)\n\
      {\n\
        c += this[i];\n\
        r[i++] = c & this.DM;\n\
        c >>= this.DB;\n\
      }\n\
      c += this.s;\n\
    }\n\
    else\n\
    {\n\
      c += this.s;\n\
      while (i < a.t)\n\
      {\n\
        c += a[i];\n\
        r[i++] = c & this.DM;\n\
        c >>= this.DB;\n\
      }\n\
      c += a.s;\n\
    }\n\
    r.s = (c < 0) ? -1 : 0;\n\
    if (c > 0) r[i++] = c;\n\
    else if (c < -1) r[i++] = this.DV + c;\n\
    r.t = i;\n\
    r.clamp();\n\
  }\n\
  // (public) this + a\n\
  function bnAdd(a)\n\
  {\n\
    var r = nbi();\n\
    this.addTo(a, r);\n\
    return r;\n\
  }\n\
  // (public) this - a\n\
  function bnSubtract(a)\n\
  {\n\
    var r = nbi();\n\
    this.subTo(a, r);\n\
    return r;\n\
  }\n\
  // (public) this * a\n\
  function bnMultiply(a)\n\
  {\n\
    var r = nbi();\n\
    this.multiplyTo(a, r);\n\
    return r;\n\
  }\n\
  // (public) this^2\n\
  function bnSquare()\n\
  {\n\
    var r = nbi();\n\
    this.squareTo(r);\n\
    return r;\n\
  }\n\
  // (public) this / a\n\
  function bnDivide(a)\n\
  {\n\
    var r = nbi();\n\
    this.divRemTo(a, r, null);\n\
    return r;\n\
  }\n\
  // (public) this % a\n\
  function bnRemainder(a)\n\
  {\n\
    var r = nbi();\n\
    this.divRemTo(a, null, r);\n\
    return r;\n\
  }\n\
  // (public) [this/a,this%a]\n\
  function bnDivideAndRemainder(a)\n\
  {\n\
    var q = nbi(),\n\
      r = nbi();\n\
    this.divRemTo(a, q, r);\n\
    return new Array(q, r);\n\
  }\n\
  // (protected) this *= n, this >= 0, 1 < n < DV\n\
  function bnpDMultiply(n)\n\
  {\n\
    this[this.t] = this.am(0, n - 1, this, 0, 0, this.t);\n\
    ++this.t;\n\
    this.clamp();\n\
  }\n\
  // (protected) this += n << w words, this >= 0\n\
  function bnpDAddOffset(n, w)\n\
  {\n\
    if (n == 0) return;\n\
    while (this.t <= w) this[this.t++] = 0;\n\
    this[w] += n;\n\
    while (this[w] >= this.DV)\n\
    {\n\
      this[w] -= this.DV;\n\
      if (++w >= this.t) this[this.t++] = 0;\n\
      ++this[w];\n\
    }\n\
  }\n\
  // A \"null\" reducer\n\
  function NullExp()\n\
  {}\n\
\n\
  function nNop(x)\n\
  {\n\
    return x;\n\
  }\n\
\n\
  function nMulTo(x, y, r)\n\
  {\n\
    x.multiplyTo(y, r);\n\
  }\n\
\n\
  function nSqrTo(x, r)\n\
  {\n\
    x.squareTo(r);\n\
  }\n\
  NullExp.prototype.convert = nNop;\n\
  NullExp.prototype.revert = nNop;\n\
  NullExp.prototype.mulTo = nMulTo;\n\
  NullExp.prototype.sqrTo = nSqrTo;\n\
  // (public) this^e\n\
  function bnPow(e)\n\
  {\n\
    return this.exp(e, new NullExp());\n\
  }\n\
  // (protected) r = lower n words of \"this * a\", a.t <= n\n\
  // \"this\" should be the larger one if appropriate.\n\
  function bnpMultiplyLowerTo(a, n, r)\n\
  {\n\
    var i = Math.min(this.t + a.t, n);\n\
    r.s = 0; // assumes a,this >= 0\n\
    r.t = i;\n\
    while (i > 0) r[--i] = 0;\n\
    var j;\n\
    for (j = r.t - this.t; i < j; ++i) r[i + this.t] = this.am(0, a[i], r, i, 0, this.t);\n\
    for (j = Math.min(a.t, n); i < j; ++i) this.am(0, a[i], r, i, 0, n - i);\n\
    r.clamp();\n\
  }\n\
  // (protected) r = \"this * a\" without lower n words, n > 0\n\
  // \"this\" should be the larger one if appropriate.\n\
  function bnpMultiplyUpperTo(a, n, r)\n\
  {\n\
    --n;\n\
    var i = r.t = this.t + a.t - n;\n\
    r.s = 0; // assumes a,this >= 0\n\
    while (--i >= 0) r[i] = 0;\n\
    for (i = Math.max(n - this.t, 0); i < a.t; ++i)\n\
    r[this.t + i - n] = this.am(n - i, a[i], r, 0, 0, this.t + i - n);\n\
    r.clamp();\n\
    r.drShiftTo(1, r);\n\
  }\n\
  // Barrett modular reduction\n\
  function Barrett(m)\n\
  {\n\
    // setup Barrett\n\
    this.r2 = nbi();\n\
    this.q3 = nbi();\n\
    Int128.ONE.dlShiftTo(2 * m.t, this.r2);\n\
    this.mu = this.r2.divide(m);\n\
    this.m = m;\n\
  }\n\
\n\
  function barrettConvert(x)\n\
  {\n\
    if (x.s < 0 || x.t > 2 * this.m.t) return x.mod(this.m);\n\
    else if (x.compareTo(this.m) < 0) return x;\n\
    else\n\
    {\n\
      var r = nbi();\n\
      x.copyTo(r);\n\
      this.reduce(r);\n\
      return r;\n\
    }\n\
  }\n\
\n\
  function barrettRevert(x)\n\
  {\n\
    return x;\n\
  }\n\
  // x = x mod m (HAC 14.42)\n\
  function barrettReduce(x)\n\
  {\n\
    x.drShiftTo(this.m.t - 1, this.r2);\n\
    if (x.t > this.m.t + 1)\n\
    {\n\
      x.t = this.m.t + 1;\n\
      x.clamp();\n\
    }\n\
    this.mu.multiplyUpperTo(this.r2, this.m.t + 1, this.q3);\n\
    this.m.multiplyLowerTo(this.q3, this.m.t + 1, this.r2);\n\
    while (x.compareTo(this.r2) < 0) x.dAddOffset(1, this.m.t + 1);\n\
    x.subTo(this.r2, x);\n\
    while (x.compareTo(this.m) >= 0) x.subTo(this.m, x);\n\
  }\n\
  // r = x^2 mod m; x != r\n\
  function barrettSqrTo(x, r)\n\
  {\n\
    x.squareTo(r);\n\
    this.reduce(r);\n\
  }\n\
  // r = x*y mod m; x,y != r\n\
  function barrettMulTo(x, y, r)\n\
  {\n\
    x.multiplyTo(y, r);\n\
    this.reduce(r);\n\
  }\n\
  Barrett.prototype.convert = barrettConvert;\n\
  Barrett.prototype.revert = barrettRevert;\n\
  Barrett.prototype.reduce = barrettReduce;\n\
  Barrett.prototype.mulTo = barrettMulTo;\n\
  Barrett.prototype.sqrTo = barrettSqrTo;\n\
  // (public) this^e % m (HAC 14.85)\n\
  function bnModPow(e, m)\n\
  {\n\
    var i = e.bitLength(),\n\
      k, r = nbv(1),\n\
      z;\n\
    if (i <= 0) return r;\n\
    else if (i < 18) k = 1;\n\
    else if (i < 48) k = 3;\n\
    else if (i < 144) k = 4;\n\
    else if (i < 768) k = 5;\n\
    else k = 6;\n\
    if (i < 8) z = new Classic(m);\n\
    else if (m.isEven()) z = new Barrett(m);\n\
    else z = new Montgomery(m);\n\
    // precomputation\n\
    var g = [],\n\
      n = 3,\n\
      k1 = k - 1,\n\
      km = (1 << k) - 1;\n\
    g[1] = z.convert(this);\n\
    if (k > 1)\n\
    {\n\
      var g2 = nbi();\n\
      z.sqrTo(g[1], g2);\n\
      while (n <= km)\n\
      {\n\
        g[n] = nbi();\n\
        z.mulTo(g2, g[n - 2], g[n]);\n\
        n += 2;\n\
      }\n\
    }\n\
    var j = e.t - 1,\n\
      w, is1 = true,\n\
      r2 = nbi(),\n\
      t;\n\
    i = nbits(e[j]) - 1;\n\
    while (j >= 0)\n\
    {\n\
      if (i >= k1) w = (e[j] >> (i - k1)) & km;\n\
      else\n\
      {\n\
        w = (e[j] & ((1 << (i + 1)) - 1)) << (k1 - i);\n\
        if (j > 0) w |= e[j - 1] >> (this.DB + i - k1);\n\
      }\n\
      n = k;\n\
      while ((w & 1) == 0)\n\
      {\n\
        w >>= 1;\n\
        --n;\n\
      }\n\
      if ((i -= n) < 0)\n\
      {\n\
        i += this.DB;\n\
        --j;\n\
      }\n\
      if (is1)\n\
      { // ret == 1, don't bother squaring or multiplying it\n\
        g[w].copyTo(r);\n\
        is1 = false;\n\
      }\n\
      else\n\
      {\n\
        while (n > 1)\n\
        {\n\
          z.sqrTo(r, r2);\n\
          z.sqrTo(r2, r);\n\
          n -= 2;\n\
        }\n\
        if (n > 0) z.sqrTo(r, r2);\n\
        else\n\
        {\n\
          t = r;\n\
          r = r2;\n\
          r2 = t;\n\
        }\n\
        z.mulTo(r2, g[w], r);\n\
      }\n\
      while (j >= 0 && (e[j] & (1 << i)) == 0)\n\
      {\n\
        z.sqrTo(r, r2);\n\
        t = r;\n\
        r = r2;\n\
        r2 = t;\n\
        if (--i < 0)\n\
        {\n\
          i = this.DB - 1;\n\
          --j;\n\
        }\n\
      }\n\
    }\n\
    return z.revert(r);\n\
  }\n\
  // (public) gcd(this,a) (HAC 14.54)\n\
  function bnGCD(a)\n\
  {\n\
    var x = (this.s < 0) ? this.negate() : this.clone();\n\
    var y = (a.s < 0) ? a.negate() : a.clone();\n\
    if (x.compareTo(y) < 0)\n\
    {\n\
      var t = x;\n\
      x = y;\n\
      y = t;\n\
    }\n\
    var i = x.getLowestSetBit(),\n\
      g = y.getLowestSetBit();\n\
    if (g < 0) return x;\n\
    if (i < g) g = i;\n\
    if (g > 0)\n\
    {\n\
      x.rShiftTo(g, x);\n\
      y.rShiftTo(g, y);\n\
    }\n\
    while (x.signum() > 0)\n\
    {\n\
      if ((i = x.getLowestSetBit()) > 0) x.rShiftTo(i, x);\n\
      if ((i = y.getLowestSetBit()) > 0) y.rShiftTo(i, y);\n\
      if (x.compareTo(y) >= 0)\n\
      {\n\
        x.subTo(y, x);\n\
        x.rShiftTo(1, x);\n\
      }\n\
      else\n\
      {\n\
        y.subTo(x, y);\n\
        y.rShiftTo(1, y);\n\
      }\n\
    }\n\
    if (g > 0) y.lShiftTo(g, y);\n\
    return y;\n\
  }\n\
  // (protected) this % n, n < 2^26\n\
  function bnpModInt(n)\n\
  {\n\
    if (n <= 0) return 0;\n\
    var d = this.DV % n,\n\
      r = (this.s < 0) ? n - 1 : 0;\n\
    if (this.t > 0) if (d == 0) r = this[0] % n;\n\
    else for (var i = this.t - 1; i >= 0; --i) r = (d * r + this[i]) % n;\n\
    return r;\n\
  }\n\
  // (public) 1/this % m (HAC 14.61)\n\
  function bnModInverse(m)\n\
  {\n\
    var ac = m.isEven();\n\
    if ((this.isEven() && ac) || m.signum() == 0) return Int128.ZERO;\n\
    var u = m.clone(),\n\
      v = this.clone();\n\
    var a = nbv(1),\n\
      b = nbv(0),\n\
      c = nbv(0),\n\
      d = nbv(1);\n\
    while (u.signum() != 0)\n\
    {\n\
      while (u.isEven())\n\
      {\n\
        u.rShiftTo(1, u);\n\
        if (ac)\n\
        {\n\
          if (!a.isEven() || !b.isEven())\n\
          {\n\
            a.addTo(this, a);\n\
            b.subTo(m, b);\n\
          }\n\
          a.rShiftTo(1, a);\n\
        }\n\
        else if (!b.isEven()) b.subTo(m, b);\n\
        b.rShiftTo(1, b);\n\
      }\n\
      while (v.isEven())\n\
      {\n\
        v.rShiftTo(1, v);\n\
        if (ac)\n\
        {\n\
          if (!c.isEven() || !d.isEven())\n\
          {\n\
            c.addTo(this, c);\n\
            d.subTo(m, d);\n\
          }\n\
          c.rShiftTo(1, c);\n\
        }\n\
        else if (!d.isEven()) d.subTo(m, d);\n\
        d.rShiftTo(1, d);\n\
      }\n\
      if (u.compareTo(v) >= 0)\n\
      {\n\
        u.subTo(v, u);\n\
        if (ac) a.subTo(c, a);\n\
        b.subTo(d, b);\n\
      }\n\
      else\n\
      {\n\
        v.subTo(u, v);\n\
        if (ac) c.subTo(a, c);\n\
        d.subTo(b, d);\n\
      }\n\
    }\n\
    if (v.compareTo(Int128.ONE) != 0) return Int128.ZERO;\n\
    if (d.compareTo(m) >= 0) return d.subtract(m);\n\
    if (d.signum() < 0) d.addTo(m, d);\n\
    else return d;\n\
    if (d.signum() < 0) return d.add(m);\n\
    else return d;\n\
  }\n\
  var lowprimes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293, 307, 311, 313, 317, 331, 337, 347, 349, 353, 359, 367, 373, 379, 383, 389, 397, 401, 409, 419, 421, 431, 433, 439, 443, 449, 457, 461, 463, 467, 479, 487, 491, 499, 503, 509, 521, 523, 541, 547, 557, 563, 569, 571, 577, 587, 593, 599, 601, 607, 613, 617, 619, 631, 641, 643, 647, 653, 659, 661, 673, 677, 683, 691, 701, 709, 719, 727, 733, 739, 743, 751, 757, 761, 769, 773, 787, 797, 809, 811, 821, 823, 827, 829, 839, 853, 857, 859, 863, 877, 881, 883, 887, 907, 911, 919, 929, 937, 941, 947, 953, 967, 971, 977, 983, 991, 997];\n\
  var lplim = (1 << 26) / lowprimes[lowprimes.length - 1];\n\
  // (public) test primality with certainty >= 1-.5^t\n\
  function bnIsProbablePrime(t)\n\
  {\n\
    var i, x = this.abs();\n\
    if (x.t == 1 && x[0] <= lowprimes[lowprimes.length - 1])\n\
    {\n\
      for (i = 0; i < lowprimes.length; ++i)\n\
      if (x[0] == lowprimes[i]) return true;\n\
      return false;\n\
    }\n\
    if (x.isEven()) return false;\n\
    i = 1;\n\
    while (i < lowprimes.length)\n\
    {\n\
      var m = lowprimes[i],\n\
        j = i + 1;\n\
      while (j < lowprimes.length && m < lplim) m *= lowprimes[j++];\n\
      m = x.modInt(m);\n\
      while (i < j) if (m % lowprimes[i++] == 0) return false;\n\
    }\n\
    return x.millerRabin(t);\n\
  }\n\
  // (protected) true if probably prime (HAC 4.24, Miller-Rabin)\n\
  function bnpMillerRabin(t)\n\
  {\n\
    var n1 = this.subtract(Int128.ONE);\n\
    var k = n1.getLowestSetBit();\n\
    if (k <= 0) return false;\n\
    var r = n1.shiftRight(k);\n\
    t = (t + 1) >> 1;\n\
    if (t > lowprimes.length) t = lowprimes.length;\n\
    var a = nbi();\n\
    for (var i = 0; i < t; ++i)\n\
    {\n\
      //Pick bases at random, instead of starting at 2\n\
      a.fromInt(lowprimes[Math.floor(Math.random() * lowprimes.length)]);\n\
      var y = a.modPow(r, this);\n\
      if (y.compareTo(Int128.ONE) != 0 && y.compareTo(n1) != 0)\n\
      {\n\
        var j = 1;\n\
        while (j++ < k && y.compareTo(n1) != 0)\n\
        {\n\
          y = y.modPowInt(2, this);\n\
          if (y.compareTo(Int128.ONE) == 0) return false;\n\
        }\n\
        if (y.compareTo(n1) != 0) return false;\n\
      }\n\
    }\n\
    return true;\n\
  }\n\
  // protected\n\
  Int128.prototype.chunkSize = bnpChunkSize;\n\
  Int128.prototype.toRadix = bnpToRadix;\n\
  Int128.prototype.fromRadix = bnpFromRadix;\n\
  Int128.prototype.fromNumber = bnpFromNumber;\n\
  Int128.prototype.bitwiseTo = bnpBitwiseTo;\n\
  Int128.prototype.changeBit = bnpChangeBit;\n\
  Int128.prototype.addTo = bnpAddTo;\n\
  Int128.prototype.dMultiply = bnpDMultiply;\n\
  Int128.prototype.dAddOffset = bnpDAddOffset;\n\
  Int128.prototype.multiplyLowerTo = bnpMultiplyLowerTo;\n\
  Int128.prototype.multiplyUpperTo = bnpMultiplyUpperTo;\n\
  Int128.prototype.modInt = bnpModInt;\n\
  Int128.prototype.millerRabin = bnpMillerRabin;\n\
  // public\n\
  Int128.prototype.clone = bnClone;\n\
  Int128.prototype.intValue = bnIntValue;\n\
  Int128.prototype.byteValue = bnByteValue;\n\
  Int128.prototype.shortValue = bnShortValue;\n\
  Int128.prototype.signum = bnSigNum;\n\
  Int128.prototype.toByteArray = bnToByteArray;\n\
  Int128.prototype.equals = bnEquals;\n\
  Int128.prototype.min = bnMin;\n\
  Int128.prototype.max = bnMax;\n\
  Int128.prototype.and = bnAnd;\n\
  Int128.prototype.or = bnOr;\n\
  Int128.prototype.xor = bnXor;\n\
  Int128.prototype.andNot = bnAndNot;\n\
  Int128.prototype.not = bnNot;\n\
  Int128.prototype.shiftLeft = bnShiftLeft;\n\
  Int128.prototype.shiftRight = bnShiftRight;\n\
  Int128.prototype.getLowestSetBit = bnGetLowestSetBit;\n\
  Int128.prototype.bitCount = bnBitCount;\n\
  Int128.prototype.testBit = bnTestBit;\n\
  Int128.prototype.setBit = bnSetBit;\n\
  Int128.prototype.clearBit = bnClearBit;\n\
  Int128.prototype.flipBit = bnFlipBit;\n\
  Int128.prototype.add = bnAdd;\n\
  Int128.prototype.subtract = bnSubtract;\n\
  Int128.prototype.multiply = bnMultiply;\n\
  Int128.prototype.divide = bnDivide;\n\
  Int128.prototype.remainder = bnRemainder;\n\
  Int128.prototype.divideAndRemainder = bnDivideAndRemainder;\n\
  Int128.prototype.modPow = bnModPow;\n\
  Int128.prototype.modInverse = bnModInverse;\n\
  Int128.prototype.pow = bnPow;\n\
  Int128.prototype.gcd = bnGCD;\n\
  Int128.prototype.isProbablePrime = bnIsProbablePrime;\n\
  // JSBN-specific extension\n\
  Int128.prototype.square = bnSquare;\n\
  \n\
  // end of Int128 section\n\
  \n\
  /*\n\
  // Uncomment the following two lines if you want to use Int128 outside ClipperLib\n\
  if (typeof(document) !== \"undefined\") window.Int128 = Int128;\n\
  else self.Int128 = Int128;\n\
  */\n\
  \n\
  // Here starts the actual Clipper library:\n\
  ClipperLib.Math_Abs_Int64 = ClipperLib.Math_Abs_Int32 = ClipperLib.Math_Abs_Double = function (a)\n\
  {\n\
    return Math.abs(a);\n\
  };\n\
  ClipperLib.Math_Max_Int32_Int32 = function (a, b)\n\
  {\n\
    return Math.max(a, b);\n\
  };\n\
  /*\n\
  -----------------------------------\n\
  cast_32 speedtest: http://jsperf.com/truncate-float-to-integer/2\n\
  -----------------------------------\n\
  */\n\
  if (browser.msie || browser.opera || browser.safari) ClipperLib.Cast_Int32 = function (a) {\n\
    return a | 0;\n\
  };\n\
  else ClipperLib.Cast_Int32 = function (a) { // eg. browser.chrome || browser.chromium || browser.firefox\n\
    return ~~a;\n\
  };\n\
  /*\n\
  --------------------------\n\
  cast_64 speedtests: http://jsperf.com/truncate-float-to-integer\n\
  Chrome: bitwise_not_floor\n\
  Firefox17: toInteger (typeof test)\n\
  IE9: bitwise_or_floor\n\
  IE7 and IE8: to_parseint\n\
  Chromium: to_floor_or_ceil\n\
  Firefox3: to_floor_or_ceil\n\
  Firefox15: to_floor_or_ceil\n\
  Opera: to_floor_or_ceil\n\
  Safari: to_floor_or_ceil\n\
  --------------------------\n\
  */\n\
  if (browser.chrome) ClipperLib.Cast_Int64 = function (a) {\n\
    if (a < -2147483648 || a > 2147483647)\n\
    return a < 0 ? Math.ceil(a): Math.floor(a);\n\
    else return ~~a;\n\
  };\n\
  else if (browser.firefox && typeof(Number.toInteger) == \"function\") ClipperLib.Cast_Int64 = function(a) {\n\
    return Number.toInteger(a);\n\
  };\n\
  else if (browser.msie7 || browser.msie8) ClipperLib.Cast_Int64 = function(a) {\n\
    return parseInt(a, 10);\n\
  };\n\
  else if (browser.msie) ClipperLib.Cast_Int64 = function (a) {\n\
    if (a < -2147483648 || a > 2147483647)\n\
    return a < 0 ? Math.ceil(a): Math.floor(a);\n\
    return a | 0;\n\
  };\n\
  // eg. browser.chromium || browser.firefox || browser.opera || browser.safari\n\
  else ClipperLib.Cast_Int64 = function(a) {\n\
    return a < 0 ? Math.ceil(a): Math.floor(a);\n\
  };\n\
  ClipperLib.Clear = function (a)\n\
  {\n\
    a.length = 0;\n\
  };\n\
  ClipperLib.MaxSteps = 64; // How many steps at maximum in arc in BuildArc() function\n\
  ClipperLib.PI = 3.141592653589793;\n\
  ClipperLib.PI2 = 2 * 3.141592653589793;\n\
  ClipperLib.IntPoint = function ()\n\
  {\n\
    var a = arguments;\n\
    if (a.length == 1)\n\
    {\n\
      this.X = a[0].X;\n\
      this.Y = a[0].Y;\n\
\n\
    }\n\
    if (a.length == 2)\n\
    {\n\
      this.X = a[0];\n\
      this.Y = a[1];\n\
    }\n\
  };\n\
  ClipperLib.IntRect = function ()\n\
  {\n\
    var a = arguments;\n\
    if (a.length == 4) // function (l, t, r, b)\n\
    {\n\
      var l = a[0],\n\
        t = a[1],\n\
        r = a[2],\n\
        b = a[3];\n\
      this.left = l;\n\
      this.top = t;\n\
      this.right = r;\n\
      this.bottom = b;\n\
    }\n\
    else\n\
    {\n\
      this.left = 0;\n\
      this.top = 0;\n\
      this.right = 0;\n\
      this.bottom = 0;\n\
    }\n\
  };\n\
  ClipperLib.Polygon = function ()\n\
  {\n\
    return [];\n\
  };\n\
  ClipperLib.Polygons = function ()\n\
  {\n\
    return []; // Was previously [[]], but caused problems when pushed\n\
  };\n\
  ClipperLib.ExPolygons = function ()\n\
  {\n\
    var a = [];\n\
    a.exPolygons = true; // this is needed to make \"overloading\" possible in Execute\n\
    return a;\n\
  }  \n\
  ClipperLib.ExPolygon = function ()\n\
  {\n\
    this.outer = null;\n\
    this.holes = null;\n\
  };\n\
  ClipperLib.ClipType = {\n\
    ctIntersection: 0,\n\
    ctUnion: 1,\n\
    ctDifference: 2,\n\
    ctXor: 3\n\
  };\n\
  ClipperLib.PolyType = {\n\
    ptSubject: 0,\n\
    ptClip: 1\n\
  };\n\
  ClipperLib.PolyFillType = {\n\
    pftEvenOdd: 0,\n\
    pftNonZero: 1,\n\
    pftPositive: 2,\n\
    pftNegative: 3\n\
  };\n\
  ClipperLib.JoinType = {\n\
    jtSquare: 0,\n\
    jtRound: 1,\n\
    jtMiter: 2\n\
  };\n\
  \n\
  ClipperLib.EdgeSide = {\n\
    esLeft: 1,\n\
    esRight: 2\n\
  };\n\
  ClipperLib.Protects = {\n\
    ipNone: 0,\n\
    ipLeft: 1,\n\
    ipRight: 2,\n\
    ipBoth: 3\n\
  };\n\
  ClipperLib.Direction = {\n\
    dRightToLeft: 0,\n\
    dLeftToRight: 1\n\
  };\n\
  ClipperLib.TEdge = function ()\n\
  {\n\
    this.xbot = 0;\n\
    this.ybot = 0;\n\
    this.xcurr = 0;\n\
    this.ycurr = 0;\n\
    this.xtop = 0;\n\
    this.ytop = 0;\n\
    this.dx = 0;\n\
    this.deltaX = 0;\n\
    this.deltaY = 0;\n\
    this.tmpX = 0;\n\
    this.polyType = ClipperLib.PolyType.ptSubject;\n\
    this.side = null; //= ClipperLib.EdgeSide.esNeither;\n\
    this.windDelta = 0;\n\
    this.windCnt = 0;\n\
    this.windCnt2 = 0;\n\
    this.outIdx = 0;\n\
    this.next = null;\n\
    this.prev = null;\n\
    this.nextInLML = null;\n\
    this.nextInAEL = null;\n\
    this.prevInAEL = null;\n\
    this.nextInSEL = null;\n\
    this.prevInSEL = null;\n\
  };\n\
  ClipperLib.IntersectNode = function ()\n\
  {\n\
    this.edge1 = null;\n\
    this.edge2 = null;\n\
    this.pt = null;\n\
    this.next = null;\n\
  };\n\
  ClipperLib.LocalMinima = function ()\n\
  {\n\
    this.Y = 0;\n\
    this.leftBound = null;\n\
    this.rightBound = null;\n\
    this.next = null;\n\
  };\n\
  ClipperLib.Scanbeam = function ()\n\
  {\n\
    this.Y = 0;\n\
    this.next = null;\n\
  };\n\
  ClipperLib.OutRec = function ()\n\
  {\n\
    this.idx = 0;\n\
    this.isHole = false;\n\
    this.FirstLeft = null;\n\
    this.AppendLink = null;\n\
    this.pts = null;\n\
    this.bottomPt = null;\n\
  };\n\
  ClipperLib.OutPt = function ()\n\
  {\n\
    this.idx = 0;\n\
    this.pt = null;\n\
    this.next = null;\n\
    this.prev = null;\n\
  };\n\
  ClipperLib.JoinRec = function ()\n\
  {\n\
    this.pt1a = null;\n\
    this.pt1b = null;\n\
    this.poly1Idx = 0;\n\
    this.pt2a = null;\n\
    this.pt2b = null;\n\
    this.poly2Idx = 0;\n\
  };\n\
  ClipperLib.HorzJoinRec = function ()\n\
  {\n\
    this.edge = null;\n\
    this.savedIdx = 0;\n\
  };\n\
  ClipperLib.ClipperBase = function ()\n\
  {\n\
    this.m_MinimaList = null;\n\
    this.m_CurrentLM = null;\n\
    this.m_edges = [\n\
      []\n\
    ]; // 2-dimensional array\n\
    this.m_UseFullRange = false;\n\
  };\n\
  // Ranges are in original C# too high for Javascript (in current state 2012 December):\n\
  // protected const double horizontal = -3.4E+38;\n\
  // internal const Int64 loRange = 0x3FFFFFFF; // = 1073741823 = sqrt(2^63 -1)/2\n\
  // internal const Int64 hiRange = 0x3FFFFFFFFFFFFFFFL; // = 4611686018427387903 = sqrt(2^127 -1)/2\n\
  // So had to adjust them to more suitable:\n\
  ClipperLib.ClipperBase.horizontal = -9007199254740992; //-2^53\n\
  ClipperLib.ClipperBase.loRange = 47453132; // sqrt(2^53 -1)/2\n\
  ClipperLib.ClipperBase.hiRange = 4503599627370495; // sqrt(2^106 -1)/2\n\
  // If JS some day supports truly 64-bit integers, then these ranges can be as in C#\n\
  // and biginteger library can be more simpler (as then 128bit can be represented as two 64bit numbers)\n\
  ClipperLib.ClipperBase.PointsEqual = function (pt1, pt2)\n\
  {\n\
    return (pt1.X == pt2.X && pt1.Y == pt2.Y);\n\
  };\n\
  ClipperLib.ClipperBase.prototype.PointIsVertex = function (pt, pp)\n\
  {\n\
    var pp2 = pp;\n\
    do {\n\
      if (ClipperLib.ClipperBase.PointsEqual(pp2.pt, pt)) return true;\n\
      pp2 = pp2.next;\n\
    }\n\
    while (pp2 != pp);\n\
    return false;\n\
  };\n\
  ClipperLib.ClipperBase.prototype.PointInPolygon = function (pt, pp, UseFulllongRange)\n\
  {\n\
    var pp2 = pp;\n\
    var result = false;\n\
    if (UseFulllongRange)\n\
    {\n\
      do {\n\
        if ((((pp2.pt.Y <= pt.Y) && (pt.Y < pp2.prev.pt.Y)) || ((pp2.prev.pt.Y <= pt.Y) && (pt.Y < pp2.pt.Y))) && new Int128(pt.X - pp2.pt.X)\n\
          .compareTo(\n\
        new Int128(pp2.prev.pt.X - pp2.pt.X)\n\
          .multiply(new Int128(pt.Y - pp2.pt.Y))\n\
          .divide(\n\
        new Int128(pp2.prev.pt.Y - pp2.pt.Y))) < 0) result = !result;\n\
        pp2 = pp2.next;\n\
      }\n\
      while (pp2 != pp);\n\
    }\n\
    else\n\
    {\n\
      do {\n\
        if ((((pp2.pt.Y <= pt.Y) && (pt.Y < pp2.prev.pt.Y)) || ((pp2.prev.pt.Y <= pt.Y) && (pt.Y < pp2.pt.Y))) && (pt.X - pp2.pt.X < (pp2.prev.pt.X - pp2.pt.X) * (pt.Y - pp2.pt.Y) / (pp2.prev.pt.Y - pp2.pt.Y))) result = !result;\n\
        pp2 = pp2.next;\n\
      }\n\
      while (pp2 != pp);\n\
    }\n\
    return result;\n\
  };\n\
  ClipperLib.ClipperBase.prototype.SlopesEqual = ClipperLib.ClipperBase.SlopesEqual = function ()\n\
  {\n\
    var a = arguments;\n\
    var e1, e2, pt1, pt2, pt3, pt4, UseFullRange;\n\
    if (a.length == 3) // function (e1, e2, UseFullRange)\n\
    {\n\
      e1 = a[0], e2 = a[1], UseFullRange = a[2];\n\
      if (UseFullRange) return new Int128(e1.deltaY)\n\
        .multiply(new Int128(e2.deltaX))\n\
        .toString() == new Int128(e1.deltaX)\n\
        .multiply(new Int128(e2.deltaY))\n\
        .toString();\n\
      else return (e1.deltaY) * (e2.deltaX) == (e1.deltaX) * (e2.deltaY);\n\
    }\n\
    else if (a.length == 4) // function (pt1, pt2, pt3, UseFullRange)\n\
    {\n\
      pt1 = a[0], pt2 = a[1], pt3 = a[2], UseFullRange = a[3];\n\
      if (UseFullRange) return new Int128(pt1.Y - pt2.Y)\n\
        .multiply(new Int128(pt2.X - pt3.X))\n\
        .toString() == new Int128(pt1.X - pt2.X)\n\
        .multiply(new Int128(pt2.Y - pt3.Y))\n\
        .toString();\n\
      else return (pt1.Y - pt2.Y) * (pt2.X - pt3.X) - (pt1.X - pt2.X) * (pt2.Y - pt3.Y) == 0;\n\
    }\n\
    else if (a.length == 5) // function (pt1, pt2, pt3, pt4, UseFullRange)\n\
    {\n\
      pt1 = a[0], pt2 = a[1], pt3 = a[2], pt4 = a[3], UseFullRange = a[4];\n\
      if (UseFullRange) return new Int128(pt1.Y - pt2.Y)\n\
        .multiply(new Int128(pt3.X - pt4.X))\n\
        .toString() == new Int128(pt1.X - pt2.X)\n\
        .multiply(new Int128(pt3.Y - pt4.Y))\n\
        .toString();\n\
      else return (pt1.Y - pt2.Y) * (pt3.X - pt4.X) - (pt1.X - pt2.X) * (pt3.Y - pt4.Y) == 0;\n\
    }\n\
  };\n\
  ClipperLib.ClipperBase.prototype.Clear = function ()\n\
  {\n\
    this.DisposeLocalMinimaList();\n\
    for (var i = 0; i < this.m_edges.length; ++i)\n\
    {\n\
      for (var j = 0; j < this.m_edges[i].length; ++j)\n\
      this.m_edges[i][j] = null;\n\
      ClipperLib.Clear(this.m_edges[i]);\n\
    }\n\
    ClipperLib.Clear(this.m_edges);\n\
    this.m_UseFullRange = false;\n\
  };\n\
  ClipperLib.ClipperBase.prototype.DisposeLocalMinimaList = function ()\n\
  {\n\
    while (this.m_MinimaList != null)\n\
    {\n\
      var tmpLm = this.m_MinimaList.next;\n\
      this.m_MinimaList = null;\n\
      this.m_MinimaList = tmpLm;\n\
    }\n\
    this.m_CurrentLM = null;\n\
  };\n\
  ClipperLib.ClipperBase.prototype.AddPolygons = function (ppg, polyType)\n\
  {\n\
    var result = false;\n\
    var res = false;\n\
    if (!(ppg instanceof Array)) return result;\n\
    for (var i = 0; i < ppg.length; ++i)\n\
    {\n\
    \tres = this.AddPolygon(ppg[i], polyType, true);\n\
      if (res && res != \"exceed\") result = true;\n\
      else if (res == \"exceed\") break;\n\
    }\n\
    if (res == \"exceed\") ClipperLib.Error(\"Coordinate exceeds range bounds in AddPolygons().\");\n\
    return result;\n\
  };\n\
  ClipperLib.ClipperBase.prototype.AddPolygon = function (pg, polyType, multiple)\n\
  {\n\
  \tif (!(pg instanceof Array)) return false;\n\
    var len = pg.length;\n\
    if (len < 3) return false;\n\
    var p = new ClipperLib.Polygon();\n\
    p.push(new ClipperLib.IntPoint(pg[0].X, pg[0].Y));\n\
    var j = 0;\n\
    var i;\n\
  \tvar exceed = false;\n\
    for (i = 1; i < len; ++i)\n\
    {\n\
      var maxVal;\n\
      if (this.m_UseFullRange) maxVal = ClipperLib.ClipperBase.hiRange;\n\
      else maxVal = ClipperLib.ClipperBase.loRange;\n\
      if (ClipperLib.Math_Abs_Int64(pg[i].X) > maxVal || ClipperLib.Math_Abs_Int64(pg[i].Y) > maxVal)\n\
      {\n\
        if (ClipperLib.Math_Abs_Int64(pg[i].X) > ClipperLib.ClipperBase.hiRange || ClipperLib.Math_Abs_Int64(pg[i].Y) > ClipperLib.ClipperBase.hiRange)\n\
        {\n\
        \tif (typeof(multiple) != \"undefined\") return \"exceed\"; \n\
        \texceed = true;\n\
        \tbreak;\n\
        }\n\
        maxVal = ClipperLib.ClipperBase.hiRange;\n\
        this.m_UseFullRange = true;\n\
      }\n\
      if (ClipperLib.ClipperBase.PointsEqual(p[j], pg[i])) continue;\n\
      else if (j > 0 && this.SlopesEqual(p[j - 1], p[j], pg[i], this.m_UseFullRange))\n\
      {\n\
        if (ClipperLib.ClipperBase.PointsEqual(p[j - 1], pg[i])) j--;\n\
      }\n\
      else j++;\n\
      if (j < p.length) p[j] = pg[i];\n\
      else p.push(new ClipperLib.IntPoint(pg[i].X, pg[i].Y));\n\
    }\n\
  \tif (exceed && typeof(multiple) == \"undefined\")\n\
    ClipperLib.Error(\"Coordinate exceeds range bounds in AddPolygon()\");\n\
\n\
    if (j < 2) return false;\n\
    len = j + 1;\n\
    while (len > 2)\n\
    {\n\
      if (ClipperLib.ClipperBase.PointsEqual(p[j], p[0])) j--;\n\
      else if (ClipperLib.ClipperBase.PointsEqual(p[0], p[1]) || this.SlopesEqual(p[j], p[0], p[1], this.m_UseFullRange)) p[0] = p[j--];\n\
      else if (this.SlopesEqual(p[j - 1], p[j], p[0], this.m_UseFullRange)) j--;\n\
      else if (this.SlopesEqual(p[0], p[1], p[2], this.m_UseFullRange))\n\
      {\n\
        for (i = 2; i <= j; ++i)\n\
        p[i - 1] = p[i];\n\
        j--;\n\
      }\n\
      else break;\n\
      len--;\n\
    }\n\
\n\
    if (len < 3) return false;\n\
    var edges = [];\n\
    for (i = 0; i < len; i++)\n\
    edges.push(new ClipperLib.TEdge());\n\
    this.m_edges.push(edges);\n\
    edges[0].xcurr = p[0].X;\n\
    edges[0].ycurr = p[0].Y;\n\
    this.InitEdge(edges[len - 1], edges[0], edges[len - 2], p[len - 1], polyType);\n\
    for (i = len - 2; i > 0; --i)\n\
    this.InitEdge(edges[i], edges[i + 1], edges[i - 1], p[i], polyType);\n\
    this.InitEdge(edges[0], edges[1], edges[len - 1], p[0], polyType);\n\
    var e = edges[0];\n\
    var eHighest = e;\n\
    do {\n\
      e.xcurr = e.xbot;\n\
      e.ycurr = e.ybot;\n\
      if (e.ytop < eHighest.ytop) eHighest = e;\n\
      e = e.next;\n\
    }\n\
    while (e != edges[0]);\n\
    if (eHighest.windDelta > 0) eHighest = eHighest.next;\n\
    if (eHighest.dx == ClipperLib.ClipperBase.horizontal) eHighest = eHighest.next;\n\
    e = eHighest;\n\
    do {\n\
      e = this.AddBoundsToLML(e);\n\
    }\n\
    while (e != eHighest);\n\
    return true;\n\
  };\n\
  ClipperLib.ClipperBase.prototype.InitEdge = function (e, eNext, ePrev, pt, polyType)\n\
  {\n\
    e.next = eNext;\n\
    e.prev = ePrev;\n\
    e.xcurr = pt.X;\n\
    e.ycurr = pt.Y;\n\
    if (e.ycurr >= e.next.ycurr)\n\
    {\n\
      e.xbot = e.xcurr;\n\
      e.ybot = e.ycurr;\n\
      e.xtop = e.next.xcurr;\n\
      e.ytop = e.next.ycurr;\n\
      e.windDelta = 1;\n\
    }\n\
    else\n\
    {\n\
      e.xtop = e.xcurr;\n\
      e.ytop = e.ycurr;\n\
      e.xbot = e.next.xcurr;\n\
      e.ybot = e.next.ycurr;\n\
      e.windDelta = -1;\n\
    }\n\
    this.SetDx(e);\n\
    e.polyType = polyType;\n\
    e.outIdx = -1;\n\
  };\n\
  ClipperLib.ClipperBase.prototype.SetDx = function (e)\n\
  {\n\
    e.deltaX = (e.xtop - e.xbot);\n\
    e.deltaY = (e.ytop - e.ybot);\n\
    if (e.deltaY == 0) e.dx = ClipperLib.ClipperBase.horizontal;\n\
    else e.dx = (e.deltaX) / (e.deltaY);\n\
  };\n\
  ClipperLib.ClipperBase.prototype.AddBoundsToLML = function (e)\n\
  {\n\
    e.nextInLML = null;\n\
    e = e.next;\n\
    for (;;)\n\
    {\n\
      if (e.dx == ClipperLib.ClipperBase.horizontal)\n\
      {\n\
        if (e.next.ytop < e.ytop && e.next.xbot > e.prev.xbot) break;\n\
        if (e.xtop != e.prev.xbot) this.SwapX(e);\n\
        e.nextInLML = e.prev;\n\
      }\n\
      else if (e.ycurr == e.prev.ycurr) break;\n\
      else e.nextInLML = e.prev;\n\
      e = e.next;\n\
    }\n\
    var newLm = new ClipperLib.LocalMinima();\n\
    newLm.next = null;\n\
    newLm.Y = e.prev.ybot;\n\
    if (e.dx == ClipperLib.ClipperBase.horizontal)\n\
    {\n\
      if (e.xbot != e.prev.xbot) this.SwapX(e);\n\
      newLm.leftBound = e.prev;\n\
      newLm.rightBound = e;\n\
    }\n\
    else if (e.dx < e.prev.dx)\n\
    {\n\
      newLm.leftBound = e.prev;\n\
      newLm.rightBound = e;\n\
    }\n\
    else\n\
    {\n\
      newLm.leftBound = e;\n\
      newLm.rightBound = e.prev;\n\
    }\n\
    newLm.leftBound.side = ClipperLib.EdgeSide.esLeft;\n\
    newLm.rightBound.side = ClipperLib.EdgeSide.esRight;\n\
    this.InsertLocalMinima(newLm);\n\
    for (;;)\n\
    {\n\
      if (e.next.ytop == e.ytop && e.next.dx != ClipperLib.ClipperBase.horizontal) break;\n\
      e.nextInLML = e.next;\n\
      e = e.next;\n\
      if (e.dx == ClipperLib.ClipperBase.horizontal && e.xbot != e.prev.xtop) this.SwapX(e);\n\
    }\n\
    return e.next;\n\
  };\n\
  ClipperLib.ClipperBase.prototype.InsertLocalMinima = function (newLm)\n\
  {\n\
    if (this.m_MinimaList == null)\n\
    {\n\
      this.m_MinimaList = newLm;\n\
    }\n\
    else if (newLm.Y >= this.m_MinimaList.Y)\n\
    {\n\
      newLm.next = this.m_MinimaList;\n\
      this.m_MinimaList = newLm;\n\
    }\n\
    else\n\
    {\n\
      var tmpLm = this.m_MinimaList;\n\
      while (tmpLm.next != null && (newLm.Y < tmpLm.next.Y))\n\
      tmpLm = tmpLm.next;\n\
      newLm.next = tmpLm.next;\n\
      tmpLm.next = newLm;\n\
    }\n\
  };\n\
  ClipperLib.ClipperBase.prototype.PopLocalMinima = function ()\n\
  {\n\
    if (this.m_CurrentLM == null) return;\n\
    this.m_CurrentLM = this.m_CurrentLM.next;\n\
  };\n\
  ClipperLib.ClipperBase.prototype.SwapX = function (e)\n\
  {\n\
    e.xcurr = e.xtop;\n\
    e.xtop = e.xbot;\n\
    e.xbot = e.xcurr;\n\
  };\n\
  ClipperLib.ClipperBase.prototype.Reset = function ()\n\
  {\n\
    this.m_CurrentLM = this.m_MinimaList;\n\
    var lm = this.m_MinimaList;\n\
    while (lm != null)\n\
    {\n\
      var e = lm.leftBound;\n\
      while (e != null)\n\
      {\n\
        e.xcurr = e.xbot;\n\
        e.ycurr = e.ybot;\n\
        e.side = ClipperLib.EdgeSide.esLeft;\n\
        e.outIdx = -1;\n\
        e = e.nextInLML;\n\
      }\n\
      e = lm.rightBound;\n\
      while (e != null)\n\
      {\n\
        e.xcurr = e.xbot;\n\
        e.ycurr = e.ybot;\n\
        e.side = ClipperLib.EdgeSide.esRight;\n\
        e.outIdx = -1;\n\
        e = e.nextInLML;\n\
      }\n\
      lm = lm.next;\n\
    }\n\
    return;\n\
  };\n\
  ClipperLib.ClipperBase.prototype.GetBounds = function ()\n\
  {\n\
    var result = new ClipperLib.IntRect();\n\
    var lm = this.m_MinimaList;\n\
    if (lm == null) return result;\n\
    result.left = lm.leftBound.xbot;\n\
    result.top = lm.leftBound.ybot;\n\
    result.right = lm.leftBound.xbot;\n\
    result.bottom = lm.leftBound.ybot;\n\
    while (lm != null)\n\
    {\n\
      if (lm.leftBound.ybot > result.bottom) result.bottom = lm.leftBound.ybot;\n\
      var e = lm.leftBound;\n\
      for (;;)\n\
      {\n\
        var bottomE = e;\n\
        while (e.nextInLML != null)\n\
        {\n\
          if (e.xbot < result.left) result.left = e.xbot;\n\
          if (e.xbot > result.right) result.right = e.xbot;\n\
          e = e.nextInLML;\n\
        }\n\
        if (e.xbot < result.left) result.left = e.xbot;\n\
        if (e.xbot > result.right) result.right = e.xbot;\n\
        if (e.xtop < result.left) result.left = e.xtop;\n\
        if (e.xtop > result.right) result.right = e.xtop;\n\
        if (e.ytop < result.top) result.top = e.ytop;\n\
        if (bottomE == lm.leftBound) e = lm.rightBound;\n\
        else break;\n\
      }\n\
      lm = lm.next;\n\
    }\n\
    return result;\n\
  };\n\
  ClipperLib.Clipper = function ()\n\
  {\n\
    this.m_PolyOuts = null;\n\
    this.m_ClipType = ClipperLib.ClipType.ctIntersection;\n\
    this.m_Scanbeam = null;\n\
    this.m_ActiveEdges = null;\n\
    this.m_SortedEdges = null;\n\
    this.m_IntersectNodes = null;\n\
    this.m_ExecuteLocked = false;\n\
    this.m_ClipFillType = ClipperLib.PolyFillType.pftEvenOdd;\n\
    this.m_SubjFillType = ClipperLib.PolyFillType.pftEvenOdd;\n\
    this.m_Joins = null;\n\
    this.m_HorizJoins = null;\n\
    this.m_ReverseOutput = false;\n\
    this.m_UsingExPolygons = false;\n\
    ClipperLib.ClipperBase.call(this);\n\
    this.m_Scanbeam = null;\n\
    this.m_ActiveEdges = null;\n\
    this.m_SortedEdges = null;\n\
    this.m_IntersectNodes = null;\n\
    this.m_ExecuteLocked = false;\n\
    this.m_PolyOuts = [];\n\
    this.m_Joins = [];\n\
    this.m_HorizJoins = [];\n\
    this.m_ReverseOutput = false;\n\
    this.m_UsingExPolygons = false;\n\
  };\n\
  ClipperLib.Clipper.prototype.Clear = function ()\n\
  {\n\
    if (this.m_edges.length == 0) return;\n\
    this.DisposeAllPolyPts();\n\
    ClipperLib.ClipperBase.prototype.Clear.call(this);\n\
  };\n\
  ClipperLib.Clipper.prototype.DisposeScanbeamList = function ()\n\
  {\n\
    while (this.m_Scanbeam != null)\n\
    {\n\
      var sb2 = this.m_Scanbeam.next;\n\
      this.m_Scanbeam = null;\n\
      this.m_Scanbeam = sb2;\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.Reset = function ()\n\
  {\n\
    ClipperLib.ClipperBase.prototype.Reset.call(this);\n\
    this.m_Scanbeam = null;\n\
    this.m_ActiveEdges = null;\n\
    this.m_SortedEdges = null;\n\
    this.DisposeAllPolyPts();\n\
    var lm = this.m_MinimaList;\n\
    while (lm != null)\n\
    {\n\
      this.InsertScanbeam(lm.Y);\n\
      this.InsertScanbeam(lm.leftBound.ytop);\n\
      lm = lm.next;\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.get_ReverseSolution = function ()\n\
  {\n\
    return this.m_ReverseOutput;\n\
  };\n\
  ClipperLib.Clipper.prototype.set_ReverseSolution = function (value)\n\
  {\n\
    this.m_ReverseOutput = value;\n\
  };\n\
  ClipperLib.Clipper.prototype.InsertScanbeam = function (Y)\n\
  {\n\
    var newSb;\n\
    if (this.m_Scanbeam == null)\n\
    {\n\
      this.m_Scanbeam = new ClipperLib.Scanbeam();\n\
      this.m_Scanbeam.next = null;\n\
      this.m_Scanbeam.Y = Y;\n\
    }\n\
    else if (Y > this.m_Scanbeam.Y)\n\
    {\n\
      newSb = new ClipperLib.Scanbeam();\n\
      newSb.Y = Y;\n\
      newSb.next = this.m_Scanbeam;\n\
      this.m_Scanbeam = newSb;\n\
    }\n\
    else\n\
    {\n\
      var sb2 = this.m_Scanbeam;\n\
      while (sb2.next != null && (Y <= sb2.next.Y))\n\
      sb2 = sb2.next;\n\
      if (Y == sb2.Y) return;\n\
      newSb = new ClipperLib.Scanbeam();\n\
      newSb.Y = Y;\n\
      newSb.next = sb2.next;\n\
      sb2.next = newSb;\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.Execute = function (clipType, solution, subjFillType, clipFillType)\n\
  {\n\
    var succeeded;\n\
    if (arguments.length == 2)\n\
    {\n\
      subjFillType = ClipperLib.PolyFillType.pftEvenOdd;\n\
      clipFillType = ClipperLib.PolyFillType.pftEvenOdd;\n\
    }\n\
    if ( typeof(solution.exPolygons) == \"undefined\") // hacky way to test if solution is not exPolygons\n\
    {\n\
      if (this.m_ExecuteLocked) return false;\n\
      this.m_ExecuteLocked = true;\n\
      ClipperLib.Clear(solution);\n\
      this.m_SubjFillType = subjFillType;\n\
      this.m_ClipFillType = clipFillType;\n\
      this.m_ClipType = clipType;\n\
      this.m_UsingExPolygons = false;\n\
      succeeded = this.ExecuteInternal();\n\
      if (succeeded)\n\
      {\n\
        this.BuildResult(solution);\n\
      }\n\
      this.m_ExecuteLocked = false;\n\
      return succeeded;\n\
    }\n\
    else\n\
    {\n\
      if (this.m_ExecuteLocked) return false;\n\
      this.m_ExecuteLocked = true;\n\
      ClipperLib.Clear(solution);\n\
      this.m_SubjFillType = subjFillType;\n\
      this.m_ClipFillType = clipFillType;\n\
      this.m_ClipType = clipType;\n\
      this.m_UsingExPolygons = true;\n\
      succeeded = this.ExecuteInternal();\n\
      if (succeeded)\n\
      {\n\
        this.BuildResultEx(solution);\n\
      }\n\
      this.m_ExecuteLocked = false;\n\
      return succeeded;\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.PolySort = function (or1, or2)\n\
  {\n\
    if (or1 == or2) return 0;\n\
    else if (or1.pts == null || or2.pts == null)\n\
    {\n\
      if ((or1.pts == null) != (or2.pts == null))\n\
      {\n\
        return or1.pts == null ? 1 : -1;\n\
      }\n\
      else return 0;\n\
    }\n\
    var i1, i2;\n\
    if (or1.isHole) i1 = or1.FirstLeft.idx;\n\
    else i1 = or1.idx;\n\
    if (or2.isHole) i2 = or2.FirstLeft.idx;\n\
    else i2 = or2.idx;\n\
    var result = i1 - i2;\n\
    if (result == 0 && (or1.isHole != or2.isHole))\n\
    {\n\
      return or1.isHole ? 1 : -1;\n\
    }\n\
    return result;\n\
  };\n\
  ClipperLib.Clipper.prototype.FindAppendLinkEnd = function (outRec)\n\
  {\n\
    while (outRec.AppendLink != null)\n\
    outRec = outRec.AppendLink;\n\
    return outRec;\n\
  };\n\
  ClipperLib.Clipper.prototype.FixHoleLinkage = function (outRec)\n\
  {\n\
    var tmp;\n\
    if (outRec.bottomPt != null) tmp = this.m_PolyOuts[outRec.bottomPt.idx].FirstLeft;\n\
    else tmp = outRec.FirstLeft;\n\
    if (outRec == tmp) ClipperLib.Error(\"HoleLinkage error\");\n\
    if (tmp != null)\n\
    {\n\
      if (tmp.AppendLink != null) tmp = this.FindAppendLinkEnd(tmp);\n\
      if (tmp == outRec) tmp = null;\n\
      else if (tmp.isHole)\n\
      {\n\
        this.FixHoleLinkage(tmp);\n\
        tmp = tmp.FirstLeft;\n\
      }\n\
    }\n\
    outRec.FirstLeft = tmp;\n\
    if (tmp == null) outRec.isHole = false;\n\
    outRec.AppendLink = null;\n\
  };\n\
  ClipperLib.Clipper.prototype.ExecuteInternal = function ()\n\
  {\n\
    var succeeded;\n\
    try\n\
    {\n\
      this.Reset();\n\
      if (this.m_CurrentLM == null) return true;\n\
      var botY = this.PopScanbeam();\n\
      do {\n\
        this.InsertLocalMinimaIntoAEL(botY);\n\
        ClipperLib.Clear(this.m_HorizJoins);\n\
        this.ProcessHorizontals();\n\
        var topY = this.PopScanbeam();\n\
        succeeded = this.ProcessIntersections(botY, topY);\n\
        if (!succeeded) break;\n\
        this.ProcessEdgesAtTopOfScanbeam(topY);\n\
        botY = topY;\n\
      }\n\
      while (this.m_Scanbeam != null);\n\
    }\n\
    catch ($$e1)\n\
    {\n\
      succeeded = false;\n\
    }\n\
    if (succeeded)\n\
    {\n\
      var outRec;\n\
      for (var i = 0; i < this.m_PolyOuts.length; i++)\n\
      {\n\
        outRec = this.m_PolyOuts[i];\n\
        if (outRec.pts == null) continue;\n\
        this.FixupOutPolygon(outRec);\n\
        if (outRec.pts == null) continue;\n\
        if (outRec.isHole && this.m_UsingExPolygons) this.FixHoleLinkage(outRec);\n\
        \n\
        if ((outRec.isHole ^ this.m_ReverseOutput) ==  (this.Area(outRec, this.m_UseFullRange) > 0))\n\
        this.ReversePolyPtLinks(outRec.pts);\n\
      }\n\
      this.JoinCommonEdges();\n\
      if (this.m_UsingExPolygons) this.m_PolyOuts.sort(this.PolySort);\n\
    }\n\
    ClipperLib.Clear(this.m_Joins);\n\
    ClipperLib.Clear(this.m_HorizJoins);\n\
    return succeeded;\n\
  };\n\
  ClipperLib.Clipper.prototype.PopScanbeam = function ()\n\
  {\n\
    var Y = this.m_Scanbeam.Y;\n\
    var sb2 = this.m_Scanbeam;\n\
    this.m_Scanbeam = this.m_Scanbeam.next;\n\
    sb2 = null;\n\
    return Y;\n\
  };\n\
  ClipperLib.Clipper.prototype.DisposeAllPolyPts = function ()\n\
  {\n\
    for (var i = 0; i < this.m_PolyOuts.length; ++i)\n\
    this.DisposeOutRec(i);\n\
    ClipperLib.Clear(this.m_PolyOuts);\n\
  };\n\
  ClipperLib.Clipper.prototype.DisposeOutRec = function (index)\n\
  {\n\
    var outRec = this.m_PolyOuts[index];\n\
    if (outRec.pts != null) this.DisposeOutPts(outRec.pts);\n\
    outRec = null;\n\
    this.m_PolyOuts[index] = null;\n\
  };\n\
  ClipperLib.Clipper.prototype.DisposeOutPts = function (pp)\n\
  {\n\
    if (pp == null) return;\n\
    var tmpPp = null;\n\
    pp.prev.next = null;\n\
    while (pp != null)\n\
    {\n\
      tmpPp = pp;\n\
      pp = pp.next;\n\
      tmpPp = null;\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.AddJoin = function (e1, e2, e1OutIdx, e2OutIdx)\n\
  {\n\
    var jr = new ClipperLib.JoinRec();\n\
    if (e1OutIdx >= 0) jr.poly1Idx = e1OutIdx;\n\
    else jr.poly1Idx = e1.outIdx;\n\
    jr.pt1a = new ClipperLib.IntPoint(e1.xcurr, e1.ycurr);\n\
    jr.pt1b = new ClipperLib.IntPoint(e1.xtop, e1.ytop);\n\
    if (e2OutIdx >= 0) jr.poly2Idx = e2OutIdx;\n\
    else jr.poly2Idx = e2.outIdx;\n\
    jr.pt2a = new ClipperLib.IntPoint(e2.xcurr, e2.ycurr);\n\
    jr.pt2b = new ClipperLib.IntPoint(e2.xtop, e2.ytop);\n\
    this.m_Joins.push(jr);\n\
  };\n\
  ClipperLib.Clipper.prototype.AddHorzJoin = function (e, idx)\n\
  {\n\
    var hj = new ClipperLib.HorzJoinRec();\n\
    hj.edge = e;\n\
    hj.savedIdx = idx;\n\
    this.m_HorizJoins.push(hj);\n\
  };\n\
  ClipperLib.Clipper.prototype.InsertLocalMinimaIntoAEL = function (botY)\n\
  {\n\
    var pt, pt2;\n\
    while (this.m_CurrentLM != null && (this.m_CurrentLM.Y == botY))\n\
    {\n\
      var lb = this.m_CurrentLM.leftBound;\n\
      var rb = this.m_CurrentLM.rightBound;\n\
      this.InsertEdgeIntoAEL(lb);\n\
      this.InsertScanbeam(lb.ytop);\n\
      this.InsertEdgeIntoAEL(rb);\n\
      if (this.IsEvenOddFillType(lb))\n\
      {\n\
        lb.windDelta = 1;\n\
        rb.windDelta = 1;\n\
      }\n\
      else\n\
      {\n\
        rb.windDelta = -lb.windDelta;\n\
      }\n\
      this.SetWindingCount(lb);\n\
      rb.windCnt = lb.windCnt;\n\
      rb.windCnt2 = lb.windCnt2;\n\
      if (rb.dx == ClipperLib.ClipperBase.horizontal)\n\
      {\n\
        this.AddEdgeToSEL(rb);\n\
        this.InsertScanbeam(rb.nextInLML.ytop);\n\
      }\n\
      else this.InsertScanbeam(rb.ytop);\n\
      if (this.IsContributing(lb)) this.AddLocalMinPoly(lb, rb, new ClipperLib.IntPoint(lb.xcurr, this.m_CurrentLM.Y));\n\
      if (rb.outIdx >= 0)\n\
      {\n\
        if (rb.dx == ClipperLib.ClipperBase.horizontal)\n\
        {\n\
          for (var i = 0; i < this.m_HorizJoins.length; i++)\n\
          {\n\
            pt = new ClipperLib.IntPoint(), pt2 = new ClipperLib.IntPoint();\n\
            var hj = this.m_HorizJoins[i];\n\
            if ((function ()\n\
            {\n\
              pt = {\n\
                Value: pt\n\
              };\n\
              pt2 = {\n\
                Value: pt2\n\
              };\n\
              var $res = this.GetOverlapSegment(new ClipperLib.IntPoint(hj.edge.xbot, hj.edge.ybot),\n\
              new ClipperLib.IntPoint(hj.edge.xtop, hj.edge.ytop),\n\
              new ClipperLib.IntPoint(rb.xbot, rb.ybot),\n\
              new ClipperLib.IntPoint(rb.xtop, rb.ytop),\n\
              pt, pt2);\n\
              pt = pt.Value;\n\
              pt2 = pt2.Value;\n\
              return $res;\n\
            })\n\
              .call(this)) this.AddJoin(hj.edge, rb, hj.savedIdx, -1);\n\
          }\n\
        }\n\
      }\n\
      if (lb.nextInAEL != rb)\n\
      {\n\
        if (rb.outIdx >= 0 && rb.prevInAEL.outIdx >= 0 && this.SlopesEqual(rb.prevInAEL, rb, this.m_UseFullRange)) this.AddJoin(rb, rb.prevInAEL, -1, -1);\n\
        var e = lb.nextInAEL;\n\
        pt = new ClipperLib.IntPoint(lb.xcurr, lb.ycurr);\n\
        while (e != rb)\n\
        {\n\
          if (e == null) ClipperLib.Error(\"InsertLocalMinimaIntoAEL: missing rightbound!\");\n\
          this.IntersectEdges(rb, e, pt, ClipperLib.Protects.ipNone);\n\
          e = e.nextInAEL;\n\
        }\n\
      }\n\
      this.PopLocalMinima();\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.InsertEdgeIntoAEL = function (edge)\n\
  {\n\
    edge.prevInAEL = null;\n\
    edge.nextInAEL = null;\n\
    if (this.m_ActiveEdges == null)\n\
    {\n\
      this.m_ActiveEdges = edge;\n\
    }\n\
    else if (this.E2InsertsBeforeE1(this.m_ActiveEdges, edge))\n\
    {\n\
      edge.nextInAEL = this.m_ActiveEdges;\n\
      this.m_ActiveEdges.prevInAEL = edge;\n\
      this.m_ActiveEdges = edge;\n\
    }\n\
    else\n\
    {\n\
      var e = this.m_ActiveEdges;\n\
      while (e.nextInAEL != null && !this.E2InsertsBeforeE1(e.nextInAEL, edge))\n\
      e = e.nextInAEL;\n\
      edge.nextInAEL = e.nextInAEL;\n\
      if (e.nextInAEL != null) e.nextInAEL.prevInAEL = edge;\n\
      edge.prevInAEL = e;\n\
      e.nextInAEL = edge;\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.E2InsertsBeforeE1 = function (e1, e2)\n\
  {\n\
    return e2.xcurr == e1.xcurr ? e2.dx > e1.dx : e2.xcurr < e1.xcurr;\n\
  };\n\
  ClipperLib.Clipper.prototype.IsEvenOddFillType = function (edge)\n\
  {\n\
    if (edge.polyType == ClipperLib.PolyType.ptSubject) return this.m_SubjFillType == ClipperLib.PolyFillType.pftEvenOdd;\n\
    else return this.m_ClipFillType == ClipperLib.PolyFillType.pftEvenOdd;\n\
  };\n\
  ClipperLib.Clipper.prototype.IsEvenOddAltFillType = function (edge)\n\
  {\n\
    if (edge.polyType == ClipperLib.PolyType.ptSubject) return this.m_ClipFillType == ClipperLib.PolyFillType.pftEvenOdd;\n\
    else return this.m_SubjFillType == ClipperLib.PolyFillType.pftEvenOdd;\n\
  };\n\
  ClipperLib.Clipper.prototype.IsContributing = function (edge)\n\
  {\n\
    var pft, pft2;\n\
    if (edge.polyType == ClipperLib.PolyType.ptSubject)\n\
    {\n\
      pft = this.m_SubjFillType;\n\
      pft2 = this.m_ClipFillType;\n\
    }\n\
    else\n\
    {\n\
      pft = this.m_ClipFillType;\n\
      pft2 = this.m_SubjFillType;\n\
    }\n\
    switch (pft)\n\
    {\n\
      case ClipperLib.PolyFillType.pftEvenOdd:\n\
      case ClipperLib.PolyFillType.pftNonZero:\n\
        if (ClipperLib.Math_Abs_Int32(edge.windCnt) != 1) return false;\n\
        break;\n\
      case ClipperLib.PolyFillType.pftPositive:\n\
        if (edge.windCnt != 1) return false;\n\
        break;\n\
      default:\n\
        if (edge.windCnt != -1) return false;\n\
        break;\n\
    }\n\
    switch (this.m_ClipType)\n\
    {\n\
      case ClipperLib.ClipType.ctIntersection:\n\
        switch (pft2)\n\
        {\n\
          case ClipperLib.PolyFillType.pftEvenOdd:\n\
          case ClipperLib.PolyFillType.pftNonZero:\n\
            return (edge.windCnt2 != 0);\n\
          case ClipperLib.PolyFillType.pftPositive:\n\
            return (edge.windCnt2 > 0);\n\
          default:\n\
            return (edge.windCnt2 < 0);\n\
        }\n\
        break;\n\
      case ClipperLib.ClipType.ctUnion:\n\
        switch (pft2)\n\
        {\n\
          case ClipperLib.PolyFillType.pftEvenOdd:\n\
          case ClipperLib.PolyFillType.pftNonZero:\n\
            return (edge.windCnt2 == 0);\n\
          case ClipperLib.PolyFillType.pftPositive:\n\
            return (edge.windCnt2 <= 0);\n\
          default:\n\
            return (edge.windCnt2 >= 0);\n\
        }\n\
        break;\n\
      case ClipperLib.ClipType.ctDifference:\n\
        if (edge.polyType == ClipperLib.PolyType.ptSubject) switch (pft2)\n\
        {\n\
          case ClipperLib.PolyFillType.pftEvenOdd:\n\
          case ClipperLib.PolyFillType.pftNonZero:\n\
            return (edge.windCnt2 == 0);\n\
          case ClipperLib.PolyFillType.pftPositive:\n\
            return (edge.windCnt2 <= 0);\n\
          default:\n\
            return (edge.windCnt2 >= 0);\n\
        }\n\
        else switch (pft2)\n\
        {\n\
          case ClipperLib.PolyFillType.pftEvenOdd:\n\
          case ClipperLib.PolyFillType.pftNonZero:\n\
            return (edge.windCnt2 != 0);\n\
          case ClipperLib.PolyFillType.pftPositive:\n\
            return (edge.windCnt2 > 0);\n\
          default:\n\
            return (edge.windCnt2 < 0);\n\
        }\n\
    }\n\
    return true;\n\
  };\n\
  ClipperLib.Clipper.prototype.SetWindingCount = function (edge)\n\
  {\n\
    var e = edge.prevInAEL;\n\
    while (e != null && e.polyType != edge.polyType)\n\
    e = e.prevInAEL;\n\
    if (e == null)\n\
    {\n\
      edge.windCnt = edge.windDelta;\n\
      edge.windCnt2 = 0;\n\
      e = this.m_ActiveEdges;\n\
    }\n\
    else if (this.IsEvenOddFillType(edge))\n\
    {\n\
      edge.windCnt = 1;\n\
      edge.windCnt2 = e.windCnt2;\n\
      e = e.nextInAEL;\n\
    }\n\
    else\n\
    {\n\
      if (e.windCnt * e.windDelta < 0)\n\
      {\n\
        if (ClipperLib.Math_Abs_Int32(e.windCnt) > 1)\n\
        {\n\
          if (e.windDelta * edge.windDelta < 0) edge.windCnt = e.windCnt;\n\
          else edge.windCnt = e.windCnt + edge.windDelta;\n\
        }\n\
        else edge.windCnt = e.windCnt + e.windDelta + edge.windDelta;\n\
      }\n\
      else\n\
      {\n\
        if (ClipperLib.Math_Abs_Int32(e.windCnt) > 1 && e.windDelta * edge.windDelta < 0) edge.windCnt = e.windCnt;\n\
        else if (e.windCnt + edge.windDelta == 0) edge.windCnt = e.windCnt;\n\
        else edge.windCnt = e.windCnt + edge.windDelta;\n\
      }\n\
      edge.windCnt2 = e.windCnt2;\n\
      e = e.nextInAEL;\n\
    }\n\
    if (this.IsEvenOddAltFillType(edge))\n\
    {\n\
      while (e != edge)\n\
      {\n\
        edge.windCnt2 = (edge.windCnt2 == 0) ? 1 : 0;\n\
        e = e.nextInAEL;\n\
      }\n\
    }\n\
    else\n\
    {\n\
      while (e != edge)\n\
      {\n\
        edge.windCnt2 += e.windDelta;\n\
        e = e.nextInAEL;\n\
      }\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.AddEdgeToSEL = function (edge)\n\
  {\n\
    if (this.m_SortedEdges == null)\n\
    {\n\
      this.m_SortedEdges = edge;\n\
      edge.prevInSEL = null;\n\
      edge.nextInSEL = null;\n\
    }\n\
    else\n\
    {\n\
      edge.nextInSEL = this.m_SortedEdges;\n\
      edge.prevInSEL = null;\n\
      this.m_SortedEdges.prevInSEL = edge;\n\
      this.m_SortedEdges = edge;\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.CopyAELToSEL = function ()\n\
  {\n\
    var e = this.m_ActiveEdges;\n\
    this.m_SortedEdges = e;\n\
    if (this.m_ActiveEdges == null) return;\n\
    this.m_SortedEdges.prevInSEL = null;\n\
    e = e.nextInAEL;\n\
    while (e != null)\n\
    {\n\
      e.prevInSEL = e.prevInAEL;\n\
      e.prevInSEL.nextInSEL = e;\n\
      e.nextInSEL = null;\n\
      e = e.nextInAEL;\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.SwapPositionsInAEL = function (edge1, edge2)\n\
  {\n\
    var next, prev;\n\
    if (edge1.nextInAEL == null && edge1.prevInAEL == null) return;\n\
    if (edge2.nextInAEL == null && edge2.prevInAEL == null) return;\n\
    if (edge1.nextInAEL == edge2)\n\
    {\n\
      next = edge2.nextInAEL;\n\
      if (next != null) next.prevInAEL = edge1;\n\
      prev = edge1.prevInAEL;\n\
      if (prev != null) prev.nextInAEL = edge2;\n\
      edge2.prevInAEL = prev;\n\
      edge2.nextInAEL = edge1;\n\
      edge1.prevInAEL = edge2;\n\
      edge1.nextInAEL = next;\n\
    }\n\
    else if (edge2.nextInAEL == edge1)\n\
    {\n\
      next = edge1.nextInAEL;\n\
      if (next != null) next.prevInAEL = edge2;\n\
      prev = edge2.prevInAEL;\n\
      if (prev != null) prev.nextInAEL = edge1;\n\
      edge1.prevInAEL = prev;\n\
      edge1.nextInAEL = edge2;\n\
      edge2.prevInAEL = edge1;\n\
      edge2.nextInAEL = next;\n\
    }\n\
    else\n\
    {\n\
      next = edge1.nextInAEL;\n\
      prev = edge1.prevInAEL;\n\
      edge1.nextInAEL = edge2.nextInAEL;\n\
      if (edge1.nextInAEL != null) edge1.nextInAEL.prevInAEL = edge1;\n\
      edge1.prevInAEL = edge2.prevInAEL;\n\
      if (edge1.prevInAEL != null) edge1.prevInAEL.nextInAEL = edge1;\n\
      edge2.nextInAEL = next;\n\
      if (edge2.nextInAEL != null) edge2.nextInAEL.prevInAEL = edge2;\n\
      edge2.prevInAEL = prev;\n\
      if (edge2.prevInAEL != null) edge2.prevInAEL.nextInAEL = edge2;\n\
    }\n\
    if (edge1.prevInAEL == null) this.m_ActiveEdges = edge1;\n\
    else if (edge2.prevInAEL == null) this.m_ActiveEdges = edge2;\n\
  };\n\
  ClipperLib.Clipper.prototype.SwapPositionsInSEL = function (edge1, edge2)\n\
  {\n\
    var next, prev;\n\
    if (edge1.nextInSEL == null && edge1.prevInSEL == null) return;\n\
    if (edge2.nextInSEL == null && edge2.prevInSEL == null) return;\n\
    if (edge1.nextInSEL == edge2)\n\
    {\n\
      next = edge2.nextInSEL;\n\
      if (next != null) next.prevInSEL = edge1;\n\
      prev = edge1.prevInSEL;\n\
      if (prev != null) prev.nextInSEL = edge2;\n\
      edge2.prevInSEL = prev;\n\
      edge2.nextInSEL = edge1;\n\
      edge1.prevInSEL = edge2;\n\
      edge1.nextInSEL = next;\n\
    }\n\
    else if (edge2.nextInSEL == edge1)\n\
    {\n\
      next = edge1.nextInSEL;\n\
      if (next != null) next.prevInSEL = edge2;\n\
      prev = edge2.prevInSEL;\n\
      if (prev != null) prev.nextInSEL = edge1;\n\
      edge1.prevInSEL = prev;\n\
      edge1.nextInSEL = edge2;\n\
      edge2.prevInSEL = edge1;\n\
      edge2.nextInSEL = next;\n\
    }\n\
    else\n\
    {\n\
      next = edge1.nextInSEL;\n\
      prev = edge1.prevInSEL;\n\
      edge1.nextInSEL = edge2.nextInSEL;\n\
      if (edge1.nextInSEL != null) edge1.nextInSEL.prevInSEL = edge1;\n\
      edge1.prevInSEL = edge2.prevInSEL;\n\
      if (edge1.prevInSEL != null) edge1.prevInSEL.nextInSEL = edge1;\n\
      edge2.nextInSEL = next;\n\
      if (edge2.nextInSEL != null) edge2.nextInSEL.prevInSEL = edge2;\n\
      edge2.prevInSEL = prev;\n\
      if (edge2.prevInSEL != null) edge2.prevInSEL.nextInSEL = edge2;\n\
    }\n\
    if (edge1.prevInSEL == null) this.m_SortedEdges = edge1;\n\
    else if (edge2.prevInSEL == null) this.m_SortedEdges = edge2;\n\
  };\n\
  ClipperLib.Clipper.prototype.AddLocalMaxPoly = function (e1, e2, pt)\n\
  {\n\
    this.AddOutPt(e1, pt);\n\
    if (e1.outIdx == e2.outIdx)\n\
    {\n\
      e1.outIdx = -1;\n\
      e2.outIdx = -1;\n\
    }\n\
    else if (e1.outIdx < e2.outIdx) this.AppendPolygon(e1, e2);\n\
    else this.AppendPolygon(e2, e1);\n\
  };\n\
  ClipperLib.Clipper.prototype.AddLocalMinPoly = function (e1, e2, pt)\n\
  {\n\
    var e, prevE;\n\
    if (e2.dx == ClipperLib.ClipperBase.horizontal || (e1.dx > e2.dx))\n\
    {\n\
      this.AddOutPt(e1, pt);\n\
      e2.outIdx = e1.outIdx;\n\
      e1.side = ClipperLib.EdgeSide.esLeft;\n\
      e2.side = ClipperLib.EdgeSide.esRight;\n\
      e = e1;\n\
      if (e.prevInAEL == e2) prevE = e2.prevInAEL;\n\
      else prevE = e.prevInAEL;\n\
    }\n\
    else\n\
    {\n\
      this.AddOutPt(e2, pt);\n\
      e1.outIdx = e2.outIdx;\n\
      e1.side = ClipperLib.EdgeSide.esRight;\n\
      e2.side = ClipperLib.EdgeSide.esLeft;\n\
      e = e2;\n\
      if (e.prevInAEL == e1) prevE = e1.prevInAEL;\n\
      else prevE = e.prevInAEL;\n\
    }\n\
    if (prevE != null && prevE.outIdx >= 0 && (ClipperLib.Clipper.TopX(prevE, pt.Y) == ClipperLib.Clipper.TopX(e, pt.Y)) && this.SlopesEqual(e, prevE, this.m_UseFullRange)) this.AddJoin(e, prevE, -1, -1);\n\
  };\n\
  ClipperLib.Clipper.prototype.CreateOutRec = function ()\n\
  {\n\
    var result = new ClipperLib.OutRec();\n\
    result.idx = -1;\n\
    result.isHole = false;\n\
    result.FirstLeft = null;\n\
    result.AppendLink = null;\n\
    result.pts = null;\n\
    result.bottomPt = null;\n\
    return result;\n\
  };\n\
  ClipperLib.Clipper.prototype.AddOutPt = function (e, pt)\n\
  {\n\
    var outRec, op;\n\
    var ToFront = (e.side == ClipperLib.EdgeSide.esLeft);\n\
    if (e.outIdx < 0)\n\
    {\n\
      outRec = this.CreateOutRec();\n\
      this.m_PolyOuts.push(outRec);\n\
      outRec.idx = this.m_PolyOuts.length - 1;\n\
      e.outIdx = outRec.idx;\n\
      op = new ClipperLib.OutPt();\n\
      outRec.pts = op;\n\
      outRec.bottomPt = op;\n\
      op.pt = pt;\n\
      op.idx = outRec.idx;\n\
      op.next = op;\n\
      op.prev = op;\n\
      this.SetHoleState(e, outRec);\n\
    }\n\
    else\n\
    {\n\
      outRec = this.m_PolyOuts[e.outIdx];\n\
      op = outRec.pts;\n\
      var op2;\n\
      if (ToFront && ClipperLib.ClipperBase.PointsEqual(pt, op.pt) || (!ToFront && ClipperLib.ClipperBase.PointsEqual(pt, op.prev.pt))) return;\n\
      op2 = new ClipperLib.OutPt();\n\
      op2.pt = pt;\n\
      op2.idx = outRec.idx;\n\
      if (op2.pt.Y == outRec.bottomPt.pt.Y && op2.pt.X < outRec.bottomPt.pt.X) outRec.bottomPt = op2;\n\
      op2.next = op;\n\
      op2.prev = op.prev;\n\
      op2.prev.next = op2;\n\
      op.prev = op2;\n\
      if (ToFront) outRec.pts = op2;\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.SwapPoints = function (pt1, pt2)\n\
  {\n\
    var tmp = pt1.Value;\n\
    pt1.Value = pt2.Value;\n\
    pt2.Value = tmp;\n\
  };\n\
  ClipperLib.Clipper.prototype.GetOverlapSegment = function (pt1a, pt1b, pt2a, pt2b, pt1, pt2)\n\
  {\n\
    if (ClipperLib.Math_Abs_Int64(pt1a.X - pt1b.X) > ClipperLib.Math_Abs_Int64(pt1a.Y - pt1b.Y))\n\
    {\n\
      if (pt1a.X > pt1b.X)\n\
      (function ()\n\
      {\n\
        pt1a = {\n\
          Value: pt1a\n\
        };\n\
        pt1b = {\n\
          Value: pt1b\n\
        };\n\
        var $res = this.SwapPoints(pt1a, pt1b);\n\
        pt1a = pt1a.Value;\n\
        pt1b = pt1b.Value;\n\
        return $res;\n\
      })\n\
        .call(this);\n\
      if (pt2a.X > pt2b.X)\n\
      (function ()\n\
      {\n\
        pt2a = {\n\
          Value: pt2a\n\
        };\n\
        pt2b = {\n\
          Value: pt2b\n\
        };\n\
        var $res = this.SwapPoints(pt2a, pt2b);\n\
        pt2a = pt2a.Value;\n\
        pt2b = pt2b.Value;\n\
        return $res;\n\
      })\n\
        .call(this);\n\
      if (pt1a.X > pt2a.X) pt1.Value = pt1a;\n\
      else pt1.Value = pt2a;\n\
      if (pt1b.X < pt2b.X) pt2.Value = pt1b;\n\
      else pt2.Value = pt2b;\n\
      return pt1.Value.X < pt2.Value.X;\n\
    }\n\
    else\n\
    {\n\
      if (pt1a.Y < pt1b.Y)\n\
      (function ()\n\
      {\n\
        pt1a = {\n\
          Value: pt1a\n\
        };\n\
        pt1b = {\n\
          Value: pt1b\n\
        };\n\
        var $res = this.SwapPoints(pt1a, pt1b);\n\
        pt1a = pt1a.Value;\n\
        pt1b = pt1b.Value;\n\
        return $res;\n\
      })\n\
        .call(this);\n\
      if (pt2a.Y < pt2b.Y)\n\
      (function ()\n\
      {\n\
        pt2a = {\n\
          Value: pt2a\n\
        };\n\
        pt2b = {\n\
          Value: pt2b\n\
        };\n\
        var $res = this.SwapPoints(pt2a, pt2b);\n\
        pt2a = pt2a.Value;\n\
        pt2b = pt2b.Value;\n\
        return $res;\n\
      })\n\
        .call(this);\n\
      if (pt1a.Y < pt2a.Y) pt1.Value = pt1a;\n\
      else pt1.Value = pt2a;\n\
      if (pt1b.Y > pt2b.Y) pt2.Value = pt1b;\n\
      else pt2.Value = pt2b;\n\
      return pt1.Value.Y > pt2.Value.Y;\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.FindSegment = function (pp, UseFullInt64Range, pt1, pt2)\n\
  {\n\
    if (pp.Value == null) return false;\n\
    var pp2 = pp.Value;\n\
    var pt1a = new ClipperLib.IntPoint(pt1.Value);\n\
    var pt2a = new ClipperLib.IntPoint(pt2.Value);\n\
    do {\n\
        // Timo's comment: for some reason calling SlopesEqual() below uses big integers\n\
        // So although coordinates are low (eg. 900), big integers are sometimes used.\n\
        // => Fixed according to changes in original Clipper ver 5.1.2 (25 February 2013)\n\
      if (this.SlopesEqual(pt1a, pt2a, pp.Value.pt, pp.Value.prev.pt, UseFullInt64Range) && this.SlopesEqual(pt1a, pt2a, pp.Value.pt, UseFullInt64Range) && this.GetOverlapSegment(pt1a, pt2a, pp.Value.pt, pp.Value.prev.pt, pt1, pt2)) return true;\n\
      pp.Value = pp.Value.next;\n\
    }\n\
    while (pp.Value != pp2);\n\
    return false;\n\
  };\n\
  ClipperLib.Clipper.prototype.Pt3IsBetweenPt1AndPt2 = function (pt1, pt2, pt3)\n\
  {\n\
    if (ClipperLib.ClipperBase.PointsEqual(pt1, pt3) || ClipperLib.ClipperBase.PointsEqual(pt2, pt3)) return true;\n\
    else if (pt1.X != pt2.X) return (pt1.X < pt3.X) == (pt3.X < pt2.X);\n\
    else return (pt1.Y < pt3.Y) == (pt3.Y < pt2.Y);\n\
  };\n\
  ClipperLib.Clipper.prototype.InsertPolyPtBetween = function (p1, p2, pt)\n\
  {\n\
    var result = new ClipperLib.OutPt();\n\
    result.pt = pt;\n\
    if (p2 == p1.next)\n\
    {\n\
      p1.next = result;\n\
      p2.prev = result;\n\
      result.next = p2;\n\
      result.prev = p1;\n\
    }\n\
    else\n\
    {\n\
      p2.next = result;\n\
      p1.prev = result;\n\
      result.next = p1;\n\
      result.prev = p2;\n\
    }\n\
    return result;\n\
  };\n\
  ClipperLib.Clipper.prototype.SetHoleState = function (e, outRec)\n\
  {\n\
    var isHole = false;\n\
    var e2 = e.prevInAEL;\n\
    while (e2 != null)\n\
    {\n\
      if (e2.outIdx >= 0)\n\
      {\n\
        isHole = !isHole;\n\
        if (outRec.FirstLeft == null) outRec.FirstLeft = this.m_PolyOuts[e2.outIdx];\n\
      }\n\
      e2 = e2.prevInAEL;\n\
    }\n\
    if (isHole) outRec.isHole = true;\n\
  };\n\
  ClipperLib.Clipper.prototype.GetDx = function (pt1, pt2)\n\
  {\n\
    if (pt1.Y == pt2.Y) return ClipperLib.ClipperBase.horizontal;\n\
    else return (pt2.X - pt1.X) / (pt2.Y - pt1.Y);\n\
  };\n\
  ClipperLib.Clipper.prototype.FirstIsBottomPt = function (btmPt1, btmPt2)\n\
  {\n\
    var p = btmPt1.prev;\n\
    while (ClipperLib.ClipperBase.PointsEqual(p.pt, btmPt1.pt) && (p != btmPt1))\n\
    p = p.prev;\n\
    var dx1p = ClipperLib.Math_Abs_Double(this.GetDx(btmPt1.pt, p.pt));\n\
    p = btmPt1.next;\n\
    while (ClipperLib.ClipperBase.PointsEqual(p.pt, btmPt1.pt) && (p != btmPt1))\n\
    p = p.next;\n\
    var dx1n = ClipperLib.Math_Abs_Double(this.GetDx(btmPt1.pt, p.pt));\n\
    p = btmPt2.prev;\n\
    while (ClipperLib.ClipperBase.PointsEqual(p.pt, btmPt2.pt) && (p != btmPt2))\n\
    p = p.prev;\n\
    var dx2p = ClipperLib.Math_Abs_Double(this.GetDx(btmPt2.pt, p.pt));\n\
    p = btmPt2.next;\n\
    while (ClipperLib.ClipperBase.PointsEqual(p.pt, btmPt2.pt) && (p != btmPt2))\n\
    p = p.next;\n\
    var dx2n = ClipperLib.Math_Abs_Double(this.GetDx(btmPt2.pt, p.pt));\n\
    return (dx1p >= dx2p && dx1p >= dx2n) || (dx1n >= dx2p && dx1n >= dx2n);\n\
  };\n\
  ClipperLib.Clipper.prototype.GetBottomPt = function (pp)\n\
  {\n\
    var dups = null;\n\
    var p = pp.next;\n\
    while (p != pp)\n\
    {\n\
      if (p.pt.Y > pp.pt.Y)\n\
      {\n\
        pp = p;\n\
        dups = null;\n\
      }\n\
      else if (p.pt.Y == pp.pt.Y && p.pt.X <= pp.pt.X)\n\
      {\n\
        if (p.pt.X < pp.pt.X)\n\
        {\n\
          dups = null;\n\
          pp = p;\n\
        }\n\
        else\n\
        {\n\
          if (p.next != pp && p.prev != pp) dups = p;\n\
        }\n\
      }\n\
      p = p.next;\n\
    }\n\
    if (dups != null)\n\
    {\n\
      while (dups != p)\n\
      {\n\
        if (!this.FirstIsBottomPt(p, dups)) pp = dups;\n\
        dups = dups.next;\n\
        while (!ClipperLib.ClipperBase.PointsEqual(dups.pt, pp.pt))\n\
        dups = dups.next;\n\
      }\n\
    }\n\
    return pp;\n\
  };\n\
  ClipperLib.Clipper.prototype.GetLowermostRec = function (outRec1, outRec2)\n\
  {\n\
    var bPt1 = outRec1.bottomPt;\n\
    var bPt2 = outRec2.bottomPt;\n\
    if (bPt1.pt.Y > bPt2.pt.Y) return outRec1;\n\
    else if (bPt1.pt.Y < bPt2.pt.Y) return outRec2;\n\
    else if (bPt1.pt.X < bPt2.pt.X) return outRec1;\n\
    else if (bPt1.pt.X > bPt2.pt.X) return outRec2;\n\
    else if (bPt1.next == bPt1) return outRec2;\n\
    else if (bPt2.next == bPt2) return outRec1;\n\
    else if (this.FirstIsBottomPt(bPt1, bPt2)) return outRec1;\n\
    else return outRec2;\n\
  };\n\
  ClipperLib.Clipper.prototype.Param1RightOfParam2 = function (outRec1, outRec2)\n\
  {\n\
    do {\n\
      outRec1 = outRec1.FirstLeft;\n\
      if (outRec1 == outRec2) return true;\n\
    }\n\
    while (outRec1 != null);\n\
    return false;\n\
  };\n\
  ClipperLib.Clipper.prototype.AppendPolygon = function (e1, e2)\n\
  {\n\
    var outRec1 = this.m_PolyOuts[e1.outIdx];\n\
    var outRec2 = this.m_PolyOuts[e2.outIdx];\n\
    var holeStateRec;\n\
    if (this.Param1RightOfParam2(outRec1, outRec2)) holeStateRec = outRec2;\n\
    else if (this.Param1RightOfParam2(outRec2, outRec1)) holeStateRec = outRec1;\n\
    else holeStateRec = this.GetLowermostRec(outRec1, outRec2);\n\
    var p1_lft = outRec1.pts;\n\
    var p1_rt = p1_lft.prev;\n\
    var p2_lft = outRec2.pts;\n\
    var p2_rt = p2_lft.prev;\n\
    var side;\n\
    var i;\n\
    if (e1.side == ClipperLib.EdgeSide.esLeft)\n\
    {\n\
      if (e2.side == ClipperLib.EdgeSide.esLeft)\n\
      {\n\
        this.ReversePolyPtLinks(p2_lft);\n\
        p2_lft.next = p1_lft;\n\
        p1_lft.prev = p2_lft;\n\
        p1_rt.next = p2_rt;\n\
        p2_rt.prev = p1_rt;\n\
        outRec1.pts = p2_rt;\n\
      }\n\
      else\n\
      {\n\
        p2_rt.next = p1_lft;\n\
        p1_lft.prev = p2_rt;\n\
        p2_lft.prev = p1_rt;\n\
        p1_rt.next = p2_lft;\n\
        outRec1.pts = p2_lft;\n\
      }\n\
      side = ClipperLib.EdgeSide.esLeft;\n\
    }\n\
    else\n\
    {\n\
      if (e2.side == ClipperLib.EdgeSide.esRight)\n\
      {\n\
        this.ReversePolyPtLinks(p2_lft);\n\
        p1_rt.next = p2_rt;\n\
        p2_rt.prev = p1_rt;\n\
        p2_lft.next = p1_lft;\n\
        p1_lft.prev = p2_lft;\n\
      }\n\
      else\n\
      {\n\
        p1_rt.next = p2_lft;\n\
        p2_lft.prev = p1_rt;\n\
        p1_lft.prev = p2_rt;\n\
        p2_rt.next = p1_lft;\n\
      }\n\
      side = ClipperLib.EdgeSide.esRight;\n\
    }\n\
    if (holeStateRec == outRec2)\n\
    {\n\
      outRec1.bottomPt = outRec2.bottomPt;\n\
      outRec1.bottomPt.idx = outRec1.idx;\n\
      if (outRec2.FirstLeft != outRec1) outRec1.FirstLeft = outRec2.FirstLeft;\n\
      outRec1.isHole = outRec2.isHole;\n\
    }\n\
    outRec2.pts = null;\n\
    outRec2.bottomPt = null;\n\
    outRec2.AppendLink = outRec1;\n\
    var OKIdx = e1.outIdx;\n\
    var ObsoleteIdx = e2.outIdx;\n\
    e1.outIdx = -1;\n\
    e2.outIdx = -1;\n\
    var e = this.m_ActiveEdges;\n\
    while (e != null)\n\
    {\n\
      if (e.outIdx == ObsoleteIdx)\n\
      {\n\
        e.outIdx = OKIdx;\n\
        e.side = side;\n\
        break;\n\
      }\n\
      e = e.nextInAEL;\n\
    }\n\
    for (i = 0; i < this.m_Joins.length; ++i)\n\
    {\n\
      if (this.m_Joins[i].poly1Idx == ObsoleteIdx) this.m_Joins[i].poly1Idx = OKIdx;\n\
      if (this.m_Joins[i].poly2Idx == ObsoleteIdx) this.m_Joins[i].poly2Idx = OKIdx;\n\
    }\n\
    for (i = 0; i < this.m_HorizJoins.length; ++i)\n\
    {\n\
      if (this.m_HorizJoins[i].savedIdx == ObsoleteIdx) this.m_HorizJoins[i].savedIdx = OKIdx;\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.ReversePolyPtLinks = function (pp)\n\
  {\n\
    if (pp == null) return;\n\
    var pp1;\n\
    var pp2;\n\
    pp1 = pp;\n\
    do {\n\
      pp2 = pp1.next;\n\
      pp1.next = pp1.prev;\n\
      pp1.prev = pp2;\n\
      pp1 = pp2;\n\
    }\n\
    while (pp1 != pp);\n\
  };\n\
  ClipperLib.Clipper.SwapSides = function (edge1, edge2)\n\
  {\n\
    var side = edge1.side;\n\
    edge1.side = edge2.side;\n\
    edge2.side = side;\n\
  };\n\
  ClipperLib.Clipper.SwapPolyIndexes = function (edge1, edge2)\n\
  {\n\
    var outIdx = edge1.outIdx;\n\
    edge1.outIdx = edge2.outIdx;\n\
    edge2.outIdx = outIdx;\n\
  };\n\
  ClipperLib.Clipper.prototype.DoEdge1 = function (edge1, edge2, pt)\n\
  {\n\
    this.AddOutPt(edge1, pt);\n\
    ClipperLib.Clipper.SwapSides(edge1, edge2);\n\
    ClipperLib.Clipper.SwapPolyIndexes(edge1, edge2);\n\
  };\n\
  ClipperLib.Clipper.prototype.DoEdge2 = function (edge1, edge2, pt)\n\
  {\n\
    this.AddOutPt(edge2, pt);\n\
    ClipperLib.Clipper.SwapSides(edge1, edge2);\n\
    ClipperLib.Clipper.SwapPolyIndexes(edge1, edge2);\n\
  };\n\
  ClipperLib.Clipper.prototype.DoBothEdges = function (edge1, edge2, pt)\n\
  {\n\
    this.AddOutPt(edge1, pt);\n\
    this.AddOutPt(edge2, pt);\n\
    ClipperLib.Clipper.SwapSides(edge1, edge2);\n\
    ClipperLib.Clipper.SwapPolyIndexes(edge1, edge2);\n\
  };\n\
  ClipperLib.Clipper.prototype.IntersectEdges = function (e1, e2, pt, protects)\n\
  {\n\
    var e1stops = (ClipperLib.Protects.ipLeft & protects) == 0 && e1.nextInLML == null && e1.xtop == pt.X && e1.ytop == pt.Y;\n\
    var e2stops = (ClipperLib.Protects.ipRight & protects) == 0 && e2.nextInLML == null && e2.xtop == pt.X && e2.ytop == pt.Y;\n\
    var e1Contributing = (e1.outIdx >= 0);\n\
    var e2contributing = (e2.outIdx >= 0);\n\
    if (e1.polyType == e2.polyType)\n\
    {\n\
      if (this.IsEvenOddFillType(e1))\n\
      {\n\
        var oldE1WindCnt = e1.windCnt;\n\
        e1.windCnt = e2.windCnt;\n\
        e2.windCnt = oldE1WindCnt;\n\
      }\n\
      else\n\
      {\n\
        if (e1.windCnt + e2.windDelta == 0) e1.windCnt = -e1.windCnt;\n\
        else e1.windCnt += e2.windDelta;\n\
        if (e2.windCnt - e1.windDelta == 0) e2.windCnt = -e2.windCnt;\n\
        else e2.windCnt -= e1.windDelta;\n\
      }\n\
    }\n\
    else\n\
    {\n\
      if (!this.IsEvenOddFillType(e2)) e1.windCnt2 += e2.windDelta;\n\
      else e1.windCnt2 = (e1.windCnt2 == 0) ? 1 : 0;\n\
      if (!this.IsEvenOddFillType(e1)) e2.windCnt2 -= e1.windDelta;\n\
      else e2.windCnt2 = (e2.windCnt2 == 0) ? 1 : 0;\n\
    }\n\
    var e1FillType, e2FillType, e1FillType2, e2FillType2;\n\
    if (e1.polyType == ClipperLib.PolyType.ptSubject)\n\
    {\n\
      e1FillType = this.m_SubjFillType;\n\
      e1FillType2 = this.m_ClipFillType;\n\
    }\n\
    else\n\
    {\n\
      e1FillType = this.m_ClipFillType;\n\
      e1FillType2 = this.m_SubjFillType;\n\
    }\n\
    if (e2.polyType == ClipperLib.PolyType.ptSubject)\n\
    {\n\
      e2FillType = this.m_SubjFillType;\n\
      e2FillType2 = this.m_ClipFillType;\n\
    }\n\
    else\n\
    {\n\
      e2FillType = this.m_ClipFillType;\n\
      e2FillType2 = this.m_SubjFillType;\n\
    }\n\
    var e1Wc, e2Wc;\n\
    switch (e1FillType)\n\
    {\n\
      case ClipperLib.PolyFillType.pftPositive:\n\
        e1Wc = e1.windCnt;\n\
        break;\n\
      case ClipperLib.PolyFillType.pftNegative:\n\
        e1Wc = -e1.windCnt;\n\
        break;\n\
      default:\n\
        e1Wc = ClipperLib.Math_Abs_Int32(e1.windCnt);\n\
        break;\n\
    }\n\
    switch (e2FillType)\n\
    {\n\
      case ClipperLib.PolyFillType.pftPositive:\n\
        e2Wc = e2.windCnt;\n\
        break;\n\
      case ClipperLib.PolyFillType.pftNegative:\n\
        e2Wc = -e2.windCnt;\n\
        break;\n\
      default:\n\
        e2Wc = ClipperLib.Math_Abs_Int32(e2.windCnt);\n\
        break;\n\
    }\n\
    if (e1Contributing && e2contributing)\n\
    {\n\
      if (e1stops || e2stops || (e1Wc != 0 && e1Wc != 1) || (e2Wc != 0 && e2Wc != 1) || (e1.polyType != e2.polyType && this.m_ClipType != ClipperLib.ClipType.ctXor)) this.AddLocalMaxPoly(e1, e2, pt);\n\
      else this.DoBothEdges(e1, e2, pt);\n\
    }\n\
    else if (e1Contributing)\n\
    {\n\
      if ((e2Wc == 0 || e2Wc == 1) && (this.m_ClipType != ClipperLib.ClipType.ctIntersection || e2.polyType == ClipperLib.PolyType.ptSubject || (e2.windCnt2 != 0))) this.DoEdge1(e1, e2, pt);\n\
    }\n\
    else if (e2contributing)\n\
    {\n\
      if ((e1Wc == 0 || e1Wc == 1) && (this.m_ClipType != ClipperLib.ClipType.ctIntersection || e1.polyType == ClipperLib.PolyType.ptSubject || (e1.windCnt2 != 0))) this.DoEdge2(e1, e2, pt);\n\
    }\n\
    else if ((e1Wc == 0 || e1Wc == 1) && (e2Wc == 0 || e2Wc == 1) && !e1stops && !e2stops)\n\
    {\n\
      var e1Wc2, e2Wc2;\n\
      switch (e1FillType2)\n\
      {\n\
        case ClipperLib.PolyFillType.pftPositive:\n\
          e1Wc2 = e1.windCnt2;\n\
          break;\n\
        case ClipperLib.PolyFillType.pftNegative:\n\
          e1Wc2 = -e1.windCnt2;\n\
          break;\n\
        default:\n\
          e1Wc2 = ClipperLib.Math_Abs_Int32(e1.windCnt2);\n\
          break;\n\
      }\n\
      switch (e2FillType2)\n\
      {\n\
        case ClipperLib.PolyFillType.pftPositive:\n\
          e2Wc2 = e2.windCnt2;\n\
          break;\n\
        case ClipperLib.PolyFillType.pftNegative:\n\
          e2Wc2 = -e2.windCnt2;\n\
          break;\n\
        default:\n\
          e2Wc2 = ClipperLib.Math_Abs_Int32(e2.windCnt2);\n\
          break;\n\
      }\n\
      if (e1.polyType != e2.polyType) this.AddLocalMinPoly(e1, e2, pt);\n\
      else if (e1Wc == 1 && e2Wc == 1) switch (this.m_ClipType)\n\
      {\n\
        case ClipperLib.ClipType.ctIntersection:\n\
          if (e1Wc2 > 0 && e2Wc2 > 0) this.AddLocalMinPoly(e1, e2, pt);\n\
          break;\n\
        case ClipperLib.ClipType.ctUnion:\n\
          if (e1Wc2 <= 0 && e2Wc2 <= 0) this.AddLocalMinPoly(e1, e2, pt);\n\
          break;\n\
        case ClipperLib.ClipType.ctDifference:\n\
          if (((e1.polyType == ClipperLib.PolyType.ptClip) && (e1Wc2 > 0) && (e2Wc2 > 0)) || ((e1.polyType == ClipperLib.PolyType.ptSubject) && (e1Wc2 <= 0) && (e2Wc2 <= 0))) this.AddLocalMinPoly(e1, e2, pt);\n\
          break;\n\
        case ClipperLib.ClipType.ctXor:\n\
          this.AddLocalMinPoly(e1, e2, pt);\n\
          break;\n\
      }\n\
      else ClipperLib.Clipper.SwapSides(e1, e2);\n\
    }\n\
    if ((e1stops != e2stops) && ((e1stops && (e1.outIdx >= 0)) || (e2stops && (e2.outIdx >= 0))))\n\
    {\n\
      ClipperLib.Clipper.SwapSides(e1, e2);\n\
      ClipperLib.Clipper.SwapPolyIndexes(e1, e2);\n\
    }\n\
    if (e1stops) this.DeleteFromAEL(e1);\n\
    if (e2stops) this.DeleteFromAEL(e2);\n\
  };\n\
  ClipperLib.Clipper.prototype.DeleteFromAEL = function (e)\n\
  {\n\
    var AelPrev = e.prevInAEL;\n\
    var AelNext = e.nextInAEL;\n\
    if (AelPrev == null && AelNext == null && (e != this.m_ActiveEdges)) return;\n\
    if (AelPrev != null) AelPrev.nextInAEL = AelNext;\n\
    else this.m_ActiveEdges = AelNext;\n\
    if (AelNext != null) AelNext.prevInAEL = AelPrev;\n\
    e.nextInAEL = null;\n\
    e.prevInAEL = null;\n\
  };\n\
  ClipperLib.Clipper.prototype.DeleteFromSEL = function (e)\n\
  {\n\
    var SelPrev = e.prevInSEL;\n\
    var SelNext = e.nextInSEL;\n\
    if (SelPrev == null && SelNext == null && (e != this.m_SortedEdges)) return;\n\
    if (SelPrev != null) SelPrev.nextInSEL = SelNext;\n\
    else this.m_SortedEdges = SelNext;\n\
    if (SelNext != null) SelNext.prevInSEL = SelPrev;\n\
    e.nextInSEL = null;\n\
    e.prevInSEL = null;\n\
  };\n\
  ClipperLib.Clipper.prototype.UpdateEdgeIntoAEL = function (e)\n\
  {\n\
    if (e.Value.nextInLML == null) ClipperLib.Error(\"UpdateEdgeIntoAEL: invalid call\");\n\
    var AelPrev = e.Value.prevInAEL;\n\
    var AelNext = e.Value.nextInAEL;\n\
    e.Value.nextInLML.outIdx = e.Value.outIdx;\n\
    if (AelPrev != null) AelPrev.nextInAEL = e.Value.nextInLML;\n\
    else this.m_ActiveEdges = e.Value.nextInLML;\n\
    if (AelNext != null) AelNext.prevInAEL = e.Value.nextInLML;\n\
    e.Value.nextInLML.side = e.Value.side;\n\
    e.Value.nextInLML.windDelta = e.Value.windDelta;\n\
    e.Value.nextInLML.windCnt = e.Value.windCnt;\n\
    e.Value.nextInLML.windCnt2 = e.Value.windCnt2;\n\
    e.Value = e.Value.nextInLML;\n\
    e.Value.prevInAEL = AelPrev;\n\
    e.Value.nextInAEL = AelNext;\n\
    if (e.Value.dx != ClipperLib.ClipperBase.horizontal) this.InsertScanbeam(e.Value.ytop);\n\
  };\n\
  ClipperLib.Clipper.prototype.ProcessHorizontals = function ()\n\
  {\n\
    var horzEdge = this.m_SortedEdges;\n\
    while (horzEdge != null)\n\
    {\n\
      this.DeleteFromSEL(horzEdge);\n\
      this.ProcessHorizontal(horzEdge);\n\
      horzEdge = this.m_SortedEdges;\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.ProcessHorizontal = function (horzEdge)\n\
  {\n\
    var Direction;\n\
    var horzLeft, horzRight;\n\
    if (horzEdge.xcurr < horzEdge.xtop)\n\
    {\n\
      horzLeft = horzEdge.xcurr;\n\
      horzRight = horzEdge.xtop;\n\
      Direction = ClipperLib.Direction.dLeftToRight;\n\
    }\n\
    else\n\
    {\n\
      horzLeft = horzEdge.xtop;\n\
      horzRight = horzEdge.xcurr;\n\
      Direction = ClipperLib.Direction.dRightToLeft;\n\
    }\n\
    var eMaxPair;\n\
    if (horzEdge.nextInLML != null) eMaxPair = null;\n\
    else eMaxPair = this.GetMaximaPair(horzEdge);\n\
    var e = this.GetNextInAEL(horzEdge, Direction);\n\
    while (e != null)\n\
    {\n\
      var eNext = this.GetNextInAEL(e, Direction);\n\
      if (eMaxPair != null || ((Direction == ClipperLib.Direction.dLeftToRight) && (e.xcurr <= horzRight)) || ((Direction == ClipperLib.Direction.dRightToLeft) && (e.xcurr >= horzLeft)))\n\
      {\n\
        if (e.xcurr == horzEdge.xtop && eMaxPair == null)\n\
        {\n\
          if (this.SlopesEqual(e, horzEdge.nextInLML, this.m_UseFullRange))\n\
          {\n\
            if (horzEdge.outIdx >= 0 && e.outIdx >= 0) this.AddJoin(horzEdge.nextInLML, e, horzEdge.outIdx, -1);\n\
            break;\n\
          }\n\
          else if (e.dx < horzEdge.nextInLML.dx) break;\n\
        }\n\
        if (e == eMaxPair)\n\
        {\n\
          if (Direction == ClipperLib.Direction.dLeftToRight) this.IntersectEdges(horzEdge, e, new ClipperLib.IntPoint(e.xcurr, horzEdge.ycurr), 0);\n\
          else this.IntersectEdges(e, horzEdge, new ClipperLib.IntPoint(e.xcurr, horzEdge.ycurr), 0);\n\
          if (eMaxPair.outIdx >= 0) ClipperLib.Error(\"ProcessHorizontal error\");\n\
          return;\n\
        }\n\
        else if (e.dx == ClipperLib.ClipperBase.horizontal && !this.IsMinima(e) && !(e.xcurr > e.xtop))\n\
        {\n\
          if (Direction == ClipperLib.Direction.dLeftToRight) this.IntersectEdges(horzEdge, e, new ClipperLib.IntPoint(e.xcurr, horzEdge.ycurr), (this.IsTopHorz(horzEdge, e.xcurr)) ? ClipperLib.Protects.ipLeft : ClipperLib.Protects.ipBoth);\n\
          else this.IntersectEdges(e, horzEdge, new ClipperLib.IntPoint(e.xcurr, horzEdge.ycurr), (this.IsTopHorz(horzEdge, e.xcurr)) ? ClipperLib.Protects.ipRight : ClipperLib.Protects.ipBoth);\n\
        }\n\
        else if (Direction == ClipperLib.Direction.dLeftToRight)\n\
        {\n\
          this.IntersectEdges(horzEdge, e, new ClipperLib.IntPoint(e.xcurr, horzEdge.ycurr), (this.IsTopHorz(horzEdge, e.xcurr)) ? ClipperLib.Protects.ipLeft : ClipperLib.Protects.ipBoth);\n\
        }\n\
        else\n\
        {\n\
          this.IntersectEdges(e, horzEdge, new ClipperLib.IntPoint(e.xcurr, horzEdge.ycurr), (this.IsTopHorz(horzEdge, e.xcurr)) ? ClipperLib.Protects.ipRight : ClipperLib.Protects.ipBoth);\n\
        }\n\
        this.SwapPositionsInAEL(horzEdge, e);\n\
      }\n\
      else if ((Direction == ClipperLib.Direction.dLeftToRight && e.xcurr > horzRight && horzEdge.nextInSEL == null) || (Direction == ClipperLib.Direction.dRightToLeft && e.xcurr < horzLeft && horzEdge.nextInSEL == null)) break;\n\
      e = eNext;\n\
    }\n\
    if (horzEdge.nextInLML != null)\n\
    {\n\
      if (horzEdge.outIdx >= 0) this.AddOutPt(horzEdge, new ClipperLib.IntPoint(horzEdge.xtop, horzEdge.ytop));\n\
      (function ()\n\
      {\n\
        horzEdge = {\n\
          Value: horzEdge\n\
        };\n\
        var $res = this.UpdateEdgeIntoAEL(horzEdge);\n\
        horzEdge = horzEdge.Value;\n\
        return $res;\n\
      })\n\
        .call(this);\n\
    }\n\
    else\n\
    {\n\
      if (horzEdge.outIdx >= 0) this.IntersectEdges(horzEdge, eMaxPair, new ClipperLib.IntPoint(horzEdge.xtop, horzEdge.ycurr), ClipperLib.Protects.ipBoth);\n\
      this.DeleteFromAEL(eMaxPair);\n\
      this.DeleteFromAEL(horzEdge);\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.IsTopHorz = function (horzEdge, XPos)\n\
  {\n\
    var e = this.m_SortedEdges;\n\
    while (e != null)\n\
    {\n\
      if ((XPos >= Math.min(e.xcurr, e.xtop)) && (XPos <= Math.max(e.xcurr, e.xtop))) return false;\n\
      e = e.nextInSEL;\n\
    }\n\
    return true;\n\
  };\n\
  ClipperLib.Clipper.prototype.GetNextInAEL = function (e, Direction)\n\
  {\n\
    return Direction == ClipperLib.Direction.dLeftToRight ? e.nextInAEL : e.prevInAEL;\n\
  };\n\
  ClipperLib.Clipper.prototype.IsMinima = function (e)\n\
  {\n\
    return e != null && (e.prev.nextInLML != e) && (e.next.nextInLML != e);\n\
  };\n\
  ClipperLib.Clipper.prototype.IsMaxima = function (e, Y)\n\
  {\n\
    return (e != null && e.ytop == Y && e.nextInLML == null);\n\
  };\n\
  ClipperLib.Clipper.prototype.IsIntermediate = function (e, Y)\n\
  {\n\
    return (e.ytop == Y && e.nextInLML != null);\n\
  };\n\
  ClipperLib.Clipper.prototype.GetMaximaPair = function (e)\n\
  {\n\
    if (!this.IsMaxima(e.next, e.ytop) || (e.next.xtop != e.xtop)) return e.prev;\n\
    else return e.next;\n\
  };\n\
  ClipperLib.Clipper.prototype.ProcessIntersections = function (botY, topY)\n\
  {\n\
    if (this.m_ActiveEdges == null) return true;\n\
    try\n\
    {\n\
      this.BuildIntersectList(botY, topY);\n\
      if (this.m_IntersectNodes == null) return true;\n\
      if (this.FixupIntersections()) this.ProcessIntersectList();\n\
      else return false;\n\
    }\n\
    catch ($$e2)\n\
    {\n\
      this.m_SortedEdges = null;\n\
      this.DisposeIntersectNodes();\n\
      ClipperLib.Error(\"ProcessIntersections error\");\n\
    }\n\
    return true;\n\
  };\n\
  ClipperLib.Clipper.prototype.BuildIntersectList = function (botY, topY)\n\
  {\n\
    if (this.m_ActiveEdges == null) return;\n\
    var e = this.m_ActiveEdges;\n\
    e.tmpX = ClipperLib.Clipper.TopX(e, topY);\n\
    this.m_SortedEdges = e;\n\
    this.m_SortedEdges.prevInSEL = null;\n\
    e = e.nextInAEL;\n\
    while (e != null)\n\
    {\n\
      e.prevInSEL = e.prevInAEL;\n\
      e.prevInSEL.nextInSEL = e;\n\
      e.nextInSEL = null;\n\
      e.tmpX = ClipperLib.Clipper.TopX(e, topY);\n\
      e = e.nextInAEL;\n\
    }\n\
    var isModified = true;\n\
    while (isModified && this.m_SortedEdges != null)\n\
    {\n\
      isModified = false;\n\
      e = this.m_SortedEdges;\n\
      while (e.nextInSEL != null)\n\
      {\n\
        var eNext = e.nextInSEL;\n\
        var pt = new ClipperLib.IntPoint();\n\
        if (e.tmpX > eNext.tmpX && (function ()\n\
        {\n\
          pt = {\n\
            Value: pt\n\
          };\n\
          var $res = this.IntersectPoint(e, eNext, pt);\n\
          pt = pt.Value;\n\
          return $res;\n\
        })\n\
          .call(this))\n\
        {\n\
          if (pt.Y > botY)\n\
          {\n\
            pt.Y = botY;\n\
            pt.X = ClipperLib.Clipper.TopX(e, pt.Y);\n\
          }\n\
          this.AddIntersectNode(e, eNext, pt);\n\
          this.SwapPositionsInSEL(e, eNext);\n\
          isModified = true;\n\
        }\n\
        else e = eNext;\n\
      }\n\
      if (e.prevInSEL != null) e.prevInSEL.nextInSEL = null;\n\
      else break;\n\
    }\n\
    this.m_SortedEdges = null;\n\
  };\n\
  ClipperLib.Clipper.prototype.FixupIntersections = function ()\n\
  {\n\
    if (this.m_IntersectNodes.next == null) return true;\n\
    this.CopyAELToSEL();\n\
    var int1 = this.m_IntersectNodes;\n\
    var int2 = this.m_IntersectNodes.next;\n\
    while (int2 != null)\n\
    {\n\
      var e1 = int1.edge1;\n\
      var e2;\n\
      if (e1.prevInSEL == int1.edge2) e2 = e1.prevInSEL;\n\
      else if (e1.nextInSEL == int1.edge2) e2 = e1.nextInSEL;\n\
      else\n\
      {\n\
        while (int2 != null)\n\
        {\n\
          if (int2.edge1.nextInSEL == int2.edge2 || int2.edge1.prevInSEL == int2.edge2) break;\n\
          else int2 = int2.next;\n\
        }\n\
        if (int2 == null) return false;\n\
        this.SwapIntersectNodes(int1, int2);\n\
        e1 = int1.edge1;\n\
        e2 = int1.edge2;\n\
      }\n\
      this.SwapPositionsInSEL(e1, e2);\n\
      int1 = int1.next;\n\
      int2 = int1.next;\n\
    }\n\
    this.m_SortedEdges = null;\n\
    return (int1.edge1.prevInSEL == int1.edge2 || int1.edge1.nextInSEL == int1.edge2);\n\
  };\n\
  ClipperLib.Clipper.prototype.ProcessIntersectList = function ()\n\
  {\n\
    while (this.m_IntersectNodes != null)\n\
    {\n\
      var iNode = this.m_IntersectNodes.next;\n\
      this.IntersectEdges(this.m_IntersectNodes.edge1, this.m_IntersectNodes.edge2, this.m_IntersectNodes.pt, ClipperLib.Protects.ipBoth);\n\
      this.SwapPositionsInAEL(this.m_IntersectNodes.edge1, this.m_IntersectNodes.edge2);\n\
      this.m_IntersectNodes = null;\n\
      this.m_IntersectNodes = iNode;\n\
    }\n\
  };\n\
  /*\n\
  --------------------------------\n\
  Round speedtest: http://jsperf.com/fastest-round\n\
  --------------------------------\n\
  */\n\
  var R1=function(a) { return a < 0 ? Math.ceil(a - 0.5): Math.round(a)};\n\
  var R2=function(a) { return a < 0 ? Math.ceil(a - 0.5): Math.floor(a + 0.5)};\n\
  var R3=function(a) { return a < 0 ? -Math.round(Math.abs(a)): Math.round(a)};\n\
  var R4=function(a) {\n\
    if (a < 0) {\n\
      a -= 0.5;\n\
      return a < -2147483648 ? Math.ceil(a): a | 0;\n\
    } else {\n\
      a += 0.5;\n\
      return a > 2147483647 ? Math.floor(a): a | 0;\n\
    }\n\
  };\n\
  if (browser.msie) ClipperLib.Clipper.Round = R1;\n\
  else if (browser.chromium) ClipperLib.Clipper.Round = R3;\n\
  else if (browser.safari) ClipperLib.Clipper.Round = R4;\n\
  else ClipperLib.Clipper.Round = R2; // eg. browser.chrome || browser.firefox || browser.opera\n\
\n\
  ClipperLib.Clipper.TopX = function (edge, currentY)\n\
  {\n\
    if (currentY == edge.ytop) return edge.xtop;\n\
    return edge.xbot + ClipperLib.Clipper.Round(edge.dx * (currentY - edge.ybot));\n\
  };\n\
  ClipperLib.Clipper.prototype.AddIntersectNode = function (e1, e2, pt)\n\
  {\n\
    var newNode = new ClipperLib.IntersectNode();\n\
    newNode.edge1 = e1;\n\
    newNode.edge2 = e2;\n\
    newNode.pt = pt;\n\
    newNode.next = null;\n\
    if (this.m_IntersectNodes == null) this.m_IntersectNodes = newNode;\n\
    else if (this.ProcessParam1BeforeParam2(newNode, this.m_IntersectNodes))\n\
    {\n\
      newNode.next = this.m_IntersectNodes;\n\
      this.m_IntersectNodes = newNode;\n\
    }\n\
    else\n\
    {\n\
      var iNode = this.m_IntersectNodes;\n\
      while (iNode.next != null && this.ProcessParam1BeforeParam2(iNode.next, newNode))\n\
      iNode = iNode.next;\n\
      newNode.next = iNode.next;\n\
      iNode.next = newNode;\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.ProcessParam1BeforeParam2 = function (node1, node2)\n\
  {\n\
    var result;\n\
    if (node1.pt.Y == node2.pt.Y)\n\
    {\n\
      if (node1.edge1 == node2.edge1 || node1.edge2 == node2.edge1)\n\
      {\n\
        result = node2.pt.X > node1.pt.X;\n\
        return node2.edge1.dx > 0 ? !result : result;\n\
      }\n\
      else if (node1.edge1 == node2.edge2 || node1.edge2 == node2.edge2)\n\
      {\n\
        result = node2.pt.X > node1.pt.X;\n\
        return node2.edge2.dx > 0 ? !result : result;\n\
      }\n\
      else return node2.pt.X > node1.pt.X;\n\
    }\n\
    else return node1.pt.Y > node2.pt.Y;\n\
  };\n\
  ClipperLib.Clipper.prototype.SwapIntersectNodes = function (int1, int2)\n\
  {\n\
    var e1 = int1.edge1;\n\
    var e2 = int1.edge2;\n\
    var p = int1.pt;\n\
    int1.edge1 = int2.edge1;\n\
    int1.edge2 = int2.edge2;\n\
    int1.pt = int2.pt;\n\
    int2.edge1 = e1;\n\
    int2.edge2 = e2;\n\
    int2.pt = p;\n\
  };\n\
  ClipperLib.Clipper.prototype.IntersectPoint = function (edge1, edge2, ip)\n\
  {\n\
    var b1, b2;\n\
    if (this.SlopesEqual(edge1, edge2, this.m_UseFullRange)) return false;\n\
    else if (edge1.dx == 0)\n\
    {\n\
      ip.Value.X = edge1.xbot;\n\
      if (edge2.dx == ClipperLib.ClipperBase.horizontal)\n\
      {\n\
        ip.Value.Y = edge2.ybot;\n\
      }\n\
      else\n\
      {\n\
        b2 = edge2.ybot - (edge2.xbot / edge2.dx);\n\
        ip.Value.Y = ClipperLib.Clipper.Round(ip.Value.X / edge2.dx + b2);\n\
      }\n\
    }\n\
    else if (edge2.dx == 0)\n\
    {\n\
      ip.Value.X = edge2.xbot;\n\
      if (edge1.dx == ClipperLib.ClipperBase.horizontal)\n\
      {\n\
        ip.Value.Y = edge1.ybot;\n\
      }\n\
      else\n\
      {\n\
        b1 = edge1.ybot - (edge1.xbot / edge1.dx);\n\
        ip.Value.Y = ClipperLib.Clipper.Round(ip.Value.X / edge1.dx + b1);\n\
      }\n\
    }\n\
    else\n\
    {\n\
      b1 = edge1.xbot - edge1.ybot * edge1.dx;\n\
      b2 = edge2.xbot - edge2.ybot * edge2.dx;\n\
      var q = (b2 - b1) / (edge1.dx - edge2.dx);\n\
      ip.Value.Y = ClipperLib.Clipper.Round(q);\n\
      if (ClipperLib.Math_Abs_Double(edge1.dx) < ClipperLib.Math_Abs_Double(edge2.dx)) ip.Value.X = ClipperLib.Clipper.Round(edge1.dx * q + b1);\n\
      else ip.Value.X = ClipperLib.Clipper.Round(edge2.dx * q + b2);\n\
    }\n\
    if (ip.Value.Y < edge1.ytop || ip.Value.Y < edge2.ytop)\n\
    {\n\
      if (edge1.ytop > edge2.ytop)\n\
      {\n\
        ip.Value.X = edge1.xtop;\n\
        ip.Value.Y = edge1.ytop;\n\
        return ClipperLib.Clipper.TopX(edge2, edge1.ytop) < edge1.xtop;\n\
      }\n\
      else\n\
      {\n\
        ip.Value.X = edge2.xtop;\n\
        ip.Value.Y = edge2.ytop;\n\
        return ClipperLib.Clipper.TopX(edge1, edge2.ytop) > edge2.xtop;\n\
      }\n\
    }\n\
    else return true;\n\
  };\n\
  ClipperLib.Clipper.prototype.DisposeIntersectNodes = function ()\n\
  {\n\
    while (this.m_IntersectNodes != null)\n\
    {\n\
      var iNode = this.m_IntersectNodes.next;\n\
      this.m_IntersectNodes = null;\n\
      this.m_IntersectNodes = iNode;\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.ProcessEdgesAtTopOfScanbeam = function (topY)\n\
  {\n\
    var e = this.m_ActiveEdges;\n\
    var ePrev;\n\
    while (e != null)\n\
    {\n\
      if (this.IsMaxima(e, topY) && this.GetMaximaPair(e)\n\
        .dx != ClipperLib.ClipperBase.horizontal)\n\
      {\n\
        ePrev = e.prevInAEL;\n\
        this.DoMaxima(e, topY);\n\
        if (ePrev == null) e = this.m_ActiveEdges;\n\
        else e = ePrev.nextInAEL;\n\
      }\n\
      else\n\
      {\n\
        if (this.IsIntermediate(e, topY) && e.nextInLML.dx == ClipperLib.ClipperBase.horizontal)\n\
        {\n\
          if (e.outIdx >= 0)\n\
          {\n\
            this.AddOutPt(e, new ClipperLib.IntPoint(e.xtop, e.ytop));\n\
            for (var i = 0; i < this.m_HorizJoins.length; ++i)\n\
            {\n\
              var pt = new ClipperLib.IntPoint(),\n\
                pt2 = new ClipperLib.IntPoint();\n\
              var hj = this.m_HorizJoins[i];\n\
              if ((function ()\n\
              {\n\
                pt = {\n\
                  Value: pt\n\
                };\n\
                pt2 = {\n\
                  Value: pt2\n\
                };\n\
                var $res = this.GetOverlapSegment(new ClipperLib.IntPoint(hj.edge.xbot, hj.edge.ybot),\n\
                new ClipperLib.IntPoint(hj.edge.xtop, hj.edge.ytop),\n\
                new ClipperLib.IntPoint(e.nextInLML.xbot, e.nextInLML.ybot),\n\
                new ClipperLib.IntPoint(e.nextInLML.xtop, e.nextInLML.ytop), pt, pt2);\n\
                pt = pt.Value;\n\
                pt2 = pt2.Value;\n\
                return $res;\n\
              })\n\
                .call(this)) this.AddJoin(hj.edge, e.nextInLML, hj.savedIdx, e.outIdx);\n\
            }\n\
            this.AddHorzJoin(e.nextInLML, e.outIdx);\n\
          }\n\
          (function ()\n\
          {\n\
            e = {\n\
              Value: e\n\
            };\n\
            var $res = this.UpdateEdgeIntoAEL(e);\n\
            e = e.Value;\n\
            return $res;\n\
          })\n\
            .call(this);\n\
          this.AddEdgeToSEL(e);\n\
        }\n\
        else\n\
        {\n\
          e.xcurr = ClipperLib.Clipper.TopX(e, topY);\n\
          e.ycurr = topY;\n\
        }\n\
        e = e.nextInAEL;\n\
      }\n\
    }\n\
    this.ProcessHorizontals();\n\
    e = this.m_ActiveEdges;\n\
    while (e != null)\n\
    {\n\
      if (this.IsIntermediate(e, topY))\n\
      {\n\
        if (e.outIdx >= 0) this.AddOutPt(e, new ClipperLib.IntPoint(e.xtop, e.ytop));\n\
        (function ()\n\
        {\n\
          e = {\n\
            Value: e\n\
          };\n\
          var $res = this.UpdateEdgeIntoAEL(e);\n\
          e = e.Value;\n\
          return $res;\n\
        })\n\
          .call(this);\n\
        ePrev = e.prevInAEL;\n\
        var eNext = e.nextInAEL;\n\
        if (ePrev != null && ePrev.xcurr == e.xbot && ePrev.ycurr == e.ybot && e.outIdx >= 0 && ePrev.outIdx >= 0 && ePrev.ycurr > ePrev.ytop && this.SlopesEqual(e, ePrev, this.m_UseFullRange))\n\
        {\n\
          this.AddOutPt(ePrev, new ClipperLib.IntPoint(e.xbot, e.ybot));\n\
          this.AddJoin(e, ePrev, -1, -1);\n\
        }\n\
        else if (eNext != null && eNext.xcurr == e.xbot && eNext.ycurr == e.ybot && e.outIdx >= 0 && eNext.outIdx >= 0 && eNext.ycurr > eNext.ytop && this.SlopesEqual(e, eNext, this.m_UseFullRange))\n\
        {\n\
          this.AddOutPt(eNext, new ClipperLib.IntPoint(e.xbot, e.ybot));\n\
          this.AddJoin(e, eNext, -1, -1);\n\
        }\n\
      }\n\
      e = e.nextInAEL;\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.DoMaxima = function (e, topY)\n\
  {\n\
    var eMaxPair = this.GetMaximaPair(e);\n\
    var X = e.xtop;\n\
    var eNext = e.nextInAEL;\n\
    while (eNext != eMaxPair)\n\
    {\n\
      if (eNext == null) ClipperLib.Error(\"DoMaxima error\");\n\
      this.IntersectEdges(e, eNext, new ClipperLib.IntPoint(X, topY), ClipperLib.Protects.ipBoth);\n\
      eNext = eNext.nextInAEL;\n\
    }\n\
    if (e.outIdx < 0 && eMaxPair.outIdx < 0)\n\
    {\n\
      this.DeleteFromAEL(e);\n\
      this.DeleteFromAEL(eMaxPair);\n\
    }\n\
    else if (e.outIdx >= 0 && eMaxPair.outIdx >= 0)\n\
    {\n\
      this.IntersectEdges(e, eMaxPair, new ClipperLib.IntPoint(X, topY), ClipperLib.Protects.ipNone);\n\
    }\n\
    else ClipperLib.Error(\"DoMaxima error\");\n\
  };\n\
  ClipperLib.Clipper.ReversePolygons = function (polys)\n\
  {\n\
    var len = polys.length,\n\
      poly;\n\
    for (var i = 0; i < len; i++)\n\
    {\n\
      if (polys[i] instanceof Array) polys[i].reverse();\n\
    }\n\
  };\n\
  ClipperLib.Clipper.Orientation = function (poly)\n\
  {\n\
    return this.Area(poly) >= 0;\n\
  };\n\
  ClipperLib.Clipper.prototype.PointCount = function (pts)\n\
  {\n\
    if (pts == null) return 0;\n\
    var result = 0;\n\
    var p = pts;\n\
    do {\n\
      result++;\n\
      p = p.next;\n\
    }\n\
    while (p != pts);\n\
    return result;\n\
  };\n\
  ClipperLib.Clipper.prototype.BuildResult = function (polyg)\n\
  {\n\
    ClipperLib.Clear(polyg);\n\
    var outRec, len = this.m_PolyOuts.length;\n\
    for (var i = 0; i < len; i++)\n\
    {\n\
      outRec = this.m_PolyOuts[i];\n\
      if (outRec.pts == null) continue;\n\
      var p = outRec.pts;\n\
      var cnt = this.PointCount(p);\n\
      if (cnt < 3) continue;\n\
      var pg = new ClipperLib.Polygon(cnt);\n\
      for (var j = 0; j < cnt; j++)\n\
      {\n\
        //pg.push(p.pt);\n\
        pg.push(new ClipperLib.IntPoint(p.pt.X, p.pt.Y)); // Have to create new point, because the point can be a reference to other point\n\
        p = p.prev;\n\
      }\n\
      polyg.push(pg);\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.BuildResultEx = function (polyg)\n\
  {\n\
    ClipperLib.Clear(polyg);\n\
    var i = 0;\n\
    while (i < this.m_PolyOuts.length)\n\
    {\n\
      var outRec = this.m_PolyOuts[i++];\n\
      if (outRec.pts == null) break;\n\
      var p = outRec.pts;\n\
      var cnt = this.PointCount(p);\n\
      if (cnt < 3) continue;\n\
      var epg = new ClipperLib.ExPolygon();\n\
      epg.outer = new ClipperLib.Polygon();\n\
      epg.holes = new ClipperLib.Polygons();\n\
      for (var j = 0; j < cnt; j++)\n\
      {\n\
        //epg.outer.push(p.pt);\n\
        epg.outer.push(new ClipperLib.IntPoint(p.pt.X, p.pt.Y)); // Have to create new point, because the point can be a reference to other point\n\
        p = p.prev;\n\
      }\n\
      while (i < this.m_PolyOuts.length)\n\
      {\n\
        outRec = this.m_PolyOuts[i];\n\
        if (outRec.pts == null || !outRec.isHole) break;\n\
        var pg = new ClipperLib.Polygon();\n\
        p = outRec.pts;\n\
        do {\n\
          //pg.push(p.pt);\n\
          pg.push(new ClipperLib.IntPoint(p.pt.X, p.pt.Y)); // Have to create new point, because the point can be a reference to other point\n\
          p = p.prev;\n\
        }\n\
        while (p != outRec.pts);\n\
        epg.holes.push(pg);\n\
        i++;\n\
      }\n\
      polyg.push(epg);\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.FixupOutPolygon = function (outRec)\n\
  {\n\
    var lastOK = null;\n\
    outRec.pts = outRec.bottomPt;\n\
    var pp = outRec.bottomPt;\n\
    for (;;)\n\
    {\n\
      if (pp.prev == pp || pp.prev == pp.next)\n\
      {\n\
        this.DisposeOutPts(pp);\n\
        outRec.pts = null;\n\
        outRec.bottomPt = null;\n\
        return;\n\
      }\n\
      if (ClipperLib.ClipperBase.PointsEqual(pp.pt, pp.next.pt) || this.SlopesEqual(pp.prev.pt, pp.pt, pp.next.pt, this.m_UseFullRange))\n\
      {\n\
        lastOK = null;\n\
        var tmp = pp;\n\
        if (pp == outRec.bottomPt) outRec.bottomPt = null;\n\
        pp.prev.next = pp.next;\n\
        pp.next.prev = pp.prev;\n\
        pp = pp.prev;\n\
        tmp = null;\n\
      }\n\
      else if (pp == lastOK) break;\n\
      else\n\
      {\n\
        if (lastOK == null) lastOK = pp;\n\
        pp = pp.next;\n\
      }\n\
    }\n\
    if (outRec.bottomPt == null)\n\
    {\n\
      outRec.bottomPt = this.GetBottomPt(pp);\n\
      outRec.bottomPt.idx = outRec.idx;\n\
      outRec.pts = outRec.bottomPt;\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.JoinPoints = function (j, p1, p2)\n\
  {\n\
    p1.Value = null;\n\
    p2.Value = null;\n\
    var outRec1 = this.m_PolyOuts[j.poly1Idx];\n\
    var outRec2 = this.m_PolyOuts[j.poly2Idx];\n\
    if (outRec1 == null || outRec2 == null) return false;\n\
    var pp1a = outRec1.pts;\n\
    var pp2a = outRec2.pts;\n\
    var pt1 = j.pt2a,\n\
      pt2 = j.pt2b;\n\
    var pt3 = j.pt1a,\n\
      pt4 = j.pt1b;\n\
    if (!(function ()\n\
    {\n\
      pp1a = {\n\
        Value: pp1a\n\
      };\n\
      pt1 = {\n\
        Value: pt1\n\
      };\n\
      pt2 = {\n\
        Value: pt2\n\
      };\n\
      var $res = this.FindSegment(pp1a, this.m_UseFullRange, pt1, pt2);\n\
      pp1a = pp1a.Value;\n\
      pt1 = pt1.Value;\n\
      pt2 = pt2.Value;\n\
      return $res;\n\
    })\n\
      .call(this)) return false;\n\
    if (outRec1 == outRec2)\n\
    {\n\
      pp2a = pp1a.next;\n\
      if (!(function ()\n\
      {\n\
        pp2a = {\n\
          Value: pp2a\n\
        };\n\
        pt3 = {\n\
          Value: pt3\n\
        };\n\
        pt4 = {\n\
          Value: pt4\n\
        };\n\
        var $res = this.FindSegment(pp2a, this.m_UseFullRange, pt3, pt4);\n\
        pp2a = pp2a.Value;\n\
        pt3 = pt3.Value;\n\
        pt4 = pt4.Value;\n\
        return $res;\n\
      })\n\
        .call(this) || (pp2a == pp1a)) return false;\n\
    }\n\
    else if (!(function ()\n\
    {\n\
      pp2a = {\n\
        Value: pp2a\n\
      };\n\
      pt3 = {\n\
        Value: pt3\n\
      };\n\
      pt4 = {\n\
        Value: pt4\n\
      };\n\
      var $res = this.FindSegment(pp2a, this.m_UseFullRange, pt3, pt4);\n\
      pp2a = pp2a.Value;\n\
      pt3 = pt3.Value;\n\
      pt4 = pt4.Value;\n\
      return $res;\n\
    })\n\
      .call(this)) return false;\n\
    if (!(function ()\n\
    {\n\
      pt1 = {\n\
        Value: pt1\n\
      };\n\
      pt2 = {\n\
        Value: pt2\n\
      };\n\
      var $res = this.GetOverlapSegment(pt1.Value, pt2.Value, pt3, pt4, pt1, pt2);\n\
      pt1 = pt1.Value;\n\
      pt2 = pt2.Value;\n\
      return $res;\n\
    })\n\
      .call(this))\n\
    {\n\
      return false;\n\
    }\n\
    var p3, p4, prev = pp1a.prev;\n\
    if (ClipperLib.ClipperBase.PointsEqual(pp1a.pt, pt1)) p1.Value = pp1a;\n\
    else if (ClipperLib.ClipperBase.PointsEqual(prev.pt, pt1)) p1.Value = prev;\n\
    else p1.Value = this.InsertPolyPtBetween(pp1a, prev, pt1);\n\
    if (ClipperLib.ClipperBase.PointsEqual(pp1a.pt, pt2)) p2.Value = pp1a;\n\
    else if (ClipperLib.ClipperBase.PointsEqual(prev.pt, pt2)) p2.Value = prev;\n\
    else if ((p1.Value == pp1a) || (p1.Value == prev)) p2.Value = this.InsertPolyPtBetween(pp1a, prev, pt2);\n\
    else if (this.Pt3IsBetweenPt1AndPt2(pp1a.pt, p1.Value.pt, pt2)) p2.Value = this.InsertPolyPtBetween(pp1a, p1.Value, pt2);\n\
    else p2.Value = this.InsertPolyPtBetween(p1.Value, prev, pt2);\n\
    prev = pp2a.prev;\n\
    if (ClipperLib.ClipperBase.PointsEqual(pp2a.pt, pt1)) p3 = pp2a;\n\
    else if (ClipperLib.ClipperBase.PointsEqual(prev.pt, pt1)) p3 = prev;\n\
    else p3 = this.InsertPolyPtBetween(pp2a, prev, pt1);\n\
    if (ClipperLib.ClipperBase.PointsEqual(pp2a.pt, pt2)) p4 = pp2a;\n\
    else if (ClipperLib.ClipperBase.PointsEqual(prev.pt, pt2)) p4 = prev;\n\
    else if ((p3 == pp2a) || (p3 == prev)) p4 = this.InsertPolyPtBetween(pp2a, prev, pt2);\n\
    else if (this.Pt3IsBetweenPt1AndPt2(pp2a.pt, p3.pt, pt2)) p4 = this.InsertPolyPtBetween(pp2a, p3, pt2);\n\
    else p4 = this.InsertPolyPtBetween(p3, prev, pt2);\n\
    if (p1.Value.next == p2.Value && p3.prev == p4)\n\
    {\n\
      p1.Value.next = p3;\n\
      p3.prev = p1.Value;\n\
      p2.Value.prev = p4;\n\
      p4.next = p2.Value;\n\
      return true;\n\
    }\n\
    else if (p1.Value.prev == p2.Value && p3.next == p4)\n\
    {\n\
      p1.Value.prev = p3;\n\
      p3.next = p1.Value;\n\
      p2.Value.next = p4;\n\
      p4.prev = p2.Value;\n\
      return true;\n\
    }\n\
    else return false;\n\
  };\n\
  ClipperLib.Clipper.prototype.FixupJoinRecs = function (j, pt, startIdx)\n\
  {\n\
    for (var k = startIdx; k < this.m_Joins.length; k++)\n\
    {\n\
      var j2 = this.m_Joins[k];\n\
      if (j2.poly1Idx == j.poly1Idx && this.PointIsVertex(j2.pt1a, pt)) j2.poly1Idx = j.poly2Idx;\n\
      if (j2.poly2Idx == j.poly1Idx && this.PointIsVertex(j2.pt2a, pt)) j2.poly2Idx = j.poly2Idx;\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.JoinCommonEdges = function ()\n\
  {\n\
    var k, orec;\n\
    for (var i = 0; i < this.m_Joins.length; i++)\n\
    {\n\
      var j = this.m_Joins[i];\n\
      var p1, p2;\n\
      if (!(function ()\n\
      {\n\
        p1 = {\n\
          Value: p1\n\
        };\n\
        p2 = {\n\
          Value: p2\n\
        };\n\
        var $res = this.JoinPoints(j, p1, p2);\n\
        p1 = p1.Value;\n\
        p2 = p2.Value;\n\
        return $res;\n\
      })\n\
        .call(this)) continue;\n\
      var outRec1 = this.m_PolyOuts[j.poly1Idx];\n\
      var outRec2 = this.m_PolyOuts[j.poly2Idx];\n\
      if (outRec1 == outRec2)\n\
      {\n\
        outRec1.pts = this.GetBottomPt(p1);\n\
        outRec1.bottomPt = outRec1.pts;\n\
        outRec1.bottomPt.idx = outRec1.idx;\n\
        outRec2 = this.CreateOutRec();\n\
        this.m_PolyOuts.push(outRec2);\n\
        outRec2.idx = this.m_PolyOuts.length - 1;\n\
        j.poly2Idx = outRec2.idx;\n\
        outRec2.pts = this.GetBottomPt(p2);\n\
        outRec2.bottomPt = outRec2.pts;\n\
        outRec2.bottomPt.idx = outRec2.idx;\n\
        if (this.PointInPolygon(outRec2.pts.pt, outRec1.pts, this.m_UseFullRange))\n\
        {\n\
          outRec2.isHole = !outRec1.isHole;\n\
          outRec2.FirstLeft = outRec1;\n\
          this.FixupJoinRecs(j, p2, i + 1);\n\
          this.FixupOutPolygon(outRec1);\n\
          this.FixupOutPolygon(outRec2);\n\
          \n\
          if ((outRec2.isHole ^ this.m_ReverseOutput) == (this.Area(outRec2, this.m_UseFullRange) > 0))\n\
          this.ReversePolyPtLinks(outRec2.pts);\n\
        }\n\
        else if (this.PointInPolygon(outRec1.pts.pt, outRec2.pts, this.m_UseFullRange))\n\
        {\n\
          outRec2.isHole = outRec1.isHole;\n\
          outRec1.isHole = !outRec2.isHole;\n\
          outRec2.FirstLeft = outRec1.FirstLeft;\n\
          outRec1.FirstLeft = outRec2;\n\
          this.FixupJoinRecs(j, p2, i + 1);\n\
          this.FixupOutPolygon(outRec1);\n\
          this.FixupOutPolygon(outRec2);\n\
          \n\
          if ((outRec1.isHole ^ this.m_ReverseOutput) == (this.Area(outRec1, this.m_UseFullRange) > 0))\n\
          this.ReversePolyPtLinks(outRec1.pts);\n\
\n\
          if (this.m_UsingExPolygons && outRec1.isHole) for (k = 0; k < this.m_PolyOuts.length; ++k)\n\
          {\n\
            orec = this.m_PolyOuts[k];\n\
            if (orec.isHole && orec.bottomPt != null && orec.FirstLeft == outRec1) orec.FirstLeft = outRec2;\n\
          }\n\
        }\n\
        else\n\
        {\n\
          outRec2.isHole = outRec1.isHole;\n\
          outRec2.FirstLeft = outRec1.FirstLeft;\n\
          this.FixupJoinRecs(j, p2, i + 1);\n\
          this.FixupOutPolygon(outRec1);\n\
          this.FixupOutPolygon(outRec2);\n\
          \n\
          if (this.m_UsingExPolygons && outRec2.pts != null) for (k = 0; k < this.m_PolyOuts.length; ++k)\n\
          {\n\
            orec = this.m_PolyOuts[k];\n\
            if (orec.isHole && orec.bottomPt != null && orec.FirstLeft == outRec1 && this.PointInPolygon(orec.bottomPt.pt, outRec2.pts, this.m_UseFullRange)) orec.FirstLeft = outRec2;\n\
          }\n\
        }\n\
      }\n\
      else\n\
      {\n\
        if (this.m_UsingExPolygons) for (k = 0; k < this.m_PolyOuts.length; ++k)\n\
        if (this.m_PolyOuts[k].isHole && this.m_PolyOuts[k].bottomPt != null && this.m_PolyOuts[k].FirstLeft == outRec2) this.m_PolyOuts[k].FirstLeft = outRec1;\n\
        this.FixupOutPolygon(outRec1);\n\
        if (outRec1.pts != null)\n\
        {\n\
        \toutRec1.isHole = this.Area(outRec1, this.m_UseFullRange) < 0;\n\
          if (outRec1.isHole && outRec1.FirstLeft == null) outRec1.FirstLeft = outRec2.FirstLeft;\n\
        }\n\
        var OKIdx = outRec1.idx;\n\
        var ObsoleteIdx = outRec2.idx;\n\
        outRec2.pts = null;\n\
        outRec2.bottomPt = null;\n\
        outRec2.AppendLink = outRec1;\n\
        for (k = i + 1; k < this.m_Joins.length; k++)\n\
        {\n\
          var j2 = this.m_Joins[k];\n\
          if (j2.poly1Idx == ObsoleteIdx) j2.poly1Idx = OKIdx;\n\
          if (j2.poly2Idx == ObsoleteIdx) j2.poly2Idx = OKIdx;\n\
        }\n\
      }\n\
    }\n\
  };\n\
  ClipperLib.Clipper.FullRangeNeeded = function (pts)\n\
  {\n\
    var result = false;\n\
    for (var i = 0; i < pts.length; i++) {\n\
      if (ClipperLib.Math_Abs_Int64(pts[i].X) > ClipperLib.ClipperBase.hiRange || ClipperLib.Math_Abs_Int64(pts[i].Y) > ClipperLib.ClipperBase.hiRange) \n\
      ClipperLib.Error(\"Coordinate exceeds range bounds in FullRangeNeeded().\");\n\
      else if (ClipperLib.Math_Abs_Int64(pts[i].X) > ClipperLib.ClipperBase.loRange || ClipperLib.Math_Abs_Int64(pts[i].Y) > ClipperLib.ClipperBase.loRange)\n\
      {\n\
        result = true;\n\
      }\n\
    }\n\
    return result;\n\
  };\n\
  ClipperLib.Clipper.prototype.Area = ClipperLib.Clipper.Area = function ()\n\
  {\n\
    var arg = arguments;\n\
    var i, a;\n\
    if (arg.length == 1) // function ( poly )\n\
    {\n\
      var poly = arg[0];\n\
      var highI = poly.length - 1;\n\
      if (highI < 2) return 0;\n\
      if (ClipperLib.Clipper.FullRangeNeeded(poly))\n\
      {\n\
        a = new Int128( poly[highI].X + poly[0].X ).multiply( new Int128(poly[0].Y - poly[highI].Y) );\n\
        for (i = 1; i <= highI; ++i)\n\
        a = a.add( new Int128( poly[i - 1].X + poly[i].X ).multiply( new Int128( poly[i].Y - poly[i - 1].Y ) ) );\n\
        return parseFloat(a.toString()) / 2;\n\
      }\n\
      else\n\
      {\n\
        var area = (poly[highI].X + poly[0].X) * (poly[0].Y - poly[highI].Y);\n\
        for (i = 1; i <= highI; ++i)\n\
          area += (poly[i - 1].X + poly[i].X) * (poly[i].Y - poly[i -1].Y);\n\
        return area / 2;\n\
      }\n\
    }\n\
    else if (arg.length == 2) //  function (outRec, UseFull64BitRange)\n\
    {\n\
      var outRec = arg[0];\n\
      var UseFull64BitRange = arg[1];\n\
      var op = outRec.pts;\n\
      if (op == null) return 0;\n\
      if (UseFull64BitRange)\n\
      {\n\
        a = new Int128(Int128.ZERO);\n\
        do {\n\
      \t  a = a.add(new Int128( op.pt.X + op.prev.pt.X ).multiply( new Int128 ( op.prev.pt.Y - op.pt.Y ) ) );\n\
          op = op.next;\n\
        } while (op != outRec.pts);\n\
        return parseFloat(a.toString()) / 2; // This could be something faster!\n\
      }\n\
      else\n\
      {\n\
        a = 0;\n\
        do {\n\
          a = a + (op.pt.X + op.prev.pt.X) * (op.prev.pt.Y - op.pt.Y);\n\
          op = op.next;\n\
        }\n\
        while (op != outRec.pts);\n\
        return a / 2;\n\
      }\n\
    }\n\
  };\n\
  ClipperLib.Clipper.BuildArc = function (pt, a1, a2, r)\n\
  {\n\
  \tvar steps = Math.sqrt(ClipperLib.Math_Abs_Double(r)) * ClipperLib.Math_Abs_Double(a2 - a1);\n\
    \n\
    steps = steps / 4; // to avoid overload\n\
    \n\
    // If you want to make steps independent of scaling factor (scale have to be set),\n\
    // the following line does the trick:\n\
    // steps = steps / Math.sqrt(scale) * 2;\n\
    \n\
    // If you want that changing scale factor has some influence to steps, uncomment also the following line:\n\
    // It may be desirable, that bigger precision ( = bigger scaling factor) needs more steps.\n\
    // steps += Math.pow(scale, 0.2);\n\
\n\
    if (steps < 6) steps = 6;\n\
    if (steps > 64) steps = ClipperLib.MaxSteps; // to avoid overload\n\
    \n\
    // if (steps > 1048576) steps = 1048576; // 0x100000\n\
    // if (steps > ClipperLib.MaxSteps) steps = ClipperLib.MaxSteps; // 0x100000\n\
    // Had to change 1048576 to lower value, because when coordinates are near or above lorange, program starts hanging\n\
    // Adjust this value to meet your needs, maybe 10 is enough for most purposes\n\
    var n = ClipperLib.Cast_Int32(steps);\n\
    var result = new ClipperLib.Polygon();\n\
    var da = (a2 - a1) / (n - 1);\n\
    var a = a1;\n\
    for (var i = 0; i < n; ++i)\n\
    {\n\
      result.push(new ClipperLib.IntPoint(pt.X + ClipperLib.Clipper.Round(Math.cos(a) * r), pt.Y + ClipperLib.Clipper.Round(Math.sin(a) * r)));\n\
      a += da;\n\
    }\n\
    return result;\n\
  };\n\
\n\
  ClipperLib.Clipper.GetUnitNormal = function (pt1, pt2)\n\
  {\n\
    var dx = (pt2.X - pt1.X);\n\
    var dy = (pt2.Y - pt1.Y);\n\
    if ((dx == 0) && (dy == 0)) return new ClipperLib.Clipper.DoublePoint(0, 0);\n\
    var f = 1 / Math.sqrt(dx * dx + dy * dy);\n\
    dx *= f;\n\
    dy *= f;\n\
    return new ClipperLib.Clipper.DoublePoint(dy, -dx);\n\
  };\n\
  ClipperLib.Clipper.prototype.OffsetPolygons = function (poly, delta, jointype, MiterLimit, AutoFix)\n\
  {\n\
    var a = arguments;\n\
    if (a.length == 4) AutoFix = true;\n\
    else if (a.length == 3)\n\
    {\n\
      MiterLimit = 2;\n\
      AutoFix = true;\n\
    }\n\
    else if (a.length == 2)\n\
    {\n\
      jointype = ClipperLib.JoinType.jtSquare;\n\
      MiterLimit = 2;\n\
      AutoFix = true;\n\
    }\n\
    if (isNaN(delta)) ClipperLib.Error(\"Delta is not a number\");\n\
    else if (isNaN(MiterLimit)) ClipperLib.Error(\"MiterLimit is not a number\");\n\
    var result = {};\n\
    new ClipperLib.Clipper.PolyOffsetBuilder(poly, result, delta, jointype, MiterLimit, AutoFix);\n\
    if (result.Value) result = result.Value;\n\
    else result = [[]];\n\
    return result;\n\
  };\n\
  ClipperLib.Clipper.prototype.SimplifyPolygon = function (poly, fillType)\n\
  {\n\
    var result = new ClipperLib.Polygons();\n\
    var c = new ClipperLib.Clipper();\n\
    if (c.AddPolygon(poly, ClipperLib.PolyType.ptSubject))\n\
    c.Execute(ClipperLib.ClipType.ctUnion, result, fillType, fillType);\n\
    return result;\n\
  };\n\
  ClipperLib.Clipper.prototype.SimplifyPolygons = function (polys, fillType)\n\
  {\n\
    var result = new ClipperLib.Polygons();\n\
    var c = new ClipperLib.Clipper();\n\
    if(c.AddPolygons(polys, ClipperLib.PolyType.ptSubject))\n\
    c.Execute(ClipperLib.ClipType.ctUnion, result, fillType, fillType);\n\
    return result;\n\
  };\n\
  var ce = ClipperLib.Clipper;\n\
  var ce2 = ClipperLib.ClipperBase;\n\
  var p;\n\
  if (typeof (Object.getOwnPropertyNames) == 'undefined')\n\
  {\n\
    for (p in ce2.prototype)\n\
    if (typeof (ce.prototype[p]) == 'undefined' || ce.prototype[p] == Object.prototype[p]) ce.prototype[p] = ce2.prototype[p];\n\
    for (p in ce2)\n\
    if (typeof (ce[p]) == 'undefined') ce[p] = ce2[p];\n\
    ce.$baseCtor = ce2;\n\
  }\n\
  else\n\
  {\n\
    var props = Object.getOwnPropertyNames(ce2.prototype);\n\
    for (var i = 0; i < props.length; i++)\n\
    if (typeof (Object.getOwnPropertyDescriptor(ce.prototype, props[i])) == 'undefined') Object.defineProperty(ce.prototype, props[i], Object.getOwnPropertyDescriptor(ce2.prototype, props[i]));\n\
    for (p in ce2)\n\
    if (typeof (ce[p]) == 'undefined') ce[p] = ce2[p];\n\
    ce.$baseCtor = ce2;\n\
  }\n\
  ClipperLib.Clipper.DoublePoint = function (x, y)\n\
  {\n\
    this.X = x;\n\
    this.Y = y;\n\
  };\n\
  \n\
  ClipperLib.Clipper.PolyOffsetBuilder = function (pts, solution, delta, jointype, MiterLimit, AutoFix)\n\
  {\n\
    this.pts = null; // Polygons\n\
    this.currentPoly = null; // Polygon\n\
    this.normals = null;\n\
    this.delta = 0;\n\
    this.m_R = 0;\n\
    this.m_i = 0;\n\
    this.m_j = 0;\n\
    this.m_k = 0;\n\
    this.botPt = null; // This is \"this.\" because it is ref in original c# code\n\
    if (delta == 0)\n\
    {\n\
      solution.Value = pts;\n\
      return;\n\
    }\n\
    this.pts = pts;\n\
    this.delta = delta;\n\
    var i, j;\n\
    //AutoFix - fixes polygon orientation if necessary and removes \n\
    //duplicate vertices. Can be set false when you're sure that polygon\n\
    //orientation is correct and that there are no duplicate vertices.\n\
    if (AutoFix)\n\
    {\n\
      var Len = this.pts.length,\n\
        botI = 0;\n\
      while (botI < Len && this.pts[botI].length == 0) botI++;\n\
      if (botI == Len)\n\
      {\n\
        //solution.Value = new ClipperLib.Polygons();\n\
        return;\n\
      }\n\
      //botPt: used to find the lowermost (in inverted Y-axis) & leftmost point\n\
      //This point (on pts[botI]) must be on an outer polygon ring and if \n\
      //its orientation is false (counterclockwise) then assume all polygons \n\
      //need reversing ...\n\
      this.botPt = this.pts[botI][0]; // This is ported with different logic than other C# refs\n\
      // adding botPt to object's property it's accessible through object's\n\
      // methods\n\
      // => All other ref's are now ported using rather complex object.Value\n\
      // technique, which seems to work.\n\
      for (i = botI; i < Len; ++i)\n\
      {\n\
        if (this.UpdateBotPt(this.pts[i][0])) botI = i;\n\
        for (j = this.pts[i].length - 1; j > 0; j--)\n\
        {\n\
          if (ClipperLib.ClipperBase.PointsEqual(this.pts[i][j], this.pts[i][j - 1]))\n\
          {\n\
            this.pts[i].splice(j, 1);\n\
          }\n\
          else if (this.UpdateBotPt(this.pts[i][j])) botI = i;\n\
        }\n\
      }\n\
      if (!ClipperLib.Clipper.Orientation(this.pts[botI])) ClipperLib.Clipper.ReversePolygons(this.pts);\n\
    }\n\
    if (MiterLimit <= 1) MiterLimit = 1;\n\
    var RMin = 2 / (MiterLimit * MiterLimit);\n\
    this.normals = [];\n\
    var deltaSq = delta * delta;\n\
    solution.Value = new ClipperLib.Polygons();\n\
    //ClipperLib.Clear(solution.Value);\n\
    var len;\n\
    for (this.m_i = 0; this.m_i < this.pts.length; this.m_i++)\n\
    {\n\
      len = this.pts[this.m_i].length;\n\
      if (len > 1 && this.pts[this.m_i][0].X == this.pts[this.m_i][len - 1].X && \n\
      this.pts[this.m_i][0].Y == this.pts[this.m_i][len - 1].Y)\n\
      {\n\
        len--;\n\
      }\n\
      if (len == 0 || (len < 3 && delta <= 0))\n\
      {\n\
        continue;\n\
      }\n\
      else if (len == 1)\n\
      {\n\
        var arc;\n\
        arc = ClipperLib.Clipper.BuildArc(this.pts[this.m_i][len - 1], 0, ClipperLib.PI2, delta);\n\
        solution.Value.push(arc);\n\
        continue;\n\
      }\n\
      \n\
      //build normals ...\n\
      ClipperLib.Clear(this.normals);\n\
      for (j = 0; j < len - 1; ++j)\n\
      this.normals.push(ClipperLib.Clipper.GetUnitNormal(this.pts[this.m_i][j], this.pts[this.m_i][j + 1]));\n\
      this.normals.push(ClipperLib.Clipper.GetUnitNormal(this.pts[this.m_i][len - 1], this.pts[this.m_i][0]));\n\
\n\
      this.currentPoly = new ClipperLib.Polygon();\n\
      this.m_k = len - 1;\n\
      for (this.m_j = 0; this.m_j < len; ++this.m_j)\n\
      {\n\
        switch (jointype)\n\
        {\n\
          case ClipperLib.JoinType.jtMiter:\n\
            this.m_R = 1 + (this.normals[this.m_j].X * this.normals[this.m_k].X + this.normals[this.m_j].Y * this.normals[this.m_k].Y);\n\
            if (this.m_R >= RMin) this.DoMiter();\n\
            else this.DoSquare(MiterLimit);\n\
            break;\n\
          case ClipperLib.JoinType.jtRound:\n\
            this.DoRound();\n\
            break;\n\
          case ClipperLib.JoinType.jtSquare:\n\
            this.DoSquare(1);\n\
            break;\n\
        }\n\
        this.m_k = this.m_j;\n\
      }\n\
      solution.Value.push(this.currentPoly);\n\
    }\n\
    \n\
    //finally, clean up untidy corners ...\n\
    var clpr = new ClipperLib.Clipper();\n\
    clpr.AddPolygons(solution.Value, ClipperLib.PolyType.ptSubject);\n\
    if (delta > 0)\n\
    {\n\
      clpr.Execute(ClipperLib.ClipType.ctUnion, solution.Value, ClipperLib.PolyFillType.pftPositive, ClipperLib.PolyFillType.pftPositive);\n\
    }\n\
    else\n\
    {\n\
      var r = clpr.GetBounds();\n\
      var outer = new ClipperLib.Polygon();\n\
      outer.push(new ClipperLib.IntPoint(r.left - 10, r.bottom + 10));\n\
      outer.push(new ClipperLib.IntPoint(r.right + 10, r.bottom + 10));\n\
      outer.push(new ClipperLib.IntPoint(r.right + 10, r.top - 10));\n\
      outer.push(new ClipperLib.IntPoint(r.left - 10, r.top - 10));\n\
      clpr.AddPolygon(outer, ClipperLib.PolyType.ptSubject);\n\
      clpr.Execute(ClipperLib.ClipType.ctUnion, solution.Value, ClipperLib.PolyFillType.pftNegative, ClipperLib.PolyFillType.pftNegative);\n\
      if (solution.Value.length > 0)\n\
      {\n\
        solution.Value.splice(0, 1);\n\
        for (i = 0; i < solution.Value.length; i++)\n\
        solution.Value[i].reverse();\n\
      }\n\
    }\n\
  };\n\
  //ClipperLib.Clipper.PolyOffsetBuilder.buffLength = 128;\n\
  ClipperLib.Clipper.PolyOffsetBuilder.prototype.UpdateBotPt = function (pt)\n\
  {\n\
    if (pt.Y > this.botPt.Y || (pt.Y == this.botPt.Y && pt.X < this.botPt.X))\n\
    {\n\
      this.botPt = pt;\n\
      return true;\n\
    }\n\
    else return false;\n\
  };\n\
  ClipperLib.Clipper.PolyOffsetBuilder.prototype.AddPoint = function (pt)\n\
  {\n\
    this.currentPoly.push(pt);\n\
  };\n\
  ClipperLib.Clipper.PolyOffsetBuilder.prototype.DoSquare = function (mul)\n\
  {\n\
    var pt1 = new ClipperLib.IntPoint(ClipperLib.Cast_Int64(ClipperLib.Clipper.Round(this.pts[this.m_i][this.m_j].X + this.normals[this.m_k].X * this.delta)),\n\
    ClipperLib.Cast_Int64(ClipperLib.Clipper.Round(this.pts[this.m_i][this.m_j].Y + this.normals[this.m_k].Y * this.delta)));\n\
    var pt2 = new ClipperLib.IntPoint(ClipperLib.Cast_Int64(ClipperLib.Clipper.Round(this.pts[this.m_i][this.m_j].X + this.normals[this.m_j].X * this.delta)),\n\
    ClipperLib.Cast_Int64(ClipperLib.Clipper.Round(this.pts[this.m_i][this.m_j].Y + this.normals[this.m_j].Y * this.delta)));\n\
    if ((this.normals[this.m_k].X * this.normals[this.m_j].Y - this.normals[this.m_j].X * this.normals[this.m_k].Y) * this.delta >= 0)\n\
    {\n\
      var a1 = Math.atan2(this.normals[this.m_k].Y, this.normals[this.m_k].X);\n\
      var a2 = Math.atan2(-this.normals[this.m_j].Y, -this.normals[this.m_j].X);\n\
      a1 = Math.abs(a2 - a1);\n\
      if (a1 > ClipperLib.PI) a1 = ClipperLib.PI2 - a1;\n\
      var dx = Math.tan((ClipperLib.PI - a1) / 4) * Math.abs(this.delta * mul);\n\
      pt1 = new ClipperLib.IntPoint(ClipperLib.Cast_Int64((pt1.X - this.normals[this.m_k].Y * dx)),\n\
      ClipperLib.Cast_Int64((pt1.Y + this.normals[this.m_k].X * dx)));\n\
      this.AddPoint(pt1);\n\
      pt2 = new ClipperLib.IntPoint(ClipperLib.Cast_Int64((pt2.X + this.normals[this.m_j].Y * dx)),\n\
      ClipperLib.Cast_Int64((pt2.Y - this.normals[this.m_j].X * dx)));\n\
      this.AddPoint(pt2);\n\
    }\n\
    else\n\
    {\n\
      this.AddPoint(pt1);\n\
      this.AddPoint(this.pts[this.m_i][this.m_j]);\n\
      this.AddPoint(pt2);\n\
    }\n\
  };\n\
  ClipperLib.Clipper.PolyOffsetBuilder.prototype.DoMiter = function ()\n\
  {\n\
    if ((this.normals[this.m_k].X * this.normals[this.m_j].Y - this.normals[this.m_j].X * this.normals[this.m_k].Y) * this.delta >= 0)\n\
    {\n\
      var q = this.delta / this.m_R;\n\
      this.AddPoint(new ClipperLib.IntPoint(\n\
      ClipperLib.Cast_Int64(\n\
      ClipperLib.Clipper.Round(this.pts[this.m_i][this.m_j].X + (this.normals[this.m_k].X + this.normals[this.m_j].X) * q)),\n\
      ClipperLib.Cast_Int64(\n\
      ClipperLib.Clipper.Round(this.pts[this.m_i][this.m_j].Y + (this.normals[this.m_k].Y + this.normals[this.m_j].Y) * q))));\n\
    }\n\
    else\n\
    {\n\
      var pt1 = new ClipperLib.IntPoint(ClipperLib.Cast_Int64(ClipperLib.Clipper.Round(this.pts[this.m_i][this.m_j].X + this.normals[this.m_k].X * this.delta)),\n\
      ClipperLib.Cast_Int64(ClipperLib.Clipper.Round(this.pts[this.m_i][this.m_j].Y + this.normals[this.m_k].Y * this.delta)));\n\
      var pt2 = new ClipperLib.IntPoint(ClipperLib.Cast_Int64(ClipperLib.Clipper.Round(this.pts[this.m_i][this.m_j].X + this.normals[this.m_j].X * this.delta)),\n\
      ClipperLib.Cast_Int64(ClipperLib.Clipper.Round(this.pts[this.m_i][this.m_j].Y + this.normals[this.m_j].Y * this.delta)));\n\
      this.AddPoint(pt1);\n\
      this.AddPoint(this.pts[this.m_i][this.m_j]);\n\
      this.AddPoint(pt2);\n\
    }\n\
  };\n\
  ClipperLib.Clipper.PolyOffsetBuilder.prototype.DoRound = function ()\n\
  {\n\
    var pt1 = new ClipperLib.IntPoint(ClipperLib.Clipper.Round(this.pts[this.m_i][this.m_j].X + this.normals[this.m_k].X * this.delta),\n\
    ClipperLib.Clipper.Round(this.pts[this.m_i][this.m_j].Y + this.normals[this.m_k].Y * this.delta));\n\
    var pt2 = new ClipperLib.IntPoint(ClipperLib.Clipper.Round(this.pts[this.m_i][this.m_j].X + this.normals[this.m_j].X * this.delta),\n\
    ClipperLib.Clipper.Round(this.pts[this.m_i][this.m_j].Y + this.normals[this.m_j].Y * this.delta));\n\
    this.AddPoint(pt1);\n\
    //round off reflex angles (ie > 180 deg) unless almost flat (ie < 10deg).\n\
    //cross product normals < 0 . angle > 180 deg.\n\
    //dot product normals == 1 . no angle\n\
    if ((this.normals[this.m_k].X * this.normals[this.m_j].Y - this.normals[this.m_j].X * this.normals[this.m_k].Y) * this.delta >= 0)\n\
    {\n\
      if ((this.normals[this.m_j].X * this.normals[this.m_k].X + this.normals[this.m_j].Y * this.normals[this.m_k].Y) < 0.985)\n\
      {\n\
        var a1 = Math.atan2(this.normals[this.m_k].Y, this.normals[this.m_k].X);\n\
        var a2 = Math.atan2(this.normals[this.m_j].Y, this.normals[this.m_j].X);\n\
        if (this.delta > 0 && a2 < a1) a2 += ClipperLib.PI2;\n\
        else if (this.delta < 0 && a2 > a1) a2 -= ClipperLib.PI2;\n\
        var arc = ClipperLib.Clipper.BuildArc(this.pts[this.m_i][this.m_j], a1, a2, this.delta);\n\
        for (var m = 0; m < arc.length; m++)\n\
        this.AddPoint(arc[m]);\n\
      }\n\
    }\n\
    else this.AddPoint(this.pts[this.m_i][this.m_j]);\n\
    this.AddPoint(pt2);\n\
  };\n\
  ClipperLib.Error = function(message)\n\
  {\n\
\t  try {\n\
      throw new Error(message);\n\
    }\n\
    catch(err) {\n\
      alert(err.message);\n\
    }\n\
  };\n\
  // Make deep copy of Polygons or Polygon\n\
  // so that also IntPoint objects are cloned and not only referenced\n\
  // This should be the fastest way\n\
  ClipperLib.Clone = function (polygon)\n\
  {\n\
  \tif (!(polygon instanceof Array)) return [];\n\
    if (polygon.length == 0) return [];\n\
    else if (polygon.length == 1 && polygon[0].length == 0) return [[]];\n\
  \tvar isPolygons = polygon[0] instanceof Array;\n\
    if (!isPolygons) polygon = [polygon];\n\
  \tvar len = polygon.length, plen, i, j, result;\n\
  \tvar results = [];\n\
    for(i = 0; i < len; i++)\n\
    {\n\
      plen = polygon[i].length;\n\
      result = [];\n\
      for(j = 0; j < plen; j++)\n\
      {\n\
        result.push({X: polygon[i][j].X, Y: polygon[i][j].Y});\n\
      }\n\
      results.push(result);\n\
    }\n\
    if (!isPolygons) results = results[0];\n\
    return results;\n\
  };\n\
  \n\
  // Clean() joins vertices that are too near each other\n\
  // and causes distortion to offsetted polygons without cleaning\n\
  ClipperLib.Clean = function (polygon, delta)\n\
  {\n\
    if (!(polygon instanceof Array)) return [];\n\
    var isPolygons = polygon[0] instanceof Array;\n\
    var polygon = ClipperLib.Clone(polygon);\n\
    if (typeof delta != \"number\" || delta === null) \n\
    {\n\
      ClipperLib.Error(\"Delta is not a number in Clean().\");\n\
      return polygon;\n\
    }\n\
    if (polygon.length == 0 || (polygon.length == 1 && polygon[0].length == 0) || delta < 0) return polygon;\n\
    if (!isPolygons) polygon = [polygon];\n\
    var k_length = polygon.length;\n\
    var len, poly, result, d, p, j, i;\n\
    var results = [];\n\
    for(var k = 0; k < k_length; k++)\n\
    {\n\
      poly = polygon[k];\n\
      len = poly.length;\n\
      if (len == 0) continue;\n\
      else if (len < 3) {\n\
        result = poly;\n\
        results.push(result);\n\
        continue;\n\
      }\n\
      result = poly;\n\
      d = delta * delta;\n\
      //d = Math.floor(c_delta * c_delta);\n\
      p = poly[0];\n\
      j = 1;\n\
      for (i = 1; i < len; i++)\n\
      {\n\
        if ((poly[i].X - p.X) * (poly[i].X - p.X) +\n\
            (poly[i].Y - p.Y) * (poly[i].Y - p.Y) <= d)\n\
          continue;\n\
        result[j] = poly[i];\n\
        p = poly[i];\n\
        j++;\n\
      }\n\
      p = poly[j - 1];\n\
      if ((poly[0].X - p.X) * (poly[0].X - p.X) +\n\
          (poly[0].Y - p.Y) * (poly[0].Y - p.Y) <= d)\n\
        j--;\n\
      if (j < len)\n\
            result.splice(j, len - j);\n\
      if (result.length) results.push(result);\n\
    }\n\
    if (!isPolygons && results.length) results = results[0];\n\
    else if (!isPolygons && results.length == 0) results = [];\n\
    else if (isPolygons && results.length ==0) results = [[]];\n\
    return results;\n\
  }\n\
\n\
  // Removes points that doesn't affect much to the visual appearance.\n\
  // If middle point is at or under certain distance (tolerance) of the line between \n\
  // start and end point, the middle point is removed.\n\
  ClipperLib.Lighten = function (polygon, tolerance)\n\
  {\n\
    if (!(polygon instanceof Array)) return [];\n\
    \n\
    if (typeof tolerance != \"number\" || tolerance === null)\n\
    {\n\
      ClipperLib.Error(\"Tolerance is not a number in Lighten().\")\n\
      return ClipperLib.Clone(polygon);\n\
    }\n\
    if (polygon.length === 0 || (polygon.length==1 && polygon[0].length === 0) || tolerance < 0)\n\
    {\n\
      return ClipperLib.Clone(polygon);\n\
    }\n\
\n\
\t  if (!(polygon[0] instanceof Array)) polygon = [polygon];\n\
\t  var i, j, poly, k, poly2, plen, A, B, P, d, rem, addlast;\n\
\t  var bxax, byay, nL;\n\
\t  var len = polygon.length;\n\
\t  var results = [];\n\
\t  for(i = 0; i < len; i++)\n\
\t  {\n\
\t    poly = polygon[i];\n\
\t    for (k = 0; k < 1000000; k++) // could be forever loop, but wiser to restrict max repeat count\n\
\t    {\n\
\t    \tpoly2 = [];\n\
\t      plen = poly.length;\n\
\t      // the first have to added to the end, if first and last are not the same\n\
\t      // this way we ensure that also the actual last point can be removed if needed\n\
\t      if (poly[plen-1].X != poly[0].X || poly[plen-1].Y != poly[0].Y)\n\
\t      {\n\
\t        addlast = 1;\n\
\t        poly.push({X:poly[0].X, Y:poly[0].Y});\n\
\t        plen = poly.length;\n\
\t      }\n\
\t      else addlast = 0;\n\
\t      rem = []; // Indexes of removed points\n\
\t      for(j = 0; j < plen - 2; j++)\n\
\t      {\n\
\t        A = poly[j]; // Start point of line segment\n\
\t        P = poly[j+1]; // Middle point. This is the one to be removed.\n\
\t        B = poly[j+2]; // End point of line segment\n\
\t        bxax = B.X - A.X;\n\
\t        byay = B.Y - A.Y;\n\
\t        d = 0;\n\
\t        if (bxax !== 0 || byay !== 0) // To avoid Nan, when A==P && P==B. And to avoid peaks (A==B && A!=P), which have lenght, but not area.\n\
\t        {\n\
\t          nL = Math.sqrt(bxax * bxax + byay * byay);\n\
\t          // d is the perpendicular distance from P to (infinite) line AB.\n\
\t          d = Math.abs((P.X - A.X) * byay - (P.Y - A.Y) * bxax) / nL;\n\
\t        }\n\
\t        if (d <= tolerance)\n\
\t        {\n\
\t          rem[j+1] = 1;\n\
\t          j++; // when removed, transfer the pointer to the next one\n\
\t        }\n\
\t      }\n\
\t      // add all unremoved points to poly2\n\
\t      poly2.push({X:poly[0].X, Y:poly[0].Y});\n\
\t      for(j = 1; j < plen-1; j++)\n\
\t        if (!rem[j]) poly2.push({X:poly[j].X,Y:poly[j].Y});\n\
\t      poly2.push({X:poly[plen-1].X,Y:poly[plen-1].Y});\n\
\t      // if the first point was added to the end, remove it\n\
\t      if (addlast) poly.pop();\n\
\t      // break, if there was not anymore removed points\n\
\t      if (!rem.length) break;\n\
\t      // else continue looping using poly2, to check if there are points to remove\n\
\t      else poly = poly2;\n\
\t    }\n\
\t    plen = poly2.length;\n\
\t    // remove duplicate from end, if needed\n\
\t    if (poly2[plen-1].X == poly2[0].X && poly2[plen-1].Y == poly2[0].Y)\n\
\t    {\n\
\t      poly2.pop();\n\
\t    }\n\
\t    if (poly2.length > 2) // to avoid two-point-polygons\n\
\t    results.push(poly2);\n\
    }\n\
    if (!polygon[0] instanceof Array) results = results[0];\n\
    if (typeof (results) == \"undefined\") results = [[]];\n\
    return results;\n\
  }\n\
\n\
  module.exports = ClipperLib;\n\
//@ sourceURL=gcanvas/lib/clipper.js"
));
require.register("gcanvas/lib/motion.js", Function("exports, require, module",
"module.exports = Motion;\n\
\n\
var Point = require('./math/point')\n\
  , Path = require('./path')\n\
  , utils = require('./utils');\n\
\n\
/**\n\
 * Realtime motion interface\n\
 * This actually sends commands to the driver.\n\
 * */\n\
function Motion(ctx) {\n\
  this.ctx = ctx;\n\
  this.position = new Point(0,0,0);\n\
  this.targetDepth = 0; // Current depth for plunge/retract\n\
}\n\
\n\
Motion.prototype = {\n\
  retract: function() {\n\
    this.rapid({z: this.ctx.aboveTop});\n\
  }\n\
, plunge: function() {\n\
    this.linear({z: this.targetDepth});\n\
  }\n\
, rapid: function(params) {\n\
    var newPosition = this.postProcess(params);\n\
    if(!newPosition) return;\n\
\n\
    this.ctx.driver.rapid.call(this.ctx.driver, params);\n\
    this.position = newPosition;\n\
  }\n\
, linear: function(params) {\n\
    var newPosition = this.postProcess(params);\n\
    if(!newPosition) return;\n\
\n\
    this.ctx.driver.linear.call(this.ctx.driver, params);\n\
    this.position = newPosition;\n\
  }\n\
, arcCW: function(params) {\n\
    var newPosition = this.postProcess(params);\n\
    // Can be cyclic so we don't\n\
    // ignore it if the position is the same\n\
\n\
    this.ctx.driver.arcCW.call(this.ctx.driver, params);\n\
\n\
    if(newPosition) {\n\
      this.position = newPosition;\n\
    }\n\
  }\n\
, arcCCW: function(params) {\n\
    var newPosition = this.postProcess(params);\n\
\n\
    this.ctx.driver.arcCCW.call(this.ctx.driver, params);\n\
\n\
    if(newPosition) {\n\
      this.position = newPosition;\n\
    }\n\
  }\n\
, postProcess: function(params) {\n\
    if(params.x)\n\
      params.x = Math.round(params.x * 1000000) / 1000000;\n\
    if(params.y)\n\
      params.y = Math.round(params.y * 1000000) / 1000000;\n\
    if(params.z)\n\
      params.z = Math.round(params.z * 1000000) / 1000000;\n\
    if(params.i)\n\
      params.i = Math.round(params.i * 1000000) / 1000000;\n\
    if(params.j)\n\
      params.j = Math.round(params.j * 1000000) / 1000000;\n\
\n\
    // Set new spindle atc changed\n\
    if(this.ctx.driver.atc\n\
       && this.ctx.atc != this.currentAtc) {\n\
      this.ctx.driver.atc(this.ctx.atc);\n\
      this.currentAtc = this.ctx.atc;\n\
    }\n\
\n\
    // Set new spindle speed changed\n\
    if(this.ctx.driver.speed\n\
       && this.ctx.speed != this.currentSpeed) {\n\
      this.ctx.driver.speed(this.ctx.speed);\n\
      this.currentSpeed = this.ctx.speed;\n\
    }\n\
\n\
    // Set new feedrate changed\n\
    if(this.ctx.driver.feed\n\
       && this.ctx.feed != this.currentFeed) {\n\
      this.ctx.driver.feed(this.ctx.feed);\n\
      this.currentFeed = this.ctx.feed;\n\
    }\n\
\n\
    // Set coolant if changed\n\
    if(this.ctx.driver.coolant\n\
       && this.ctx.coolant != this.currentCoolant) {\n\
      this.ctx.driver.coolant(this.ctx.coolant);\n\
      this.currentCoolant = this.ctx.coolant;\n\
    }\n\
\n\
    var v1 = new Point(\n\
          params.x === undefined ? this.position.x : params.x\n\
        , params.y === undefined ? this.position.y : params.y\n\
        , params.z === undefined ? this.position.z : params.z);\n\
\n\
    if(utils.samePos(this.position, v1)) {\n\
      return false;\n\
    }\n\
\n\
    return v1;\n\
  }\n\
\n\
, followPath: function(path) {\n\
\n\
    if(path.forEach) {\n\
      path.forEach(this.followPath, this);\n\
      return;\n\
    }\n\
\n\
    var each = {};\n\
    var motion = this;\n\
    var driver = this.ctx.driver;\n\
    var item;\n\
\n\
    each[Path.actions.MOVE_TO] = function(x,y) {\n\
      // Optimize out 0 distances moves\n\
      if(utils.sameFloat(x, this.position.x) &&\n\
         utils.sameFloat(y, this.position.y)) {\n\
        return;\n\
      }\n\
      motion.retract();\n\
      motion.rapid({x:x,y:y});\n\
    };\n\
\n\
    each[Path.actions.LINE_TO] = function(x,y) {\n\
      motion.plunge();\n\
      motion.linear({x:x,y:y});\n\
    };\n\
\n\
    each[Path.actions.ELLIPSE] = function(x, y, rx, ry,\n\
\t\t\t\t\t\t\t\t\t  aStart, aEnd, aClockwise , mx, my) {\n\
\n\
      motion.plunge();\n\
\n\
      // Detect plain arc\n\
      if(utils.sameFloat(rx,ry) &&\n\
        (driver.arcCW && !aClockwise) ||\n\
        (driver.arcCCW && aClockwise) ) {\n\
          var center = new Point(x, y);\n\
          var points = utils.arcToPoints(center,\n\
                                         aStart,\n\
                                         aEnd,\n\
                                         rx);\n\
          var params = {\n\
            x: points.end.x, y: points.end.y,\n\
            i: x-points.start.x, j: y-points.start.y\n\
          };\n\
\n\
          if(aClockwise)\n\
            motion.arcCCW(params);\n\
          else\n\
            motion.arcCW(params);\n\
      }\n\
      else {\n\
        this._interpolate('ellipse', arguments, mx, my);\n\
      }\n\
    };\n\
\n\
    each[Path.actions.BEZIER_CURVE_TO] = function() {\n\
      this._interpolate('bezierCurveTo', arguments);\n\
    };\n\
\n\
    each[Path.actions.QUADRATIC_CURVE_TO] = function() {\n\
      this._interpolate('quadraticCurveTo', arguments);\n\
    };\n\
\n\
    for(var i = 0, l = path.actions.length; i < l; ++i) {\n\
      item = path.actions[i]\n\
      each[item.action].apply(this, item.args);\n\
    }\n\
  }\n\
\n\
, _interpolate: function(name, args) {\n\
    var path = new Path();\n\
    path.moveTo(this.position.x, this.position.y);\n\
    path[name].apply(path, args);\n\
\n\
    var pts = path.getPoints(40);\n\
    for(var i=0,l=pts.length; i < l; ++i) {\n\
      var p=pts[i];\n\
      this.linear({x:p.x, y:p.y});\n\
    };\n\
  }\n\
};\n\
//@ sourceURL=gcanvas/lib/motion.js"
));
require.register("gcanvas/lib/parsefont.js", Function("exports, require, module",
"module.export = parseFont;\n\
\n\
// stolen from node-canvas\n\
\n\
/**\n\
 * Text baselines.\n\
 */\n\
\n\
var baselines = ['alphabetic', 'top', 'bottom', 'middle', 'ideographic', 'hanging'];\n\
\n\
/**\n\
 * Font RegExp helpers.\n\
 */\n\
\n\
var weights = 'normal|bold|bolder|lighter|[1-9]00'\n\
  , styles = 'normal|italic|oblique'\n\
  , units = 'px|pt|pc|in|cm|mm|%'\n\
  , string = '\\'([^\\']+)\\'|\"([^\"]+)\"|[\\\\w-]+';\n\
/**\n\
 * Font parser RegExp;\n\
 */\n\
\n\
var fontre = new RegExp('^ *'\n\
  + '(?:(' + weights + ') *)?'\n\
  + '(?:(' + styles + ') *)?'\n\
  + '([\\\\d\\\\.]+)(' + units + ') *'\n\
  + '((?:' + string + ')( *, *(?:' + string + '))*)'\n\
  );\n\
\n\
/**\n\
 * Parse font `str`.\n\
 *\n\
 * @param {String} str\n\
 * @return {Object}\n\
 * @api private\n\
 */\n\
\n\
var parseFont = module.exports = function(str){\n\
  var font = {}\n\
    , captures = fontre.exec(str);\n\
\n\
  // Invalid\n\
  if (!captures) return;\n\
\n\
  // // Cached\n\
  // if (cache[str]) return cache[str];\n\
\n\
  // Populate font object\n\
  font.weight = captures[1] || 'normal';\n\
  font.style = captures[2] || 'normal';\n\
  font.size = parseFloat(captures[3]);\n\
  font.unit = captures[4];\n\
  font.family = captures[5].replace(/[\"']/g, '').split(',')[0];\n\
\n\
  switch (font.unit) {\n\
    case 'pt':\n\
      font.size / 72;\n\
      break;\n\
    case 'in':\n\
      font.size *= 96;\n\
      break;\n\
    case 'mm':\n\
      font.size *= 96.0 / 25.4;\n\
      break;\n\
    case 'cm':\n\
      font.size *= 96.0 / 2.54;\n\
      break;\n\
  }\n\
\n\
  return  font;\n\
};\n\
//@ sourceURL=gcanvas/lib/parsefont.js"
));
require.register("gcanvas/lib/utils.js", Function("exports, require, module",
"var Point = require('./math/point');\n\
\n\
var EPSILON = 0.0000000001;\n\
\n\
module.exports = {\n\
  /*\n\
   * Convert start+end angle arc to start/end points.\n\
   * */\n\
  arcToPoints: function(center, astart, aend, radius) {\n\
    // center = new Vector3(center.x, center.y, center.z);\n\
    var x = center.x,\n\
        y = center.y,\n\
        a = new Point(), // start point\n\
        b = new Point(); // end point\n\
\n\
      a.x = radius * Math.cos(astart) + center.x\n\
      a.y = radius * Math.sin(astart) + center.y\n\
\n\
      b.x = radius * Math.cos(aend) + center.x\n\
      b.y = radius * Math.sin(aend) + center.y\n\
\n\
    return {\n\
      start: a,\n\
      end: b\n\
    };\n\
  }\n\
\n\
  /*\n\
   * Convert start/end/center point arc to start/end angle arc.\n\
   * ex:\n\
   * */\n\
, pointsToArc: function(center, start, end) {\n\
\n\
    center = new Point(center.x, center.y);\n\
    start = new Point(start.x, start.y);\n\
    end = new Point(end.x, end.y);\n\
\n\
    var astart = Math.atan2(start.y - center.y, start.x - center.x),\n\
        aend = Math.atan2(end.y - center.y, end.x - center.x),\n\
        radius = start.clone().sub(center).magnitude();\n\
\n\
    // Always assume a full circle\n\
    // if they are the same \n\
    // Handling of 0,0 optimized in the usage\n\
    if(aend === astart) {\n\
      aend += Math.PI*2;\n\
    }\n\
\n\
    return {\n\
      start: astart\n\
    , end: aend\n\
    , radius: radius \n\
    }\n\
  }\n\
\n\
  /*\n\
  * Given an angle in radians, will return an equivalent angle between\n\
  * [-pi, pi]\n\
  * We have to work around Javascript's STUPID modulo bug: -2 % 3 is not -2,\n\
  * it is 1. That's why we're calling modulo twice.\n\
  * */\n\
, normalizeAngle: function(angle) {\n\
    var a = angle + Math.PI;\n\
    return (a%(2*Math.PI) + 2*Math.PI) % (2*Math.PI) - Math.PI;\n\
  }\n\
\n\
, sameFloat: function(a, b, epsilon) {\n\
\t\tvar absA = Math.abs(a)\n\
      , absB = Math.abs(b)\n\
      , diff = Math.abs(a - b)\n\
\n\
    epsilon = epsilon || EPSILON;\n\
\n\
\t\tif (a == b) { // shortcut, handles infinities\n\
\t\t\treturn true;\n\
\t\t} else if (a == 0 || b == 0 || diff < Number.MIN_VALUE) {\n\
\t\t\t// a or b is zero or both are extremely close to it\n\
\t\t\t// relative error is less meaningful here\n\
\t\t\treturn diff < (epsilon * Number.MIN_VALUE);\n\
\t\t} else { // use relative error\n\
\t\t\treturn diff / (absA + absB) < epsilon;\n\
\t\t}\n\
\t}\n\
, samePos: function(a, b) {\n\
    return this.sameFloat(a.x, b.x)\n\
        && this.sameFloat(a.y, b.y)\n\
        && this.sameFloat(a.z, b.z);\n\
  }\n\
, squeeze: function() {\n\
  }\n\
};\n\
//@ sourceURL=gcanvas/lib/utils.js"
));
require.register("gcanvas/lib/drivers/gcode.js", Function("exports, require, module",
"module.exports = GCodeDriver;\n\
\n\
function GCodeDriver(stream) {\n\
  this.stream = stream || {\n\
    write: function(str) {\n\
      console.log(str);\n\
    }\n\
  };\n\
}\n\
\n\
GCodeDriver.prototype = {\n\
  send: function(code, params) {\n\
    var command = code;\n\
    for(var k in params) {\n\
      command += ' ' + k.toUpperCase() + params[k];\n\
    }\n\
    this.stream.write(command);\n\
  }\n\
, speed: function(n) {\n\
    this.send('S'+n);\n\
  }\n\
, feed: function(n) {\n\
    this.send('F'+n);\n\
  }\n\
, coolant: function(type) {\n\
    if(type === 'mist') {\n\
      // special\n\
      this.send('M07');\n\
    }\n\
    else if(type) {\n\
      // flood\n\
      this.send('M08');\n\
    }\n\
    else {\n\
      // off\n\
      this.send('M09');\n\
    }\n\
  }\n\
, atc: function(id) {\n\
    this.send('M6', {T: id});\n\
  }\n\
, rapid: function(params) {\n\
    this.send('G0', params);\n\
  }\n\
, linear: function(params) {\n\
    this.send('G1', params);\n\
  }\n\
, arcCW: function(params) {\n\
    this.send('G2', params);\n\
  }\n\
, arcCCW: function(params) {\n\
    this.send('G3', params);\n\
  }\n\
};\n\
//@ sourceURL=gcanvas/lib/drivers/gcode.js"
));
require.register("gcanvas/lib/drivers/filter.js", Function("exports, require, module",
"module.exports = Filter;\n\
\n\
var all = [\n\
  'rapid'\n\
, 'linear'\n\
, 'arcCW'\n\
, 'arcCCW'\n\
];\n\
\n\
function Filter(output, whitelist) {\n\
  whitelist = whitelist || all;\n\
\n\
  whitelist.forEach(function(name) {\n\
    if(!output[name]) return;\n\
\n\
    this[name] = function passthrough() {\n\
      output[name].apply(output, arguments);\n\
    };\n\
  }, this);\n\
}\n\
//@ sourceURL=gcanvas/lib/drivers/filter.js"
));
require.register("gcanvas/lib/drivers/simulator.js", Function("exports, require, module",
"module.exports = Simulator;\n\
\n\
function Simulator(ctx) {\n\
  this.ctx = ctx;\n\
}\n\
\n\
Simulator.prototype = {\n\
  rapid: function(p) {\n\
    this.ctx.moveTo(p.x, p.y);\n\
  } \n\
, linear: function(p) {\n\
    this.ctx.lineTo(p.x, p.y);\n\
  }\n\
};\n\
//@ sourceURL=gcanvas/lib/drivers/simulator.js"
));
require.register("gcanvas/lib/fonts/helvetiker_regular.typeface.js", Function("exports, require, module",
"module.exports = ({\"glyphs\":{\"ο\":{\"x_min\":0,\"x_max\":712,\"ha\":815,\"o\":\"m 356 -25 q 96 88 192 -25 q 0 368 0 201 q 92 642 0 533 q 356 761 192 761 q 617 644 517 761 q 712 368 712 533 q 619 91 712 201 q 356 -25 520 -25 m 356 85 q 527 175 465 85 q 583 369 583 255 q 528 562 583 484 q 356 651 466 651 q 189 560 250 651 q 135 369 135 481 q 187 177 135 257 q 356 85 250 85 \"},\"S\":{\"x_min\":0,\"x_max\":788,\"ha\":890,\"o\":\"m 788 291 q 662 54 788 144 q 397 -26 550 -26 q 116 68 226 -26 q 0 337 0 168 l 131 337 q 200 152 131 220 q 384 85 269 85 q 557 129 479 85 q 650 270 650 183 q 490 429 650 379 q 194 513 341 470 q 33 739 33 584 q 142 964 33 881 q 388 1041 242 1041 q 644 957 543 1041 q 756 716 756 867 l 625 716 q 561 874 625 816 q 395 933 497 933 q 243 891 309 933 q 164 759 164 841 q 325 609 164 656 q 625 526 475 568 q 788 291 788 454 \"},\"¦\":{\"x_min\":343,\"x_max\":449,\"ha\":792,\"o\":\"m 449 462 l 343 462 l 343 986 l 449 986 l 449 462 m 449 -242 l 343 -242 l 343 280 l 449 280 l 449 -242 \"},\"/\":{\"x_min\":183.25,\"x_max\":608.328125,\"ha\":792,\"o\":\"m 608 1041 l 266 -129 l 183 -129 l 520 1041 l 608 1041 \"},\"Τ\":{\"x_min\":-0.4375,\"x_max\":777.453125,\"ha\":839,\"o\":\"m 777 893 l 458 893 l 458 0 l 319 0 l 319 892 l 0 892 l 0 1013 l 777 1013 l 777 893 \"},\"y\":{\"x_min\":0,\"x_max\":684.78125,\"ha\":771,\"o\":\"m 684 738 l 388 -83 q 311 -216 356 -167 q 173 -279 252 -279 q 97 -266 133 -279 l 97 -149 q 132 -155 109 -151 q 168 -160 155 -160 q 240 -114 213 -160 q 274 -26 248 -98 l 0 738 l 137 737 l 341 139 l 548 737 l 684 738 \"},\"Π\":{\"x_min\":0,\"x_max\":803,\"ha\":917,\"o\":\"m 803 0 l 667 0 l 667 886 l 140 886 l 140 0 l 0 0 l 0 1012 l 803 1012 l 803 0 \"},\"ΐ\":{\"x_min\":-111,\"x_max\":339,\"ha\":361,\"o\":\"m 339 800 l 229 800 l 229 925 l 339 925 l 339 800 m -1 800 l -111 800 l -111 925 l -1 925 l -1 800 m 284 3 q 233 -10 258 -5 q 182 -15 207 -15 q 85 26 119 -15 q 42 200 42 79 l 42 737 l 167 737 l 168 215 q 172 141 168 157 q 226 101 183 101 q 248 103 239 101 q 284 112 257 104 l 284 3 m 302 1040 l 113 819 l 30 819 l 165 1040 l 302 1040 \"},\"g\":{\"x_min\":0,\"x_max\":686,\"ha\":838,\"o\":\"m 686 34 q 586 -213 686 -121 q 331 -306 487 -306 q 131 -252 216 -306 q 31 -84 31 -190 l 155 -84 q 228 -174 166 -138 q 345 -207 284 -207 q 514 -109 454 -207 q 564 89 564 -27 q 461 6 521 36 q 335 -23 401 -23 q 88 100 184 -23 q 0 370 0 215 q 87 634 0 522 q 330 758 183 758 q 457 728 398 758 q 564 644 515 699 l 564 737 l 686 737 l 686 34 m 582 367 q 529 560 582 481 q 358 652 468 652 q 189 561 250 652 q 135 369 135 482 q 189 176 135 255 q 361 85 251 85 q 529 176 468 85 q 582 367 582 255 \"},\"²\":{\"x_min\":0,\"x_max\":442,\"ha\":539,\"o\":\"m 442 383 l 0 383 q 91 566 0 492 q 260 668 176 617 q 354 798 354 727 q 315 875 354 845 q 227 905 277 905 q 136 869 173 905 q 99 761 99 833 l 14 761 q 82 922 14 864 q 232 974 141 974 q 379 926 316 974 q 442 797 442 878 q 351 635 442 704 q 183 539 321 611 q 92 455 92 491 l 442 455 l 442 383 \"},\"–\":{\"x_min\":0,\"x_max\":705.5625,\"ha\":803,\"o\":\"m 705 334 l 0 334 l 0 410 l 705 410 l 705 334 \"},\"Κ\":{\"x_min\":0,\"x_max\":819.5625,\"ha\":893,\"o\":\"m 819 0 l 650 0 l 294 509 l 139 356 l 139 0 l 0 0 l 0 1013 l 139 1013 l 139 526 l 626 1013 l 809 1013 l 395 600 l 819 0 \"},\"ƒ\":{\"x_min\":-46.265625,\"x_max\":392,\"ha\":513,\"o\":\"m 392 651 l 259 651 l 79 -279 l -46 -278 l 134 651 l 14 651 l 14 751 l 135 751 q 151 948 135 900 q 304 1041 185 1041 q 334 1040 319 1041 q 392 1034 348 1039 l 392 922 q 337 931 360 931 q 271 883 287 931 q 260 793 260 853 l 260 751 l 392 751 l 392 651 \"},\"e\":{\"x_min\":0,\"x_max\":714,\"ha\":813,\"o\":\"m 714 326 l 140 326 q 200 157 140 227 q 359 87 260 87 q 488 130 431 87 q 561 245 545 174 l 697 245 q 577 48 670 123 q 358 -26 484 -26 q 97 85 195 -26 q 0 363 0 197 q 94 642 0 529 q 358 765 195 765 q 626 627 529 765 q 714 326 714 503 m 576 429 q 507 583 564 522 q 355 650 445 650 q 206 583 266 650 q 140 429 152 522 l 576 429 \"},\"ό\":{\"x_min\":0,\"x_max\":712,\"ha\":815,\"o\":\"m 356 -25 q 94 91 194 -25 q 0 368 0 202 q 92 642 0 533 q 356 761 192 761 q 617 644 517 761 q 712 368 712 533 q 619 91 712 201 q 356 -25 520 -25 m 356 85 q 527 175 465 85 q 583 369 583 255 q 528 562 583 484 q 356 651 466 651 q 189 560 250 651 q 135 369 135 481 q 187 177 135 257 q 356 85 250 85 m 576 1040 l 387 819 l 303 819 l 438 1040 l 576 1040 \"},\"J\":{\"x_min\":0,\"x_max\":588,\"ha\":699,\"o\":\"m 588 279 q 287 -26 588 -26 q 58 73 126 -26 q 0 327 0 158 l 133 327 q 160 172 133 227 q 288 96 198 96 q 426 171 391 96 q 449 336 449 219 l 449 1013 l 588 1013 l 588 279 \"},\"»\":{\"x_min\":-1,\"x_max\":503,\"ha\":601,\"o\":\"m 503 302 l 280 136 l 281 256 l 429 373 l 281 486 l 280 608 l 503 440 l 503 302 m 221 302 l 0 136 l 0 255 l 145 372 l 0 486 l -1 608 l 221 440 l 221 302 \"},\"©\":{\"x_min\":-3,\"x_max\":1008,\"ha\":1106,\"o\":\"m 502 -7 q 123 151 263 -7 q -3 501 -3 294 q 123 851 -3 706 q 502 1011 263 1011 q 881 851 739 1011 q 1008 501 1008 708 q 883 151 1008 292 q 502 -7 744 -7 m 502 60 q 830 197 709 60 q 940 501 940 322 q 831 805 940 681 q 502 944 709 944 q 174 805 296 944 q 65 501 65 680 q 173 197 65 320 q 502 60 294 60 m 741 394 q 661 246 731 302 q 496 190 591 190 q 294 285 369 190 q 228 497 228 370 q 295 714 228 625 q 499 813 370 813 q 656 762 588 813 q 733 625 724 711 l 634 625 q 589 704 629 673 q 498 735 550 735 q 377 666 421 735 q 334 504 334 597 q 374 340 334 408 q 490 272 415 272 q 589 304 549 272 q 638 394 628 337 l 741 394 \"},\"ώ\":{\"x_min\":0,\"x_max\":922,\"ha\":1030,\"o\":\"m 687 1040 l 498 819 l 415 819 l 549 1040 l 687 1040 m 922 339 q 856 97 922 203 q 650 -26 780 -26 q 538 9 587 -26 q 461 103 489 44 q 387 12 436 46 q 277 -22 339 -22 q 69 97 147 -22 q 0 338 0 202 q 45 551 0 444 q 161 737 84 643 l 302 737 q 175 552 219 647 q 124 336 124 446 q 155 179 124 248 q 275 88 197 88 q 375 163 341 88 q 400 294 400 219 l 400 572 l 524 572 l 524 294 q 561 135 524 192 q 643 88 591 88 q 762 182 719 88 q 797 341 797 257 q 745 555 797 450 q 619 737 705 637 l 760 737 q 874 551 835 640 q 922 339 922 444 \"},\"^\":{\"x_min\":193.0625,\"x_max\":598.609375,\"ha\":792,\"o\":\"m 598 772 l 515 772 l 395 931 l 277 772 l 193 772 l 326 1013 l 462 1013 l 598 772 \"},\"«\":{\"x_min\":0,\"x_max\":507.203125,\"ha\":604,\"o\":\"m 506 136 l 284 302 l 284 440 l 506 608 l 507 485 l 360 371 l 506 255 l 506 136 m 222 136 l 0 302 l 0 440 l 222 608 l 221 486 l 73 373 l 222 256 l 222 136 \"},\"D\":{\"x_min\":0,\"x_max\":828,\"ha\":935,\"o\":\"m 389 1013 q 714 867 593 1013 q 828 521 828 729 q 712 161 828 309 q 382 0 587 0 l 0 0 l 0 1013 l 389 1013 m 376 124 q 607 247 523 124 q 681 510 681 355 q 607 771 681 662 q 376 896 522 896 l 139 896 l 139 124 l 376 124 \"},\"∙\":{\"x_min\":0,\"x_max\":142,\"ha\":239,\"o\":\"m 142 585 l 0 585 l 0 738 l 142 738 l 142 585 \"},\"ÿ\":{\"x_min\":0,\"x_max\":47,\"ha\":125,\"o\":\"m 47 3 q 37 -7 47 -7 q 28 0 30 -7 q 39 -4 32 -4 q 45 3 45 -1 l 37 0 q 28 9 28 0 q 39 19 28 19 l 47 16 l 47 19 l 47 3 m 37 1 q 44 8 44 1 q 37 16 44 16 q 30 8 30 16 q 37 1 30 1 m 26 1 l 23 22 l 14 0 l 3 22 l 3 3 l 0 25 l 13 1 l 22 25 l 26 1 \"},\"w\":{\"x_min\":0,\"x_max\":1009.71875,\"ha\":1100,\"o\":\"m 1009 738 l 783 0 l 658 0 l 501 567 l 345 0 l 222 0 l 0 738 l 130 738 l 284 174 l 432 737 l 576 738 l 721 173 l 881 737 l 1009 738 \"},\"$\":{\"x_min\":0,\"x_max\":700,\"ha\":793,\"o\":\"m 664 717 l 542 717 q 490 825 531 785 q 381 872 450 865 l 381 551 q 620 446 540 522 q 700 241 700 370 q 618 45 700 116 q 381 -25 536 -25 l 381 -152 l 307 -152 l 307 -25 q 81 62 162 -25 q 0 297 0 149 l 124 297 q 169 146 124 204 q 307 81 215 89 l 307 441 q 80 536 148 469 q 13 725 13 603 q 96 910 13 839 q 307 982 180 982 l 307 1077 l 381 1077 l 381 982 q 574 917 494 982 q 664 717 664 845 m 307 565 l 307 872 q 187 831 233 872 q 142 724 142 791 q 180 618 142 656 q 307 565 218 580 m 381 76 q 562 237 562 96 q 517 361 562 313 q 381 423 472 409 l 381 76 \"},\"\\\\\":{\"x_min\":-0.015625,\"x_max\":425.0625,\"ha\":522,\"o\":\"m 425 -129 l 337 -129 l 0 1041 l 83 1041 l 425 -129 \"},\"µ\":{\"x_min\":0,\"x_max\":697.21875,\"ha\":747,\"o\":\"m 697 -4 q 629 -14 658 -14 q 498 97 513 -14 q 422 9 470 41 q 313 -23 374 -23 q 207 4 258 -23 q 119 81 156 32 l 119 -278 l 0 -278 l 0 738 l 124 738 l 124 343 q 165 173 124 246 q 308 83 216 83 q 452 178 402 83 q 493 359 493 255 l 493 738 l 617 738 l 617 214 q 623 136 617 160 q 673 92 637 92 q 697 96 684 92 l 697 -4 \"},\"Ι\":{\"x_min\":42,\"x_max\":181,\"ha\":297,\"o\":\"m 181 0 l 42 0 l 42 1013 l 181 1013 l 181 0 \"},\"Ύ\":{\"x_min\":0,\"x_max\":1144.5,\"ha\":1214,\"o\":\"m 1144 1012 l 807 416 l 807 0 l 667 0 l 667 416 l 325 1012 l 465 1012 l 736 533 l 1004 1012 l 1144 1012 m 277 1040 l 83 799 l 0 799 l 140 1040 l 277 1040 \"},\"’\":{\"x_min\":0,\"x_max\":139,\"ha\":236,\"o\":\"m 139 851 q 102 737 139 784 q 0 669 65 690 l 0 734 q 59 787 42 741 q 72 873 72 821 l 0 873 l 0 1013 l 139 1013 l 139 851 \"},\"Ν\":{\"x_min\":0,\"x_max\":801,\"ha\":915,\"o\":\"m 801 0 l 651 0 l 131 822 l 131 0 l 0 0 l 0 1013 l 151 1013 l 670 191 l 670 1013 l 801 1013 l 801 0 \"},\"-\":{\"x_min\":8.71875,\"x_max\":350.390625,\"ha\":478,\"o\":\"m 350 317 l 8 317 l 8 428 l 350 428 l 350 317 \"},\"Q\":{\"x_min\":0,\"x_max\":968,\"ha\":1072,\"o\":\"m 954 5 l 887 -79 l 744 35 q 622 -11 687 2 q 483 -26 556 -26 q 127 130 262 -26 q 0 504 0 279 q 127 880 0 728 q 484 1041 262 1041 q 841 884 708 1041 q 968 507 968 735 q 933 293 968 398 q 832 104 899 188 l 954 5 m 723 191 q 802 330 777 248 q 828 499 828 412 q 744 790 828 673 q 483 922 650 922 q 228 791 322 922 q 142 505 142 673 q 227 221 142 337 q 487 91 323 91 q 632 123 566 91 l 520 215 l 587 301 l 723 191 \"},\"ς\":{\"x_min\":1,\"x_max\":676.28125,\"ha\":740,\"o\":\"m 676 460 l 551 460 q 498 595 542 546 q 365 651 448 651 q 199 578 263 651 q 136 401 136 505 q 266 178 136 241 q 508 106 387 142 q 640 -50 640 62 q 625 -158 640 -105 q 583 -278 611 -211 l 465 -278 q 498 -182 490 -211 q 515 -80 515 -126 q 381 12 515 -15 q 134 91 197 51 q 1 388 1 179 q 100 651 1 542 q 354 761 199 761 q 587 680 498 761 q 676 460 676 599 \"},\"M\":{\"x_min\":0,\"x_max\":954,\"ha\":1067,\"o\":\"m 954 0 l 819 0 l 819 869 l 537 0 l 405 0 l 128 866 l 128 0 l 0 0 l 0 1013 l 200 1013 l 472 160 l 757 1013 l 954 1013 l 954 0 \"},\"Ψ\":{\"x_min\":0,\"x_max\":1006,\"ha\":1094,\"o\":\"m 1006 678 q 914 319 1006 429 q 571 200 814 200 l 571 0 l 433 0 l 433 200 q 92 319 194 200 q 0 678 0 429 l 0 1013 l 139 1013 l 139 679 q 191 417 139 492 q 433 326 255 326 l 433 1013 l 571 1013 l 571 326 l 580 326 q 813 423 747 326 q 868 679 868 502 l 868 1013 l 1006 1013 l 1006 678 \"},\"C\":{\"x_min\":0,\"x_max\":886,\"ha\":944,\"o\":\"m 886 379 q 760 87 886 201 q 455 -26 634 -26 q 112 136 236 -26 q 0 509 0 283 q 118 882 0 737 q 469 1041 245 1041 q 748 955 630 1041 q 879 708 879 859 l 745 708 q 649 862 724 805 q 473 920 573 920 q 219 791 312 920 q 136 509 136 675 q 217 229 136 344 q 470 99 311 99 q 672 179 591 99 q 753 379 753 259 l 886 379 \"},\"!\":{\"x_min\":0,\"x_max\":138,\"ha\":236,\"o\":\"m 138 684 q 116 409 138 629 q 105 244 105 299 l 33 244 q 16 465 33 313 q 0 684 0 616 l 0 1013 l 138 1013 l 138 684 m 138 0 l 0 0 l 0 151 l 138 151 l 138 0 \"},\"{\":{\"x_min\":0,\"x_max\":480.5625,\"ha\":578,\"o\":\"m 480 -286 q 237 -213 303 -286 q 187 -45 187 -159 q 194 48 187 -15 q 201 141 201 112 q 164 264 201 225 q 0 314 118 314 l 0 417 q 164 471 119 417 q 201 605 201 514 q 199 665 201 644 q 193 772 193 769 q 241 941 193 887 q 480 1015 308 1015 l 480 915 q 336 866 375 915 q 306 742 306 828 q 310 662 306 717 q 314 577 314 606 q 288 452 314 500 q 176 365 256 391 q 289 275 257 337 q 314 143 314 226 q 313 84 314 107 q 310 -11 310 -5 q 339 -131 310 -94 q 480 -182 377 -182 l 480 -286 \"},\"X\":{\"x_min\":-0.015625,\"x_max\":854.15625,\"ha\":940,\"o\":\"m 854 0 l 683 0 l 423 409 l 166 0 l 0 0 l 347 519 l 18 1013 l 186 1013 l 428 637 l 675 1013 l 836 1013 l 504 520 l 854 0 \"},\"#\":{\"x_min\":0,\"x_max\":963.890625,\"ha\":1061,\"o\":\"m 963 690 l 927 590 l 719 590 l 655 410 l 876 410 l 840 310 l 618 310 l 508 -3 l 393 -2 l 506 309 l 329 310 l 215 -2 l 102 -3 l 212 310 l 0 310 l 36 410 l 248 409 l 312 590 l 86 590 l 120 690 l 347 690 l 459 1006 l 573 1006 l 462 690 l 640 690 l 751 1006 l 865 1006 l 754 690 l 963 690 m 606 590 l 425 590 l 362 410 l 543 410 l 606 590 \"},\"ι\":{\"x_min\":42,\"x_max\":284,\"ha\":361,\"o\":\"m 284 3 q 233 -10 258 -5 q 182 -15 207 -15 q 85 26 119 -15 q 42 200 42 79 l 42 738 l 167 738 l 168 215 q 172 141 168 157 q 226 101 183 101 q 248 103 239 101 q 284 112 257 104 l 284 3 \"},\"Ά\":{\"x_min\":0,\"x_max\":906.953125,\"ha\":982,\"o\":\"m 283 1040 l 88 799 l 5 799 l 145 1040 l 283 1040 m 906 0 l 756 0 l 650 303 l 251 303 l 143 0 l 0 0 l 376 1012 l 529 1012 l 906 0 m 609 421 l 452 866 l 293 421 l 609 421 \"},\")\":{\"x_min\":0,\"x_max\":318,\"ha\":415,\"o\":\"m 318 365 q 257 25 318 191 q 87 -290 197 -141 l 0 -290 q 140 21 93 -128 q 193 360 193 189 q 141 704 193 537 q 0 1024 97 850 l 87 1024 q 257 706 197 871 q 318 365 318 542 \"},\"ε\":{\"x_min\":0,\"x_max\":634.71875,\"ha\":714,\"o\":\"m 634 234 q 527 38 634 110 q 300 -25 433 -25 q 98 29 183 -25 q 0 204 0 93 q 37 314 0 265 q 128 390 67 353 q 56 460 82 419 q 26 555 26 505 q 114 712 26 654 q 295 763 191 763 q 499 700 416 763 q 589 515 589 631 l 478 515 q 419 618 464 580 q 307 657 374 657 q 207 630 253 657 q 151 547 151 598 q 238 445 151 469 q 389 434 280 434 l 389 331 l 349 331 q 206 315 255 331 q 125 210 125 287 q 183 107 125 145 q 302 76 233 76 q 436 117 379 76 q 509 234 493 159 l 634 234 \"},\"Δ\":{\"x_min\":0,\"x_max\":952.78125,\"ha\":1028,\"o\":\"m 952 0 l 0 0 l 400 1013 l 551 1013 l 952 0 m 762 124 l 476 867 l 187 124 l 762 124 \"},\"}\":{\"x_min\":0,\"x_max\":481,\"ha\":578,\"o\":\"m 481 314 q 318 262 364 314 q 282 136 282 222 q 284 65 282 97 q 293 -58 293 -48 q 241 -217 293 -166 q 0 -286 174 -286 l 0 -182 q 143 -130 105 -182 q 171 -2 171 -93 q 168 81 171 22 q 165 144 165 140 q 188 275 165 229 q 306 365 220 339 q 191 455 224 391 q 165 588 165 505 q 168 681 165 624 q 171 742 171 737 q 141 865 171 827 q 0 915 102 915 l 0 1015 q 243 942 176 1015 q 293 773 293 888 q 287 675 293 741 q 282 590 282 608 q 318 466 282 505 q 481 417 364 417 l 481 314 \"},\"‰\":{\"x_min\":-3,\"x_max\":1672,\"ha\":1821,\"o\":\"m 846 0 q 664 76 732 0 q 603 244 603 145 q 662 412 603 344 q 846 489 729 489 q 1027 412 959 489 q 1089 244 1089 343 q 1029 76 1089 144 q 846 0 962 0 m 845 103 q 945 143 910 103 q 981 243 981 184 q 947 340 981 301 q 845 385 910 385 q 745 342 782 385 q 709 243 709 300 q 742 147 709 186 q 845 103 781 103 m 888 986 l 284 -25 l 199 -25 l 803 986 l 888 986 m 241 468 q 58 545 126 468 q -3 715 -3 615 q 56 881 -3 813 q 238 958 124 958 q 421 881 353 958 q 483 712 483 813 q 423 544 483 612 q 241 468 356 468 m 241 855 q 137 811 175 855 q 100 710 100 768 q 136 612 100 653 q 240 572 172 572 q 344 614 306 572 q 382 713 382 656 q 347 810 382 771 q 241 855 308 855 m 1428 0 q 1246 76 1314 0 q 1185 244 1185 145 q 1244 412 1185 344 q 1428 489 1311 489 q 1610 412 1542 489 q 1672 244 1672 343 q 1612 76 1672 144 q 1428 0 1545 0 m 1427 103 q 1528 143 1492 103 q 1564 243 1564 184 q 1530 340 1564 301 q 1427 385 1492 385 q 1327 342 1364 385 q 1291 243 1291 300 q 1324 147 1291 186 q 1427 103 1363 103 \"},\"a\":{\"x_min\":0,\"x_max\":698.609375,\"ha\":794,\"o\":\"m 698 0 q 661 -12 679 -7 q 615 -17 643 -17 q 536 12 564 -17 q 500 96 508 41 q 384 6 456 37 q 236 -25 312 -25 q 65 31 130 -25 q 0 194 0 88 q 118 390 0 334 q 328 435 180 420 q 488 483 476 451 q 495 523 495 504 q 442 619 495 584 q 325 654 389 654 q 209 617 257 654 q 152 513 161 580 l 33 513 q 123 705 33 633 q 332 772 207 772 q 528 712 448 772 q 617 531 617 645 l 617 163 q 624 108 617 126 q 664 90 632 90 l 698 94 l 698 0 m 491 262 l 491 372 q 272 329 350 347 q 128 201 128 294 q 166 113 128 144 q 264 83 205 83 q 414 130 346 83 q 491 262 491 183 \"},\"—\":{\"x_min\":0,\"x_max\":941.671875,\"ha\":1039,\"o\":\"m 941 334 l 0 334 l 0 410 l 941 410 l 941 334 \"},\"=\":{\"x_min\":8.71875,\"x_max\":780.953125,\"ha\":792,\"o\":\"m 780 510 l 8 510 l 8 606 l 780 606 l 780 510 m 780 235 l 8 235 l 8 332 l 780 332 l 780 235 \"},\"N\":{\"x_min\":0,\"x_max\":801,\"ha\":914,\"o\":\"m 801 0 l 651 0 l 131 823 l 131 0 l 0 0 l 0 1013 l 151 1013 l 670 193 l 670 1013 l 801 1013 l 801 0 \"},\"ρ\":{\"x_min\":0,\"x_max\":712,\"ha\":797,\"o\":\"m 712 369 q 620 94 712 207 q 362 -26 521 -26 q 230 2 292 -26 q 119 83 167 30 l 119 -278 l 0 -278 l 0 362 q 91 643 0 531 q 355 764 190 764 q 617 647 517 764 q 712 369 712 536 m 583 366 q 530 559 583 480 q 359 651 469 651 q 190 562 252 651 q 135 370 135 483 q 189 176 135 257 q 359 85 250 85 q 528 175 466 85 q 583 366 583 254 \"},\"2\":{\"x_min\":59,\"x_max\":731,\"ha\":792,\"o\":\"m 731 0 l 59 0 q 197 314 59 188 q 457 487 199 315 q 598 691 598 580 q 543 819 598 772 q 411 867 488 867 q 272 811 328 867 q 209 630 209 747 l 81 630 q 182 901 81 805 q 408 986 271 986 q 629 909 536 986 q 731 694 731 826 q 613 449 731 541 q 378 316 495 383 q 201 122 235 234 l 731 122 l 731 0 \"},\"¯\":{\"x_min\":0,\"x_max\":941.671875,\"ha\":938,\"o\":\"m 941 1033 l 0 1033 l 0 1109 l 941 1109 l 941 1033 \"},\"Z\":{\"x_min\":0,\"x_max\":779,\"ha\":849,\"o\":\"m 779 0 l 0 0 l 0 113 l 621 896 l 40 896 l 40 1013 l 779 1013 l 778 887 l 171 124 l 779 124 l 779 0 \"},\"u\":{\"x_min\":0,\"x_max\":617,\"ha\":729,\"o\":\"m 617 0 l 499 0 l 499 110 q 391 10 460 45 q 246 -25 322 -25 q 61 58 127 -25 q 0 258 0 136 l 0 738 l 125 738 l 125 284 q 156 148 125 202 q 273 82 197 82 q 433 165 369 82 q 493 340 493 243 l 493 738 l 617 738 l 617 0 \"},\"k\":{\"x_min\":0,\"x_max\":612.484375,\"ha\":697,\"o\":\"m 612 738 l 338 465 l 608 0 l 469 0 l 251 382 l 121 251 l 121 0 l 0 0 l 0 1013 l 121 1013 l 121 402 l 456 738 l 612 738 \"},\"Η\":{\"x_min\":0,\"x_max\":803,\"ha\":917,\"o\":\"m 803 0 l 667 0 l 667 475 l 140 475 l 140 0 l 0 0 l 0 1013 l 140 1013 l 140 599 l 667 599 l 667 1013 l 803 1013 l 803 0 \"},\"Α\":{\"x_min\":0,\"x_max\":906.953125,\"ha\":985,\"o\":\"m 906 0 l 756 0 l 650 303 l 251 303 l 143 0 l 0 0 l 376 1013 l 529 1013 l 906 0 m 609 421 l 452 866 l 293 421 l 609 421 \"},\"s\":{\"x_min\":0,\"x_max\":604,\"ha\":697,\"o\":\"m 604 217 q 501 36 604 104 q 292 -23 411 -23 q 86 43 166 -23 q 0 238 0 114 l 121 237 q 175 122 121 164 q 300 85 223 85 q 415 112 363 85 q 479 207 479 147 q 361 309 479 276 q 140 372 141 370 q 21 544 21 426 q 111 708 21 647 q 298 761 190 761 q 492 705 413 761 q 583 531 583 643 l 462 531 q 412 625 462 594 q 298 657 363 657 q 199 636 242 657 q 143 558 143 608 q 262 454 143 486 q 484 394 479 397 q 604 217 604 341 \"},\"B\":{\"x_min\":0,\"x_max\":778,\"ha\":876,\"o\":\"m 580 546 q 724 469 670 535 q 778 311 778 403 q 673 83 778 171 q 432 0 575 0 l 0 0 l 0 1013 l 411 1013 q 629 957 541 1013 q 732 768 732 892 q 691 633 732 693 q 580 546 650 572 m 393 899 l 139 899 l 139 588 l 379 588 q 521 624 462 588 q 592 744 592 667 q 531 859 592 819 q 393 899 471 899 m 419 124 q 566 169 504 124 q 635 303 635 219 q 559 436 635 389 q 402 477 494 477 l 139 477 l 139 124 l 419 124 \"},\"…\":{\"x_min\":0,\"x_max\":614,\"ha\":708,\"o\":\"m 142 0 l 0 0 l 0 151 l 142 151 l 142 0 m 378 0 l 236 0 l 236 151 l 378 151 l 378 0 m 614 0 l 472 0 l 472 151 l 614 151 l 614 0 \"},\"?\":{\"x_min\":0,\"x_max\":607,\"ha\":704,\"o\":\"m 607 777 q 543 599 607 674 q 422 474 482 537 q 357 272 357 391 l 236 272 q 297 487 236 395 q 411 619 298 490 q 474 762 474 691 q 422 885 474 838 q 301 933 371 933 q 179 880 228 933 q 124 706 124 819 l 0 706 q 94 963 0 872 q 302 1044 177 1044 q 511 973 423 1044 q 607 777 607 895 m 370 0 l 230 0 l 230 151 l 370 151 l 370 0 \"},\"H\":{\"x_min\":0,\"x_max\":803,\"ha\":915,\"o\":\"m 803 0 l 667 0 l 667 475 l 140 475 l 140 0 l 0 0 l 0 1013 l 140 1013 l 140 599 l 667 599 l 667 1013 l 803 1013 l 803 0 \"},\"ν\":{\"x_min\":0,\"x_max\":675,\"ha\":761,\"o\":\"m 675 738 l 404 0 l 272 0 l 0 738 l 133 738 l 340 147 l 541 738 l 675 738 \"},\"c\":{\"x_min\":1,\"x_max\":701.390625,\"ha\":775,\"o\":\"m 701 264 q 584 53 681 133 q 353 -26 487 -26 q 91 91 188 -26 q 1 370 1 201 q 92 645 1 537 q 353 761 190 761 q 572 688 479 761 q 690 493 666 615 l 556 493 q 487 606 545 562 q 356 650 428 650 q 186 563 246 650 q 134 372 134 487 q 188 179 134 258 q 359 88 250 88 q 492 136 437 88 q 566 264 548 185 l 701 264 \"},\"¶\":{\"x_min\":0,\"x_max\":566.671875,\"ha\":678,\"o\":\"m 21 892 l 52 892 l 98 761 l 145 892 l 176 892 l 178 741 l 157 741 l 157 867 l 108 741 l 88 741 l 40 871 l 40 741 l 21 741 l 21 892 m 308 854 l 308 731 q 252 691 308 691 q 227 691 240 691 q 207 696 213 695 l 207 712 l 253 706 q 288 733 288 706 l 288 763 q 244 741 279 741 q 193 797 193 741 q 261 860 193 860 q 287 860 273 860 q 308 854 302 855 m 288 842 l 263 843 q 213 796 213 843 q 248 756 213 756 q 288 796 288 756 l 288 842 m 566 988 l 502 988 l 502 -1 l 439 -1 l 439 988 l 317 988 l 317 -1 l 252 -1 l 252 602 q 81 653 155 602 q 0 805 0 711 q 101 989 0 918 q 309 1053 194 1053 l 566 1053 l 566 988 \"},\"β\":{\"x_min\":0,\"x_max\":660,\"ha\":745,\"o\":\"m 471 550 q 610 450 561 522 q 660 280 660 378 q 578 64 660 151 q 367 -22 497 -22 q 239 5 299 -22 q 126 82 178 32 l 126 -278 l 0 -278 l 0 593 q 54 903 0 801 q 318 1042 127 1042 q 519 964 436 1042 q 603 771 603 887 q 567 644 603 701 q 471 550 532 586 m 337 79 q 476 138 418 79 q 535 279 535 198 q 427 437 535 386 q 226 477 344 477 l 226 583 q 398 620 329 583 q 486 762 486 668 q 435 884 486 833 q 312 935 384 935 q 169 861 219 935 q 126 698 126 797 l 126 362 q 170 169 126 242 q 337 79 224 79 \"},\"Μ\":{\"x_min\":0,\"x_max\":954,\"ha\":1068,\"o\":\"m 954 0 l 819 0 l 819 868 l 537 0 l 405 0 l 128 865 l 128 0 l 0 0 l 0 1013 l 199 1013 l 472 158 l 758 1013 l 954 1013 l 954 0 \"},\"Ό\":{\"x_min\":0.109375,\"x_max\":1120,\"ha\":1217,\"o\":\"m 1120 505 q 994 132 1120 282 q 642 -29 861 -29 q 290 130 422 -29 q 167 505 167 280 q 294 883 167 730 q 650 1046 430 1046 q 999 882 868 1046 q 1120 505 1120 730 m 977 504 q 896 784 977 669 q 644 915 804 915 q 391 785 484 915 q 307 504 307 669 q 391 224 307 339 q 644 95 486 95 q 894 224 803 95 q 977 504 977 339 m 277 1040 l 83 799 l 0 799 l 140 1040 l 277 1040 \"},\"Ή\":{\"x_min\":0,\"x_max\":1158,\"ha\":1275,\"o\":\"m 1158 0 l 1022 0 l 1022 475 l 496 475 l 496 0 l 356 0 l 356 1012 l 496 1012 l 496 599 l 1022 599 l 1022 1012 l 1158 1012 l 1158 0 m 277 1040 l 83 799 l 0 799 l 140 1040 l 277 1040 \"},\"•\":{\"x_min\":0,\"x_max\":663.890625,\"ha\":775,\"o\":\"m 663 529 q 566 293 663 391 q 331 196 469 196 q 97 294 194 196 q 0 529 0 393 q 96 763 0 665 q 331 861 193 861 q 566 763 469 861 q 663 529 663 665 \"},\"¥\":{\"x_min\":0.1875,\"x_max\":819.546875,\"ha\":886,\"o\":\"m 563 561 l 697 561 l 696 487 l 520 487 l 482 416 l 482 380 l 697 380 l 695 308 l 482 308 l 482 0 l 342 0 l 342 308 l 125 308 l 125 380 l 342 380 l 342 417 l 303 487 l 125 487 l 125 561 l 258 561 l 0 1013 l 140 1013 l 411 533 l 679 1013 l 819 1013 l 563 561 \"},\"(\":{\"x_min\":0,\"x_max\":318.0625,\"ha\":415,\"o\":\"m 318 -290 l 230 -290 q 61 23 122 -142 q 0 365 0 190 q 62 712 0 540 q 230 1024 119 869 l 318 1024 q 175 705 219 853 q 125 360 125 542 q 176 22 125 187 q 318 -290 223 -127 \"},\"U\":{\"x_min\":0,\"x_max\":796,\"ha\":904,\"o\":\"m 796 393 q 681 93 796 212 q 386 -25 566 -25 q 101 95 208 -25 q 0 393 0 211 l 0 1013 l 138 1013 l 138 391 q 204 191 138 270 q 394 107 276 107 q 586 191 512 107 q 656 391 656 270 l 656 1013 l 796 1013 l 796 393 \"},\"γ\":{\"x_min\":0.5,\"x_max\":744.953125,\"ha\":822,\"o\":\"m 744 737 l 463 54 l 463 -278 l 338 -278 l 338 54 l 154 495 q 104 597 124 569 q 13 651 67 651 l 0 651 l 0 751 l 39 753 q 168 711 121 753 q 242 594 207 676 l 403 208 l 617 737 l 744 737 \"},\"α\":{\"x_min\":0,\"x_max\":765.5625,\"ha\":809,\"o\":\"m 765 -4 q 698 -14 726 -14 q 564 97 586 -14 q 466 7 525 40 q 337 -26 407 -26 q 88 98 186 -26 q 0 369 0 212 q 88 637 0 525 q 337 760 184 760 q 465 728 407 760 q 563 637 524 696 l 563 739 l 685 739 l 685 222 q 693 141 685 168 q 748 94 708 94 q 765 96 760 94 l 765 -4 m 584 371 q 531 562 584 485 q 360 653 470 653 q 192 566 254 653 q 135 379 135 489 q 186 181 135 261 q 358 84 247 84 q 528 176 465 84 q 584 371 584 260 \"},\"F\":{\"x_min\":0,\"x_max\":683.328125,\"ha\":717,\"o\":\"m 683 888 l 140 888 l 140 583 l 613 583 l 613 458 l 140 458 l 140 0 l 0 0 l 0 1013 l 683 1013 l 683 888 \"},\"­\":{\"x_min\":0,\"x_max\":705.5625,\"ha\":803,\"o\":\"m 705 334 l 0 334 l 0 410 l 705 410 l 705 334 \"},\":\":{\"x_min\":0,\"x_max\":142,\"ha\":239,\"o\":\"m 142 585 l 0 585 l 0 738 l 142 738 l 142 585 m 142 0 l 0 0 l 0 151 l 142 151 l 142 0 \"},\"Χ\":{\"x_min\":0,\"x_max\":854.171875,\"ha\":935,\"o\":\"m 854 0 l 683 0 l 423 409 l 166 0 l 0 0 l 347 519 l 18 1013 l 186 1013 l 427 637 l 675 1013 l 836 1013 l 504 521 l 854 0 \"},\"*\":{\"x_min\":116,\"x_max\":674,\"ha\":792,\"o\":\"m 674 768 l 475 713 l 610 544 l 517 477 l 394 652 l 272 478 l 178 544 l 314 713 l 116 766 l 153 876 l 341 812 l 342 1013 l 446 1013 l 446 811 l 635 874 l 674 768 \"},\"†\":{\"x_min\":0,\"x_max\":777,\"ha\":835,\"o\":\"m 458 804 l 777 804 l 777 683 l 458 683 l 458 0 l 319 0 l 319 681 l 0 683 l 0 804 l 319 804 l 319 1015 l 458 1013 l 458 804 \"},\"°\":{\"x_min\":0,\"x_max\":347,\"ha\":444,\"o\":\"m 173 802 q 43 856 91 802 q 0 977 0 905 q 45 1101 0 1049 q 173 1153 90 1153 q 303 1098 255 1153 q 347 977 347 1049 q 303 856 347 905 q 173 802 256 802 m 173 884 q 238 910 214 884 q 262 973 262 937 q 239 1038 262 1012 q 173 1064 217 1064 q 108 1037 132 1064 q 85 973 85 1010 q 108 910 85 937 q 173 884 132 884 \"},\"V\":{\"x_min\":0,\"x_max\":862.71875,\"ha\":940,\"o\":\"m 862 1013 l 505 0 l 361 0 l 0 1013 l 143 1013 l 434 165 l 718 1012 l 862 1013 \"},\"Ξ\":{\"x_min\":0,\"x_max\":734.71875,\"ha\":763,\"o\":\"m 723 889 l 9 889 l 9 1013 l 723 1013 l 723 889 m 673 463 l 61 463 l 61 589 l 673 589 l 673 463 m 734 0 l 0 0 l 0 124 l 734 124 l 734 0 \"},\" \":{\"x_min\":0,\"x_max\":0,\"ha\":853},\"Ϋ\":{\"x_min\":0.328125,\"x_max\":819.515625,\"ha\":889,\"o\":\"m 588 1046 l 460 1046 l 460 1189 l 588 1189 l 588 1046 m 360 1046 l 232 1046 l 232 1189 l 360 1189 l 360 1046 m 819 1012 l 482 416 l 482 0 l 342 0 l 342 416 l 0 1012 l 140 1012 l 411 533 l 679 1012 l 819 1012 \"},\"0\":{\"x_min\":73,\"x_max\":715,\"ha\":792,\"o\":\"m 394 -29 q 153 129 242 -29 q 73 479 73 272 q 152 829 73 687 q 394 989 241 989 q 634 829 545 989 q 715 479 715 684 q 635 129 715 270 q 394 -29 546 -29 m 394 89 q 546 211 489 89 q 598 479 598 322 q 548 748 598 640 q 394 871 491 871 q 241 748 298 871 q 190 479 190 637 q 239 211 190 319 q 394 89 296 89 \"},\"”\":{\"x_min\":0,\"x_max\":347,\"ha\":454,\"o\":\"m 139 851 q 102 737 139 784 q 0 669 65 690 l 0 734 q 59 787 42 741 q 72 873 72 821 l 0 873 l 0 1013 l 139 1013 l 139 851 m 347 851 q 310 737 347 784 q 208 669 273 690 l 208 734 q 267 787 250 741 q 280 873 280 821 l 208 873 l 208 1013 l 347 1013 l 347 851 \"},\"@\":{\"x_min\":0,\"x_max\":1260,\"ha\":1357,\"o\":\"m 1098 -45 q 877 -160 1001 -117 q 633 -203 752 -203 q 155 -29 327 -203 q 0 360 0 127 q 176 802 0 616 q 687 1008 372 1008 q 1123 854 969 1008 q 1260 517 1260 718 q 1155 216 1260 341 q 868 82 1044 82 q 772 106 801 82 q 737 202 737 135 q 647 113 700 144 q 527 82 594 82 q 367 147 420 82 q 314 312 314 212 q 401 565 314 452 q 639 690 498 690 q 810 588 760 690 l 849 668 l 938 668 q 877 441 900 532 q 833 226 833 268 q 853 182 833 198 q 902 167 873 167 q 1088 272 1012 167 q 1159 512 1159 372 q 1051 793 1159 681 q 687 925 925 925 q 248 747 415 925 q 97 361 97 586 q 226 26 97 159 q 627 -122 370 -122 q 856 -87 737 -122 q 1061 8 976 -53 l 1098 -45 m 786 488 q 738 580 777 545 q 643 615 700 615 q 483 517 548 615 q 425 322 425 430 q 457 203 425 250 q 552 156 490 156 q 722 273 665 156 q 786 488 738 309 \"},\"Ί\":{\"x_min\":0,\"x_max\":499,\"ha\":613,\"o\":\"m 277 1040 l 83 799 l 0 799 l 140 1040 l 277 1040 m 499 0 l 360 0 l 360 1012 l 499 1012 l 499 0 \"},\"i\":{\"x_min\":14,\"x_max\":136,\"ha\":275,\"o\":\"m 136 873 l 14 873 l 14 1013 l 136 1013 l 136 873 m 136 0 l 14 0 l 14 737 l 136 737 l 136 0 \"},\"Β\":{\"x_min\":0,\"x_max\":778,\"ha\":877,\"o\":\"m 580 545 q 724 468 671 534 q 778 310 778 402 q 673 83 778 170 q 432 0 575 0 l 0 0 l 0 1013 l 411 1013 q 629 957 541 1013 q 732 768 732 891 q 691 632 732 692 q 580 545 650 571 m 393 899 l 139 899 l 139 587 l 379 587 q 521 623 462 587 q 592 744 592 666 q 531 859 592 819 q 393 899 471 899 m 419 124 q 566 169 504 124 q 635 302 635 219 q 559 435 635 388 q 402 476 494 476 l 139 476 l 139 124 l 419 124 \"},\"υ\":{\"x_min\":0,\"x_max\":617,\"ha\":725,\"o\":\"m 617 352 q 540 94 617 199 q 308 -24 455 -24 q 76 94 161 -24 q 0 352 0 199 l 0 739 l 126 739 l 126 355 q 169 185 126 257 q 312 98 220 98 q 451 185 402 98 q 492 355 492 257 l 492 739 l 617 739 l 617 352 \"},\"]\":{\"x_min\":0,\"x_max\":275,\"ha\":372,\"o\":\"m 275 -281 l 0 -281 l 0 -187 l 151 -187 l 151 920 l 0 920 l 0 1013 l 275 1013 l 275 -281 \"},\"m\":{\"x_min\":0,\"x_max\":1019,\"ha\":1128,\"o\":\"m 1019 0 l 897 0 l 897 454 q 860 591 897 536 q 739 660 816 660 q 613 586 659 660 q 573 436 573 522 l 573 0 l 447 0 l 447 455 q 412 591 447 535 q 294 657 372 657 q 165 586 213 657 q 122 437 122 521 l 122 0 l 0 0 l 0 738 l 117 738 l 117 640 q 202 730 150 697 q 316 763 254 763 q 437 730 381 763 q 525 642 494 697 q 621 731 559 700 q 753 763 682 763 q 943 694 867 763 q 1019 512 1019 625 l 1019 0 \"},\"χ\":{\"x_min\":8.328125,\"x_max\":780.5625,\"ha\":815,\"o\":\"m 780 -278 q 715 -294 747 -294 q 616 -257 663 -294 q 548 -175 576 -227 l 379 133 l 143 -277 l 9 -277 l 313 254 l 163 522 q 127 586 131 580 q 36 640 91 640 q 8 637 27 640 l 8 752 l 52 757 q 162 719 113 757 q 236 627 200 690 l 383 372 l 594 737 l 726 737 l 448 250 l 625 -69 q 670 -153 647 -110 q 743 -188 695 -188 q 780 -184 759 -188 l 780 -278 \"},\"8\":{\"x_min\":55,\"x_max\":736,\"ha\":792,\"o\":\"m 571 527 q 694 424 652 491 q 736 280 736 358 q 648 71 736 158 q 395 -26 551 -26 q 142 69 238 -26 q 55 279 55 157 q 96 425 55 359 q 220 527 138 491 q 120 615 153 562 q 88 726 88 668 q 171 904 88 827 q 395 986 261 986 q 618 905 529 986 q 702 727 702 830 q 670 616 702 667 q 571 527 638 565 m 394 565 q 519 610 475 565 q 563 717 563 655 q 521 823 563 781 q 392 872 474 872 q 265 824 312 872 q 224 720 224 783 q 265 613 224 656 q 394 565 312 565 m 395 91 q 545 150 488 91 q 597 280 597 204 q 546 408 597 355 q 395 465 492 465 q 244 408 299 465 q 194 280 194 356 q 244 150 194 203 q 395 91 299 91 \"},\"ί\":{\"x_min\":42,\"x_max\":326.71875,\"ha\":361,\"o\":\"m 284 3 q 233 -10 258 -5 q 182 -15 207 -15 q 85 26 119 -15 q 42 200 42 79 l 42 737 l 167 737 l 168 215 q 172 141 168 157 q 226 101 183 101 q 248 102 239 101 q 284 112 257 104 l 284 3 m 326 1040 l 137 819 l 54 819 l 189 1040 l 326 1040 \"},\"Ζ\":{\"x_min\":0,\"x_max\":779.171875,\"ha\":850,\"o\":\"m 779 0 l 0 0 l 0 113 l 620 896 l 40 896 l 40 1013 l 779 1013 l 779 887 l 170 124 l 779 124 l 779 0 \"},\"R\":{\"x_min\":0,\"x_max\":781.953125,\"ha\":907,\"o\":\"m 781 0 l 623 0 q 587 242 590 52 q 407 433 585 433 l 138 433 l 138 0 l 0 0 l 0 1013 l 396 1013 q 636 946 539 1013 q 749 731 749 868 q 711 597 749 659 q 608 502 674 534 q 718 370 696 474 q 729 207 722 352 q 781 26 736 62 l 781 0 m 373 551 q 533 594 465 551 q 614 731 614 645 q 532 859 614 815 q 373 896 465 896 l 138 896 l 138 551 l 373 551 \"},\"o\":{\"x_min\":0,\"x_max\":713,\"ha\":821,\"o\":\"m 357 -25 q 94 91 194 -25 q 0 368 0 202 q 93 642 0 533 q 357 761 193 761 q 618 644 518 761 q 713 368 713 533 q 619 91 713 201 q 357 -25 521 -25 m 357 85 q 528 175 465 85 q 584 369 584 255 q 529 562 584 484 q 357 651 467 651 q 189 560 250 651 q 135 369 135 481 q 187 177 135 257 q 357 85 250 85 \"},\"5\":{\"x_min\":54.171875,\"x_max\":738,\"ha\":792,\"o\":\"m 738 314 q 626 60 738 153 q 382 -23 526 -23 q 155 47 248 -23 q 54 256 54 125 l 183 256 q 259 132 204 174 q 382 91 314 91 q 533 149 471 91 q 602 314 602 213 q 538 469 602 411 q 386 528 475 528 q 284 506 332 528 q 197 439 237 484 l 81 439 l 159 958 l 684 958 l 684 840 l 254 840 l 214 579 q 306 627 258 612 q 407 643 354 643 q 636 552 540 643 q 738 314 738 457 \"},\"7\":{\"x_min\":58.71875,\"x_max\":730.953125,\"ha\":792,\"o\":\"m 730 839 q 469 448 560 641 q 335 0 378 255 l 192 0 q 328 441 235 252 q 593 830 421 630 l 58 830 l 58 958 l 730 958 l 730 839 \"},\"K\":{\"x_min\":0,\"x_max\":819.46875,\"ha\":906,\"o\":\"m 819 0 l 649 0 l 294 509 l 139 355 l 139 0 l 0 0 l 0 1013 l 139 1013 l 139 526 l 626 1013 l 809 1013 l 395 600 l 819 0 \"},\",\":{\"x_min\":0,\"x_max\":142,\"ha\":239,\"o\":\"m 142 -12 q 105 -132 142 -82 q 0 -205 68 -182 l 0 -138 q 57 -82 40 -124 q 70 0 70 -51 l 0 0 l 0 151 l 142 151 l 142 -12 \"},\"d\":{\"x_min\":0,\"x_max\":683,\"ha\":796,\"o\":\"m 683 0 l 564 0 l 564 93 q 456 6 516 38 q 327 -25 395 -25 q 87 100 181 -25 q 0 365 0 215 q 90 639 0 525 q 343 763 187 763 q 564 647 486 763 l 564 1013 l 683 1013 l 683 0 m 582 373 q 529 562 582 484 q 361 653 468 653 q 190 561 253 653 q 135 365 135 479 q 189 175 135 254 q 358 85 251 85 q 529 178 468 85 q 582 373 582 258 \"},\"¨\":{\"x_min\":-109,\"x_max\":247,\"ha\":232,\"o\":\"m 247 1046 l 119 1046 l 119 1189 l 247 1189 l 247 1046 m 19 1046 l -109 1046 l -109 1189 l 19 1189 l 19 1046 \"},\"E\":{\"x_min\":0,\"x_max\":736.109375,\"ha\":789,\"o\":\"m 736 0 l 0 0 l 0 1013 l 725 1013 l 725 889 l 139 889 l 139 585 l 677 585 l 677 467 l 139 467 l 139 125 l 736 125 l 736 0 \"},\"Y\":{\"x_min\":0,\"x_max\":820,\"ha\":886,\"o\":\"m 820 1013 l 482 416 l 482 0 l 342 0 l 342 416 l 0 1013 l 140 1013 l 411 534 l 679 1012 l 820 1013 \"},\"\\\"\":{\"x_min\":0,\"x_max\":299,\"ha\":396,\"o\":\"m 299 606 l 203 606 l 203 988 l 299 988 l 299 606 m 96 606 l 0 606 l 0 988 l 96 988 l 96 606 \"},\"‹\":{\"x_min\":17.984375,\"x_max\":773.609375,\"ha\":792,\"o\":\"m 773 40 l 18 376 l 17 465 l 773 799 l 773 692 l 159 420 l 773 149 l 773 40 \"},\"„\":{\"x_min\":0,\"x_max\":364,\"ha\":467,\"o\":\"m 141 -12 q 104 -132 141 -82 q 0 -205 67 -182 l 0 -138 q 56 -82 40 -124 q 69 0 69 -51 l 0 0 l 0 151 l 141 151 l 141 -12 m 364 -12 q 327 -132 364 -82 q 222 -205 290 -182 l 222 -138 q 279 -82 262 -124 q 292 0 292 -51 l 222 0 l 222 151 l 364 151 l 364 -12 \"},\"δ\":{\"x_min\":1,\"x_max\":710,\"ha\":810,\"o\":\"m 710 360 q 616 87 710 196 q 356 -28 518 -28 q 99 82 197 -28 q 1 356 1 192 q 100 606 1 509 q 355 703 199 703 q 180 829 288 754 q 70 903 124 866 l 70 1012 l 643 1012 l 643 901 l 258 901 q 462 763 422 794 q 636 592 577 677 q 710 360 710 485 m 584 365 q 552 501 584 447 q 451 602 521 555 q 372 611 411 611 q 197 541 258 611 q 136 355 136 472 q 190 171 136 245 q 358 85 252 85 q 528 173 465 85 q 584 365 584 252 \"},\"έ\":{\"x_min\":0,\"x_max\":634.71875,\"ha\":714,\"o\":\"m 634 234 q 527 38 634 110 q 300 -25 433 -25 q 98 29 183 -25 q 0 204 0 93 q 37 313 0 265 q 128 390 67 352 q 56 459 82 419 q 26 555 26 505 q 114 712 26 654 q 295 763 191 763 q 499 700 416 763 q 589 515 589 631 l 478 515 q 419 618 464 580 q 307 657 374 657 q 207 630 253 657 q 151 547 151 598 q 238 445 151 469 q 389 434 280 434 l 389 331 l 349 331 q 206 315 255 331 q 125 210 125 287 q 183 107 125 145 q 302 76 233 76 q 436 117 379 76 q 509 234 493 159 l 634 234 m 520 1040 l 331 819 l 248 819 l 383 1040 l 520 1040 \"},\"ω\":{\"x_min\":0,\"x_max\":922,\"ha\":1031,\"o\":\"m 922 339 q 856 97 922 203 q 650 -26 780 -26 q 538 9 587 -26 q 461 103 489 44 q 387 12 436 46 q 277 -22 339 -22 q 69 97 147 -22 q 0 339 0 203 q 45 551 0 444 q 161 738 84 643 l 302 738 q 175 553 219 647 q 124 336 124 446 q 155 179 124 249 q 275 88 197 88 q 375 163 341 88 q 400 294 400 219 l 400 572 l 524 572 l 524 294 q 561 135 524 192 q 643 88 591 88 q 762 182 719 88 q 797 342 797 257 q 745 556 797 450 q 619 738 705 638 l 760 738 q 874 551 835 640 q 922 339 922 444 \"},\"´\":{\"x_min\":0,\"x_max\":96,\"ha\":251,\"o\":\"m 96 606 l 0 606 l 0 988 l 96 988 l 96 606 \"},\"±\":{\"x_min\":11,\"x_max\":781,\"ha\":792,\"o\":\"m 781 490 l 446 490 l 446 255 l 349 255 l 349 490 l 11 490 l 11 586 l 349 586 l 349 819 l 446 819 l 446 586 l 781 586 l 781 490 m 781 21 l 11 21 l 11 115 l 781 115 l 781 21 \"},\"|\":{\"x_min\":343,\"x_max\":449,\"ha\":792,\"o\":\"m 449 462 l 343 462 l 343 986 l 449 986 l 449 462 m 449 -242 l 343 -242 l 343 280 l 449 280 l 449 -242 \"},\"ϋ\":{\"x_min\":0,\"x_max\":617,\"ha\":725,\"o\":\"m 482 800 l 372 800 l 372 925 l 482 925 l 482 800 m 239 800 l 129 800 l 129 925 l 239 925 l 239 800 m 617 352 q 540 93 617 199 q 308 -24 455 -24 q 76 93 161 -24 q 0 352 0 199 l 0 738 l 126 738 l 126 354 q 169 185 126 257 q 312 98 220 98 q 451 185 402 98 q 492 354 492 257 l 492 738 l 617 738 l 617 352 \"},\"§\":{\"x_min\":0,\"x_max\":593,\"ha\":690,\"o\":\"m 593 425 q 554 312 593 369 q 467 233 516 254 q 537 83 537 172 q 459 -74 537 -12 q 288 -133 387 -133 q 115 -69 184 -133 q 47 96 47 -6 l 166 96 q 199 7 166 40 q 288 -26 232 -26 q 371 -5 332 -26 q 420 60 420 21 q 311 201 420 139 q 108 309 210 255 q 0 490 0 383 q 33 602 0 551 q 124 687 66 654 q 75 743 93 712 q 58 812 58 773 q 133 984 58 920 q 300 1043 201 1043 q 458 987 394 1043 q 529 814 529 925 l 411 814 q 370 908 404 877 q 289 939 336 939 q 213 911 246 939 q 180 841 180 883 q 286 720 180 779 q 484 612 480 615 q 593 425 593 534 m 467 409 q 355 544 467 473 q 196 630 228 612 q 146 587 162 609 q 124 525 124 558 q 239 387 124 462 q 398 298 369 315 q 448 345 429 316 q 467 409 467 375 \"},\"b\":{\"x_min\":0,\"x_max\":685,\"ha\":783,\"o\":\"m 685 372 q 597 99 685 213 q 347 -25 501 -25 q 219 5 277 -25 q 121 93 161 36 l 121 0 l 0 0 l 0 1013 l 121 1013 l 121 634 q 214 723 157 692 q 341 754 272 754 q 591 637 493 754 q 685 372 685 526 m 554 356 q 499 550 554 470 q 328 644 437 644 q 162 556 223 644 q 108 369 108 478 q 160 176 108 256 q 330 83 221 83 q 498 169 435 83 q 554 356 554 245 \"},\"q\":{\"x_min\":0,\"x_max\":683,\"ha\":876,\"o\":\"m 683 -278 l 564 -278 l 564 97 q 474 8 533 39 q 345 -23 415 -23 q 91 93 188 -23 q 0 364 0 203 q 87 635 0 522 q 337 760 184 760 q 466 727 408 760 q 564 637 523 695 l 564 737 l 683 737 l 683 -278 m 582 375 q 527 564 582 488 q 358 652 466 652 q 190 565 253 652 q 135 377 135 488 q 189 179 135 261 q 361 84 251 84 q 530 179 469 84 q 582 375 582 260 \"},\"Ω\":{\"x_min\":-0.171875,\"x_max\":969.5625,\"ha\":1068,\"o\":\"m 969 0 l 555 0 l 555 123 q 744 308 675 194 q 814 558 814 423 q 726 812 814 709 q 484 922 633 922 q 244 820 334 922 q 154 567 154 719 q 223 316 154 433 q 412 123 292 199 l 412 0 l 0 0 l 0 124 l 217 124 q 68 327 122 210 q 15 572 15 444 q 144 911 15 781 q 484 1041 274 1041 q 822 909 691 1041 q 953 569 953 777 q 899 326 953 443 q 750 124 846 210 l 969 124 l 969 0 \"},\"ύ\":{\"x_min\":0,\"x_max\":617,\"ha\":725,\"o\":\"m 617 352 q 540 93 617 199 q 308 -24 455 -24 q 76 93 161 -24 q 0 352 0 199 l 0 738 l 126 738 l 126 354 q 169 185 126 257 q 312 98 220 98 q 451 185 402 98 q 492 354 492 257 l 492 738 l 617 738 l 617 352 m 535 1040 l 346 819 l 262 819 l 397 1040 l 535 1040 \"},\"z\":{\"x_min\":-0.015625,\"x_max\":613.890625,\"ha\":697,\"o\":\"m 613 0 l 0 0 l 0 100 l 433 630 l 20 630 l 20 738 l 594 738 l 593 636 l 163 110 l 613 110 l 613 0 \"},\"™\":{\"x_min\":0,\"x_max\":894,\"ha\":1000,\"o\":\"m 389 951 l 229 951 l 229 503 l 160 503 l 160 951 l 0 951 l 0 1011 l 389 1011 l 389 951 m 894 503 l 827 503 l 827 939 l 685 503 l 620 503 l 481 937 l 481 503 l 417 503 l 417 1011 l 517 1011 l 653 580 l 796 1010 l 894 1011 l 894 503 \"},\"ή\":{\"x_min\":0.78125,\"x_max\":697,\"ha\":810,\"o\":\"m 697 -278 l 572 -278 l 572 454 q 540 587 572 536 q 425 650 501 650 q 271 579 337 650 q 206 420 206 509 l 206 0 l 81 0 l 81 489 q 73 588 81 562 q 0 644 56 644 l 0 741 q 68 755 38 755 q 158 721 124 755 q 200 630 193 687 q 297 726 234 692 q 434 761 359 761 q 620 692 544 761 q 697 516 697 624 l 697 -278 m 479 1040 l 290 819 l 207 819 l 341 1040 l 479 1040 \"},\"Θ\":{\"x_min\":0,\"x_max\":960,\"ha\":1056,\"o\":\"m 960 507 q 833 129 960 280 q 476 -32 698 -32 q 123 129 255 -32 q 0 507 0 280 q 123 883 0 732 q 476 1045 255 1045 q 832 883 696 1045 q 960 507 960 732 m 817 500 q 733 789 817 669 q 476 924 639 924 q 223 792 317 924 q 142 507 142 675 q 222 222 142 339 q 476 89 315 89 q 730 218 636 89 q 817 500 817 334 m 716 449 l 243 449 l 243 571 l 716 571 l 716 449 \"},\"®\":{\"x_min\":-3,\"x_max\":1008,\"ha\":1106,\"o\":\"m 503 532 q 614 562 566 532 q 672 658 672 598 q 614 747 672 716 q 503 772 569 772 l 338 772 l 338 532 l 503 532 m 502 -7 q 123 151 263 -7 q -3 501 -3 294 q 123 851 -3 706 q 502 1011 263 1011 q 881 851 739 1011 q 1008 501 1008 708 q 883 151 1008 292 q 502 -7 744 -7 m 502 60 q 830 197 709 60 q 940 501 940 322 q 831 805 940 681 q 502 944 709 944 q 174 805 296 944 q 65 501 65 680 q 173 197 65 320 q 502 60 294 60 m 788 146 l 678 146 q 653 316 655 183 q 527 449 652 449 l 338 449 l 338 146 l 241 146 l 241 854 l 518 854 q 688 808 621 854 q 766 658 766 755 q 739 563 766 607 q 668 497 713 519 q 751 331 747 472 q 788 164 756 190 l 788 146 \"},\"~\":{\"x_min\":0,\"x_max\":833,\"ha\":931,\"o\":\"m 833 958 q 778 753 833 831 q 594 665 716 665 q 402 761 502 665 q 240 857 302 857 q 131 795 166 857 q 104 665 104 745 l 0 665 q 54 867 0 789 q 237 958 116 958 q 429 861 331 958 q 594 765 527 765 q 704 827 670 765 q 729 958 729 874 l 833 958 \"},\"Ε\":{\"x_min\":0,\"x_max\":736.21875,\"ha\":778,\"o\":\"m 736 0 l 0 0 l 0 1013 l 725 1013 l 725 889 l 139 889 l 139 585 l 677 585 l 677 467 l 139 467 l 139 125 l 736 125 l 736 0 \"},\"³\":{\"x_min\":0,\"x_max\":450,\"ha\":547,\"o\":\"m 450 552 q 379 413 450 464 q 220 366 313 366 q 69 414 130 366 q 0 567 0 470 l 85 567 q 126 470 85 504 q 225 437 168 437 q 320 467 280 437 q 360 552 360 498 q 318 632 360 608 q 213 657 276 657 q 195 657 203 657 q 176 657 181 657 l 176 722 q 279 733 249 722 q 334 815 334 752 q 300 881 334 856 q 220 907 267 907 q 133 875 169 907 q 97 781 97 844 l 15 781 q 78 926 15 875 q 220 972 135 972 q 364 930 303 972 q 426 817 426 888 q 344 697 426 733 q 421 642 392 681 q 450 552 450 603 \"},\"[\":{\"x_min\":0,\"x_max\":273.609375,\"ha\":371,\"o\":\"m 273 -281 l 0 -281 l 0 1013 l 273 1013 l 273 920 l 124 920 l 124 -187 l 273 -187 l 273 -281 \"},\"L\":{\"x_min\":0,\"x_max\":645.828125,\"ha\":696,\"o\":\"m 645 0 l 0 0 l 0 1013 l 140 1013 l 140 126 l 645 126 l 645 0 \"},\"σ\":{\"x_min\":0,\"x_max\":803.390625,\"ha\":894,\"o\":\"m 803 628 l 633 628 q 713 368 713 512 q 618 93 713 204 q 357 -25 518 -25 q 94 91 194 -25 q 0 368 0 201 q 94 644 0 533 q 356 761 194 761 q 481 750 398 761 q 608 739 564 739 l 803 739 l 803 628 m 360 85 q 529 180 467 85 q 584 374 584 262 q 527 566 584 490 q 352 651 463 651 q 187 559 247 651 q 135 368 135 478 q 189 175 135 254 q 360 85 251 85 \"},\"ζ\":{\"x_min\":0,\"x_max\":573,\"ha\":642,\"o\":\"m 573 -40 q 553 -162 573 -97 q 510 -278 543 -193 l 400 -278 q 441 -187 428 -219 q 462 -90 462 -132 q 378 -14 462 -14 q 108 45 197 -14 q 0 290 0 117 q 108 631 0 462 q 353 901 194 767 l 55 901 l 55 1012 l 561 1012 l 561 924 q 261 669 382 831 q 128 301 128 489 q 243 117 128 149 q 458 98 350 108 q 573 -40 573 80 \"},\"θ\":{\"x_min\":0,\"x_max\":674,\"ha\":778,\"o\":\"m 674 496 q 601 160 674 304 q 336 -26 508 -26 q 73 153 165 -26 q 0 485 0 296 q 72 840 0 683 q 343 1045 166 1045 q 605 844 516 1045 q 674 496 674 692 m 546 579 q 498 798 546 691 q 336 935 437 935 q 178 798 237 935 q 126 579 137 701 l 546 579 m 546 475 l 126 475 q 170 233 126 348 q 338 80 230 80 q 504 233 447 80 q 546 475 546 346 \"},\"Ο\":{\"x_min\":0,\"x_max\":958,\"ha\":1054,\"o\":\"m 485 1042 q 834 883 703 1042 q 958 511 958 735 q 834 136 958 287 q 481 -26 701 -26 q 126 130 261 -26 q 0 504 0 279 q 127 880 0 729 q 485 1042 263 1042 m 480 98 q 731 225 638 98 q 815 504 815 340 q 733 783 815 670 q 480 913 640 913 q 226 785 321 913 q 142 504 142 671 q 226 224 142 339 q 480 98 319 98 \"},\"Γ\":{\"x_min\":0,\"x_max\":705.28125,\"ha\":749,\"o\":\"m 705 886 l 140 886 l 140 0 l 0 0 l 0 1012 l 705 1012 l 705 886 \"},\" \":{\"x_min\":0,\"x_max\":0,\"ha\":375},\"%\":{\"x_min\":-3,\"x_max\":1089,\"ha\":1186,\"o\":\"m 845 0 q 663 76 731 0 q 602 244 602 145 q 661 412 602 344 q 845 489 728 489 q 1027 412 959 489 q 1089 244 1089 343 q 1029 76 1089 144 q 845 0 962 0 m 844 103 q 945 143 909 103 q 981 243 981 184 q 947 340 981 301 q 844 385 909 385 q 744 342 781 385 q 708 243 708 300 q 741 147 708 186 q 844 103 780 103 m 888 986 l 284 -25 l 199 -25 l 803 986 l 888 986 m 241 468 q 58 545 126 468 q -3 715 -3 615 q 56 881 -3 813 q 238 958 124 958 q 421 881 353 958 q 483 712 483 813 q 423 544 483 612 q 241 468 356 468 m 241 855 q 137 811 175 855 q 100 710 100 768 q 136 612 100 653 q 240 572 172 572 q 344 614 306 572 q 382 713 382 656 q 347 810 382 771 q 241 855 308 855 \"},\"P\":{\"x_min\":0,\"x_max\":726,\"ha\":806,\"o\":\"m 424 1013 q 640 931 555 1013 q 726 719 726 850 q 637 506 726 587 q 413 426 548 426 l 140 426 l 140 0 l 0 0 l 0 1013 l 424 1013 m 379 889 l 140 889 l 140 548 l 372 548 q 522 589 459 548 q 593 720 593 637 q 528 845 593 801 q 379 889 463 889 \"},\"Έ\":{\"x_min\":0,\"x_max\":1078.21875,\"ha\":1118,\"o\":\"m 1078 0 l 342 0 l 342 1013 l 1067 1013 l 1067 889 l 481 889 l 481 585 l 1019 585 l 1019 467 l 481 467 l 481 125 l 1078 125 l 1078 0 m 277 1040 l 83 799 l 0 799 l 140 1040 l 277 1040 \"},\"Ώ\":{\"x_min\":0.125,\"x_max\":1136.546875,\"ha\":1235,\"o\":\"m 1136 0 l 722 0 l 722 123 q 911 309 842 194 q 981 558 981 423 q 893 813 981 710 q 651 923 800 923 q 411 821 501 923 q 321 568 321 720 q 390 316 321 433 q 579 123 459 200 l 579 0 l 166 0 l 166 124 l 384 124 q 235 327 289 210 q 182 572 182 444 q 311 912 182 782 q 651 1042 441 1042 q 989 910 858 1042 q 1120 569 1120 778 q 1066 326 1120 443 q 917 124 1013 210 l 1136 124 l 1136 0 m 277 1040 l 83 800 l 0 800 l 140 1041 l 277 1040 \"},\"_\":{\"x_min\":0,\"x_max\":705.5625,\"ha\":803,\"o\":\"m 705 -334 l 0 -334 l 0 -234 l 705 -234 l 705 -334 \"},\"Ϊ\":{\"x_min\":-110,\"x_max\":246,\"ha\":275,\"o\":\"m 246 1046 l 118 1046 l 118 1189 l 246 1189 l 246 1046 m 18 1046 l -110 1046 l -110 1189 l 18 1189 l 18 1046 m 136 0 l 0 0 l 0 1012 l 136 1012 l 136 0 \"},\"+\":{\"x_min\":23,\"x_max\":768,\"ha\":792,\"o\":\"m 768 372 l 444 372 l 444 0 l 347 0 l 347 372 l 23 372 l 23 468 l 347 468 l 347 840 l 444 840 l 444 468 l 768 468 l 768 372 \"},\"½\":{\"x_min\":0,\"x_max\":1050,\"ha\":1149,\"o\":\"m 1050 0 l 625 0 q 712 178 625 108 q 878 277 722 187 q 967 385 967 328 q 932 456 967 429 q 850 484 897 484 q 759 450 798 484 q 721 352 721 416 l 640 352 q 706 502 640 448 q 851 551 766 551 q 987 509 931 551 q 1050 385 1050 462 q 976 251 1050 301 q 829 179 902 215 q 717 68 740 133 l 1050 68 l 1050 0 m 834 985 l 215 -28 l 130 -28 l 750 984 l 834 985 m 224 422 l 142 422 l 142 811 l 0 811 l 0 867 q 104 889 62 867 q 164 973 157 916 l 224 973 l 224 422 \"},\"Ρ\":{\"x_min\":0,\"x_max\":720,\"ha\":783,\"o\":\"m 424 1013 q 637 933 554 1013 q 720 723 720 853 q 633 508 720 591 q 413 426 546 426 l 140 426 l 140 0 l 0 0 l 0 1013 l 424 1013 m 378 889 l 140 889 l 140 548 l 371 548 q 521 589 458 548 q 592 720 592 637 q 527 845 592 801 q 378 889 463 889 \"},\"'\":{\"x_min\":0,\"x_max\":139,\"ha\":236,\"o\":\"m 139 851 q 102 737 139 784 q 0 669 65 690 l 0 734 q 59 787 42 741 q 72 873 72 821 l 0 873 l 0 1013 l 139 1013 l 139 851 \"},\"ª\":{\"x_min\":0,\"x_max\":350,\"ha\":397,\"o\":\"m 350 625 q 307 616 328 616 q 266 631 281 616 q 247 673 251 645 q 190 628 225 644 q 116 613 156 613 q 32 641 64 613 q 0 722 0 669 q 72 826 0 800 q 247 866 159 846 l 247 887 q 220 934 247 916 q 162 953 194 953 q 104 934 129 953 q 76 882 80 915 l 16 882 q 60 976 16 941 q 166 1011 104 1011 q 266 979 224 1011 q 308 891 308 948 l 308 706 q 311 679 308 688 q 331 670 315 670 l 350 672 l 350 625 m 247 757 l 247 811 q 136 790 175 798 q 64 726 64 773 q 83 682 64 697 q 132 667 103 667 q 207 690 174 667 q 247 757 247 718 \"},\"΅\":{\"x_min\":0,\"x_max\":450,\"ha\":553,\"o\":\"m 450 800 l 340 800 l 340 925 l 450 925 l 450 800 m 406 1040 l 212 800 l 129 800 l 269 1040 l 406 1040 m 110 800 l 0 800 l 0 925 l 110 925 l 110 800 \"},\"T\":{\"x_min\":0,\"x_max\":777,\"ha\":835,\"o\":\"m 777 894 l 458 894 l 458 0 l 319 0 l 319 894 l 0 894 l 0 1013 l 777 1013 l 777 894 \"},\"Φ\":{\"x_min\":0,\"x_max\":915,\"ha\":997,\"o\":\"m 527 0 l 389 0 l 389 122 q 110 231 220 122 q 0 509 0 340 q 110 785 0 677 q 389 893 220 893 l 389 1013 l 527 1013 l 527 893 q 804 786 693 893 q 915 509 915 679 q 805 231 915 341 q 527 122 696 122 l 527 0 m 527 226 q 712 310 641 226 q 779 507 779 389 q 712 705 779 627 q 527 787 641 787 l 527 226 m 389 226 l 389 787 q 205 698 275 775 q 136 505 136 620 q 206 308 136 391 q 389 226 276 226 \"},\"⁋\":{\"x_min\":0,\"x_max\":0,\"ha\":694},\"j\":{\"x_min\":-77.78125,\"x_max\":167,\"ha\":349,\"o\":\"m 167 871 l 42 871 l 42 1013 l 167 1013 l 167 871 m 167 -80 q 121 -231 167 -184 q -26 -278 76 -278 l -77 -278 l -77 -164 l -41 -164 q 26 -143 11 -164 q 42 -65 42 -122 l 42 737 l 167 737 l 167 -80 \"},\"Σ\":{\"x_min\":0,\"x_max\":756.953125,\"ha\":819,\"o\":\"m 756 0 l 0 0 l 0 107 l 395 523 l 22 904 l 22 1013 l 745 1013 l 745 889 l 209 889 l 566 523 l 187 125 l 756 125 l 756 0 \"},\"1\":{\"x_min\":215.671875,\"x_max\":574,\"ha\":792,\"o\":\"m 574 0 l 442 0 l 442 697 l 215 697 l 215 796 q 386 833 330 796 q 475 986 447 875 l 574 986 l 574 0 \"},\"›\":{\"x_min\":18.0625,\"x_max\":774,\"ha\":792,\"o\":\"m 774 376 l 18 40 l 18 149 l 631 421 l 18 692 l 18 799 l 774 465 l 774 376 \"},\"<\":{\"x_min\":17.984375,\"x_max\":773.609375,\"ha\":792,\"o\":\"m 773 40 l 18 376 l 17 465 l 773 799 l 773 692 l 159 420 l 773 149 l 773 40 \"},\"£\":{\"x_min\":0,\"x_max\":704.484375,\"ha\":801,\"o\":\"m 704 41 q 623 -10 664 5 q 543 -26 583 -26 q 359 15 501 -26 q 243 36 288 36 q 158 23 197 36 q 73 -21 119 10 l 6 76 q 125 195 90 150 q 175 331 175 262 q 147 443 175 383 l 0 443 l 0 512 l 108 512 q 43 734 43 623 q 120 929 43 854 q 358 1010 204 1010 q 579 936 487 1010 q 678 729 678 857 l 678 684 l 552 684 q 504 838 552 780 q 362 896 457 896 q 216 852 263 896 q 176 747 176 815 q 199 627 176 697 q 248 512 217 574 l 468 512 l 468 443 l 279 443 q 297 356 297 398 q 230 194 297 279 q 153 107 211 170 q 227 133 190 125 q 293 142 264 142 q 410 119 339 142 q 516 96 482 96 q 579 105 550 96 q 648 142 608 115 l 704 41 \"},\"t\":{\"x_min\":0,\"x_max\":367,\"ha\":458,\"o\":\"m 367 0 q 312 -5 339 -2 q 262 -8 284 -8 q 145 28 183 -8 q 108 143 108 64 l 108 638 l 0 638 l 0 738 l 108 738 l 108 944 l 232 944 l 232 738 l 367 738 l 367 638 l 232 638 l 232 185 q 248 121 232 140 q 307 102 264 102 q 345 104 330 102 q 367 107 360 107 l 367 0 \"},\"¬\":{\"x_min\":0,\"x_max\":706,\"ha\":803,\"o\":\"m 706 411 l 706 158 l 630 158 l 630 335 l 0 335 l 0 411 l 706 411 \"},\"λ\":{\"x_min\":0,\"x_max\":750,\"ha\":803,\"o\":\"m 750 -7 q 679 -15 716 -15 q 538 59 591 -15 q 466 214 512 97 l 336 551 l 126 0 l 0 0 l 270 705 q 223 837 247 770 q 116 899 190 899 q 90 898 100 899 l 90 1004 q 152 1011 125 1011 q 298 938 244 1011 q 373 783 326 901 l 605 192 q 649 115 629 136 q 716 95 669 95 l 736 95 q 750 97 745 97 l 750 -7 \"},\"W\":{\"x_min\":0,\"x_max\":1263.890625,\"ha\":1351,\"o\":\"m 1263 1013 l 995 0 l 859 0 l 627 837 l 405 0 l 265 0 l 0 1013 l 136 1013 l 342 202 l 556 1013 l 701 1013 l 921 207 l 1133 1012 l 1263 1013 \"},\">\":{\"x_min\":18.0625,\"x_max\":774,\"ha\":792,\"o\":\"m 774 376 l 18 40 l 18 149 l 631 421 l 18 692 l 18 799 l 774 465 l 774 376 \"},\"v\":{\"x_min\":0,\"x_max\":675.15625,\"ha\":761,\"o\":\"m 675 738 l 404 0 l 272 0 l 0 738 l 133 737 l 340 147 l 541 737 l 675 738 \"},\"τ\":{\"x_min\":0.28125,\"x_max\":644.5,\"ha\":703,\"o\":\"m 644 628 l 382 628 l 382 179 q 388 120 382 137 q 436 91 401 91 q 474 94 447 91 q 504 97 501 97 l 504 0 q 454 -9 482 -5 q 401 -14 426 -14 q 278 67 308 -14 q 260 233 260 118 l 260 628 l 0 628 l 0 739 l 644 739 l 644 628 \"},\"ξ\":{\"x_min\":0,\"x_max\":624.9375,\"ha\":699,\"o\":\"m 624 -37 q 608 -153 624 -96 q 563 -278 593 -211 l 454 -278 q 491 -183 486 -200 q 511 -83 511 -126 q 484 -23 511 -44 q 370 1 452 1 q 323 0 354 1 q 283 -1 293 -1 q 84 76 169 -1 q 0 266 0 154 q 56 431 0 358 q 197 538 108 498 q 94 613 134 562 q 54 730 54 665 q 77 823 54 780 q 143 901 101 867 l 27 901 l 27 1012 l 576 1012 l 576 901 l 380 901 q 244 863 303 901 q 178 745 178 820 q 312 600 178 636 q 532 582 380 582 l 532 479 q 276 455 361 479 q 118 281 118 410 q 165 173 118 217 q 274 120 208 133 q 494 101 384 110 q 624 -37 624 76 \"},\"&\":{\"x_min\":-3,\"x_max\":894.25,\"ha\":992,\"o\":\"m 894 0 l 725 0 l 624 123 q 471 0 553 40 q 306 -41 390 -41 q 168 -7 231 -41 q 62 92 105 26 q 14 187 31 139 q -3 276 -3 235 q 55 433 -3 358 q 248 581 114 508 q 170 689 196 640 q 137 817 137 751 q 214 985 137 922 q 384 1041 284 1041 q 548 988 483 1041 q 622 824 622 928 q 563 666 622 739 q 431 556 516 608 l 621 326 q 649 407 639 361 q 663 493 653 426 l 781 493 q 703 229 781 352 l 894 0 m 504 818 q 468 908 504 877 q 384 940 433 940 q 293 907 331 940 q 255 818 255 875 q 289 714 255 767 q 363 628 313 678 q 477 729 446 682 q 504 818 504 771 m 556 209 l 314 499 q 179 395 223 449 q 135 283 135 341 q 146 222 135 253 q 183 158 158 192 q 333 80 241 80 q 556 209 448 80 \"},\"Λ\":{\"x_min\":0,\"x_max\":862.5,\"ha\":942,\"o\":\"m 862 0 l 719 0 l 426 847 l 143 0 l 0 0 l 356 1013 l 501 1013 l 862 0 \"},\"I\":{\"x_min\":41,\"x_max\":180,\"ha\":293,\"o\":\"m 180 0 l 41 0 l 41 1013 l 180 1013 l 180 0 \"},\"G\":{\"x_min\":0,\"x_max\":921,\"ha\":1011,\"o\":\"m 921 0 l 832 0 l 801 136 q 655 15 741 58 q 470 -28 568 -28 q 126 133 259 -28 q 0 499 0 284 q 125 881 0 731 q 486 1043 259 1043 q 763 957 647 1043 q 905 709 890 864 l 772 709 q 668 866 747 807 q 486 926 589 926 q 228 795 322 926 q 142 507 142 677 q 228 224 142 342 q 483 94 323 94 q 712 195 625 94 q 796 435 796 291 l 477 435 l 477 549 l 921 549 l 921 0 \"},\"ΰ\":{\"x_min\":0,\"x_max\":617,\"ha\":725,\"o\":\"m 524 800 l 414 800 l 414 925 l 524 925 l 524 800 m 183 800 l 73 800 l 73 925 l 183 925 l 183 800 m 617 352 q 540 93 617 199 q 308 -24 455 -24 q 76 93 161 -24 q 0 352 0 199 l 0 738 l 126 738 l 126 354 q 169 185 126 257 q 312 98 220 98 q 451 185 402 98 q 492 354 492 257 l 492 738 l 617 738 l 617 352 m 489 1040 l 300 819 l 216 819 l 351 1040 l 489 1040 \"},\"`\":{\"x_min\":0,\"x_max\":138.890625,\"ha\":236,\"o\":\"m 138 699 l 0 699 l 0 861 q 36 974 0 929 q 138 1041 72 1020 l 138 977 q 82 931 95 969 q 69 839 69 893 l 138 839 l 138 699 \"},\"·\":{\"x_min\":0,\"x_max\":142,\"ha\":239,\"o\":\"m 142 585 l 0 585 l 0 738 l 142 738 l 142 585 \"},\"Υ\":{\"x_min\":0.328125,\"x_max\":819.515625,\"ha\":889,\"o\":\"m 819 1013 l 482 416 l 482 0 l 342 0 l 342 416 l 0 1013 l 140 1013 l 411 533 l 679 1013 l 819 1013 \"},\"r\":{\"x_min\":0,\"x_max\":355.5625,\"ha\":432,\"o\":\"m 355 621 l 343 621 q 179 569 236 621 q 122 411 122 518 l 122 0 l 0 0 l 0 737 l 117 737 l 117 604 q 204 719 146 686 q 355 753 262 753 l 355 621 \"},\"x\":{\"x_min\":0,\"x_max\":675,\"ha\":764,\"o\":\"m 675 0 l 525 0 l 331 286 l 144 0 l 0 0 l 256 379 l 12 738 l 157 737 l 336 473 l 516 738 l 661 738 l 412 380 l 675 0 \"},\"μ\":{\"x_min\":0,\"x_max\":696.609375,\"ha\":747,\"o\":\"m 696 -4 q 628 -14 657 -14 q 498 97 513 -14 q 422 8 470 41 q 313 -24 374 -24 q 207 3 258 -24 q 120 80 157 31 l 120 -278 l 0 -278 l 0 738 l 124 738 l 124 343 q 165 172 124 246 q 308 82 216 82 q 451 177 402 82 q 492 358 492 254 l 492 738 l 616 738 l 616 214 q 623 136 616 160 q 673 92 636 92 q 696 95 684 92 l 696 -4 \"},\"h\":{\"x_min\":0,\"x_max\":615,\"ha\":724,\"o\":\"m 615 472 l 615 0 l 490 0 l 490 454 q 456 590 490 535 q 338 654 416 654 q 186 588 251 654 q 122 436 122 522 l 122 0 l 0 0 l 0 1013 l 122 1013 l 122 633 q 218 727 149 694 q 362 760 287 760 q 552 676 484 760 q 615 472 615 600 \"},\".\":{\"x_min\":0,\"x_max\":142,\"ha\":239,\"o\":\"m 142 0 l 0 0 l 0 151 l 142 151 l 142 0 \"},\"φ\":{\"x_min\":-2,\"x_max\":878,\"ha\":974,\"o\":\"m 496 -279 l 378 -279 l 378 -17 q 101 88 204 -17 q -2 367 -2 194 q 68 626 -2 510 q 283 758 151 758 l 283 646 q 167 537 209 626 q 133 373 133 462 q 192 177 133 254 q 378 93 259 93 l 378 758 q 445 764 426 763 q 476 765 464 765 q 765 659 653 765 q 878 377 878 553 q 771 96 878 209 q 496 -17 665 -17 l 496 -279 m 496 93 l 514 93 q 687 183 623 93 q 746 380 746 265 q 691 569 746 491 q 522 658 629 658 l 496 656 l 496 93 \"},\";\":{\"x_min\":0,\"x_max\":142,\"ha\":239,\"o\":\"m 142 585 l 0 585 l 0 738 l 142 738 l 142 585 m 142 -12 q 105 -132 142 -82 q 0 -206 68 -182 l 0 -138 q 58 -82 43 -123 q 68 0 68 -56 l 0 0 l 0 151 l 142 151 l 142 -12 \"},\"f\":{\"x_min\":0,\"x_max\":378,\"ha\":472,\"o\":\"m 378 638 l 246 638 l 246 0 l 121 0 l 121 638 l 0 638 l 0 738 l 121 738 q 137 935 121 887 q 290 1028 171 1028 q 320 1027 305 1028 q 378 1021 334 1026 l 378 908 q 323 918 346 918 q 257 870 273 918 q 246 780 246 840 l 246 738 l 378 738 l 378 638 \"},\"“\":{\"x_min\":1,\"x_max\":348.21875,\"ha\":454,\"o\":\"m 140 670 l 1 670 l 1 830 q 37 943 1 897 q 140 1011 74 990 l 140 947 q 82 900 97 940 q 68 810 68 861 l 140 810 l 140 670 m 348 670 l 209 670 l 209 830 q 245 943 209 897 q 348 1011 282 990 l 348 947 q 290 900 305 940 q 276 810 276 861 l 348 810 l 348 670 \"},\"A\":{\"x_min\":0.03125,\"x_max\":906.953125,\"ha\":1008,\"o\":\"m 906 0 l 756 0 l 648 303 l 251 303 l 142 0 l 0 0 l 376 1013 l 529 1013 l 906 0 m 610 421 l 452 867 l 293 421 l 610 421 \"},\"6\":{\"x_min\":53,\"x_max\":739,\"ha\":792,\"o\":\"m 739 312 q 633 62 739 162 q 400 -31 534 -31 q 162 78 257 -31 q 53 439 53 206 q 178 859 53 712 q 441 986 284 986 q 643 912 559 986 q 732 713 732 833 l 601 713 q 544 830 594 786 q 426 875 494 875 q 268 793 331 875 q 193 517 193 697 q 301 597 240 570 q 427 624 362 624 q 643 540 552 624 q 739 312 739 451 m 603 298 q 540 461 603 400 q 404 516 484 516 q 268 461 323 516 q 207 300 207 401 q 269 137 207 198 q 405 83 325 83 q 541 137 486 83 q 603 298 603 197 \"},\"‘\":{\"x_min\":1,\"x_max\":139.890625,\"ha\":236,\"o\":\"m 139 670 l 1 670 l 1 830 q 37 943 1 897 q 139 1011 74 990 l 139 947 q 82 900 97 940 q 68 810 68 861 l 139 810 l 139 670 \"},\"ϊ\":{\"x_min\":-70,\"x_max\":283,\"ha\":361,\"o\":\"m 283 800 l 173 800 l 173 925 l 283 925 l 283 800 m 40 800 l -70 800 l -70 925 l 40 925 l 40 800 m 283 3 q 232 -10 257 -5 q 181 -15 206 -15 q 84 26 118 -15 q 41 200 41 79 l 41 737 l 166 737 l 167 215 q 171 141 167 157 q 225 101 182 101 q 247 103 238 101 q 283 112 256 104 l 283 3 \"},\"π\":{\"x_min\":-0.21875,\"x_max\":773.21875,\"ha\":857,\"o\":\"m 773 -7 l 707 -11 q 575 40 607 -11 q 552 174 552 77 l 552 226 l 552 626 l 222 626 l 222 0 l 97 0 l 97 626 l 0 626 l 0 737 l 773 737 l 773 626 l 676 626 l 676 171 q 695 103 676 117 q 773 90 714 90 l 773 -7 \"},\"ά\":{\"x_min\":0,\"x_max\":765.5625,\"ha\":809,\"o\":\"m 765 -4 q 698 -14 726 -14 q 564 97 586 -14 q 466 7 525 40 q 337 -26 407 -26 q 88 98 186 -26 q 0 369 0 212 q 88 637 0 525 q 337 760 184 760 q 465 727 407 760 q 563 637 524 695 l 563 738 l 685 738 l 685 222 q 693 141 685 168 q 748 94 708 94 q 765 95 760 94 l 765 -4 m 584 371 q 531 562 584 485 q 360 653 470 653 q 192 566 254 653 q 135 379 135 489 q 186 181 135 261 q 358 84 247 84 q 528 176 465 84 q 584 371 584 260 m 604 1040 l 415 819 l 332 819 l 466 1040 l 604 1040 \"},\"O\":{\"x_min\":0,\"x_max\":958,\"ha\":1057,\"o\":\"m 485 1041 q 834 882 702 1041 q 958 512 958 734 q 834 136 958 287 q 481 -26 702 -26 q 126 130 261 -26 q 0 504 0 279 q 127 880 0 728 q 485 1041 263 1041 m 480 98 q 731 225 638 98 q 815 504 815 340 q 733 783 815 669 q 480 912 640 912 q 226 784 321 912 q 142 504 142 670 q 226 224 142 339 q 480 98 319 98 \"},\"n\":{\"x_min\":0,\"x_max\":615,\"ha\":724,\"o\":\"m 615 463 l 615 0 l 490 0 l 490 454 q 453 592 490 537 q 331 656 410 656 q 178 585 240 656 q 117 421 117 514 l 117 0 l 0 0 l 0 738 l 117 738 l 117 630 q 218 728 150 693 q 359 764 286 764 q 552 675 484 764 q 615 463 615 593 \"},\"3\":{\"x_min\":54,\"x_max\":737,\"ha\":792,\"o\":\"m 737 284 q 635 55 737 141 q 399 -25 541 -25 q 156 52 248 -25 q 54 308 54 140 l 185 308 q 245 147 185 202 q 395 96 302 96 q 539 140 484 96 q 602 280 602 190 q 510 429 602 390 q 324 454 451 454 l 324 565 q 487 584 441 565 q 565 719 565 617 q 515 835 565 791 q 395 879 466 879 q 255 824 307 879 q 203 661 203 769 l 78 661 q 166 909 78 822 q 387 992 250 992 q 603 921 513 992 q 701 723 701 844 q 669 607 701 656 q 578 524 637 558 q 696 434 655 499 q 737 284 737 369 \"},\"9\":{\"x_min\":53,\"x_max\":739,\"ha\":792,\"o\":\"m 739 524 q 619 94 739 241 q 362 -32 516 -32 q 150 47 242 -32 q 59 244 59 126 l 191 244 q 246 129 191 176 q 373 82 301 82 q 526 161 466 82 q 597 440 597 255 q 363 334 501 334 q 130 432 216 334 q 53 650 53 521 q 134 880 53 786 q 383 986 226 986 q 659 841 566 986 q 739 524 739 719 m 388 449 q 535 514 480 449 q 585 658 585 573 q 535 805 585 744 q 388 873 480 873 q 242 809 294 873 q 191 658 191 745 q 239 514 191 572 q 388 449 292 449 \"},\"l\":{\"x_min\":41,\"x_max\":166,\"ha\":279,\"o\":\"m 166 0 l 41 0 l 41 1013 l 166 1013 l 166 0 \"},\"¤\":{\"x_min\":40.09375,\"x_max\":728.796875,\"ha\":825,\"o\":\"m 728 304 l 649 224 l 512 363 q 383 331 458 331 q 256 363 310 331 l 119 224 l 40 304 l 177 441 q 150 553 150 493 q 184 673 150 621 l 40 818 l 119 898 l 267 749 q 321 766 291 759 q 384 773 351 773 q 447 766 417 773 q 501 749 477 759 l 649 898 l 728 818 l 585 675 q 612 618 604 648 q 621 553 621 587 q 591 441 621 491 l 728 304 m 384 682 q 280 643 318 682 q 243 551 243 604 q 279 461 243 499 q 383 423 316 423 q 487 461 449 423 q 525 553 525 500 q 490 641 525 605 q 384 682 451 682 \"},\"κ\":{\"x_min\":0,\"x_max\":632.328125,\"ha\":679,\"o\":\"m 632 0 l 482 0 l 225 384 l 124 288 l 124 0 l 0 0 l 0 738 l 124 738 l 124 446 l 433 738 l 596 738 l 312 466 l 632 0 \"},\"4\":{\"x_min\":48,\"x_max\":742.453125,\"ha\":792,\"o\":\"m 742 243 l 602 243 l 602 0 l 476 0 l 476 243 l 48 243 l 48 368 l 476 958 l 602 958 l 602 354 l 742 354 l 742 243 m 476 354 l 476 792 l 162 354 l 476 354 \"},\"p\":{\"x_min\":0,\"x_max\":685,\"ha\":786,\"o\":\"m 685 364 q 598 96 685 205 q 350 -23 504 -23 q 121 89 205 -23 l 121 -278 l 0 -278 l 0 738 l 121 738 l 121 633 q 220 726 159 691 q 351 761 280 761 q 598 636 504 761 q 685 364 685 522 m 557 371 q 501 560 557 481 q 330 651 437 651 q 162 559 223 651 q 108 366 108 479 q 162 177 108 254 q 333 87 224 87 q 502 178 441 87 q 557 371 557 258 \"},\"‡\":{\"x_min\":0,\"x_max\":777,\"ha\":835,\"o\":\"m 458 238 l 458 0 l 319 0 l 319 238 l 0 238 l 0 360 l 319 360 l 319 681 l 0 683 l 0 804 l 319 804 l 319 1015 l 458 1013 l 458 804 l 777 804 l 777 683 l 458 683 l 458 360 l 777 360 l 777 238 l 458 238 \"},\"ψ\":{\"x_min\":0,\"x_max\":808,\"ha\":907,\"o\":\"m 465 -278 l 341 -278 l 341 -15 q 87 102 180 -15 q 0 378 0 210 l 0 739 l 133 739 l 133 379 q 182 195 133 275 q 341 98 242 98 l 341 922 l 465 922 l 465 98 q 623 195 563 98 q 675 382 675 278 l 675 742 l 808 742 l 808 381 q 720 104 808 213 q 466 -13 627 -13 l 465 -278 \"},\"η\":{\"x_min\":0.78125,\"x_max\":697,\"ha\":810,\"o\":\"m 697 -278 l 572 -278 l 572 454 q 540 587 572 536 q 425 650 501 650 q 271 579 337 650 q 206 420 206 509 l 206 0 l 81 0 l 81 489 q 73 588 81 562 q 0 644 56 644 l 0 741 q 68 755 38 755 q 158 720 124 755 q 200 630 193 686 q 297 726 234 692 q 434 761 359 761 q 620 692 544 761 q 697 516 697 624 l 697 -278 \"}},\"cssFontWeight\":\"normal\",\"ascender\":1189,\"underlinePosition\":-100,\"cssFontStyle\":\"normal\",\"boundingBox\":{\"yMin\":-334,\"xMin\":-111,\"yMax\":1189,\"xMax\":1672},\"resolution\":1000,\"original_font_information\":{\"postscript_name\":\"Helvetiker-Regular\",\"version_string\":\"Version 1.00 2004 initial release\",\"vendor_url\":\"http://www.magenta.gr/\",\"full_font_name\":\"Helvetiker\",\"font_family_name\":\"Helvetiker\",\"copyright\":\"Copyright (c) Μagenta ltd, 2004\",\"description\":\"\",\"trademark\":\"\",\"designer\":\"\",\"designer_url\":\"\",\"unique_font_identifier\":\"Μagenta ltd:Helvetiker:22-10-104\",\"license_url\":\"http://www.ellak.gr/fonts/MgOpen/license.html\",\"license_description\":\"Copyright (c) 2004 by MAGENTA Ltd. All Rights Reserved.\\r\\n\
\\r\\n\
Permission is hereby granted, free of charge, to any person obtaining a copy of the fonts accompanying this license (\\\"Fonts\\\") and associated documentation files (the \\\"Font Software\\\"), to reproduce and distribute the Font Software, including without limitation the rights to use, copy, merge, publish, distribute, and/or sell copies of the Font Software, and to permit persons to whom the Font Software is furnished to do so, subject to the following conditions: \\r\\n\
\\r\\n\
The above copyright and this permission notice shall be included in all copies of one or more of the Font Software typefaces.\\r\\n\
\\r\\n\
The Font Software may be modified, altered, or added to, and in particular the designs of glyphs or characters in the Fonts may be modified and additional glyphs or characters may be added to the Fonts, only if the fonts are renamed to names not containing the word \\\"MgOpen\\\", or if the modifications are accepted for inclusion in the Font Software itself by the each appointed Administrator.\\r\\n\
\\r\\n\
This License becomes null and void to the extent applicable to Fonts or Font Software that has been modified and is distributed under the \\\"MgOpen\\\" name.\\r\\n\
\\r\\n\
The Font Software may be sold as part of a larger software package but no copy of one or more of the Font Software typefaces may be sold by itself. \\r\\n\
\\r\\n\
THE FONT SOFTWARE IS PROVIDED \\\"AS IS\\\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL MAGENTA OR PERSONS OR BODIES IN CHARGE OF ADMINISTRATION AND MAINTENANCE OF THE FONT SOFTWARE BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM OTHER DEALINGS IN THE FONT SOFTWARE.\",\"manufacturer_name\":\"Μagenta ltd\",\"font_sub_family_name\":\"Regular\"},\"descender\":-334,\"familyName\":\"Helvetiker\",\"lineHeight\":1522,\"underlineThickness\":50});\n\
//@ sourceURL=gcanvas/lib/fonts/helvetiker_regular.typeface.js"
));if (typeof exports == "object") {
  module.exports = require("gcanvas");
} else if (typeof define == "function" && define.amd) {
  define(function(){ return require("gcanvas"); });
} else {
  this["GCanvas"] = require("gcanvas");
}})();