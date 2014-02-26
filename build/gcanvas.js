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
  , Font = require('./font')\n\
  , parseFont = require('./parsefont')\n\
  , utils = require('./utils');\n\
\n\
function GCanvas(driver, width, height) {\n\
  var self = this;\n\
  this.canvas = {\n\
    width: width,\n\
    height: height,\n\
    getContext: function() {\n\
      return self;\n\
    }\n\
  };\n\
\n\
  this.font = \"7pt Helvetiker\";\n\
  this.matrix = new Matrix();\n\
  this.rotation = 0; \n\
  this.depth = 0;\n\
  this.depthOfCut = 0;\n\
  this.top = 0;\n\
  this.align = 'center';\n\
  // this.feed = ;\n\
  this.mode = 'mill';\n\
  this.driver = driver || new GcodeDriver();\n\
  this.driver.src = this;\n\
  this.stack = [];\n\
  this.motion = new Motion(this);\n\
  this.filters = [];\n\
  this.precision = 20;\n\
\n\
  this.beginPath();\n\
}\n\
\n\
GCanvas.prototype = {\n\
  save: function() {\n\
    this.stack.push({\n\
      matrix: this.matrix.clone(),\n\
      font: this.font,\n\
      speed: this.speed,\n\
      feed: this.feed,\n\
      depth: this.depth,\n\
      depthOfCut: this.depthOfCut,\n\
      toolDiameter: this.toolDiameter,\n\
      align: this.align,\n\
      mode: this.mode,\n\
      top: this.top,\n\
      filters: this.filters.slice()\n\
    });\n\
  }\n\
, restore: function() {\n\
    var prev = this.stack.pop();\n\
    for(var k in prev) {\n\
      if(prev.hasOwnProperty(k)) {\n\
        this[k] = prev[k];\n\
      }\n\
    }\n\
  }\n\
, filter: function(fn) {\n\
    this.filters.push(fn);\n\
  }\n\
, map: function(from, to) {\n\
    if(arguments.length == 1) {\n\
      to = from;\n\
      from = 'xyza';\n\
    }\n\
\n\
    from = from.split('');\n\
    to = to.split('');\n\
\n\
    this.filter(function(p) {\n\
      var tmp = {};\n\
      var negative = false;\n\
      var i = 0;\n\
\n\
      to.forEach(function(d) {\n\
        if(d == '-') {\n\
          negative = true;\n\
        }\n\
        else {\n\
          tmp[d] = p[ from[i] ];\n\
\n\
          if(negative) {\n\
            tmp[d] = -tmp[d];\n\
          }\n\
\n\
          negative = false;\n\
          i++;\n\
        }\n\
      });\n\
\n\
      return tmp;\n\
    });\n\
  }\n\
, beginPath: function() {\n\
    // this.prevsubPaths = this.subPaths;\n\
    this.path = new Path();\n\
    // this.subPaths = [this.path];\n\
  }\n\
, _restorePath: function() {\n\
    this.subPaths = this.prevsubPaths;\n\
    this.path = this.subPaths[this.subPaths.length-1] || new Path();\n\
  }\n\
, transform: function(a, b, c, d, e, f) {\n\
    this.matrix = this.matrix.concat(\n\
      new Matrix(a, b, c, d, e, f)\n\
    );\n\
  }\n\
, setTransform: function(a, b, c, d, e, f) {\n\
    this.matrix = new Matrix(a, b, c, d, e, f);\n\
  }\n\
, resetTransform: function() {\n\
    this.matrix = new Matrix();\n\
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
    else if(a.x !== undefined) {\n\
      var v = new Point(a.x, a.y);\n\
      v = this.matrix.transformPoint(v);\n\
      a.x = v.x; \n\
      a.y = v.y; \n\
    }\n\
  }\n\
, _ensurePath: function(x,y) {\n\
    if(this.path.subPaths.length === 0) {\n\
      this.path.moveTo(x,y);\n\
    }\n\
  }\n\
, moveTo: function(x,y) {\n\
    this._transformPoint(arguments);\n\
    // this.path = new Path();\n\
    this.path.moveTo(x,y);\n\
    // this.subPaths.push( this.path );\n\
  }\n\
, lineTo: function(x,y) {\n\
    this._transformPoint(arguments);\n\
    this._ensurePath(x,y);\n\
    this.path.lineTo(x,y);\n\
  }\n\
, arcTo: function(x1, y1, x2, y2, radius) {\n\
    this._transformPoint(arguments,0);\n\
    this._transformPoint(arguments,2);\n\
    this._ensurePath(x1,y1);\n\
\n\
    var p0 = this.path.lastPoint();\n\
    var p1 = new Point(x1,y1);\n\
    var p2 = new Point(x2,y2);\n\
    var v01 = p0.sub(p1);\n\
    var v21 = p2.sub(p1);\n\
\n\
    // sin(A - B) = sin(A) * cos(B) - sin(B) * cos(A)\n\
    var cross = v01.x * v21.y - v01.y * v21.x;\n\
\n\
    if (Math.abs(cross) < 1E-10) {\n\
        // on one line\n\
        this.lineTo(x1,y1);\n\
        return;\n\
    }\n\
\n\
    var d01 = v01.magnitude();\n\
    var d21 = v21.magnitude();\n\
    var angle = (Math.PI - Math.abs(Math.asin(cross / (d01 * d21)))) / 2;\n\
    var span = radius * Math.tan(angle);\n\
    var rate = span / d01;\n\
\n\
    var startPoint = new Point(\n\
      p1.x + v01.x * rate,\n\
      p1.y + v01.y * rate\n\
    );\n\
\n\
    rate = span / d21; \n\
\n\
    var endPoint = new Point(\n\
      p1.x + v21.x * rate,\n\
      p1.y + v21.y * rate\n\
    );\n\
\n\
    var midPoint = new Point(\n\
      (startPoint.x + endPoint.x) / 2,\n\
      (startPoint.y + endPoint.y) / 2\n\
    );\n\
\n\
    var vm1 = midPoint.sub(p1);\n\
    var dm1 = vm1.magnitude();\n\
    var d = Math.sqrt(radius*radius + span*span);\n\
\n\
    var centerPoint = new Point();\n\
    rate = d / dm1;\n\
    centerPoint.x = p1.x + vm1.x * rate;\n\
    centerPoint.y = p1.y + vm1.y * rate;\n\
\n\
    var arc = utils.pointsToArc(centerPoint, startPoint, endPoint);\n\
\n\
    this.path.lineTo(startPoint.x, startPoint.y);\n\
    this.path.arc(centerPoint.x, centerPoint.y, arc.radius, arc.start, arc.end, cross > 0);\n\
  }\n\
, arc: function (x, y, radius,\n\
\t\t\t\t\t\t\t\t\t  aStartAngle,\n\
                    aEndAngle,\n\
                    aClockwise ) {\n\
\n\
    // In the conversion to points we lose the distinction\n\
    // between 0 and pi2 so we must optimize out 0 here \n\
    // or else they will be treated as full circles.\n\
\n\
    if(aStartAngle - aEndAngle === 0) {\n\
      return;\n\
    }\n\
\n\
    // See portal2 example\n\
    if(aEndAngle-aStartAngle === -Math.PI*2)\n\
      aEndAngle = Math.PI*2;\n\
\n\
    var center = new Point(x, y);\n\
    var points = utils.arcToPoints(x, y,\n\
                                   aStartAngle,\n\
                                   aEndAngle,\n\
                                   radius);\n\
\n\
    this._transformPoint(center);\n\
    this._transformPoint(points.start);\n\
    this._transformPoint(points.end);\n\
\n\
    var res = utils.pointsToArc(center,\n\
                                points.start,\n\
                                points.end);\n\
\n\
    // this._ensurePath(points.start.x, points.start.y);\n\
\n\
    this.path.arc(center.x, center.y, res.radius, res.start, res.end, aClockwise);\n\
    \n\
    // var tmp = new Path();\n\
    // tmp.moveTo(points.start.x, points.start.y);\n\
    // tmp.arc(center.x, center.y, radius, res.start, res.end, aClockwise);\n\
\n\
    // tmp.getPoints(40).forEach(function(p) {\n\
    //   this.lineTo(p.x,p.y);\n\
    // },this);\n\
  }\n\
, circle: function(x, y, rad, ccw) {\n\
    this.beginPath();\n\
    this.arc(x, y, rad, 0, Math.PI*2, ccw);\n\
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
, quadraticCurveTo: function( aCPx, aCPy, aX, aY ) {\n\
    this._transformPoint(arguments, 0);\n\
    this._transformPoint(arguments, 2);\n\
\n\
    this.path.quadraticCurveTo.apply(this.path, arguments);\n\
  }\n\
, clip: function() {\n\
    this.clipRegion = this.path;\n\
  }\n\
, rect: function(x,y,w,h) {\n\
    this.moveTo(x,y);\n\
    this.lineTo(x+w,y);\n\
    this.lineTo(x+w,y+h);\n\
    this.lineTo(x,y+h);\n\
    this.closePath();\n\
  }\n\
, fillRect: function(x,y,w,h,depth) { \n\
    this.save();\n\
    this.beginPath();\n\
    this.depth = depth || this.depth;\n\
    this.rect(x,y,w,h);\n\
    this.fill();\n\
    this.restore();\n\
  }\n\
, fillCircle: function(x,y,rad,depth) { \n\
    this.save();\n\
    this.beginPath();\n\
    this.depth = depth || this.depth;\n\
    this.circle(x,y,rad);\n\
    this.fill();\n\
    this.restore();\n\
  }\n\
, measureText: function(text) {\n\
    // Removed until I have cleaner way to do it\n\
  }\n\
, stroke: function(align) {\n\
    var offset = 0;\n\
\n\
    align = align || this.align;\n\
\n\
    if(align === 'outer') {\n\
      offset = this.toolDiameter/2;\n\
    }\n\
    if(align === 'inner') {\n\
      offset = -this.toolDiameter/2;\n\
    }\n\
\n\
    var path = this.path;\n\
    path = path.simplify();\n\
\n\
    if(path.subPaths)\n\
    path.subPaths.forEach(function(subPath) {\n\
      subPath = subPath.toPath().offset(offset);\n\
\n\
      // Climb milling\n\
      if(align == 'inner') {\n\
        subPath = subPath.reverse();\n\
      }\n\
\n\
      this._layer(function(z) {\n\
        this.motion.followPath(subPath,z);\n\
      });\n\
    }, this);\n\
\n\
    this.motion.retract();\n\
  }\n\
, fill: function(windingRule) {\n\
\n\
    if(!this.toolDiameter) {\n\
      throw 'You must set context.toolDiameter to use fill()'\n\
    }\n\
\n\
    var path = this.path;\n\
    path = path.simplify(windingRule, this.precision);\n\
    path = path.clip(this.clipRegion, 0, this.precision);\n\
    path = path.fillPath(this.toolDiameter, this.precision);\n\
    var motion = this.motion;\n\
\n\
    if(path.subPaths)\n\
    path.subPaths.forEach(function(subPath) {\n\
      this._layer(function(z) {\n\
        this.motion.followPath(subPath, z);\n\
      });\n\
    }, this);\n\
\n\
    this.motion.retract();\n\
  }\n\
\n\
// , outerThread: function(dmin, dmaj, depth, pitch, ccw) {\n\
//     this.align = 'outer';\n\
//     this.beginPath();\n\
//     if(ccw) {\n\
//       this.moveTo(dmin/2,depth);\n\
//       this.lineTo(dmaj/2,depth);\n\
//       this.lineTo(dmaj/2,0);\n\
//     }\n\
//     else {\n\
//       this.moveTo(dmaj/2,0);\n\
//       this.lineTo(dmaj/2,depth);\n\
//       this.lineTo(dmin/2,depth);\n\
//     }\n\
//     this.spiral(pitch, ccw);\n\
//   }\n\
, thread: function(x, y, attack, dmin, dmaj, pitch, start, length, ccw, virtual) {\n\
    this.save();\n\
    this.beginPath();\n\
    this.rect(dmin/2,start,dmaj/2-dmin/2,length);\n\
    this.lathe(x,y,attack, pitch, ccw, virtual);\n\
    this.restore();\n\
  }\n\
, threadMill: function(x, y, attack, dmin, dmaj, pitch, start, length, ccw) {\n\
    return this.thread(x, y, attack, dmin, dmaj, pitch, start, length, ccw, true);\n\
  }\n\
, latheMill: function(x, y, attack, pitch, ccw) {\n\
    return this.lathe(x, y, attack, pitch, ccw, true);\n\
  }\n\
, lathe: function(x, y, attack, pitch, ccw, virtual) {\n\
\n\
    this.save();\n\
\n\
    this.filter(function(p) {\n\
      if(p.x != undefined)\n\
        p.x += x;\n\
      if(p.y != undefined)\n\
        p.y += y;\n\
    });\n\
\n\
    var inPath = this.path;\n\
    var toolR = this.toolDiameter/2 || 0;\n\
\n\
    if(virtual && toolR) {\n\
      if(attack == 'inner') { \n\
        inPath = inPath.translate(-toolR,0);\n\
      }\n\
      if(attack == 'outer') { \n\
        inPath = inPath.translate(toolR,0);\n\
      }\n\
    }\n\
\n\
    var bounds = inPath.getBounds(); // Find bounds\n\
    var height = bounds.bottom-bounds.top;\n\
    var width = bounds.right-bounds.left;\n\
    inPath = inPath.simplify();\n\
\n\
    var quad = new Path();\n\
    quad.rect(0,0,bounds.right,bounds.bottom);\n\
    inPath = inPath.clip(quad);\n\
\n\
    var path = new Path();\n\
    var s = this.depthOfCut || 1000;\n\
    var top = virtual ? this.top : 0;\n\
\n\
    // console.log(bounds);\n\
\n\
    // Build waterline path\n\
    // for given attack.\n\
    // Each subpath is a layer.\n\
    if(attack === 'face') {\n\
      for(var i=s; i <= bounds.bottom; i += s) {\n\
        var clip = new Path();\n\
        clip.rect(0, top, width, i);\n\
        var layer = inPath.clip(clip,0);\n\
\n\
        layer.subPaths = layer.subPaths.map(function(sp) {\n\
          sp = sp.shiftToNearest(0,0);\n\
          return sp;\n\
        });\n\
\n\
        path.addPath(layer);\n\
      }\n\
    }\n\
    else if(attack === 'inner') {\n\
      for(var i=bounds.left; i <= bounds.right; i += s) {\n\
        var clip = new Path();\n\
        clip.rect(0,top,i,height-top);\n\
        var layer = inPath.clip(clip,0);\n\
\n\
        layer.subPaths = layer.subPaths.map(function(sp) {\n\
          sp = sp.shiftToNearest(0,0);\n\
          return sp;\n\
        });\n\
\n\
        path.addPath(layer);\n\
      }\n\
    }\n\
    else if(attack === 'outer') {\n\
      for(var i=bounds.right; i >= 0; i -= s) {\n\
        i = Math.max(i, 0);\n\
\n\
        var clip = new Path();\n\
        clip.rect(i,top,bounds.right+10,height-top);\n\
        var layer = inPath.clip(clip,0);\n\
\n\
        layer.subPaths = layer.subPaths.map(function(sp) {\n\
          sp = sp.shiftToNearest(bounds.right,0);\n\
          return sp;\n\
        });\n\
\n\
        path.addPath(layer);\n\
      }\n\
    }\n\
\n\
    // path.addPath(inPath);\n\
\n\
    var inner = this.align == 'inner';\n\
    pitch = pitch || this.toolDiameter || 1;\n\
\n\
    var motion = this.motion;\n\
    var driver = this.driver;\n\
    // var range = (attack == 'face') ? height : width; \n\
    // var depthOfCut = this.depthOfCut || range;\n\
    // var offset = range;\n\
    var a = 0;\n\
\n\
\n\
    path.subPaths.forEach(function(subPath) {\n\
      var spiralAngle = 0;\n\
      driver.zero({a:0});\n\
      var a = 0;\n\
\n\
      var pts = subPath.getPoints();\n\
\n\
      if(!ccw) {\n\
        // CCW simply makes the path bottom-out.\n\
        // The physical circular motion is\n\
        // always determined by the attack\n\
        // to ensure climb milling.\n\
        pts = pts.reverse();\n\
      }\n\
\n\
      var p0u = motion.position;\n\
      var p0 = p0u.clone();\n\
\n\
      pts.forEach(function(p1,i) {\n\
        p1 = p1.clone();\n\
        p1u = p1.clone();\n\
\n\
        var xo = p1u.x-p0u.x;\n\
        var yo = p1u.y-p0u.y;\n\
        var dist = Math.sqrt(xo*xo + yo*yo);\n\
\n\
        if(virtual) {\n\
          var r0 = p0.x;\n\
          var z0 = p0.y;\n\
          var r1 = p1.x;\n\
          var z1 = p1.y;\n\
          var loops = dist/pitch;\n\
\n\
          // Entering and exiting are a part of the path\n\
          // touching the bounds as a consequence\n\
          // of the waterline clipping.\n\
          // We just have to detect them and\n\
          // behave a little differently.\n\
          if(attack == 'inner' && p0.x <= bounds.left) {\n\
            // Inner Entering\n\
            var x = (r1) * Math.sin(spiralAngle);\n\
            var y = (r1) * Math.cos(spiralAngle);\n\
            if(i === 0)\n\
              motion.rapid({x: x, y: y});\n\
            else\n\
              motion.linear({x: x, y: y});\n\
\n\
            motion.rapid({z: z1});\n\
          }\n\
          else if(attack == 'inner' && p1.x <= bounds.left) {\n\
            // Inner Exiting\n\
            var x = (r1) * Math.sin(spiralAngle);\n\
            var y = (r1) * Math.cos(spiralAngle);\n\
            motion.rapid({x: x, y: y});\n\
            motion.rapid({z: z1});\n\
          }\n\
          else if(attack == 'outer' && p0.x >= bounds.right) {\n\
            // Outer Entering\n\
            var x = (r1) * Math.cos(spiralAngle);\n\
            var y = (r1) * Math.sin(spiralAngle);\n\
            motion.linear({x: x, y: y});\n\
          }\n\
          else if(attack == 'outer' && p1.x >= bounds.right) {\n\
            // Outer Exiting\n\
            var x = (r1) * Math.cos(spiralAngle);\n\
            var y = (r1) * Math.sin(spiralAngle);\n\
            motion.rapid({x: x, y: y});\n\
            motion.rapid({z: z1});\n\
          }\n\
          else if(attack == 'face' && p0.y <= bounds.top) {\n\
            // Face Entering\n\
            var x = (r1) * Math.cos(spiralAngle);\n\
            var y = (r1) * Math.sin(spiralAngle);\n\
            motion.rapid({x: x, y: y});\n\
            motion.linear({z: z1});\n\
          }\n\
          else if(attack == 'face' && p1.y <= bounds.top) {\n\
            // Outer Exiting\n\
            var x = (r1) * Math.cos(spiralAngle);\n\
            var y = (r1) * Math.sin(spiralAngle);\n\
            motion.rapid({z: z1});\n\
            motion.rapid({x: x, y: y});\n\
          }\n\
          else {\n\
            spiralAngle = utils.spiral(this.precision, r0, r1, loops,\n\
                                       spiralAngle, attack=='inner',\n\
                                       function(x,y,t) {\n\
              var z = z0+(z1-z0)*t; \n\
\n\
              motion.linear({\n\
                x: x,\n\
                y: y,\n\
                z: z \n\
              });\n\
            });\n\
          }\n\
        }\n\
        else {\n\
\n\
          if(attack == 'inner' && p1u.x <= bounds.left) {\n\
            motion.rapid({x: p1.x, y: p1.y});\n\
          }\n\
          else if(attack == 'outer' && p1.x >= bounds.right) {\n\
            motion.rapid({x: p1.x, y: p1.y});\n\
          }\n\
          else if(attack == 'face' && p1.y <= bounds.top) {\n\
            motion.rapid({x: p1.x, y: p1.y});\n\
          }\n\
          else {\n\
            a += dist/pitch*360;\n\
            motion.linear({x: p1.x, y: p1.y, a: a});\n\
          }\n\
        }\n\
\n\
        p0 = p1.clone();\n\
        p0u = p1u.clone();\n\
      }, this);\n\
\n\
      // This is important to be done after\n\
      // every subpath, for ctx.top\n\
      if(virtual) {\n\
        motion.rapid({z: 0});\n\
      }\n\
    }, this);\n\
\n\
    driver.zero({a:0});\n\
\n\
    // Always finish with an arc?\n\
    // motion.arcCW({\n\
    //   x: 0,\n\
    //   y: 0,\n\
    //   i:-p1.x,\n\
    //   j:-p1.y\n\
    // });\n\
\n\
    this.restore();\n\
  }\n\
, peckDrill: function(x, y, depth, peck) {\n\
\n\
    this._transformPoint(arguments);\n\
\n\
    if(arguments.length <= 2) {\n\
      depth = arguments[0];\n\
      peck = arguments[1];\n\
      x = 0;\n\
      y = 0;\n\
    }\n\
\n\
    var prevZ = this.top;\n\
    var mtn = this.motion;\n\
    peck = peck || this.toolDiameter;\n\
\n\
    // We need a tad bit of play\n\
    // to avoid rapid plunging into \n\
    // the previous peck's bur\n\
    // and to pull out a little further\n\
    // than the surface in case it started\n\
    // out too close\n\
    var tad = peck/2 || depth/10;\n\
\n\
    mtn.rapid({x:x,y:y});\n\
\n\
    for(var z=this.top+peck; prevZ < depth; z += peck) {\n\
      z = Math.min(z, depth); // Cap to exact depth\n\
      mtn.rapid({z:prevZ-tad}); // Rapid to prev depth - tad\n\
      mtn.linear({z:z}); // Drill a bit further\n\
      mtn.retract();\n\
      // mtn.rapid({z:-tad}); // Rapid all the way out \n\
      prevZ = z;\n\
    }\n\
\n\
    mtn.retract();\n\
  }\n\
, _layer: function(fn) {\n\
    var depthOfCut = this.depthOfCut || this.depth;\n\
    var start = this.top + depthOfCut;\n\
\n\
    if(depthOfCut === 0) {\n\
      fn.call(this, 0);\n\
      return;\n\
    }\n\
\n\
    var offset = this.top;\n\
    while(offset < this.depth) {\n\
      offset += depthOfCut;\n\
\n\
      // Clip to actual depth\n\
      offset = Math.min(offset, this.depth);\n\
\n\
      // Remove the material at this depth\n\
      fn.call(this, offset);\n\
    }\n\
\n\
    // Finishing pass\n\
    fn.call(this, this.depth);\n\
  }\n\
, text: function(text, x, y, params) {\n\
    var fontProps = parseFont(this.font);\n\
    var font = new Font(fontProps);\n\
\n\
    // this.beginPath();\n\
    this.save();\n\
    this.translate(x, y);\n\
    font.drawText(this, text);\n\
    this.restore();\n\
  }\n\
, fillText: function(text, x, y, params) {\n\
    this.text(text, x, y, params);\n\
    this.fill();\n\
  }\n\
, strokeText: function(text, x, y, params) {\n\
    this.text(text, x, y, params);\n\
    this.stroke();\n\
  }\n\
, clearRect: function() {}\n\
, closePath: function() {\n\
    this.path.close();\n\
  }\n\
};\n\
\n\
GCanvas.Filter = require('./drivers/filter');\n\
GCanvas.Simulator = require('./drivers/simulator');\n\
GCanvas.GcodeDriver = GcodeDriver;\n\
\n\
var helvetiker = require('./fonts/helvetiker_regular.typeface');\n\
Font.load(helvetiker);\n\
\n\
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
"module.exports = Path;\n\
\n\
var SubPath = require('./subpath')\n\
  , ClipperLib = require('./clipper')\n\
  , utils = require('./utils')\n\
  , Point = require('./math/point')\n\
\n\
function Path() {\n\
  this.subPaths = [];\n\
}\n\
\n\
Path.actions = SubPath.actions;\n\
\n\
Path.prototype = {\n\
  clone: function() {\n\
    var copy = new Path();\n\
    copy.subPaths = this.subPaths.slice(0);\n\
    return copy;\n\
  }\n\
, moveTo: function(x,y) {\n\
    var subPath = new SubPath();\n\
    subPath.moveTo(x,y);\n\
    this.subPaths.push(subPath);\n\
    this.current = subPath;\n\
  }\n\
, _ensure: function(x,y) {\n\
    if(this.subPaths.length === 0) {\n\
      this.moveTo(x,y);\n\
    }\n\
  }\n\
\n\
, close: function() {\n\
    if(!this.current) return false;\n\
    this.current.close();\n\
  }\n\
\n\
/*\n\
 * Pass all curves straight through\n\
 * */\n\
, lineTo: function() {\n\
    this.current.lineTo.apply(this.current, arguments);\n\
  }\n\
, arc: function(x, y, rad,\n\
\t\t\t\t\t\t\t\t\t  astart, aend, ccw) {\n\
    this.ellipse(x,y,rad,rad,astart,aend,ccw);\n\
  }\n\
, ellipse: function(x, y, xrad, yrad,\n\
\t\t\t\t\t\t\t\t\t  astart, aend, ccw) {\n\
\n\
    var points = utils.arcToPoints(x, y,\n\
                                   astart,\n\
                                   aend,\n\
                                   xrad);\n\
\n\
    this._ensure(points.start.x, points.start.y);\n\
    this.current.ellipse.apply(this.current, arguments);\n\
  }\n\
, quadraticCurveTo: function() {\n\
    this.current.quadraticCurveTo.apply(this.current, arguments);\n\
  }\n\
, bezierCurveTo: function() {\n\
    this.current.bezierCurveTo.apply(this.current, arguments);\n\
  }\n\
, rect: function(x,y,w,h) {\n\
    this.moveTo(x,y);\n\
    this.lineTo(x+w,y);\n\
    this.lineTo(x+w,y+h);\n\
    this.lineTo(x,y+h);\n\
    this.lineTo(x,y);\n\
  }\n\
\n\
, toPolys: function(scale,divisions) {\n\
    if(!scale) throw 'NO SCALE!';\n\
\n\
    return this.subPaths.map(function(subPath) {\n\
      return subPath.toPoly(scale,divisions);\n\
    });\n\
  }\n\
, fromPolys: function(polygons, scale) {\n\
    if(!scale) throw 'NO SCALE!';\n\
\n\
    this.subPaths = [];\n\
\n\
    for(var i=0,l=polygons.length; i < l; ++i) {\n\
      var subPath = new SubPath();\n\
      subPath.fromPoly(polygons[i], scale);\n\
      this.subPaths.push(subPath);\n\
      this.current = subPath;\n\
    }\n\
\n\
    return this;\n\
  }\n\
, clip: function(clipRegion, clipType, divisions) {\n\
    if(!clipRegion) return this;\n\
\n\
    clipType = clipType || 0;\n\
\n\
    var scale = 1000;\n\
\n\
    // this.close();\n\
    // clipRegion.close();\n\
\n\
    var subjPolys = this.toPolys(scale, divisions);\n\
    var clipPolys = clipRegion.toPolys(scale);\n\
\n\
    // Clean both\n\
    // var subjPolys = ClipperLib.Clipper.CleanPolygons(subjPolys, 1);\n\
    // var clipPolys = ClipperLib.Clipper.CleanPolygons(clipPolys, 1);\n\
\n\
    // var subjPolys = ClipperLib.Clipper.SimplifyPolygons(subjPolys, ClipperLib.PolyFillType.pftNonZero);\n\
\n\
    // var clipPolys = ClipperLib.Clipper.SimplifyPolygons(clipPolys, ClipperLib.PolyFillType.pftNonZero);\n\
\n\
    var cpr = new ClipperLib.Clipper();\n\
    // cpr.PreserveCollinear = true;\n\
    // cpr.ReverseSolution = true;\n\
\n\
    cpr.AddPaths(subjPolys, ClipperLib.PolyType.ptSubject,true);\n\
    cpr.AddPaths(clipPolys, ClipperLib.PolyType.ptClip, true);\n\
\n\
    var clipped = [];\n\
    cpr.Execute(clipType, clipped);\n\
\n\
    var tmp;\n\
\n\
    var path = new Path();\n\
    path.fromPolys(clipped, scale);\n\
    return path;\n\
  }\n\
\n\
, translate: function(x,y) {\n\
    var result = new Path();\n\
    this.subPaths.forEach(function(subPath) {\n\
      var pts = subPath.getPoints();\n\
      result.moveTo(pts[0].x+x, pts[0].y+y);\n\
      pts.slice(1).forEach(function(p) {\n\
        // p.x += x;\n\
        // p.y += y;\n\
        result.lineTo(p.x+x, p.y+y);\n\
      });\n\
    });\n\
    return result;\n\
  }\n\
\n\
, clipToBounds: function(bounds) {\n\
    var result = new Path();\n\
    var p0 = new Point(0,0,0);\n\
    var p0u = p0.clone();\n\
    var p1u;\n\
\n\
    this.subPaths.forEach(function(subPath) {\n\
      var pts = subPath.getPoints();\n\
\n\
      pts.forEach(function(p1, i) {\n\
        p1 = p1.clone();\n\
        p1u = p1.clone();\n\
\n\
        // if(p1.y < bounds.top && p0.y < bounds.top) {\n\
        //   return;\n\
        // }\n\
        // if(p1.x > bounds.right && p0.x > bounds.right) {\n\
        //   return;\n\
        // }\n\
\n\
        if(p1.y < bounds.top) {\n\
          var m = (p1.x - p0.x) / (p1.y - p0.y);\n\
          p1.x += (m * (bounds.top - p1.y)) || 0;\n\
          p1.y = bounds.top;\n\
\n\
\n\
        }\n\
        else if(p0u.y < bounds.top) {\n\
          var m = (p1.x - p0u.x) / (p1.y - p0u.y);\n\
          var x = (m * (bounds.top - p1.y)) || 0;\n\
\n\
          result.moveTo(p1.x+x, bounds.top);\n\
        }\n\
\n\
        // if(p1.x < bounds.left) {\n\
        //   var m = (p1.y - p0.y) / (p1.x - p0.x);\n\
        //   p1.y += m * (bounds.left - p1.x);\n\
        //   p1.x = bounds.left;\n\
        // }\n\
        // else if(p0u.x < bounds.left) {\n\
        //   var m = (p1.y - p0u.y) / (p1.x - p0u.x);\n\
        //   var y = m * (bounds.left - p1.x);\n\
        //   // result.moveTo(bounds.left, bounds.top);\n\
        // }\n\
\n\
        if(p1.x > bounds.right) {\n\
          var m = (p1.y - p0.y) / (p1.x - p0.x);\n\
          p1.y += m * (bounds.right - p1.x);\n\
          p1.x = bounds.right;\n\
\n\
        }\n\
        else if(p0u.x > bounds.right) {\n\
       \n\
          var m = (p1.y - p0u.y) / (p1.x - p0u.x);\n\
          var y = m * (bounds.right - p1.x);\n\
\n\
          // result.moveTo(bounds.right, p1.y-y);\n\
        }\n\
\n\
\n\
        if(i === 0)\n\
          result.moveTo(p1.x, p1.y);\n\
        else\n\
          result.lineTo(p1.x, p1.y);\n\
 \n\
        p0 = p1;\n\
        p0u = p1u;\n\
      });\n\
    });\n\
\n\
    return result;\n\
  }\n\
\n\
, simplify: function(windingRule, divisions) {\n\
    var scale = 1000;\n\
    var polys = this.toPolys(scale, divisions); \n\
    var type = ClipperLib.PolyFillType.pftNonZero;\n\
\n\
    if(windingRule === 'evenodd') {\n\
      type = ClipperLib.PolyFillType.pftEvenOdd;\n\
    }\n\
\n\
    var polys = ClipperLib.Clipper.SimplifyPolygons(polys, type);\n\
\n\
    var result = new Path();\n\
    result.fromPolys(polys, scale);\n\
\n\
    return result;\n\
  }\n\
\n\
, offset: function(delta, divisions) {\n\
    if(delta === 0) {\n\
      return this;\n\
    }\n\
\n\
    // Special case for single ellipse\n\
    // just change the radius.\n\
    if(this.subPaths.length == 1\n\
      && this.subPaths[0].actions.length == 2\n\
      && this.subPaths[0].actions[1].action === 'ellipse') {\n\
        var result = new Path();\n\
        var args = this.subPaths[0].actions[1].args;\n\
\n\
        if(args[2] + delta < 0)\n\
          return false;\n\
\n\
        result.ellipse(\n\
          args[0],\n\
          args[1],\n\
          args[2] + delta,\n\
          args[3] + delta,\n\
          args[4],\n\
          args[5],\n\
          args[6]\n\
        );\n\
\n\
        return result;\n\
    }\n\
\n\
    var scale = 1000;\n\
    var cleandelta = 0.1;\n\
\n\
    var polygons = this.toPolys(scale, divisions);\n\
\n\
    // offset\n\
    var miterLimit = 1000*scale;\n\
\n\
    var co = new ClipperLib.ClipperOffset();\n\
    // co.PreserveCollinear = true;\n\
    // co.ReverseSolution = true;\n\
\n\
    co.AddPaths(polygons, \n\
             ClipperLib.JoinType.jtMiter,\n\
             ClipperLib.EndType.etClosedPolygon);\n\
\n\
    var solution = [];\n\
\n\
    try {\n\
      co.Execute(solution, delta*scale);\n\
    }\n\
    catch(err) {\n\
      return false;\n\
    }\n\
\n\
\n\
    if(!solution || solution.length === 0\n\
      || solution[0].length === 0) return false;\n\
\n\
    var result = new Path();\n\
    result.fromPolys(solution, scale);\n\
\n\
    result.close(); // Not sure why I need to do this now\n\
    return result;\n\
  }\n\
\n\
, ramp: function(depth) {\n\
  }\n\
\n\
, addPath: function(path2) {\n\
    this.subPaths = this.subPaths.concat(path2.subPaths);\n\
  }\n\
\n\
, estimateMaxOffset: function(divisions) {\n\
    var bounds = this.getBounds();\n\
    var width = Math.abs(bounds.right - bounds.left)\n\
    var height = Math.abs(bounds.bottom - bounds.top)\n\
    var lt = Math.min(width, height) / 2;\n\
\n\
    var gt = 0;\n\
\n\
    for(var i = 0; i < 5; ++i) {\n\
      var test = gt+(lt-gt)/2;\n\
      var offset = this.offset(-test,3);\n\
\n\
      if(offset) {\n\
        gt = test\n\
      }\n\
      else {\n\
        lt = test;\n\
      }\n\
    }\n\
\n\
    return {lt: lt, gt: gt};\n\
  }\n\
\n\
, fillPath: function(diameter, divisions) {\n\
    var result = new Path();\n\
    var overlap = Math.sin(Math.PI/4);\n\
\n\
    // this.subPaths.forEach(function(sp) {\n\
      // var path = sp.toPath();\n\
      var path = this;\n\
\n\
      var max = path.estimateMaxOffset(5).lt;\n\
      max -= diameter/2; \n\
\n\
      for(var i = -max; i < -diameter/2; i += diameter*overlap) {\n\
        var offsetPath = path.offset(i, divisions).reverse();\n\
        result.addPath(offsetPath);\n\
      }\n\
\n\
      // Finishing pass\n\
      var finish = path.offset( -diameter/2, divisions );\n\
      if(finish)\n\
        result.addPath( finish.reverse() );\n\
    // });\n\
\n\
    return result;\n\
  }\n\
\n\
, connectEnds: function(diameter) {\n\
    for(var i=this.subPaths.length-1; i > 0; --i) {\n\
      var sp1 = this.subPaths[i-1];\n\
      var sp2 = this.subPaths[i];\n\
\n\
      var p1 = sp1.lastPoint();\n\
      var nearest = sp2.nearestPoint(p1);\n\
      var p2 = nearest.point;\n\
\n\
      if(nearest.distance < diameter*2) {\n\
        sp2 = sp2.shift(nearest.i);\n\
        sp1.lineTo(p2.x, p2.y);\n\
        sp2.actions[0].action = Path.actions.LINE_TO;\n\
        sp1.actions = sp1.actions.concat( sp2.actions );\n\
        this.subPaths.splice(i,1);\n\
      }\n\
    }\n\
\n\
    return this;\n\
  }\n\
\n\
, reverse: function() {\n\
    var result = new Path();\n\
\n\
    result.subPaths = this.subPaths.map(function(sp) {\n\
      return sp.reverse();\n\
    }).reverse();\n\
\n\
    return result;\n\
  }\n\
\n\
, sort: function() { \n\
    if(this.subPaths.length === 0) return this;\n\
\n\
    var copy = new Path();\n\
\n\
    var p0 = this.subPaths[0].lastPoint();\n\
\n\
    copy.subPaths = this.subPaths.sort(function(a, b) {\n\
      var p1 = a.lastPoint();\n\
      var p2 = b.firstPoint();\n\
\n\
      var d1 = Point.distance(p1,p0);\n\
      var d2 = Point.distance(p2,p0);\n\
\n\
      // Moving target\n\
      p0 = b.lastPoint();\n\
\n\
      if(d1 < d2) return -1;\n\
      if(d1 > d2) return 1;\n\
\n\
      return 0;\n\
    });\n\
\n\
    return copy;\n\
  }\n\
\n\
, firstPoint: function() {\n\
    if(!this.current) return false;\n\
    return this.subPaths[0].firstPoint();\n\
  }\n\
\n\
, lastPoint: function() {\n\
    if(!this.current) return false;\n\
    return this.subPaths[this.subPaths.length-1].lastPoint();\n\
  }\n\
\n\
, getPoints: function(divisions) {\n\
    var pts = [];\n\
    this.subPaths.forEach(function(sp) {\n\
      pts.push.apply(pts, sp.getPoints(divisions));\n\
    });\n\
    return pts;\n\
  }\n\
\n\
, getBounds: function() {\n\
    var pts = this.getPoints();\n\
    var p0 = this.firstPoint();\n\
    var res = {\n\
      left: p0.x,\n\
      top: p0.y,\n\
      right: p0.x,\n\
      bottom: p0.y\n\
    };\n\
\n\
    pts.forEach(function(p) {\n\
      res.left = Math.min(res.left, p.x);\n\
      res.top = Math.min(res.top, p.y);\n\
      res.right = Math.max(res.right, p.x);\n\
      res.bottom = Math.max(res.bottom, p.y);\n\
    });\n\
\n\
    return res;\n\
  }\n\
}\n\
\n\
var NON_ZERO = ClipperLib.PolyFillType.pftNonZero;\n\
var EVEN_ODD = ClipperLib.PolyFillType.pftEvenOdd;\n\
//@ sourceURL=gcanvas/lib/path.js"
));
require.register("gcanvas/lib/subpath.js", Function("exports, require, module",
"/**\n\
 * Derived from code originally written by zz85 for three.js\n\
 * http://www.lab4games.net/zz85/blog\n\
 * Thanks zz85!\n\
 **/\n\
\n\
module.exports = SubPath;\n\
\n\
var Point = require('./math/point')\n\
  , ClipperLib = require('./clipper')\n\
  , Path = require('./path')\n\
  , utils = require('./utils');\n\
\n\
function SubPath( points ) {\n\
\tthis.actions = [];\n\
  this.pointsCache = [];\n\
\n\
\tif ( points ) {\n\
\t\tthis.fromPoints( points );\n\
\t}\n\
};\n\
\n\
SubPath.actions = {\n\
\tMOVE_TO: 'moveTo',\n\
\tLINE_TO: 'lineTo',\n\
\tQUADRATIC_CURVE_TO: 'quadraticCurveTo',\n\
\tBEZIER_CURVE_TO: 'bezierCurveTo',\n\
\tELLIPSE: 'ellipse'\n\
};\n\
\n\
SubPath.prototype = {\n\
  clone: function() {\n\
    var path = new SubPath();\n\
    path.actions = this.actions.slice(0);\n\
    return path;\n\
  }\n\
\n\
, isClosed: function() {\n\
    var fp = this.firstPoint();\n\
    var lp = this.lastPoint();\n\
    return utils.samePos(fp,lp);\n\
  }\n\
\n\
\n\
, toPath: function() {\n\
   var clone = this.clone();\n\
   var path = new Path();\n\
   path.subPaths.push(clone);\n\
   path.current = path.subPaths[path.subPaths.length-1];\n\
   return path;\n\
  }\n\
\n\
, addAction: function(action) {\n\
    this.actions.push(action);\n\
    this.pointsCache = [];\n\
  }\n\
\n\
, firstPoint: function() {\n\
    var p = new Point(0,0);\n\
    var action = this.actions[0];\n\
    var args = action.args;\n\
\n\
    switch(action.action) {\n\
      case 'ellipse':\n\
        p = utils.arcToPoints(\n\
          args[0], args[1], args[4],\n\
          args[5], args[2]).start\n\
        break;\n\
\n\
      default:\n\
        p.x = args[args.length-2];\n\
        p.y = args[args.length-1];\n\
        break;\n\
    }\n\
\n\
    return p;\n\
  }\n\
\n\
, lastPoint: function() {\n\
    var p = new Point(0,0);\n\
    var action = this.actions[this.\n\
      actions.length-1];\n\
    var args = action.args;\n\
\n\
    switch(action.action) {\n\
      case 'ellipse':\n\
        p = utils.arcToPoints(\n\
          args[0], args[1], args[4],\n\
          args[5], args[2]).end\n\
        break;\n\
\n\
      default:\n\
        p.x = args[args.length-2];\n\
        p.y = args[args.length-1];\n\
        break;\n\
    }\n\
\n\
    return p;\n\
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
, getActionLength: function(x0,y0,i) {\n\
    var action = this.actions[i],\n\
        args = action.args;\n\
\n\
    if(action.action == 'ellipse') {\n\
      var rad = args[3];\n\
      var astart = args[4];\n\
      var aend = args[5];\n\
\n\
      return (aend-astart)*rad;\n\
    }\n\
\n\
    var x = args[args.length-2];\n\
    var y = args[args.length-1];\n\
    var xo = x - x0;\n\
    var yo = y - y0;\n\
    return Math.sqrt(xo*xo + yo*yo);\n\
  }\n\
\n\
, getLength: function() {\n\
    var args, x1=0, y1=0, x2=0, y2=0, xo=0, yo=0, len=0;\n\
\n\
    var first = this.firstPoint();\n\
    x2 = first.x;\n\
    y2 = first.y;\n\
\n\
    var pts = this.getPoints(10000);\n\
    for(var i=1,l=pts.length; i < l; ++i) {\n\
      var p=pts[i];\n\
      x1 = x2;\n\
      y1 = y2;\n\
      x2 = p.x;\n\
      y2 = p.y;\n\
      xo = x2-x1;\n\
      yo = y2-y1;\n\
\n\
      len += Math.sqrt(xo*xo + yo*yo);\n\
    }\n\
    return len;\n\
  }\n\
\n\
, nearestPoint: function(p1) {\n\
    var p2 = new Point()\n\
      , args\n\
      , rn\n\
      , rp\n\
      , rd = Infinity;\n\
\n\
    this.actions.forEach(function(action,n) {\n\
      args = action.args;\n\
      p2.x = args[args.length-2];\n\
      p2.y = args[args.length-1];\n\
\n\
      var d = Point.distance(p1,p2);\n\
      if(d < rd) {\n\
        rn = n;\n\
        rp = p2.clone();\n\
        rd = d;\n\
      }\n\
    });\n\
\n\
    return {\n\
      i: rn\n\
    , distance: rd\n\
    , point: rp\n\
    };\n\
  }\n\
\n\
, pointAt: function(i) {\n\
    var p = new Point();\n\
    var action = this.actions[i];\n\
    var args = action.args;\n\
    switch(action.action) {\n\
      case 'lineTo':\n\
        p.x = args[args.length-2];\n\
        p.y = args[args.length-1];\n\
        break;\n\
\n\
    }\n\
\n\
    return p;\n\
  }\n\
\n\
, shiftToNearest: function(x, y) {\n\
    var nearest = this.nearestPoint(new Point(x,y));\n\
    return this.shift(nearest.i);\n\
  }\n\
\n\
, shift: function(an) {\n\
    if(an === 0) return this;\n\
\n\
    var result = new SubPath();\n\
\n\
\n\
    result.actions = this.actions.slice(an).concat(\n\
      this.actions.slice(0,an)\n\
    );\n\
\n\
    result.actions.forEach(function(a) {\n\
      a.action = SubPath.actions.LINE_TO;\n\
    });\n\
\n\
    result.lineTo.apply(result, result.actions[0].args);\n\
\n\
    return result;\n\
  }\n\
\n\
, moveTo: function ( x, y ) {\n\
    this.addAction( { action: SubPath.actions.MOVE_TO, args: arguments } );\n\
  }\n\
\n\
, lineTo: function ( x, y ) {\n\
    this.addAction( { action: SubPath.actions.LINE_TO, args: arguments } );\n\
  }\n\
\n\
, quadraticCurveTo: function( aCPx, aCPy, aX, aY ) {\n\
    this.addAction( { action: SubPath.actions.QUADRATIC_CURVE_TO, args: arguments } );\n\
  }\n\
\n\
, bezierCurveTo: function( aCP1x, aCP1y,\n\
                           aCP2x, aCP2y,\n\
                           aX, aY ) {\n\
    this.addAction( { action: SubPath.actions.BEZIER_CURVE_TO, args: arguments } );\n\
  }\n\
\n\
, arc: function ( aX, aY, aRadius, aStartAngle, aEndAngle, aClockwise ) {\n\
    this.ellipse(aX, aY, aRadius, aRadius, aStartAngle, aEndAngle, aClockwise);\n\
  }\n\
\n\
, ellipse: function ( aX, aY, xRadius, yRadius, aStartAngle, aEndAngle, aClockwise ) {\n\
    this.addAction( { action: SubPath.actions.ELLIPSE, args: arguments } );\n\
  }\n\
\n\
, getPoints: function( divisions ) {\n\
\n\
    divisions = divisions || 40;\n\
\n\
    if(this.pointsCache[divisions]) {\n\
      return this.pointsCache[divisions];\n\
    }\n\
\n\
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
      case SubPath.actions.MOVE_TO:\n\
\n\
        points.push( new Point( args[ 0 ], args[ 1 ] ) );\n\
\n\
        break;\n\
\n\
      case SubPath.actions.LINE_TO:\n\
\n\
        points.push( new Point( args[ 0 ], args[ 1 ] ) );\n\
\n\
        break;\n\
\n\
      case SubPath.actions.QUADRATIC_CURVE_TO:\n\
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
      case SubPath.actions.BEZIER_CURVE_TO:\n\
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
      case SubPath.actions.ELLIPSE:\n\
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
    }\n\
\n\
    if(this.closed) {\n\
      points.push( points[ 0 ] );\n\
    }\n\
\n\
    this.pointsCache[divisions] = points;\n\
    return points;\n\
  }\n\
, toPoly: function(scale, divisions) {\n\
    return this.getPoints(divisions).map(function(p) {\n\
      return {X: p.x*scale, Y: p.y*scale};\n\
    });\n\
  }\n\
, fromPoly: function(poly, scale) {\n\
    scale = 1/scale;\n\
\n\
    this.moveTo(poly[0].X*scale, poly[0].Y*scale);\n\
\n\
    for(var i=1,l=poly.length; i < l; ++i) {\n\
      this.lineTo(poly[i].X*scale, poly[i].Y*scale);\n\
    }\n\
\n\
    this.close();\n\
    // todo: close properly (closePath())\n\
    // this.lineTo(poly[0].X*scale, poly[0].Y*scale);\n\
    return this;\n\
  }\n\
, close: function() {\n\
    if(this.isClosed()) return;\n\
\n\
    var curStart = this.actions[0].args;\n\
    this.lineTo.apply(this, curStart);\n\
  }\n\
, reverse: function() {\n\
    var result = new SubPath();\n\
    var pts = this.getPoints().reverse();\n\
    if(pts.length == 0) return result;\n\
\n\
    result.moveTo(pts[0].x, pts[0].y);\n\
    for(var i=1,l=pts.length; i < l; ++i) {\n\
      result.lineTo(pts[i].x, pts[i].y);\n\
    }\n\
    return result;\n\
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
//@ sourceURL=gcanvas/lib/subpath.js"
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
"// rev 452\n\
/********************************************************************************\n\
 *                                                                              *\n\
 * Author    :  Angus Johnson                                                   *\n\
 * Version   :  6.1.3a                                                          *\n\
 * Date      :  22 January 2014                                                 *\n\
 * Website   :  http://www.angusj.com                                           *\n\
 * Copyright :  Angus Johnson 2010-2014                                         *\n\
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
 * September 24-28, 2005 , Long Beach, California, USA                          *\n\
 * http://www.me.berkeley.edu/~mcmains/pubs/DAC05OffsetPolygon.pdf              *\n\
 *                                                                              *\n\
 *******************************************************************************/\n\
/*******************************************************************************\n\
 *                                                                              *\n\
 * Author    :  Timo                                                            *\n\
 * Version   :  6.1.3.2                                                         *\n\
 * Date      :  1 February 2014                                                 *\n\
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
(function ()\n\
{\n\
  \"use strict\";\n\
  //use_int32: When enabled 32bit ints are used instead of 64bit ints. This\n\
  //improve performance but coordinate values are limited to the range +/- 46340\n\
  var use_int32 = false;\n\
  //use_xyz: adds a Z member to IntPoint. Adds a minor cost to performance.\n\
  var use_xyz = false;\n\
  //UseLines: Enables line clipping. Adds a very minor cost to performance.\n\
  var use_lines = true;\n\
  //use_deprecated: Enables support for the obsolete OffsetPaths() function\n\
  //which has been replace with the ClipperOffset class.\n\
  var use_deprecated = false;\n\
\n\
  var ClipperLib = {};\n\
  var isNode = false;\n\
  if (typeof module !== 'undefined' && module.exports)\n\
  {\n\
    module.exports = ClipperLib;\n\
    isNode = true;\n\
  }\n\
  else\n\
  {\n\
    if (typeof (document) !== \"undefined\") window.ClipperLib = ClipperLib;\n\
    else self['ClipperLib'] = ClipperLib;\n\
  }\n\
  var navigator_appName;\n\
  if (!isNode)\n\
  {\n\
    var nav = navigator.userAgent.toString().toLowerCase();\n\
    navigator_appName = navigator.appName;\n\
  }\n\
  else\n\
  {\n\
    var nav = \"chrome\"; // Node.js uses Chrome's V8 engine\n\
    navigator_appName = \"Netscape\"; // Firefox, Chrome and Safari returns \"Netscape\", so Node.js should also\n\
  }\n\
  // Browser test to speedup performance critical functions\n\
  var browser = {};\n\
  if (nav.indexOf(\"chrome\") != -1 && nav.indexOf(\"chromium\") == -1) browser.chrome = 1;\n\
  else browser.chrome = 0;\n\
  if (nav.indexOf(\"chromium\") != -1) browser.chromium = 1;\n\
  else browser.chromium = 0;\n\
  if (nav.indexOf(\"safari\") != -1 && nav.indexOf(\"chrome\") == -1 && nav.indexOf(\"chromium\") == -1) browser.safari = 1;\n\
  else browser.safari = 0;\n\
  if (nav.indexOf(\"firefox\") != -1) browser.firefox = 1;\n\
  else browser.firefox = 0;\n\
  if (nav.indexOf(\"firefox/17\") != -1) browser.firefox17 = 1;\n\
  else browser.firefox17 = 0;\n\
  if (nav.indexOf(\"firefox/15\") != -1) browser.firefox15 = 1;\n\
  else browser.firefox15 = 0;\n\
  if (nav.indexOf(\"firefox/3\") != -1) browser.firefox3 = 1;\n\
  else browser.firefox3 = 0;\n\
  if (nav.indexOf(\"opera\") != -1) browser.opera = 1;\n\
  else browser.opera = 0;\n\
  if (nav.indexOf(\"msie 10\") != -1) browser.msie10 = 1;\n\
  else browser.msie10 = 0;\n\
  if (nav.indexOf(\"msie 9\") != -1) browser.msie9 = 1;\n\
  else browser.msie9 = 0;\n\
  if (nav.indexOf(\"msie 8\") != -1) browser.msie8 = 1;\n\
  else browser.msie8 = 0;\n\
  if (nav.indexOf(\"msie 7\") != -1) browser.msie7 = 1;\n\
  else browser.msie7 = 0;\n\
  if (nav.indexOf(\"msie \") != -1) browser.msie = 1;\n\
  else browser.msie = 0;\n\
  ClipperLib.biginteger_used = null;\n\
  // Copyright (c) 2005  Tom Wu\n\
  // All Rights Reserved.\n\
  // See \"LICENSE\" for details.\n\
  // Basic JavaScript BN library - subset useful for RSA encryption.\n\
  // Bits per digit\n\
  var dbits;\n\
  // JavaScript engine analysis\n\
  var canary = 0xdeadbeefcafe;\n\
  var j_lm = ((canary & 0xffffff) == 0xefcafe);\n\
  // (public) Constructor\n\
  function BigInteger(a, b, c)\n\
  {\n\
    // This test variable can be removed,\n\
    // but at least for performance tests it is useful piece of knowledge\n\
    // This is the only ClipperLib related variable in BigInteger library\n\
    ClipperLib.biginteger_used = 1;\n\
    if (a != null)\n\
      if (\"number\" == typeof a && \"undefined\" == typeof (b)) this.fromInt(a); // faster conversion\n\
      else if (\"number\" == typeof a) this.fromNumber(a, b, c);\n\
    else if (b == null && \"string\" != typeof a) this.fromString(a, 256);\n\
    else this.fromString(a, b);\n\
  }\n\
  // return new, unset BigInteger\n\
  function nbi()\n\
  {\n\
    return new BigInteger(null);\n\
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
  if (j_lm && (navigator_appName == \"Microsoft Internet Explorer\"))\n\
  {\n\
    BigInteger.prototype.am = am2;\n\
    dbits = 30;\n\
  }\n\
  else if (j_lm && (navigator_appName != \"Netscape\"))\n\
  {\n\
    BigInteger.prototype.am = am1;\n\
    dbits = 26;\n\
  }\n\
  else\n\
  { // Mozilla/Netscape seems to prefer am3\n\
    BigInteger.prototype.am = am3;\n\
    dbits = 28;\n\
  }\n\
  BigInteger.prototype.DB = dbits;\n\
  BigInteger.prototype.DM = ((1 << dbits) - 1);\n\
  BigInteger.prototype.DV = (1 << dbits);\n\
  var BI_FP = 52;\n\
  BigInteger.prototype.FV = Math.pow(2, BI_FP);\n\
  BigInteger.prototype.F1 = BI_FP - dbits;\n\
  BigInteger.prototype.F2 = 2 * dbits - BI_FP;\n\
  // Digit conversions\n\
  var BI_RM = \"0123456789abcdefghijklmnopqrstuvwxyz\";\n\
  var BI_RC = new Array();\n\
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
      if (sh == 0)\n\
        this[this.t++] = x;\n\
      else if (sh + k > this.DB)\n\
      {\n\
        this[this.t - 1] |= (x & ((1 << (this.DB - sh)) - 1)) << sh;\n\
        this[this.t++] = (x >> (this.DB - sh));\n\
      }\n\
      else\n\
        this[this.t - 1] |= x << sh;\n\
      sh += k;\n\
      if (sh >= this.DB) sh -= this.DB;\n\
    }\n\
    if (k == 8 && (s[0] & 0x80) != 0)\n\
    {\n\
      this.s = -1;\n\
      if (sh > 0) this[this.t - 1] |= ((1 << (this.DB - sh)) - 1) << sh;\n\
    }\n\
    this.clamp();\n\
    if (mi) BigInteger.ZERO.subTo(this, this);\n\
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
    if (this.s < 0) return \"-\" + this.negate().toString(b);\n\
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
    BigInteger.ZERO.subTo(this, r);\n\
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
    while (--i >= 0)\n\
      if ((r = this[i] - a[i]) != 0) return r;\n\
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
    if (this.s != a.s) BigInteger.ZERO.subTo(r, r);\n\
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
    BigInteger.ONE.dlShiftTo(ys, t);\n\
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
      if (ts != ms) BigInteger.ZERO.subTo(q, q);\n\
    }\n\
    r.t = ys;\n\
    r.clamp();\n\
    if (nsh > 0) r.rShiftTo(nsh, r); // Denormalize remainder\n\
    if (ts < 0) BigInteger.ZERO.subTo(r, r);\n\
  }\n\
  // (public) this mod a\n\
  function bnMod(a)\n\
  {\n\
    var r = nbi();\n\
    this.abs().divRemTo(a, null, r);\n\
    if (this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r, r);\n\
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
    x.abs().dlShiftTo(this.m.t, r);\n\
    r.divRemTo(this.m, null, r);\n\
    if (x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r, r);\n\
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
    if (e > 0xffffffff || e < 1) return BigInteger.ONE;\n\
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
  BigInteger.prototype.copyTo = bnpCopyTo;\n\
  BigInteger.prototype.fromInt = bnpFromInt;\n\
  BigInteger.prototype.fromString = bnpFromString;\n\
  BigInteger.prototype.clamp = bnpClamp;\n\
  BigInteger.prototype.dlShiftTo = bnpDLShiftTo;\n\
  BigInteger.prototype.drShiftTo = bnpDRShiftTo;\n\
  BigInteger.prototype.lShiftTo = bnpLShiftTo;\n\
  BigInteger.prototype.rShiftTo = bnpRShiftTo;\n\
  BigInteger.prototype.subTo = bnpSubTo;\n\
  BigInteger.prototype.multiplyTo = bnpMultiplyTo;\n\
  BigInteger.prototype.squareTo = bnpSquareTo;\n\
  BigInteger.prototype.divRemTo = bnpDivRemTo;\n\
  BigInteger.prototype.invDigit = bnpInvDigit;\n\
  BigInteger.prototype.isEven = bnpIsEven;\n\
  BigInteger.prototype.exp = bnpExp;\n\
  // public\n\
  BigInteger.prototype.toString = bnToString;\n\
  BigInteger.prototype.negate = bnNegate;\n\
  BigInteger.prototype.abs = bnAbs;\n\
  BigInteger.prototype.compareTo = bnCompareTo;\n\
  BigInteger.prototype.bitLength = bnBitLength;\n\
  BigInteger.prototype.mod = bnMod;\n\
  BigInteger.prototype.modPowInt = bnModPowInt;\n\
  // \"constants\"\n\
  BigInteger.ZERO = nbv(0);\n\
  BigInteger.ONE = nbv(1);\n\
  // Copyright (c) 2005-2009  Tom Wu\n\
  // All Rights Reserved.\n\
  // See \"LICENSE\" for details.\n\
  // Extended JavaScript BN functions, required for RSA private ops.\n\
  // Version 1.1: new BigInteger(\"0\", 10) returns \"proper\" zero\n\
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
      r = (a + z.intValue()).toString(b).substr(1) + r;\n\
      y.divRemTo(d, y, z);\n\
    }\n\
    return z.intValue().toString(b) + r;\n\
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
    if (mi) BigInteger.ZERO.subTo(this, this);\n\
  }\n\
  // (protected) alternate constructor\n\
  function bnpFromNumber(a, b, c)\n\
  {\n\
    if (\"number\" == typeof b)\n\
    {\n\
      // new BigInteger(int,int,RNG)\n\
      if (a < 2) this.fromInt(1);\n\
      else\n\
      {\n\
        this.fromNumber(a, c);\n\
        if (!this.testBit(a - 1)) // force MSB set\n\
          this.bitwiseTo(BigInteger.ONE.shiftLeft(a - 1), op_or, this);\n\
        if (this.isEven()) this.dAddOffset(1, 0); // force odd\n\
        while (!this.isProbablePrime(b))\n\
        {\n\
          this.dAddOffset(2, 0);\n\
          if (this.bitLength() > a) this.subTo(BigInteger.ONE.shiftLeft(a - 1), this);\n\
        }\n\
      }\n\
    }\n\
    else\n\
    {\n\
      // new BigInteger(int,RNG)\n\
      var x = new Array(),\n\
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
      r = new Array();\n\
    r[0] = this.s;\n\
    var p = this.DB - (i * this.DB) % 8,\n\
      d, k = 0;\n\
    if (i-- > 0)\n\
    {\n\
      if (p < this.DB && (d = this[i] >> p) != (this.s & this.DM) >> p)\n\
        r[k++] = d | (this.s << (this.DB - p));\n\
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
    var r = BigInteger.ONE.shiftLeft(n);\n\
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
    BigInteger.ONE.dlShiftTo(2 * m.t, this.r2);\n\
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
    if (i < 8)\n\
      z = new Classic(m);\n\
    else if (m.isEven())\n\
      z = new Barrett(m);\n\
    else\n\
      z = new Montgomery(m);\n\
    // precomputation\n\
    var g = new Array(),\n\
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
    if (this.t > 0)\n\
      if (d == 0) r = this[0] % n;\n\
      else\n\
        for (var i = this.t - 1; i >= 0; --i) r = (d * r + this[i]) % n;\n\
    return r;\n\
  }\n\
  // (public) 1/this % m (HAC 14.61)\n\
  function bnModInverse(m)\n\
  {\n\
    var ac = m.isEven();\n\
    if ((this.isEven() && ac) || m.signum() == 0) return BigInteger.ZERO;\n\
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
    if (v.compareTo(BigInteger.ONE) != 0) return BigInteger.ZERO;\n\
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
      while (i < j)\n\
        if (m % lowprimes[i++] == 0) return false;\n\
    }\n\
    return x.millerRabin(t);\n\
  }\n\
  // (protected) true if probably prime (HAC 4.24, Miller-Rabin)\n\
  function bnpMillerRabin(t)\n\
  {\n\
    var n1 = this.subtract(BigInteger.ONE);\n\
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
      if (y.compareTo(BigInteger.ONE) != 0 && y.compareTo(n1) != 0)\n\
      {\n\
        var j = 1;\n\
        while (j++ < k && y.compareTo(n1) != 0)\n\
        {\n\
          y = y.modPowInt(2, this);\n\
          if (y.compareTo(BigInteger.ONE) == 0) return false;\n\
        }\n\
        if (y.compareTo(n1) != 0) return false;\n\
      }\n\
    }\n\
    return true;\n\
  }\n\
  // protected\n\
  BigInteger.prototype.chunkSize = bnpChunkSize;\n\
  BigInteger.prototype.toRadix = bnpToRadix;\n\
  BigInteger.prototype.fromRadix = bnpFromRadix;\n\
  BigInteger.prototype.fromNumber = bnpFromNumber;\n\
  BigInteger.prototype.bitwiseTo = bnpBitwiseTo;\n\
  BigInteger.prototype.changeBit = bnpChangeBit;\n\
  BigInteger.prototype.addTo = bnpAddTo;\n\
  BigInteger.prototype.dMultiply = bnpDMultiply;\n\
  BigInteger.prototype.dAddOffset = bnpDAddOffset;\n\
  BigInteger.prototype.multiplyLowerTo = bnpMultiplyLowerTo;\n\
  BigInteger.prototype.multiplyUpperTo = bnpMultiplyUpperTo;\n\
  BigInteger.prototype.modInt = bnpModInt;\n\
  BigInteger.prototype.millerRabin = bnpMillerRabin;\n\
  // public\n\
  BigInteger.prototype.clone = bnClone;\n\
  BigInteger.prototype.intValue = bnIntValue;\n\
  BigInteger.prototype.byteValue = bnByteValue;\n\
  BigInteger.prototype.shortValue = bnShortValue;\n\
  BigInteger.prototype.signum = bnSigNum;\n\
  BigInteger.prototype.toByteArray = bnToByteArray;\n\
  BigInteger.prototype.equals = bnEquals;\n\
  BigInteger.prototype.min = bnMin;\n\
  BigInteger.prototype.max = bnMax;\n\
  BigInteger.prototype.and = bnAnd;\n\
  BigInteger.prototype.or = bnOr;\n\
  BigInteger.prototype.xor = bnXor;\n\
  BigInteger.prototype.andNot = bnAndNot;\n\
  BigInteger.prototype.not = bnNot;\n\
  BigInteger.prototype.shiftLeft = bnShiftLeft;\n\
  BigInteger.prototype.shiftRight = bnShiftRight;\n\
  BigInteger.prototype.getLowestSetBit = bnGetLowestSetBit;\n\
  BigInteger.prototype.bitCount = bnBitCount;\n\
  BigInteger.prototype.testBit = bnTestBit;\n\
  BigInteger.prototype.setBit = bnSetBit;\n\
  BigInteger.prototype.clearBit = bnClearBit;\n\
  BigInteger.prototype.flipBit = bnFlipBit;\n\
  BigInteger.prototype.add = bnAdd;\n\
  BigInteger.prototype.subtract = bnSubtract;\n\
  BigInteger.prototype.multiply = bnMultiply;\n\
  BigInteger.prototype.divide = bnDivide;\n\
  BigInteger.prototype.remainder = bnRemainder;\n\
  BigInteger.prototype.divideAndRemainder = bnDivideAndRemainder;\n\
  BigInteger.prototype.modPow = bnModPow;\n\
  BigInteger.prototype.modInverse = bnModInverse;\n\
  BigInteger.prototype.pow = bnPow;\n\
  BigInteger.prototype.gcd = bnGCD;\n\
  BigInteger.prototype.isProbablePrime = bnIsProbablePrime;\n\
  // JSBN-specific extension\n\
  BigInteger.prototype.square = bnSquare;\n\
  var Int128 = BigInteger;\n\
  // BigInteger interfaces not implemented in jsbn:\n\
  // BigInteger(int signum, byte[] magnitude)\n\
  // double doubleValue()\n\
  // float floatValue()\n\
  // int hashCode()\n\
  // long longValue()\n\
  // static BigInteger valueOf(long val)\n\
  // Helper functions to make BigInteger functions callable with two parameters\n\
  // as in original C# Clipper\n\
  Int128.prototype.IsNegative = function ()\n\
  {\n\
    if (this.compareTo(Int128.ZERO) == -1) return true;\n\
    else return false;\n\
  };\n\
  Int128.op_Equality = function (val1, val2)\n\
  {\n\
    if (val1.compareTo(val2) == 0) return true;\n\
    else return false;\n\
  };\n\
  Int128.op_Inequality = function (val1, val2)\n\
  {\n\
    if (val1.compareTo(val2) != 0) return true;\n\
    else return false;\n\
  };\n\
  Int128.op_GreaterThan = function (val1, val2)\n\
  {\n\
    if (val1.compareTo(val2) > 0) return true;\n\
    else return false;\n\
  };\n\
  Int128.op_LessThan = function (val1, val2)\n\
  {\n\
    if (val1.compareTo(val2) < 0) return true;\n\
    else return false;\n\
  };\n\
  Int128.op_Addition = function (lhs, rhs)\n\
  {\n\
    return new Int128(lhs).add(new Int128(rhs));\n\
  };\n\
  Int128.op_Subtraction = function (lhs, rhs)\n\
  {\n\
    return new Int128(lhs).subtract(new Int128(rhs));\n\
  };\n\
  Int128.Int128Mul = function (lhs, rhs)\n\
  {\n\
    return new Int128(lhs).multiply(new Int128(rhs));\n\
  };\n\
  Int128.op_Division = function (lhs, rhs)\n\
  {\n\
    return lhs.divide(rhs);\n\
  };\n\
  Int128.prototype.ToDouble = function ()\n\
  {\n\
    return parseFloat(this.toString()); // This could be something faster\n\
  };\n\
  // end of Int128 section\n\
  /*\n\
  // Uncomment the following two lines if you want to use Int128 outside ClipperLib\n\
  if (typeof(document) !== \"undefined\") window.Int128 = Int128;\n\
  else self.Int128 = Int128;\n\
  */\n\
  // ---------------------------------------------  \n\
  // Here starts the actual Clipper library:\n\
  // Helper function to support Inheritance in Javascript\n\
  if (typeof (Inherit) == 'undefined')\n\
  {\n\
    var Inherit = function (ce, ce2)\n\
    {\n\
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
    };\n\
  }\n\
  ClipperLib.Path = function ()\n\
  {\n\
    return [];\n\
  };\n\
  ClipperLib.Paths = function ()\n\
  {\n\
    return []; // Was previously [[]], but caused problems when pushed\n\
  };\n\
  // Preserves the calling way of original C# Clipper\n\
  // Is essential due to compatibility, because DoublePoint is public class in original C# version\n\
  ClipperLib.DoublePoint = function ()\n\
  {\n\
    var a = arguments;\n\
    this.X = 0;\n\
    this.Y = 0;\n\
    // public DoublePoint(DoublePoint dp)\n\
    // public DoublePoint(IntPoint ip)\n\
    if (a.length == 1)\n\
    {\n\
      this.X = a[0].X;\n\
      this.Y = a[0].Y;\n\
    }\n\
    else if (a.length == 2)\n\
    {\n\
      this.X = a[0];\n\
      this.Y = a[1];\n\
    }\n\
  }; // This is internal faster function when called without arguments\n\
  ClipperLib.DoublePoint0 = function ()\n\
  {\n\
    this.X = 0;\n\
    this.Y = 0;\n\
  };\n\
  // This is internal faster function when called with 1 argument (dp or ip)\n\
  ClipperLib.DoublePoint1 = function (dp)\n\
  {\n\
    this.X = dp.X;\n\
    this.Y = dp.Y;\n\
  };\n\
  // This is internal faster function when called with 2 arguments (x and y)\n\
  ClipperLib.DoublePoint2 = function (x, y)\n\
  {\n\
    this.X = x;\n\
    this.Y = y;\n\
  };\n\
  // PolyTree & PolyNode start\n\
  // -------------------------------\n\
  ClipperLib.PolyNode = function ()\n\
  {\n\
    this.m_Parent = null;\n\
    this.m_polygon = new ClipperLib.Path();\n\
    this.m_Index = 0;\n\
    this.m_jointype = 0;\n\
    this.m_endtype = 0;\n\
    this.m_Childs = [];\n\
    this.IsOpen = false;\n\
  };\n\
  ClipperLib.PolyNode.prototype.IsHoleNode = function ()\n\
  {\n\
    var result = true;\n\
    var node = this.m_Parent;\n\
    while (node !== null)\n\
    {\n\
      result = !result;\n\
      node = node.m_Parent;\n\
    }\n\
    return result;\n\
  };\n\
  ClipperLib.PolyNode.prototype.ChildCount = function ()\n\
  {\n\
    return this.m_Childs.length;\n\
  };\n\
  ClipperLib.PolyNode.prototype.Contour = function ()\n\
  {\n\
    return this.m_polygon;\n\
  };\n\
  ClipperLib.PolyNode.prototype.AddChild = function (Child)\n\
  {\n\
    var cnt = this.m_Childs.length;\n\
    this.m_Childs.push(Child);\n\
    Child.m_Parent = this;\n\
    Child.m_Index = cnt;\n\
  };\n\
  ClipperLib.PolyNode.prototype.GetNext = function ()\n\
  {\n\
    if (this.m_Childs.length > 0)\n\
      return this.m_Childs[0];\n\
    else\n\
      return this.GetNextSiblingUp();\n\
  };\n\
  ClipperLib.PolyNode.prototype.GetNextSiblingUp = function ()\n\
  {\n\
    if (this.m_Parent === null)\n\
      return null;\n\
    else if (this.m_Index == this.m_Parent.m_Childs.length - 1)\n\
      return this.m_Parent.GetNextSiblingUp();\n\
    else\n\
      return this.m_Parent.m_Childs[this.m_Index + 1];\n\
  };\n\
  ClipperLib.PolyNode.prototype.Childs = function ()\n\
  {\n\
    return this.m_Childs;\n\
  };\n\
  ClipperLib.PolyNode.prototype.Parent = function ()\n\
  {\n\
    return this.m_Parent;\n\
  };\n\
  ClipperLib.PolyNode.prototype.IsHole = function ()\n\
  {\n\
    return this.IsHoleNode();\n\
  };\n\
  // PolyTree : PolyNode\n\
  ClipperLib.PolyTree = function ()\n\
  {\n\
    this.m_AllPolys = [];\n\
    ClipperLib.PolyNode.call(this);\n\
  };\n\
  ClipperLib.PolyTree.prototype.Clear = function ()\n\
  {\n\
    for (var i = 0, ilen = this.m_AllPolys.length; i < ilen; i++)\n\
      this.m_AllPolys[i] = null;\n\
    this.m_AllPolys.length = 0;\n\
    this.m_Childs.length = 0;\n\
  };\n\
  ClipperLib.PolyTree.prototype.GetFirst = function ()\n\
  {\n\
    if (this.m_Childs.length > 0)\n\
      return this.m_Childs[0];\n\
    else\n\
      return null;\n\
  };\n\
  ClipperLib.PolyTree.prototype.Total = function ()\n\
  {\n\
    return this.m_AllPolys.length;\n\
  };\n\
  Inherit(ClipperLib.PolyTree, ClipperLib.PolyNode);\n\
  // -------------------------------\n\
  // PolyTree & PolyNode end\n\
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
  if (browser.msie || browser.opera || browser.safari) ClipperLib.Cast_Int32 = function (a)\n\
  {\n\
    return a | 0;\n\
  };\n\
  else ClipperLib.Cast_Int32 = function (a)\n\
  { // eg. browser.chrome || browser.chromium || browser.firefox\n\
    return~~ a;\n\
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
  if (browser.chrome) ClipperLib.Cast_Int64 = function (a)\n\
  {\n\
    if (a < -2147483648 || a > 2147483647)\n\
      return a < 0 ? Math.ceil(a) : Math.floor(a);\n\
    else return~~ a;\n\
  };\n\
  else if (browser.firefox && typeof (Number.toInteger) == \"function\") ClipperLib.Cast_Int64 = function (a)\n\
  {\n\
    return Number.toInteger(a);\n\
  };\n\
  else if (browser.msie7 || browser.msie8) ClipperLib.Cast_Int64 = function (a)\n\
  {\n\
    return parseInt(a, 10);\n\
  };\n\
  else if (browser.msie) ClipperLib.Cast_Int64 = function (a)\n\
  {\n\
    if (a < -2147483648 || a > 2147483647)\n\
      return a < 0 ? Math.ceil(a) : Math.floor(a);\n\
    return a | 0;\n\
  };\n\
  // eg. browser.chromium || browser.firefox || browser.opera || browser.safari\n\
  else ClipperLib.Cast_Int64 = function (a)\n\
  {\n\
    return a < 0 ? Math.ceil(a) : Math.floor(a);\n\
  };\n\
  ClipperLib.Clear = function (a)\n\
  {\n\
    a.length = 0;\n\
  };\n\
  //ClipperLib.MaxSteps = 64; // How many steps at maximum in arc in BuildArc() function\n\
  ClipperLib.PI = 3.141592653589793;\n\
  ClipperLib.PI2 = 2 * 3.141592653589793;\n\
  ClipperLib.IntPoint = function ()\n\
  {\n\
    var a = arguments,\n\
      alen = a.length;\n\
    this.X = 0;\n\
    this.Y = 0;\n\
    if (use_xyz)\n\
    {\n\
      this.Z = 0;\n\
      if (alen == 3) // public IntPoint(cInt x, cInt y, cInt z = 0)\n\
      {\n\
        this.X = a[0];\n\
        this.Y = a[1];\n\
        this.Z = a[2];\n\
      }\n\
      else if (alen == 2) // public IntPoint(cInt x, cInt y)\n\
      {\n\
        this.X = a[0];\n\
        this.Y = a[1];\n\
        this.Z = 0;\n\
      }\n\
      else if (alen == 1)\n\
      {\n\
        if (a[0] instanceof ClipperLib.DoublePoint) // public IntPoint(DoublePoint dp)\n\
        {\n\
          var dp = a[0];\n\
          this.X = ClipperLib.Clipper.Round(dp.X);\n\
          this.Y = ClipperLib.Clipper.Round(dp.Y);\n\
          this.Z = 0;\n\
        }\n\
        else // public IntPoint(IntPoint pt)\n\
        {\n\
          var pt = a[0];\n\
          if (typeof (pt.Z) == \"undefined\") pt.Z = 0;\n\
          this.X = pt.X;\n\
          this.Y = pt.Y;\n\
          this.Z = pt.Z;\n\
        }\n\
      }\n\
      else // public IntPoint()\n\
      {\n\
        this.X = 0;\n\
        this.Y = 0;\n\
        this.Z = 0;\n\
      }\n\
    }\n\
    else // if (!use_xyz)\n\
    {\n\
      if (alen == 2) // public IntPoint(cInt X, cInt Y)\n\
      {\n\
        this.X = a[0];\n\
        this.Y = a[1];\n\
      }\n\
      else if (alen == 1)\n\
      {\n\
        if (a[0] instanceof ClipperLib.DoublePoint) // public IntPoint(DoublePoint dp)\n\
        {\n\
          var dp = a[0];\n\
          this.X = ClipperLib.Clipper.Round(dp.X);\n\
          this.Y = ClipperLib.Clipper.Round(dp.Y);\n\
        }\n\
        else // public IntPoint(IntPoint pt)\n\
        {\n\
          var pt = a[0];\n\
          this.X = pt.X;\n\
          this.Y = pt.Y;\n\
        }\n\
      }\n\
      else // public IntPoint(IntPoint pt)\n\
      {\n\
        this.X = 0;\n\
        this.Y = 0;\n\
      }\n\
    }\n\
  };\n\
  ClipperLib.IntPoint.op_Equality = function (a, b)\n\
  {\n\
    //return a == b;\n\
    return a.X == b.X && a.Y == b.Y;\n\
  };\n\
  ClipperLib.IntPoint.op_Inequality = function (a, b)\n\
  {\n\
    //return a != b;\n\
    return a.X != b.X || a.Y != b.Y;\n\
  };\n\
  /*\n\
  ClipperLib.IntPoint.prototype.Equals = function (obj)\n\
  {\n\
    if (obj === null)\n\
        return false;\n\
    if (obj instanceof ClipperLib.IntPoint)\n\
    {\n\
        var a = Cast(obj, ClipperLib.IntPoint);\n\
        return (this.X == a.X) && (this.Y == a.Y);\n\
    }\n\
    else\n\
        return false;\n\
  };\n\
*/\n\
  if (use_xyz)\n\
  {\n\
    ClipperLib.IntPoint0 = function ()\n\
    {\n\
      this.X = 0;\n\
      this.Y = 0;\n\
      this.Z = 0;\n\
    };\n\
    ClipperLib.IntPoint1 = function (pt)\n\
    {\n\
      this.X = pt.X;\n\
      this.Y = pt.Y;\n\
      this.Z = pt.Z;\n\
    };\n\
    ClipperLib.IntPoint1dp = function (dp)\n\
    {\n\
      this.X = ClipperLib.Clipper.Round(dp.X);\n\
      this.Y = ClipperLib.Clipper.Round(dp.Y);\n\
      this.Z = 0;\n\
    };\n\
    ClipperLib.IntPoint2 = function (x, y)\n\
    {\n\
      this.X = x;\n\
      this.Y = y;\n\
      this.Z = 0;\n\
    };\n\
    ClipperLib.IntPoint3 = function (x, y, z)\n\
    {\n\
      this.X = x;\n\
      this.Y = y;\n\
      this.Z = z;\n\
    };\n\
  }\n\
  else // if (!use_xyz)\n\
  {\n\
    ClipperLib.IntPoint0 = function ()\n\
    {\n\
      this.X = 0;\n\
      this.Y = 0;\n\
    };\n\
    ClipperLib.IntPoint1 = function (pt)\n\
    {\n\
      this.X = pt.X;\n\
      this.Y = pt.Y;\n\
    };\n\
    ClipperLib.IntPoint1dp = function (dp)\n\
    {\n\
      this.X = ClipperLib.Clipper.Round(dp.X);\n\
      this.Y = ClipperLib.Clipper.Round(dp.Y);\n\
    };\n\
    ClipperLib.IntPoint2 = function (x, y)\n\
    {\n\
      this.X = x;\n\
      this.Y = y;\n\
    };\n\
  }\n\
  ClipperLib.IntRect = function ()\n\
  {\n\
    var a = arguments,\n\
      alen = a.length;\n\
    if (alen == 4) // function (l, t, r, b)\n\
    {\n\
      this.left = a[0];\n\
      this.top = a[1];\n\
      this.right = a[2];\n\
      this.bottom = a[3];\n\
    }\n\
    else if (alen == 1) // function (ir)\n\
    {\n\
      this.left = ir.left;\n\
      this.top = ir.top;\n\
      this.right = ir.right;\n\
      this.bottom = ir.bottom;\n\
    }\n\
    else // function ()\n\
    {\n\
      this.left = 0;\n\
      this.top = 0;\n\
      this.right = 0;\n\
      this.bottom = 0;\n\
    }\n\
  };\n\
  ClipperLib.IntRect0 = function ()\n\
  {\n\
    this.left = 0;\n\
    this.top = 0;\n\
    this.right = 0;\n\
    this.bottom = 0;\n\
  };\n\
  ClipperLib.IntRect1 = function (ir)\n\
  {\n\
    this.left = ir.left;\n\
    this.top = ir.top;\n\
    this.right = ir.right;\n\
    this.bottom = ir.bottom;\n\
  };\n\
  ClipperLib.IntRect4 = function (l, t, r, b)\n\
  {\n\
    this.left = l;\n\
    this.top = t;\n\
    this.right = r;\n\
    this.bottom = b;\n\
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
  ClipperLib.EndType = {\n\
    etOpenSquare: 0,\n\
    etOpenRound: 1,\n\
    etOpenButt: 2,\n\
    etClosedLine: 3,\n\
    etClosedPolygon: 4\n\
  };\n\
  if (use_deprecated)\n\
    ClipperLib.EndType_ = {\n\
      etSquare: 0,\n\
      etRound: 1,\n\
      etButt: 2,\n\
      etClosed: 3\n\
    };\n\
  ClipperLib.EdgeSide = {\n\
    esLeft: 0,\n\
    esRight: 1\n\
  };\n\
  ClipperLib.Direction = {\n\
    dRightToLeft: 0,\n\
    dLeftToRight: 1\n\
  };\n\
  ClipperLib.TEdge = function ()\n\
  {\n\
    this.Bot = new ClipperLib.IntPoint();\n\
    this.Curr = new ClipperLib.IntPoint();\n\
    this.Top = new ClipperLib.IntPoint();\n\
    this.Delta = new ClipperLib.IntPoint();\n\
    this.Dx = 0;\n\
    this.PolyTyp = ClipperLib.PolyType.ptSubject;\n\
    this.Side = ClipperLib.EdgeSide.esLeft;\n\
    this.WindDelta = 0;\n\
    this.WindCnt = 0;\n\
    this.WindCnt2 = 0;\n\
    this.OutIdx = 0;\n\
    this.Next = null;\n\
    this.Prev = null;\n\
    this.NextInLML = null;\n\
    this.NextInAEL = null;\n\
    this.PrevInAEL = null;\n\
    this.NextInSEL = null;\n\
    this.PrevInSEL = null;\n\
  };\n\
  ClipperLib.IntersectNode = function ()\n\
  {\n\
    this.Edge1 = null;\n\
    this.Edge2 = null;\n\
    this.Pt = new ClipperLib.IntPoint();\n\
  };\n\
  ClipperLib.MyIntersectNodeSort = function () {};\n\
  ClipperLib.MyIntersectNodeSort.Compare = function (node1, node2)\n\
  {\n\
    return (node2.Pt.Y - node1.Pt.Y);\n\
  };\n\
  ClipperLib.LocalMinima = function ()\n\
  {\n\
    this.Y = 0;\n\
    this.LeftBound = null;\n\
    this.RightBound = null;\n\
    this.Next = null;\n\
  };\n\
  ClipperLib.Scanbeam = function ()\n\
  {\n\
    this.Y = 0;\n\
    this.Next = null;\n\
  };\n\
  ClipperLib.OutRec = function ()\n\
  {\n\
    this.Idx = 0;\n\
    this.IsHole = false;\n\
    this.IsOpen = false;\n\
    this.FirstLeft = null;\n\
    this.Pts = null;\n\
    this.BottomPt = null;\n\
    this.PolyNode = null;\n\
  };\n\
  ClipperLib.OutPt = function ()\n\
  {\n\
    this.Idx = 0;\n\
    this.Pt = new ClipperLib.IntPoint();\n\
    this.Next = null;\n\
    this.Prev = null;\n\
  };\n\
  ClipperLib.Join = function ()\n\
  {\n\
    this.OutPt1 = null;\n\
    this.OutPt2 = null;\n\
    this.OffPt = new ClipperLib.IntPoint();\n\
  };\n\
  ClipperLib.ClipperBase = function ()\n\
  {\n\
    this.m_MinimaList = null;\n\
    this.m_CurrentLM = null;\n\
    this.m_edges = new Array();\n\
    this.m_UseFullRange = false;\n\
    this.m_HasOpenPaths = false;\n\
    this.PreserveCollinear = false;\n\
    this.m_MinimaList = null;\n\
    this.m_CurrentLM = null;\n\
    this.m_UseFullRange = false;\n\
    this.m_HasOpenPaths = false;\n\
  };\n\
  // Ranges are in original C# too high for Javascript (in current state 2013 september):\n\
  // protected const double horizontal = -3.4E+38;\n\
  // internal const cInt loRange = 0x3FFFFFFF; // = 1073741823 = sqrt(2^63 -1)/2\n\
  // internal const cInt hiRange = 0x3FFFFFFFFFFFFFFFL; // = 4611686018427387903 = sqrt(2^127 -1)/2\n\
  // So had to adjust them to more suitable for Javascript.\n\
  // If JS some day supports truly 64-bit integers, then these ranges can be as in C#\n\
  // and biginteger library can be more simpler (as then 128bit can be represented as two 64bit numbers)\n\
  ClipperLib.ClipperBase.horizontal = -9007199254740992; //-2^53\n\
  ClipperLib.ClipperBase.Skip = -2;\n\
  ClipperLib.ClipperBase.Unassigned = -1;\n\
  ClipperLib.ClipperBase.tolerance = 1E-20;\n\
  if (use_int32)\n\
  {\n\
    ClipperLib.ClipperBase.loRange = 46340;\n\
    ClipperLib.ClipperBase.hiRange = 46340;\n\
  }\n\
  else\n\
  {\n\
    ClipperLib.ClipperBase.loRange = 47453132; // sqrt(2^53 -1)/2\n\
    ClipperLib.ClipperBase.hiRange = 4503599627370495; // sqrt(2^106 -1)/2\n\
  }\n\
  ClipperLib.ClipperBase.near_zero = function (val)\n\
  {\n\
    return (val > -ClipperLib.ClipperBase.tolerance) && (val < ClipperLib.ClipperBase.tolerance);\n\
  };\n\
  ClipperLib.ClipperBase.IsHorizontal = function (e)\n\
  {\n\
    return e.Delta.Y === 0;\n\
  };\n\
  ClipperLib.ClipperBase.prototype.PointIsVertex = function (pt, pp)\n\
  {\n\
    var pp2 = pp;\n\
    do {\n\
      if (ClipperLib.IntPoint.op_Equality(pp2.Pt, pt))\n\
        return true;\n\
      pp2 = pp2.Next;\n\
    }\n\
    while (pp2 != pp)\n\
    return false;\n\
  };\n\
  ClipperLib.ClipperBase.prototype.PointOnLineSegment = function (pt, linePt1, linePt2, UseFullRange)\n\
  {\n\
    if (UseFullRange)\n\
      return ((pt.X == linePt1.X) && (pt.Y == linePt1.Y)) ||\n\
        ((pt.X == linePt2.X) && (pt.Y == linePt2.Y)) ||\n\
        (((pt.X > linePt1.X) == (pt.X < linePt2.X)) &&\n\
        ((pt.Y > linePt1.Y) == (pt.Y < linePt2.Y)) &&\n\
        (Int128.op_Equality(Int128.Int128Mul((pt.X - linePt1.X), (linePt2.Y - linePt1.Y)),\n\
          Int128.Int128Mul((linePt2.X - linePt1.X), (pt.Y - linePt1.Y)))));\n\
    else\n\
      return ((pt.X == linePt1.X) && (pt.Y == linePt1.Y)) || ((pt.X == linePt2.X) && (pt.Y == linePt2.Y)) || (((pt.X > linePt1.X) == (pt.X < linePt2.X)) && ((pt.Y > linePt1.Y) == (pt.Y < linePt2.Y)) && ((pt.X - linePt1.X) * (linePt2.Y - linePt1.Y) == (linePt2.X - linePt1.X) * (pt.Y - linePt1.Y)));\n\
  };\n\
  ClipperLib.ClipperBase.prototype.PointOnPolygon = function (pt, pp, UseFullRange)\n\
  {\n\
    var pp2 = pp;\n\
    while (true)\n\
    {\n\
      if (this.PointOnLineSegment(pt, pp2.Pt, pp2.Next.Pt, UseFullRange))\n\
        return true;\n\
      pp2 = pp2.Next;\n\
      if (pp2 == pp)\n\
        break;\n\
    }\n\
    return false;\n\
  };\n\
  ClipperLib.ClipperBase.prototype.SlopesEqual = ClipperLib.ClipperBase.SlopesEqual = function ()\n\
  {\n\
    var a = arguments,\n\
      alen = a.length;\n\
    var e1, e2, pt1, pt2, pt3, pt4, UseFullRange;\n\
    if (alen == 3) // function (e1, e2, UseFullRange)\n\
    {\n\
      e1 = a[0];\n\
      e2 = a[1];\n\
      UseFullRange = a[2];\n\
      if (UseFullRange)\n\
        return Int128.op_Equality(Int128.Int128Mul(e1.Delta.Y, e2.Delta.X), Int128.Int128Mul(e1.Delta.X, e2.Delta.Y));\n\
      else\n\
        return ClipperLib.Cast_Int64((e1.Delta.Y) * (e2.Delta.X)) == ClipperLib.Cast_Int64((e1.Delta.X) * (e2.Delta.Y));\n\
    }\n\
    else if (alen == 4) // function (pt1, pt2, pt3, UseFullRange)\n\
    {\n\
      pt1 = a[0];\n\
      pt2 = a[1];\n\
      pt3 = a[2];\n\
      UseFullRange = a[3];\n\
      if (UseFullRange)\n\
        return Int128.op_Equality(Int128.Int128Mul(pt1.Y - pt2.Y, pt2.X - pt3.X), Int128.Int128Mul(pt1.X - pt2.X, pt2.Y - pt3.Y));\n\
      else\n\
        return ClipperLib.Cast_Int64((pt1.Y - pt2.Y) * (pt2.X - pt3.X)) - ClipperLib.Cast_Int64((pt1.X - pt2.X) * (pt2.Y - pt3.Y)) === 0;\n\
    }\n\
    else // function (pt1, pt2, pt3, pt4, UseFullRange)\n\
    {\n\
      pt1 = a[0];\n\
      pt2 = a[1];\n\
      pt3 = a[2];\n\
      pt4 = a[3];\n\
      UseFullRange = a[4];\n\
      if (UseFullRange)\n\
        return Int128.op_Equality(Int128.Int128Mul(pt1.Y - pt2.Y, pt3.X - pt4.X), Int128.Int128Mul(pt1.X - pt2.X, pt3.Y - pt4.Y));\n\
      else\n\
        return ClipperLib.Cast_Int64((pt1.Y - pt2.Y) * (pt3.X - pt4.X)) - ClipperLib.Cast_Int64((pt1.X - pt2.X) * (pt3.Y - pt4.Y)) === 0;\n\
    }\n\
  };\n\
  ClipperLib.ClipperBase.SlopesEqual3 = function (e1, e2, UseFullRange)\n\
  {\n\
    if (UseFullRange)\n\
      return Int128.op_Equality(Int128.Int128Mul(e1.Delta.Y, e2.Delta.X), Int128.Int128Mul(e1.Delta.X, e2.Delta.Y));\n\
    else\n\
      return ClipperLib.Cast_Int64((e1.Delta.Y) * (e2.Delta.X)) == ClipperLib.Cast_Int64((e1.Delta.X) * (e2.Delta.Y));\n\
  };\n\
  ClipperLib.ClipperBase.SlopesEqual4 = function (pt1, pt2, pt3, UseFullRange)\n\
  {\n\
    if (UseFullRange)\n\
      return Int128.op_Equality(Int128.Int128Mul(pt1.Y - pt2.Y, pt2.X - pt3.X), Int128.Int128Mul(pt1.X - pt2.X, pt2.Y - pt3.Y));\n\
    else\n\
      return ClipperLib.Cast_Int64((pt1.Y - pt2.Y) * (pt2.X - pt3.X)) - ClipperLib.Cast_Int64((pt1.X - pt2.X) * (pt2.Y - pt3.Y)) === 0;\n\
  };\n\
  ClipperLib.ClipperBase.SlopesEqual5 = function (pt1, pt2, pt3, pt4, UseFullRange)\n\
  {\n\
    if (UseFullRange)\n\
      return Int128.op_Equality(Int128.Int128Mul(pt1.Y - pt2.Y, pt3.X - pt4.X), Int128.Int128Mul(pt1.X - pt2.X, pt3.Y - pt4.Y));\n\
    else\n\
      return ClipperLib.Cast_Int64((pt1.Y - pt2.Y) * (pt3.X - pt4.X)) - ClipperLib.Cast_Int64((pt1.X - pt2.X) * (pt3.Y - pt4.Y)) === 0;\n\
  };\n\
  ClipperLib.ClipperBase.prototype.Clear = function ()\n\
  {\n\
    this.DisposeLocalMinimaList();\n\
    for (var i = 0, ilen = this.m_edges.length; i < ilen; ++i)\n\
    {\n\
      for (var j = 0, jlen = this.m_edges[i].length; j < jlen; ++j)\n\
        this.m_edges[i][j] = null;\n\
      ClipperLib.Clear(this.m_edges[i]);\n\
    }\n\
    ClipperLib.Clear(this.m_edges);\n\
    this.m_UseFullRange = false;\n\
    this.m_HasOpenPaths = false;\n\
  };\n\
  ClipperLib.ClipperBase.prototype.DisposeLocalMinimaList = function ()\n\
  {\n\
    while (this.m_MinimaList !== null)\n\
    {\n\
      var tmpLm = this.m_MinimaList.Next;\n\
      this.m_MinimaList = null;\n\
      this.m_MinimaList = tmpLm;\n\
    }\n\
    this.m_CurrentLM = null;\n\
  };\n\
  ClipperLib.ClipperBase.prototype.RangeTest = function (Pt, useFullRange)\n\
  {\n\
    if (useFullRange.Value)\n\
    {\n\
      if (Pt.X > ClipperLib.ClipperBase.hiRange || Pt.Y > ClipperLib.ClipperBase.hiRange || -Pt.X > ClipperLib.ClipperBase.hiRange || -Pt.Y > ClipperLib.ClipperBase.hiRange)\n\
        ClipperLib.Error(\"Coordinate outside allowed range in RangeTest().\");\n\
    }\n\
    else if (Pt.X > ClipperLib.ClipperBase.loRange || Pt.Y > ClipperLib.ClipperBase.loRange || -Pt.X > ClipperLib.ClipperBase.loRange || -Pt.Y > ClipperLib.ClipperBase.loRange)\n\
    {\n\
      useFullRange.Value = true;\n\
      this.RangeTest(Pt, useFullRange);\n\
    }\n\
  };\n\
  ClipperLib.ClipperBase.prototype.InitEdge = function (e, eNext, ePrev, pt)\n\
  {\n\
    e.Next = eNext;\n\
    e.Prev = ePrev;\n\
    //e.Curr = pt;\n\
    e.Curr.X = pt.X;\n\
    e.Curr.Y = pt.Y;\n\
    e.OutIdx = -1;\n\
  };\n\
  ClipperLib.ClipperBase.prototype.InitEdge2 = function (e, polyType)\n\
  {\n\
    if (e.Curr.Y >= e.Next.Curr.Y)\n\
    {\n\
      //e.Bot = e.Curr;\n\
      e.Bot.X = e.Curr.X;\n\
      e.Bot.Y = e.Curr.Y;\n\
      //e.Top = e.Next.Curr;\n\
      e.Top.X = e.Next.Curr.X;\n\
      e.Top.Y = e.Next.Curr.Y;\n\
    }\n\
    else\n\
    {\n\
      //e.Top = e.Curr;\n\
      e.Top.X = e.Curr.X;\n\
      e.Top.Y = e.Curr.Y;\n\
      //e.Bot = e.Next.Curr;\n\
      e.Bot.X = e.Next.Curr.X;\n\
      e.Bot.Y = e.Next.Curr.Y;\n\
    }\n\
    this.SetDx(e);\n\
    e.PolyTyp = polyType;\n\
  };\n\
  ClipperLib.ClipperBase.prototype.FindNextLocMin = function (E)\n\
  {\n\
    var E2;\n\
    for (;;)\n\
    {\n\
      while (ClipperLib.IntPoint.op_Inequality(E.Bot, E.Prev.Bot) || ClipperLib.IntPoint.op_Equality(E.Curr, E.Top))\n\
        E = E.Next;\n\
      if (E.Dx != ClipperLib.ClipperBase.horizontal && E.Prev.Dx != ClipperLib.ClipperBase.horizontal)\n\
        break;\n\
      while (E.Prev.Dx == ClipperLib.ClipperBase.horizontal)\n\
        E = E.Prev;\n\
      E2 = E;\n\
      while (E.Dx == ClipperLib.ClipperBase.horizontal)\n\
        E = E.Next;\n\
      if (E.Top.Y == E.Prev.Bot.Y)\n\
        continue;\n\
      //ie just an intermediate horz.\n\
      if (E2.Prev.Bot.X < E.Bot.X)\n\
        E = E2;\n\
      break;\n\
    }\n\
    return E;\n\
  };\n\
  ClipperLib.ClipperBase.prototype.ProcessBound = function (E, IsClockwise)\n\
  {\n\
    var EStart = E,\n\
      Result = E;\n\
    var Horz;\n\
    var StartX;\n\
    if (E.Dx == ClipperLib.ClipperBase.horizontal)\n\
    {\n\
      //it's possible for adjacent overlapping horz edges to start heading left\n\
      //before finishing right, so ...\n\
      if (IsClockwise)\n\
        StartX = E.Prev.Bot.X;\n\
      else\n\
        StartX = E.Next.Bot.X;\n\
      if (E.Bot.X != StartX)\n\
        this.ReverseHorizontal(E);\n\
    }\n\
    if (Result.OutIdx != ClipperLib.ClipperBase.Skip)\n\
    {\n\
      if (IsClockwise)\n\
      {\n\
        while (Result.Top.Y == Result.Next.Bot.Y && Result.Next.OutIdx != ClipperLib.ClipperBase.Skip)\n\
          Result = Result.Next;\n\
        if (Result.Dx == ClipperLib.ClipperBase.horizontal && Result.Next.OutIdx != ClipperLib.ClipperBase.Skip)\n\
        {\n\
          //nb: at the top of a bound, horizontals are added to the bound\n\
          //only when the preceding edge attaches to the horizontal's left vertex\n\
          //unless a Skip edge is encountered when that becomes the top divide\n\
          Horz = Result;\n\
          while (Horz.Prev.Dx == ClipperLib.ClipperBase.horizontal)\n\
            Horz = Horz.Prev;\n\
          if (Horz.Prev.Top.X == Result.Next.Top.X)\n\
          {\n\
            if (!IsClockwise)\n\
              Result = Horz.Prev;\n\
          }\n\
          else if (Horz.Prev.Top.X > Result.Next.Top.X)\n\
            Result = Horz.Prev;\n\
        }\n\
        while (E != Result)\n\
        {\n\
          E.NextInLML = E.Next;\n\
          if (E.Dx == ClipperLib.ClipperBase.horizontal && E != EStart && E.Bot.X != E.Prev.Top.X)\n\
            this.ReverseHorizontal(E);\n\
          E = E.Next;\n\
        }\n\
        if (E.Dx == ClipperLib.ClipperBase.horizontal && E != EStart && E.Bot.X != E.Prev.Top.X)\n\
          this.ReverseHorizontal(E);\n\
        Result = Result.Next;\n\
        //move to the edge just beyond current bound\n\
      }\n\
      else\n\
      {\n\
        while (Result.Top.Y == Result.Prev.Bot.Y && Result.Prev.OutIdx != ClipperLib.ClipperBase.Skip)\n\
          Result = Result.Prev;\n\
        if (Result.Dx == ClipperLib.ClipperBase.horizontal && Result.Prev.OutIdx != ClipperLib.ClipperBase.Skip)\n\
        {\n\
          Horz = Result;\n\
          while (Horz.Next.Dx == ClipperLib.ClipperBase.horizontal)\n\
            Horz = Horz.Next;\n\
          if (Horz.Next.Top.X == Result.Prev.Top.X)\n\
          {\n\
            if (!IsClockwise)\n\
              Result = Horz.Next;\n\
          }\n\
          else if (Horz.Next.Top.X > Result.Prev.Top.X)\n\
            Result = Horz.Next;\n\
        }\n\
        while (E != Result)\n\
        {\n\
          E.NextInLML = E.Prev;\n\
          if (E.Dx == ClipperLib.ClipperBase.horizontal && E != EStart && E.Bot.X != E.Next.Top.X)\n\
            this.ReverseHorizontal(E);\n\
          E = E.Prev;\n\
        }\n\
        if (E.Dx == ClipperLib.ClipperBase.horizontal && E != EStart && E.Bot.X != E.Next.Top.X)\n\
          this.ReverseHorizontal(E);\n\
        Result = Result.Prev;\n\
        //move to the edge just beyond current bound\n\
      }\n\
    }\n\
    if (Result.OutIdx == ClipperLib.ClipperBase.Skip)\n\
    {\n\
      //if edges still remain in the current bound beyond the skip edge then\n\
      //create another LocMin and call ProcessBound once more\n\
      E = Result;\n\
      if (IsClockwise)\n\
      {\n\
        while (E.Top.Y == E.Next.Bot.Y)\n\
          E = E.Next;\n\
        //don't include top horizontals when parsing a bound a second time,\n\
        //they will be contained in the opposite bound ...\n\
        while (E != Result && E.Dx == ClipperLib.ClipperBase.horizontal)\n\
          E = E.Prev;\n\
      }\n\
      else\n\
      {\n\
        while (E.Top.Y == E.Prev.Bot.Y)\n\
          E = E.Prev;\n\
        while (E != Result && E.Dx == ClipperLib.ClipperBase.horizontal)\n\
          E = E.Next;\n\
      }\n\
      if (E == Result)\n\
      {\n\
        if (IsClockwise)\n\
          Result = E.Next;\n\
        else\n\
          Result = E.Prev;\n\
      }\n\
      else\n\
      {\n\
        //there are more edges in the bound beyond result starting with E\n\
        if (IsClockwise)\n\
          E = Result.Next;\n\
        else\n\
          E = Result.Prev;\n\
        var locMin = new ClipperLib.LocalMinima();\n\
        locMin.Next = null;\n\
        locMin.Y = E.Bot.Y;\n\
        locMin.LeftBound = null;\n\
        locMin.RightBound = E;\n\
        locMin.RightBound.WindDelta = 0;\n\
        Result = this.ProcessBound(locMin.RightBound, IsClockwise);\n\
        this.InsertLocalMinima(locMin);\n\
      }\n\
    }\n\
    return Result;\n\
  };\n\
  ClipperLib.ClipperBase.prototype.AddPath = function (pg, polyType, Closed)\n\
  {\n\
    if (use_lines)\n\
    {\n\
      if (!Closed && polyType == ClipperLib.PolyType.ptClip)\n\
        ClipperLib.Error(\"AddPath: Open paths must be subject.\");\n\
    }\n\
    else\n\
    {\n\
      if (!Closed)\n\
        ClipperLib.Error(\"AddPath: Open paths have been disabled.\");\n\
    }\n\
    var highI = pg.length - 1;\n\
    if (Closed)\n\
      while (highI > 0 && (ClipperLib.IntPoint.op_Equality(pg[highI], pg[0])))\n\
    --highI;\n\
    while (highI > 0 && (ClipperLib.IntPoint.op_Equality(pg[highI], pg[highI - 1])))\n\
    --highI;\n\
    if ((Closed && highI < 2) || (!Closed && highI < 1))\n\
      return false;\n\
    //create a new edge array ...\n\
    var edges = new Array();\n\
    for (var i = 0; i <= highI; i++)\n\
      edges.push(new ClipperLib.TEdge());\n\
    var IsFlat = true;\n\
    //1. Basic (first) edge initialization ...\n\
\n\
    //edges[1].Curr = pg[1];\n\
    edges[1].Curr.X = pg[1].X;\n\
    edges[1].Curr.Y = pg[1].Y;\n\
\n\
    var $1 = {Value: this.m_UseFullRange};\n\
    this.RangeTest(pg[0], $1);\n\
    this.m_UseFullRange = $1.Value;\n\
\n\
    $1.Value = this.m_UseFullRange;\n\
    this.RangeTest(pg[highI], $1);\n\
    this.m_UseFullRange = $1.Value;\n\
\n\
    this.InitEdge(edges[0], edges[1], edges[highI], pg[0]);\n\
    this.InitEdge(edges[highI], edges[0], edges[highI - 1], pg[highI]);\n\
    for (var i = highI - 1; i >= 1; --i)\n\
    {\n\
      $1.Value = this.m_UseFullRange;\n\
      this.RangeTest(pg[i], $1);\n\
      this.m_UseFullRange = $1.Value;\n\
\n\
      this.InitEdge(edges[i], edges[i + 1], edges[i - 1], pg[i]);\n\
    }\n\
\n\
    var eStart = edges[0];\n\
    //2. Remove duplicate vertices, and (when closed) collinear edges ...\n\
    var E = eStart,\n\
      eLoopStop = eStart;\n\
    for (;;)\n\
    {\n\
      if (ClipperLib.IntPoint.op_Equality(E.Curr, E.Next.Curr))\n\
      {\n\
        if (E == E.Next)\n\
          break;\n\
        if (E == eStart)\n\
          eStart = E.Next;\n\
        E = this.RemoveEdge(E);\n\
        eLoopStop = E;\n\
        continue;\n\
      }\n\
      if (E.Prev == E.Next)\n\
        break;\n\
      else if (Closed && ClipperLib.ClipperBase.SlopesEqual(E.Prev.Curr, E.Curr, E.Next.Curr, this.m_UseFullRange) && (!this.PreserveCollinear || !this.Pt2IsBetweenPt1AndPt3(E.Prev.Curr, E.Curr, E.Next.Curr)))\n\
      {\n\
        //Collinear edges are allowed for open paths but in closed paths\n\
        //the default is to merge adjacent collinear edges into a single edge.\n\
        //However, if the PreserveCollinear property is enabled, only overlapping\n\
        //collinear edges (ie spikes) will be removed from closed paths.\n\
        if (E == eStart)\n\
          eStart = E.Next;\n\
        E = this.RemoveEdge(E);\n\
        E = E.Prev;\n\
        eLoopStop = E;\n\
        continue;\n\
      }\n\
      E = E.Next;\n\
      if (E == eLoopStop)\n\
        break;\n\
    }\n\
    if ((!Closed && (E == E.Next)) || (Closed && (E.Prev == E.Next)))\n\
      return false;\n\
    if (!Closed)\n\
    {\n\
      this.m_HasOpenPaths = true;\n\
      eStart.Prev.OutIdx = ClipperLib.ClipperBase.Skip;\n\
    }\n\
    //3. Do second stage of edge initialization ...\n\
    var eHighest = eStart;\n\
    E = eStart;\n\
    do {\n\
      this.InitEdge2(E, polyType);\n\
      E = E.Next;\n\
      if (IsFlat && E.Curr.Y != eStart.Curr.Y)\n\
        IsFlat = false;\n\
    }\n\
    while (E != eStart)\n\
    //4. Finally, add edge bounds to LocalMinima list ...\n\
    //Totally flat paths must be handled differently when adding them\n\
    //to LocalMinima list to avoid endless loops etc ...\n\
    if (IsFlat)\n\
    {\n\
      if (Closed)\n\
        return false;\n\
      E.Prev.OutIdx = ClipperLib.ClipperBase.Skip;\n\
      if (E.Prev.Bot.X < E.Prev.Top.X)\n\
        this.ReverseHorizontal(E.Prev);\n\
      var locMin = new ClipperLib.LocalMinima();\n\
      locMin.Next = null;\n\
      locMin.Y = E.Bot.Y;\n\
      locMin.LeftBound = null;\n\
      locMin.RightBound = E;\n\
      locMin.RightBound.Side = ClipperLib.EdgeSide.esRight;\n\
      locMin.RightBound.WindDelta = 0;\n\
      while (E.Next.OutIdx != ClipperLib.ClipperBase.Skip)\n\
      {\n\
        E.NextInLML = E.Next;\n\
        if (E.Bot.X != E.Prev.Top.X)\n\
          this.ReverseHorizontal(E);\n\
        E = E.Next;\n\
      }\n\
      this.InsertLocalMinima(locMin);\n\
      this.m_edges.push(edges);\n\
      return true;\n\
    }\n\
    this.m_edges.push(edges);\n\
    var clockwise;\n\
    var EMin = null;\n\
    for (;;)\n\
    {\n\
      E = this.FindNextLocMin(E);\n\
      if (E == EMin)\n\
        break;\n\
      else if (EMin == null)\n\
        EMin = E;\n\
      //E and E.Prev now share a local minima (left aligned if horizontal).\n\
      //Compare their slopes to find which starts which bound ...\n\
      var locMin = new ClipperLib.LocalMinima();\n\
      locMin.Next = null;\n\
      locMin.Y = E.Bot.Y;\n\
      if (E.Dx < E.Prev.Dx)\n\
      {\n\
        locMin.LeftBound = E.Prev;\n\
        locMin.RightBound = E;\n\
        clockwise = false;\n\
        //Q.nextInLML = Q.prev\n\
      }\n\
      else\n\
      {\n\
        locMin.LeftBound = E;\n\
        locMin.RightBound = E.Prev;\n\
        clockwise = true;\n\
        //Q.nextInLML = Q.next\n\
      }\n\
      locMin.LeftBound.Side = ClipperLib.EdgeSide.esLeft;\n\
      locMin.RightBound.Side = ClipperLib.EdgeSide.esRight;\n\
      if (!Closed)\n\
        locMin.LeftBound.WindDelta = 0;\n\
      else if (locMin.LeftBound.Next == locMin.RightBound)\n\
        locMin.LeftBound.WindDelta = -1;\n\
      else\n\
        locMin.LeftBound.WindDelta = 1;\n\
      locMin.RightBound.WindDelta = -locMin.LeftBound.WindDelta;\n\
      E = this.ProcessBound(locMin.LeftBound, clockwise);\n\
      var E2 = this.ProcessBound(locMin.RightBound, !clockwise);\n\
      if (locMin.LeftBound.OutIdx == ClipperLib.ClipperBase.Skip)\n\
        locMin.LeftBound = null;\n\
      else if (locMin.RightBound.OutIdx == ClipperLib.ClipperBase.Skip)\n\
        locMin.RightBound = null;\n\
      this.InsertLocalMinima(locMin);\n\
      if (!clockwise)\n\
        E = E2;\n\
    }\n\
    return true;\n\
  };\n\
  ClipperLib.ClipperBase.prototype.AddPaths = function (ppg, polyType, closed)\n\
  {\n\
    //  console.log(\"-------------------------------------------\");\n\
    //  console.log(JSON.stringify(ppg));\n\
    var result = false;\n\
    for (var i = 0, ilen = ppg.length; i < ilen; ++i)\n\
      if (this.AddPath(ppg[i], polyType, closed))\n\
        result = true;\n\
    return result;\n\
  };\n\
  //------------------------------------------------------------------------------\n\
  ClipperLib.ClipperBase.prototype.Pt2IsBetweenPt1AndPt3 = function (pt1, pt2, pt3)\n\
  {\n\
    if ((ClipperLib.IntPoint.op_Equality(pt1, pt3)) || (ClipperLib.IntPoint.op_Equality(pt1, pt2)) ||\n\
      (ClipperLib.IntPoint.op_Equality(pt3, pt2)))\n\
      return false;\n\
    else if (pt1.X != pt3.X)\n\
      return (pt2.X > pt1.X) == (pt2.X < pt3.X);\n\
    else\n\
      return (pt2.Y > pt1.Y) == (pt2.Y < pt3.Y);\n\
  };\n\
  ClipperLib.ClipperBase.prototype.RemoveEdge = function (e)\n\
  {\n\
    //removes e from double_linked_list (but without removing from memory)\n\
    e.Prev.Next = e.Next;\n\
    e.Next.Prev = e.Prev;\n\
    var result = e.Next;\n\
    e.Prev = null; //flag as removed (see ClipperBase.Clear)\n\
    return result;\n\
  };\n\
  ClipperLib.ClipperBase.prototype.SetDx = function (e)\n\
  {\n\
    e.Delta.X = (e.Top.X - e.Bot.X);\n\
    e.Delta.Y = (e.Top.Y - e.Bot.Y);\n\
    if (e.Delta.Y === 0) e.Dx = ClipperLib.ClipperBase.horizontal;\n\
    else e.Dx = (e.Delta.X) / (e.Delta.Y);\n\
  };\n\
  ClipperLib.ClipperBase.prototype.InsertLocalMinima = function (newLm)\n\
  {\n\
    if (this.m_MinimaList === null)\n\
    {\n\
      this.m_MinimaList = newLm;\n\
    }\n\
    else if (newLm.Y >= this.m_MinimaList.Y)\n\
    {\n\
      newLm.Next = this.m_MinimaList;\n\
      this.m_MinimaList = newLm;\n\
    }\n\
    else\n\
    {\n\
      var tmpLm = this.m_MinimaList;\n\
      while (tmpLm.Next !== null && (newLm.Y < tmpLm.Next.Y))\n\
        tmpLm = tmpLm.Next;\n\
      newLm.Next = tmpLm.Next;\n\
      tmpLm.Next = newLm;\n\
    }\n\
  };\n\
  ClipperLib.ClipperBase.prototype.PopLocalMinima = function ()\n\
  {\n\
    if (this.m_CurrentLM === null)\n\
      return;\n\
    this.m_CurrentLM = this.m_CurrentLM.Next;\n\
  };\n\
  ClipperLib.ClipperBase.prototype.ReverseHorizontal = function (e)\n\
  {\n\
    //swap horizontal edges' top and bottom x's so they follow the natural\n\
    //progression of the bounds - ie so their xbots will align with the\n\
    //adjoining lower edge. [Helpful in the ProcessHorizontal() method.]\n\
    var tmp = e.Top.X;\n\
    e.Top.X = e.Bot.X;\n\
    e.Bot.X = tmp;\n\
    if (use_xyz)\n\
    {\n\
      tmp = e.Top.Z;\n\
      e.Top.Z = e.Bot.Z;\n\
      e.Bot.Z = tmp;\n\
    }\n\
  };\n\
  ClipperLib.ClipperBase.prototype.Reset = function ()\n\
  {\n\
    this.m_CurrentLM = this.m_MinimaList;\n\
    if (this.m_CurrentLM == null)\n\
      return;\n\
    //ie nothing to process\n\
    //reset all edges ...\n\
    var lm = this.m_MinimaList;\n\
    while (lm != null)\n\
    {\n\
      var e = lm.LeftBound;\n\
      if (e != null)\n\
      {\n\
        //e.Curr = e.Bot;\n\
        e.Curr.X = e.Bot.X;\n\
        e.Curr.Y = e.Bot.Y;\n\
        e.Side = ClipperLib.EdgeSide.esLeft;\n\
        e.OutIdx = ClipperLib.ClipperBase.Unassigned;\n\
      }\n\
      e = lm.RightBound;\n\
      if (e != null)\n\
      {\n\
        //e.Curr = e.Bot;\n\
        e.Curr.X = e.Bot.X;\n\
        e.Curr.Y = e.Bot.Y;\n\
        e.Side = ClipperLib.EdgeSide.esRight;\n\
        e.OutIdx = ClipperLib.ClipperBase.Unassigned;\n\
      }\n\
      lm = lm.Next;\n\
    }\n\
  };\n\
  ClipperLib.Clipper = function (InitOptions) // public Clipper(int InitOptions = 0)\n\
  {\n\
    if (typeof (InitOptions) == \"undefined\") InitOptions = 0;\n\
    this.m_PolyOuts = null;\n\
    this.m_ClipType = ClipperLib.ClipType.ctIntersection;\n\
    this.m_Scanbeam = null;\n\
    this.m_ActiveEdges = null;\n\
    this.m_SortedEdges = null;\n\
    this.m_IntersectList = null;\n\
    this.m_IntersectNodeComparer = null;\n\
    this.m_ExecuteLocked = false;\n\
    this.m_ClipFillType = ClipperLib.PolyFillType.pftEvenOdd;\n\
    this.m_SubjFillType = ClipperLib.PolyFillType.pftEvenOdd;\n\
    this.m_Joins = null;\n\
    this.m_GhostJoins = null;\n\
    this.m_UsingPolyTree = false;\n\
    this.ReverseSolution = false;\n\
    this.StrictlySimple = false;\n\
    ClipperLib.ClipperBase.call(this);\n\
    this.m_Scanbeam = null;\n\
    this.m_ActiveEdges = null;\n\
    this.m_SortedEdges = null;\n\
    this.m_IntersectList = new Array();\n\
    this.m_IntersectNodeComparer = ClipperLib.MyIntersectNodeSort.Compare;\n\
    this.m_ExecuteLocked = false;\n\
    this.m_UsingPolyTree = false;\n\
    this.m_PolyOuts = new Array();\n\
    this.m_Joins = new Array();\n\
    this.m_GhostJoins = new Array();\n\
    this.ReverseSolution = (1 & InitOptions) !== 0;\n\
    this.StrictlySimple = (2 & InitOptions) !== 0;\n\
    this.PreserveCollinear = (4 & InitOptions) !== 0;\n\
    if (use_xyz)\n\
    {\n\
      this.ZFillFunction = null; // function (IntPoint vert1, IntPoint vert2, ref IntPoint intersectPt);\n\
    }\n\
  };\n\
  ClipperLib.Clipper.ioReverseSolution = 1;\n\
  ClipperLib.Clipper.ioStrictlySimple = 2;\n\
  ClipperLib.Clipper.ioPreserveCollinear = 4;\n\
\n\
  ClipperLib.Clipper.prototype.Clear = function ()\n\
  {\n\
    if (this.m_edges.length === 0)\n\
      return;\n\
    //avoids problems with ClipperBase destructor\n\
    this.DisposeAllPolyPts();\n\
    ClipperLib.ClipperBase.prototype.Clear.call(this);\n\
  };\n\
\n\
  ClipperLib.Clipper.prototype.DisposeScanbeamList = function ()\n\
  {\n\
    while (this.m_Scanbeam !== null)\n\
    {\n\
      var sb2 = this.m_Scanbeam.Next;\n\
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
\n\
    var lm = this.m_MinimaList;\n\
    while (lm !== null)\n\
    {\n\
      this.InsertScanbeam(lm.Y);\n\
      lm = lm.Next;\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.InsertScanbeam = function (Y)\n\
  {\n\
    if (this.m_Scanbeam === null)\n\
    {\n\
      this.m_Scanbeam = new ClipperLib.Scanbeam();\n\
      this.m_Scanbeam.Next = null;\n\
      this.m_Scanbeam.Y = Y;\n\
    }\n\
    else if (Y > this.m_Scanbeam.Y)\n\
    {\n\
      var newSb = new ClipperLib.Scanbeam();\n\
      newSb.Y = Y;\n\
      newSb.Next = this.m_Scanbeam;\n\
      this.m_Scanbeam = newSb;\n\
    }\n\
    else\n\
    {\n\
      var sb2 = this.m_Scanbeam;\n\
      while (sb2.Next !== null && (Y <= sb2.Next.Y))\n\
        sb2 = sb2.Next;\n\
      if (Y == sb2.Y)\n\
        return;\n\
      //ie ignores duplicates\n\
      var newSb = new ClipperLib.Scanbeam();\n\
      newSb.Y = Y;\n\
      newSb.Next = sb2.Next;\n\
      sb2.Next = newSb;\n\
    }\n\
  };\n\
  // ************************************\n\
  ClipperLib.Clipper.prototype.Execute = function ()\n\
  {\n\
    var a = arguments,\n\
      alen = a.length,\n\
      ispolytree = a[1] instanceof ClipperLib.PolyTree;\n\
    if (alen == 4 && !ispolytree) // function (clipType, solution, subjFillType, clipFillType)\n\
    {\n\
      var clipType = a[0],\n\
        solution = a[1],\n\
        subjFillType = a[2],\n\
        clipFillType = a[3];\n\
      if (this.m_ExecuteLocked)\n\
        return false;\n\
      if (this.m_HasOpenPaths)\n\
        ClipperLib.Error(\"Error: PolyTree struct is need for open path clipping.\");\n\
      this.m_ExecuteLocked = true;\n\
      ClipperLib.Clear(solution);\n\
      this.m_SubjFillType = subjFillType;\n\
      this.m_ClipFillType = clipFillType;\n\
      this.m_ClipType = clipType;\n\
      this.m_UsingPolyTree = false;\n\
      try\n\
      {\n\
        var succeeded = this.ExecuteInternal();\n\
        //build the return polygons ...\n\
        if (succeeded) this.BuildResult(solution);\n\
      }\n\
      finally\n\
      {\n\
        this.DisposeAllPolyPts();\n\
        this.m_ExecuteLocked = false;\n\
      }\n\
      return succeeded;\n\
    }\n\
    else if (alen == 4 && ispolytree) // function (clipType, polytree, subjFillType, clipFillType)\n\
    {\n\
      var clipType = a[0],\n\
        polytree = a[1],\n\
        subjFillType = a[2],\n\
        clipFillType = a[3];\n\
      if (this.m_ExecuteLocked)\n\
        return false;\n\
      this.m_ExecuteLocked = true;\n\
      this.m_SubjFillType = subjFillType;\n\
      this.m_ClipFillType = clipFillType;\n\
      this.m_ClipType = clipType;\n\
      this.m_UsingPolyTree = true;\n\
      try\n\
      {\n\
        var succeeded = this.ExecuteInternal();\n\
        //build the return polygons ...\n\
        if (succeeded) this.BuildResult2(polytree);\n\
      }\n\
      finally\n\
      {\n\
        this.DisposeAllPolyPts();\n\
        this.m_ExecuteLocked = false;\n\
      }\n\
      return succeeded;\n\
    }\n\
    else if (alen == 2 && !ispolytree) // function (clipType, solution)\n\
    {\n\
      var clipType = a[0],\n\
        solution = a[1];\n\
      return this.Execute(clipType, solution, ClipperLib.PolyFillType.pftEvenOdd, ClipperLib.PolyFillType.pftEvenOdd);\n\
    }\n\
    else if (alen == 2 && ispolytree) // function (clipType, polytree)\n\
    {\n\
      var clipType = a[0],\n\
        polytree = a[1];\n\
      return this.Execute(clipType, polytree, ClipperLib.PolyFillType.pftEvenOdd, ClipperLib.PolyFillType.pftEvenOdd);\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.FixHoleLinkage = function (outRec)\n\
  {\n\
    //skip if an outermost polygon or\n\
    //already already points to the correct FirstLeft ...\n\
    if (outRec.FirstLeft === null || (outRec.IsHole != outRec.FirstLeft.IsHole && outRec.FirstLeft.Pts !== null))\n\
      return;\n\
    var orfl = outRec.FirstLeft;\n\
    while (orfl !== null && ((orfl.IsHole == outRec.IsHole) || orfl.Pts === null))\n\
      orfl = orfl.FirstLeft;\n\
    outRec.FirstLeft = orfl;\n\
  };\n\
  ClipperLib.Clipper.prototype.ExecuteInternal = function ()\n\
  {\n\
    try\n\
    {\n\
      this.Reset();\n\
      if (this.m_CurrentLM === null)\n\
        return false;\n\
      var botY = this.PopScanbeam();\n\
      do {\n\
        this.InsertLocalMinimaIntoAEL(botY);\n\
        ClipperLib.Clear(this.m_GhostJoins);\n\
        this.ProcessHorizontals(false);\n\
        if (this.m_Scanbeam === null)\n\
          break;\n\
        var topY = this.PopScanbeam();\n\
        //console.log(\"botY:\" + botY + \", topY:\" + topY);\n\
        if (!this.ProcessIntersections(botY, topY))\n\
          return false;\n\
        this.ProcessEdgesAtTopOfScanbeam(topY);\n\
        botY = topY;\n\
      }\n\
      while (this.m_Scanbeam !== null || this.m_CurrentLM !== null)\n\
      //fix orientations ...\n\
      for (var i = 0, ilen = this.m_PolyOuts.length; i < ilen; i++)\n\
      {\n\
        var outRec = this.m_PolyOuts[i];\n\
        if (outRec.Pts === null || outRec.IsOpen)\n\
          continue;\n\
        if ((outRec.IsHole ^ this.ReverseSolution) == (this.Area(outRec) > 0))\n\
          this.ReversePolyPtLinks(outRec.Pts);\n\
      }\n\
      this.JoinCommonEdges();\n\
      for (var i = 0, ilen = this.m_PolyOuts.length; i < ilen; i++)\n\
      {\n\
        var outRec = this.m_PolyOuts[i];\n\
        if (outRec.Pts !== null && !outRec.IsOpen)\n\
          this.FixupOutPolygon(outRec);\n\
      }\n\
      if (this.StrictlySimple)\n\
        this.DoSimplePolygons();\n\
      return true;\n\
    }\n\
    finally\n\
    {\n\
      ClipperLib.Clear(this.m_Joins);\n\
      ClipperLib.Clear(this.m_GhostJoins);\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.PopScanbeam = function ()\n\
  {\n\
    var Y = this.m_Scanbeam.Y;\n\
    var sb2 = this.m_Scanbeam;\n\
    this.m_Scanbeam = this.m_Scanbeam.Next;\n\
    sb2 = null;\n\
    return Y;\n\
  };\n\
  ClipperLib.Clipper.prototype.DisposeAllPolyPts = function ()\n\
  {\n\
    for (var i = 0, ilen = this.m_PolyOuts.length; i < ilen; ++i)\n\
      this.DisposeOutRec(i);\n\
    ClipperLib.Clear(this.m_PolyOuts);\n\
  };\n\
  ClipperLib.Clipper.prototype.DisposeOutRec = function (index)\n\
  {\n\
    var outRec = this.m_PolyOuts[index];\n\
    if (outRec.Pts !== null)\n\
      this.DisposeOutPts(outRec.Pts);\n\
    outRec = null;\n\
    this.m_PolyOuts[index] = null;\n\
  };\n\
  ClipperLib.Clipper.prototype.DisposeOutPts = function (pp)\n\
  {\n\
    if (pp === null)\n\
      return;\n\
    var tmpPp = null;\n\
    pp.Prev.Next = null;\n\
    while (pp !== null)\n\
    {\n\
      tmpPp = pp;\n\
      pp = pp.Next;\n\
      tmpPp = null;\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.AddJoin = function (Op1, Op2, OffPt)\n\
  {\n\
    var j = new ClipperLib.Join();\n\
    j.OutPt1 = Op1;\n\
    j.OutPt2 = Op2;\n\
    //j.OffPt = OffPt;\n\
    j.OffPt.X = OffPt.X;\n\
    j.OffPt.Y = OffPt.Y;\n\
    this.m_Joins.push(j);\n\
  };\n\
  ClipperLib.Clipper.prototype.AddGhostJoin = function (Op, OffPt)\n\
  {\n\
    var j = new ClipperLib.Join();\n\
    j.OutPt1 = Op;\n\
    //j.OffPt = OffPt;\n\
    j.OffPt.X = OffPt.X;\n\
    j.OffPt.Y = OffPt.Y;\n\
    this.m_GhostJoins.push(j);\n\
  };\n\
  if (use_xyz)\n\
  {\n\
    ClipperLib.Clipper.prototype.SetZ = function (pt, e)\n\
    {\n\
      pt.Z = 0;\n\
      if (this.ZFillFunction !== null)\n\
      {\n\
        //put the 'preferred' point as first parameter ...\n\
        if (e.OutIdx < 0)\n\
          this.ZFillFunction(e.Bot, e.Top, pt); //outside a path so presume entering\n\
        else\n\
          this.ZFillFunction(e.Top, e.Bot, pt); //inside a path so presume exiting\n\
      }\n\
    };\n\
    //------------------------------------------------------------------------------\n\
  }\n\
  ClipperLib.Clipper.prototype.InsertLocalMinimaIntoAEL = function (botY)\n\
  {\n\
    while (this.m_CurrentLM !== null && (this.m_CurrentLM.Y == botY))\n\
    {\n\
      var lb = this.m_CurrentLM.LeftBound;\n\
      var rb = this.m_CurrentLM.RightBound;\n\
      this.PopLocalMinima();\n\
      var Op1 = null;\n\
      if (lb === null)\n\
      {\n\
        this.InsertEdgeIntoAEL(rb, null);\n\
        this.SetWindingCount(rb);\n\
        if (this.IsContributing(rb))\n\
          Op1 = this.AddOutPt(rb, rb.Bot);\n\
      }\n\
      else if (rb == null)\n\
      {\n\
        this.InsertEdgeIntoAEL(lb, null);\n\
        this.SetWindingCount(lb);\n\
        if (this.IsContributing(lb))\n\
          Op1 = this.AddOutPt(lb, lb.Bot);\n\
        this.InsertScanbeam(lb.Top.Y);\n\
      }\n\
      else\n\
      {\n\
        this.InsertEdgeIntoAEL(lb, null);\n\
        this.InsertEdgeIntoAEL(rb, lb);\n\
        this.SetWindingCount(lb);\n\
        rb.WindCnt = lb.WindCnt;\n\
        rb.WindCnt2 = lb.WindCnt2;\n\
        if (this.IsContributing(lb))\n\
          Op1 = this.AddLocalMinPoly(lb, rb, lb.Bot);\n\
        this.InsertScanbeam(lb.Top.Y);\n\
      }\n\
      if (rb != null)\n\
      {\n\
        if (ClipperLib.ClipperBase.IsHorizontal(rb))\n\
          this.AddEdgeToSEL(rb);\n\
        else\n\
          this.InsertScanbeam(rb.Top.Y);\n\
      }\n\
      if (lb == null || rb == null) continue;\n\
      //if output polygons share an Edge with a horizontal rb, they'll need joining later ...\n\
      if (Op1 !== null && ClipperLib.ClipperBase.IsHorizontal(rb) && this.m_GhostJoins.length > 0 && rb.WindDelta !== 0)\n\
      {\n\
        for (var i = 0, ilen = this.m_GhostJoins.length; i < ilen; i++)\n\
        {\n\
          //if the horizontal Rb and a 'ghost' horizontal overlap, then convert\n\
          //the 'ghost' join to a real join ready for later ...\n\
          var j = this.m_GhostJoins[i];\n\
          if (this.HorzSegmentsOverlap(j.OutPt1.Pt, j.OffPt, rb.Bot, rb.Top))\n\
            this.AddJoin(j.OutPt1, Op1, j.OffPt);\n\
        }\n\
      }\n\
      if (lb.OutIdx >= 0 && lb.PrevInAEL !== null &&\n\
        lb.PrevInAEL.Curr.X == lb.Bot.X &&\n\
        lb.PrevInAEL.OutIdx >= 0 &&\n\
        ClipperLib.ClipperBase.SlopesEqual(lb.PrevInAEL, lb, this.m_UseFullRange) &&\n\
        lb.WindDelta !== 0 && lb.PrevInAEL.WindDelta !== 0)\n\
      {\n\
        var Op2 = this.AddOutPt(lb.PrevInAEL, lb.Bot);\n\
        this.AddJoin(Op1, Op2, lb.Top);\n\
      }\n\
      if (lb.NextInAEL != rb)\n\
      {\n\
        if (rb.OutIdx >= 0 && rb.PrevInAEL.OutIdx >= 0 &&\n\
          ClipperLib.ClipperBase.SlopesEqual(rb.PrevInAEL, rb, this.m_UseFullRange) &&\n\
          rb.WindDelta !== 0 && rb.PrevInAEL.WindDelta !== 0)\n\
        {\n\
          var Op2 = this.AddOutPt(rb.PrevInAEL, rb.Bot);\n\
          this.AddJoin(Op1, Op2, rb.Top);\n\
        }\n\
        var e = lb.NextInAEL;\n\
        if (e !== null)\n\
          while (e != rb)\n\
          {\n\
            //nb: For calculating winding counts etc, IntersectEdges() assumes\n\
            //that param1 will be to the right of param2 ABOVE the intersection ...\n\
            this.IntersectEdges(rb, e, lb.Curr, false);\n\
            //order important here\n\
            e = e.NextInAEL;\n\
          }\n\
      }\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.InsertEdgeIntoAEL = function (edge, startEdge)\n\
  {\n\
    if (this.m_ActiveEdges === null)\n\
    {\n\
      edge.PrevInAEL = null;\n\
      edge.NextInAEL = null;\n\
      this.m_ActiveEdges = edge;\n\
    }\n\
    else if (startEdge === null && this.E2InsertsBeforeE1(this.m_ActiveEdges, edge))\n\
    {\n\
      edge.PrevInAEL = null;\n\
      edge.NextInAEL = this.m_ActiveEdges;\n\
      this.m_ActiveEdges.PrevInAEL = edge;\n\
      this.m_ActiveEdges = edge;\n\
    }\n\
    else\n\
    {\n\
      if (startEdge === null)\n\
        startEdge = this.m_ActiveEdges;\n\
      while (startEdge.NextInAEL !== null && !this.E2InsertsBeforeE1(startEdge.NextInAEL, edge))\n\
        startEdge = startEdge.NextInAEL;\n\
      edge.NextInAEL = startEdge.NextInAEL;\n\
      if (startEdge.NextInAEL !== null)\n\
        startEdge.NextInAEL.PrevInAEL = edge;\n\
      edge.PrevInAEL = startEdge;\n\
      startEdge.NextInAEL = edge;\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.E2InsertsBeforeE1 = function (e1, e2)\n\
  {\n\
    if (e2.Curr.X == e1.Curr.X)\n\
    {\n\
      if (e2.Top.Y > e1.Top.Y)\n\
        return e2.Top.X < ClipperLib.Clipper.TopX(e1, e2.Top.Y);\n\
      else\n\
        return e1.Top.X > ClipperLib.Clipper.TopX(e2, e1.Top.Y);\n\
    }\n\
    else\n\
      return e2.Curr.X < e1.Curr.X;\n\
  };\n\
  ClipperLib.Clipper.prototype.IsEvenOddFillType = function (edge)\n\
  {\n\
    if (edge.PolyTyp == ClipperLib.PolyType.ptSubject)\n\
      return this.m_SubjFillType == ClipperLib.PolyFillType.pftEvenOdd;\n\
    else\n\
      return this.m_ClipFillType == ClipperLib.PolyFillType.pftEvenOdd;\n\
  };\n\
  ClipperLib.Clipper.prototype.IsEvenOddAltFillType = function (edge)\n\
  {\n\
    if (edge.PolyTyp == ClipperLib.PolyType.ptSubject)\n\
      return this.m_ClipFillType == ClipperLib.PolyFillType.pftEvenOdd;\n\
    else\n\
      return this.m_SubjFillType == ClipperLib.PolyFillType.pftEvenOdd;\n\
  };\n\
  ClipperLib.Clipper.prototype.IsContributing = function (edge)\n\
  {\n\
    var pft, pft2;\n\
    if (edge.PolyTyp == ClipperLib.PolyType.ptSubject)\n\
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
      if (edge.WindDelta === 0 && edge.WindCnt != 1)\n\
        return false;\n\
      break;\n\
    case ClipperLib.PolyFillType.pftNonZero:\n\
      if (Math.abs(edge.WindCnt) != 1)\n\
        return false;\n\
      break;\n\
    case ClipperLib.PolyFillType.pftPositive:\n\
      if (edge.WindCnt != 1)\n\
        return false;\n\
      break;\n\
    default:\n\
      if (edge.WindCnt != -1)\n\
        return false;\n\
      break;\n\
    }\n\
    switch (this.m_ClipType)\n\
    {\n\
    case ClipperLib.ClipType.ctIntersection:\n\
      switch (pft2)\n\
      {\n\
      case ClipperLib.PolyFillType.pftEvenOdd:\n\
      case ClipperLib.PolyFillType.pftNonZero:\n\
        return (edge.WindCnt2 !== 0);\n\
      case ClipperLib.PolyFillType.pftPositive:\n\
        return (edge.WindCnt2 > 0);\n\
      default:\n\
        return (edge.WindCnt2 < 0);\n\
      }\n\
    case ClipperLib.ClipType.ctUnion:\n\
      switch (pft2)\n\
      {\n\
      case ClipperLib.PolyFillType.pftEvenOdd:\n\
      case ClipperLib.PolyFillType.pftNonZero:\n\
        return (edge.WindCnt2 === 0);\n\
      case ClipperLib.PolyFillType.pftPositive:\n\
        return (edge.WindCnt2 <= 0);\n\
      default:\n\
        return (edge.WindCnt2 >= 0);\n\
      }\n\
    case ClipperLib.ClipType.ctDifference:\n\
      if (edge.PolyTyp == ClipperLib.PolyType.ptSubject)\n\
        switch (pft2)\n\
        {\n\
        case ClipperLib.PolyFillType.pftEvenOdd:\n\
        case ClipperLib.PolyFillType.pftNonZero:\n\
          return (edge.WindCnt2 === 0);\n\
        case ClipperLib.PolyFillType.pftPositive:\n\
          return (edge.WindCnt2 <= 0);\n\
        default:\n\
          return (edge.WindCnt2 >= 0);\n\
        }\n\
      else\n\
        switch (pft2)\n\
        {\n\
        case ClipperLib.PolyFillType.pftEvenOdd:\n\
        case ClipperLib.PolyFillType.pftNonZero:\n\
          return (edge.WindCnt2 !== 0);\n\
        case ClipperLib.PolyFillType.pftPositive:\n\
          return (edge.WindCnt2 > 0);\n\
        default:\n\
          return (edge.WindCnt2 < 0);\n\
        }\n\
    case ClipperLib.ClipType.ctXor:\n\
      if (edge.WindDelta === 0)\n\
        switch (pft2)\n\
        {\n\
        case ClipperLib.PolyFillType.pftEvenOdd:\n\
        case ClipperLib.PolyFillType.pftNonZero:\n\
          return (edge.WindCnt2 === 0);\n\
        case ClipperLib.PolyFillType.pftPositive:\n\
          return (edge.WindCnt2 <= 0);\n\
        default:\n\
          return (edge.WindCnt2 >= 0);\n\
        }\n\
      else\n\
        return true;\n\
    }\n\
    return true;\n\
  };\n\
  ClipperLib.Clipper.prototype.SetWindingCount = function (edge)\n\
  {\n\
    var e = edge.PrevInAEL;\n\
    //find the edge of the same polytype that immediately preceeds 'edge' in AEL\n\
    while (e !== null && ((e.PolyTyp != edge.PolyTyp) || (e.WindDelta === 0)))\n\
      e = e.PrevInAEL;\n\
    if (e === null)\n\
    {\n\
      edge.WindCnt = (edge.WindDelta === 0 ? 1 : edge.WindDelta);\n\
      edge.WindCnt2 = 0;\n\
      e = this.m_ActiveEdges;\n\
      //ie get ready to calc WindCnt2\n\
    }\n\
    else if (edge.WindDelta === 0 && this.m_ClipType != ClipperLib.ClipType.ctUnion)\n\
    {\n\
      edge.WindCnt = 1;\n\
      edge.WindCnt2 = e.WindCnt2;\n\
      e = e.NextInAEL;\n\
      //ie get ready to calc WindCnt2\n\
    }\n\
    else if (this.IsEvenOddFillType(edge))\n\
    {\n\
      //EvenOdd filling ...\n\
      if (edge.WindDelta === 0)\n\
      {\n\
        //are we inside a subj polygon ...\n\
        var Inside = true;\n\
        var e2 = e.PrevInAEL;\n\
        while (e2 !== null)\n\
        {\n\
          if (e2.PolyTyp == e.PolyTyp && e2.WindDelta !== 0)\n\
            Inside = !Inside;\n\
          e2 = e2.PrevInAEL;\n\
        }\n\
        edge.WindCnt = (Inside ? 0 : 1);\n\
      }\n\
      else\n\
      {\n\
        edge.WindCnt = edge.WindDelta;\n\
      }\n\
      edge.WindCnt2 = e.WindCnt2;\n\
      e = e.NextInAEL;\n\
      //ie get ready to calc WindCnt2\n\
    }\n\
    else\n\
    {\n\
      //nonZero, Positive or Negative filling ...\n\
      if (e.WindCnt * e.WindDelta < 0)\n\
      {\n\
        //prev edge is 'decreasing' WindCount (WC) toward zero\n\
        //so we're outside the previous polygon ...\n\
        if (Math.abs(e.WindCnt) > 1)\n\
        {\n\
          //outside prev poly but still inside another.\n\
          //when reversing direction of prev poly use the same WC \n\
          if (e.WindDelta * edge.WindDelta < 0)\n\
            edge.WindCnt = e.WindCnt;\n\
          else\n\
            edge.WindCnt = e.WindCnt + edge.WindDelta;\n\
        }\n\
        else\n\
          edge.WindCnt = (edge.WindDelta === 0 ? 1 : edge.WindDelta);\n\
      }\n\
      else\n\
      {\n\
        //prev edge is 'increasing' WindCount (WC) away from zero\n\
        //so we're inside the previous polygon ...\n\
        if (edge.WindDelta === 0)\n\
          edge.WindCnt = (e.WindCnt < 0 ? e.WindCnt - 1 : e.WindCnt + 1);\n\
        else if (e.WindDelta * edge.WindDelta < 0)\n\
          edge.WindCnt = e.WindCnt;\n\
        else\n\
          edge.WindCnt = e.WindCnt + edge.WindDelta;\n\
      }\n\
      edge.WindCnt2 = e.WindCnt2;\n\
      e = e.NextInAEL;\n\
      //ie get ready to calc WindCnt2\n\
    }\n\
    //update WindCnt2 ...\n\
    if (this.IsEvenOddAltFillType(edge))\n\
    {\n\
      //EvenOdd filling ...\n\
      while (e != edge)\n\
      {\n\
        if (e.WindDelta !== 0)\n\
          edge.WindCnt2 = (edge.WindCnt2 === 0 ? 1 : 0);\n\
        e = e.NextInAEL;\n\
      }\n\
    }\n\
    else\n\
    {\n\
      //nonZero, Positive or Negative filling ...\n\
      while (e != edge)\n\
      {\n\
        edge.WindCnt2 += e.WindDelta;\n\
        e = e.NextInAEL;\n\
      }\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.AddEdgeToSEL = function (edge)\n\
  {\n\
    //SEL pointers in PEdge are reused to build a list of horizontal edges.\n\
    //However, we don't need to worry about order with horizontal edge processing.\n\
    if (this.m_SortedEdges === null)\n\
    {\n\
      this.m_SortedEdges = edge;\n\
      edge.PrevInSEL = null;\n\
      edge.NextInSEL = null;\n\
    }\n\
    else\n\
    {\n\
      edge.NextInSEL = this.m_SortedEdges;\n\
      edge.PrevInSEL = null;\n\
      this.m_SortedEdges.PrevInSEL = edge;\n\
      this.m_SortedEdges = edge;\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.CopyAELToSEL = function ()\n\
  {\n\
    var e = this.m_ActiveEdges;\n\
    this.m_SortedEdges = e;\n\
    while (e !== null)\n\
    {\n\
      e.PrevInSEL = e.PrevInAEL;\n\
      e.NextInSEL = e.NextInAEL;\n\
      e = e.NextInAEL;\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.SwapPositionsInAEL = function (edge1, edge2)\n\
  {\n\
    //check that one or other edge hasn't already been removed from AEL ...\n\
    if (edge1.NextInAEL == edge1.PrevInAEL || edge2.NextInAEL == edge2.PrevInAEL)\n\
      return;\n\
    if (edge1.NextInAEL == edge2)\n\
    {\n\
      var next = edge2.NextInAEL;\n\
      if (next !== null)\n\
        next.PrevInAEL = edge1;\n\
      var prev = edge1.PrevInAEL;\n\
      if (prev !== null)\n\
        prev.NextInAEL = edge2;\n\
      edge2.PrevInAEL = prev;\n\
      edge2.NextInAEL = edge1;\n\
      edge1.PrevInAEL = edge2;\n\
      edge1.NextInAEL = next;\n\
    }\n\
    else if (edge2.NextInAEL == edge1)\n\
    {\n\
      var next = edge1.NextInAEL;\n\
      if (next !== null)\n\
        next.PrevInAEL = edge2;\n\
      var prev = edge2.PrevInAEL;\n\
      if (prev !== null)\n\
        prev.NextInAEL = edge1;\n\
      edge1.PrevInAEL = prev;\n\
      edge1.NextInAEL = edge2;\n\
      edge2.PrevInAEL = edge1;\n\
      edge2.NextInAEL = next;\n\
    }\n\
    else\n\
    {\n\
      var next = edge1.NextInAEL;\n\
      var prev = edge1.PrevInAEL;\n\
      edge1.NextInAEL = edge2.NextInAEL;\n\
      if (edge1.NextInAEL !== null)\n\
        edge1.NextInAEL.PrevInAEL = edge1;\n\
      edge1.PrevInAEL = edge2.PrevInAEL;\n\
      if (edge1.PrevInAEL !== null)\n\
        edge1.PrevInAEL.NextInAEL = edge1;\n\
      edge2.NextInAEL = next;\n\
      if (edge2.NextInAEL !== null)\n\
        edge2.NextInAEL.PrevInAEL = edge2;\n\
      edge2.PrevInAEL = prev;\n\
      if (edge2.PrevInAEL !== null)\n\
        edge2.PrevInAEL.NextInAEL = edge2;\n\
    }\n\
    if (edge1.PrevInAEL === null)\n\
      this.m_ActiveEdges = edge1;\n\
    else if (edge2.PrevInAEL === null)\n\
      this.m_ActiveEdges = edge2;\n\
  };\n\
  ClipperLib.Clipper.prototype.SwapPositionsInSEL = function (edge1, edge2)\n\
  {\n\
    if (edge1.NextInSEL === null && edge1.PrevInSEL === null)\n\
      return;\n\
    if (edge2.NextInSEL === null && edge2.PrevInSEL === null)\n\
      return;\n\
    if (edge1.NextInSEL == edge2)\n\
    {\n\
      var next = edge2.NextInSEL;\n\
      if (next !== null)\n\
        next.PrevInSEL = edge1;\n\
      var prev = edge1.PrevInSEL;\n\
      if (prev !== null)\n\
        prev.NextInSEL = edge2;\n\
      edge2.PrevInSEL = prev;\n\
      edge2.NextInSEL = edge1;\n\
      edge1.PrevInSEL = edge2;\n\
      edge1.NextInSEL = next;\n\
    }\n\
    else if (edge2.NextInSEL == edge1)\n\
    {\n\
      var next = edge1.NextInSEL;\n\
      if (next !== null)\n\
        next.PrevInSEL = edge2;\n\
      var prev = edge2.PrevInSEL;\n\
      if (prev !== null)\n\
        prev.NextInSEL = edge1;\n\
      edge1.PrevInSEL = prev;\n\
      edge1.NextInSEL = edge2;\n\
      edge2.PrevInSEL = edge1;\n\
      edge2.NextInSEL = next;\n\
    }\n\
    else\n\
    {\n\
      var next = edge1.NextInSEL;\n\
      var prev = edge1.PrevInSEL;\n\
      edge1.NextInSEL = edge2.NextInSEL;\n\
      if (edge1.NextInSEL !== null)\n\
        edge1.NextInSEL.PrevInSEL = edge1;\n\
      edge1.PrevInSEL = edge2.PrevInSEL;\n\
      if (edge1.PrevInSEL !== null)\n\
        edge1.PrevInSEL.NextInSEL = edge1;\n\
      edge2.NextInSEL = next;\n\
      if (edge2.NextInSEL !== null)\n\
        edge2.NextInSEL.PrevInSEL = edge2;\n\
      edge2.PrevInSEL = prev;\n\
      if (edge2.PrevInSEL !== null)\n\
        edge2.PrevInSEL.NextInSEL = edge2;\n\
    }\n\
    if (edge1.PrevInSEL === null)\n\
      this.m_SortedEdges = edge1;\n\
    else if (edge2.PrevInSEL === null)\n\
      this.m_SortedEdges = edge2;\n\
  };\n\
  ClipperLib.Clipper.prototype.AddLocalMaxPoly = function (e1, e2, pt)\n\
  {\n\
    this.AddOutPt(e1, pt);\n\
    if (e2.WindDelta == 0) this.AddOutPt(e2, pt);\n\
    if (e1.OutIdx == e2.OutIdx)\n\
    {\n\
      e1.OutIdx = -1;\n\
      e2.OutIdx = -1;\n\
    }\n\
    else if (e1.OutIdx < e2.OutIdx)\n\
      this.AppendPolygon(e1, e2);\n\
    else\n\
      this.AppendPolygon(e2, e1);\n\
  };\n\
  ClipperLib.Clipper.prototype.AddLocalMinPoly = function (e1, e2, pt)\n\
  {\n\
    var result;\n\
    var e, prevE;\n\
    if (ClipperLib.ClipperBase.IsHorizontal(e2) || (e1.Dx > e2.Dx))\n\
    {\n\
      result = this.AddOutPt(e1, pt);\n\
      e2.OutIdx = e1.OutIdx;\n\
      e1.Side = ClipperLib.EdgeSide.esLeft;\n\
      e2.Side = ClipperLib.EdgeSide.esRight;\n\
      e = e1;\n\
      if (e.PrevInAEL == e2)\n\
        prevE = e2.PrevInAEL;\n\
      else\n\
        prevE = e.PrevInAEL;\n\
    }\n\
    else\n\
    {\n\
      result = this.AddOutPt(e2, pt);\n\
      e1.OutIdx = e2.OutIdx;\n\
      e1.Side = ClipperLib.EdgeSide.esRight;\n\
      e2.Side = ClipperLib.EdgeSide.esLeft;\n\
      e = e2;\n\
      if (e.PrevInAEL == e1)\n\
        prevE = e1.PrevInAEL;\n\
      else\n\
        prevE = e.PrevInAEL;\n\
    }\n\
    if (prevE !== null && prevE.OutIdx >= 0 && (ClipperLib.Clipper.TopX(prevE, pt.Y) == ClipperLib.Clipper.TopX(e, pt.Y)) && ClipperLib.ClipperBase.SlopesEqual(e, prevE, this.m_UseFullRange) && (e.WindDelta !== 0) && (prevE.WindDelta !== 0))\n\
    {\n\
      var outPt = this.AddOutPt(prevE, pt);\n\
      this.AddJoin(result, outPt, e.Top);\n\
    }\n\
    return result;\n\
  };\n\
  ClipperLib.Clipper.prototype.CreateOutRec = function ()\n\
  {\n\
    var result = new ClipperLib.OutRec();\n\
    result.Idx = -1;\n\
    result.IsHole = false;\n\
    result.IsOpen = false;\n\
    result.FirstLeft = null;\n\
    result.Pts = null;\n\
    result.BottomPt = null;\n\
    result.PolyNode = null;\n\
    this.m_PolyOuts.push(result);\n\
    result.Idx = this.m_PolyOuts.length - 1;\n\
    return result;\n\
  };\n\
  ClipperLib.Clipper.prototype.AddOutPt = function (e, pt)\n\
  {\n\
    var ToFront = (e.Side == ClipperLib.EdgeSide.esLeft);\n\
    if (e.OutIdx < 0)\n\
    {\n\
      var outRec = this.CreateOutRec();\n\
      outRec.IsOpen = (e.WindDelta === 0);\n\
      var newOp = new ClipperLib.OutPt();\n\
      outRec.Pts = newOp;\n\
      newOp.Idx = outRec.Idx;\n\
      //newOp.Pt = pt;\n\
      newOp.Pt.X = pt.X;\n\
      newOp.Pt.Y = pt.Y;\n\
      newOp.Next = newOp;\n\
      newOp.Prev = newOp;\n\
      if (!outRec.IsOpen)\n\
        this.SetHoleState(e, outRec);\n\
      if (use_xyz)\n\
      {\n\
        if (ClipperLib.IntPoint.op_Equality(pt, e.Bot))\n\
        {\n\
          //newOp.Pt = e.Bot;\n\
          newOp.Pt.X = e.Bot.X;\n\
          newOp.Pt.Y = e.Bot.Y;\n\
          newOp.Pt.Z = e.Bot.Z;\n\
        }\n\
        else if (ClipperLib.IntPoint.op_Equality(pt, e.Top))\n\
        {\n\
          //newOp.Pt = e.Top;\n\
          newOp.Pt.X = e.Top.X;\n\
          newOp.Pt.Y = e.Top.Y;\n\
          newOp.Pt.Z = e.Top.Z;\n\
        }\n\
        else\n\
          this.SetZ(newOp.Pt, e);\n\
      }\n\
      e.OutIdx = outRec.Idx;\n\
      //nb: do this after SetZ !\n\
      return newOp;\n\
    }\n\
    else\n\
    {\n\
      var outRec = this.m_PolyOuts[e.OutIdx];\n\
      //OutRec.Pts is the 'Left-most' point & OutRec.Pts.Prev is the 'Right-most'\n\
      var op = outRec.Pts;\n\
      if (ToFront && ClipperLib.IntPoint.op_Equality(pt, op.Pt))\n\
        return op;\n\
      else if (!ToFront && ClipperLib.IntPoint.op_Equality(pt, op.Prev.Pt))\n\
        return op.Prev;\n\
      var newOp = new ClipperLib.OutPt();\n\
      newOp.Idx = outRec.Idx;\n\
      //newOp.Pt = pt;\n\
      newOp.Pt.X = pt.X;\n\
      newOp.Pt.Y = pt.Y;\n\
      newOp.Next = op;\n\
      newOp.Prev = op.Prev;\n\
      newOp.Prev.Next = newOp;\n\
      op.Prev = newOp;\n\
      if (ToFront)\n\
        outRec.Pts = newOp;\n\
      if (use_xyz)\n\
      {\n\
        if (ClipperLib.IntPoint.op_Equality(pt, e.Bot))\n\
        {\n\
          //newOp.Pt = e.Bot;\n\
          newOp.Pt.X = e.Bot.X;\n\
          newOp.Pt.Y = e.Bot.Y;\n\
          newOp.Pt.Z = e.Bot.Z;\n\
        }\n\
        else if (ClipperLib.IntPoint.op_Equality(pt, e.Top))\n\
        {\n\
          //newOp.Pt = e.Top;\n\
          newOp.Pt.X = e.Top.X;\n\
          newOp.Pt.Y = e.Top.Y;\n\
          newOp.Pt.Z = e.Top.Z;\n\
        }\n\
        else\n\
          this.SetZ(newOp.Pt, e);\n\
      }\n\
      return newOp;\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.SwapPoints = function (pt1, pt2)\n\
  {\n\
    var tmp = new ClipperLib.IntPoint(pt1.Value);\n\
    //pt1.Value = pt2.Value;\n\
    pt1.Value.X = pt2.Value.X;\n\
    pt1.Value.Y = pt2.Value.Y;\n\
    //pt2.Value = tmp;\n\
    pt2.Value.X = tmp.X;\n\
    pt2.Value.Y = tmp.Y;\n\
  };\n\
  ClipperLib.Clipper.prototype.HorzSegmentsOverlap = function (Pt1a, Pt1b, Pt2a, Pt2b)\n\
  {\n\
    //precondition: both segments are horizontal\n\
    if ((Pt1a.X > Pt2a.X) == (Pt1a.X < Pt2b.X))\n\
      return true;\n\
    else if ((Pt1b.X > Pt2a.X) == (Pt1b.X < Pt2b.X))\n\
      return true;\n\
    else if ((Pt2a.X > Pt1a.X) == (Pt2a.X < Pt1b.X))\n\
      return true;\n\
    else if ((Pt2b.X > Pt1a.X) == (Pt2b.X < Pt1b.X))\n\
      return true;\n\
    else if ((Pt1a.X == Pt2a.X) && (Pt1b.X == Pt2b.X))\n\
      return true;\n\
    else if ((Pt1a.X == Pt2b.X) && (Pt1b.X == Pt2a.X))\n\
      return true;\n\
    else\n\
      return false;\n\
  };\n\
  ClipperLib.Clipper.prototype.InsertPolyPtBetween = function (p1, p2, pt)\n\
  {\n\
    var result = new ClipperLib.OutPt();\n\
    //result.Pt = pt;\n\
    result.Pt.X = pt.X;\n\
    result.Pt.Y = pt.Y;\n\
    if (p2 == p1.Next)\n\
    {\n\
      p1.Next = result;\n\
      p2.Prev = result;\n\
      result.Next = p2;\n\
      result.Prev = p1;\n\
    }\n\
    else\n\
    {\n\
      p2.Next = result;\n\
      p1.Prev = result;\n\
      result.Next = p1;\n\
      result.Prev = p2;\n\
    }\n\
    return result;\n\
  };\n\
  ClipperLib.Clipper.prototype.SetHoleState = function (e, outRec)\n\
  {\n\
    var isHole = false;\n\
    var e2 = e.PrevInAEL;\n\
    while (e2 !== null)\n\
    {\n\
      if (e2.OutIdx >= 0 && e2.WindDelta != 0)\n\
      {\n\
        isHole = !isHole;\n\
        if (outRec.FirstLeft === null)\n\
          outRec.FirstLeft = this.m_PolyOuts[e2.OutIdx];\n\
      }\n\
      e2 = e2.PrevInAEL;\n\
    }\n\
    if (isHole)\n\
      outRec.IsHole = true;\n\
  };\n\
  ClipperLib.Clipper.prototype.GetDx = function (pt1, pt2)\n\
  {\n\
    if (pt1.Y == pt2.Y)\n\
      return ClipperLib.ClipperBase.horizontal;\n\
    else\n\
      return (pt2.X - pt1.X) / (pt2.Y - pt1.Y);\n\
  };\n\
  ClipperLib.Clipper.prototype.FirstIsBottomPt = function (btmPt1, btmPt2)\n\
  {\n\
    var p = btmPt1.Prev;\n\
    while ((ClipperLib.IntPoint.op_Equality(p.Pt, btmPt1.Pt)) && (p != btmPt1))\n\
      p = p.Prev;\n\
    var dx1p = Math.abs(this.GetDx(btmPt1.Pt, p.Pt));\n\
    p = btmPt1.Next;\n\
    while ((ClipperLib.IntPoint.op_Equality(p.Pt, btmPt1.Pt)) && (p != btmPt1))\n\
      p = p.Next;\n\
    var dx1n = Math.abs(this.GetDx(btmPt1.Pt, p.Pt));\n\
    p = btmPt2.Prev;\n\
    while ((ClipperLib.IntPoint.op_Equality(p.Pt, btmPt2.Pt)) && (p != btmPt2))\n\
      p = p.Prev;\n\
    var dx2p = Math.abs(this.GetDx(btmPt2.Pt, p.Pt));\n\
    p = btmPt2.Next;\n\
    while ((ClipperLib.IntPoint.op_Equality(p.Pt, btmPt2.Pt)) && (p != btmPt2))\n\
      p = p.Next;\n\
    var dx2n = Math.abs(this.GetDx(btmPt2.Pt, p.Pt));\n\
    return (dx1p >= dx2p && dx1p >= dx2n) || (dx1n >= dx2p && dx1n >= dx2n);\n\
  };\n\
  ClipperLib.Clipper.prototype.GetBottomPt = function (pp)\n\
  {\n\
    var dups = null;\n\
    var p = pp.Next;\n\
    while (p != pp)\n\
    {\n\
      if (p.Pt.Y > pp.Pt.Y)\n\
      {\n\
        pp = p;\n\
        dups = null;\n\
      }\n\
      else if (p.Pt.Y == pp.Pt.Y && p.Pt.X <= pp.Pt.X)\n\
      {\n\
        if (p.Pt.X < pp.Pt.X)\n\
        {\n\
          dups = null;\n\
          pp = p;\n\
        }\n\
        else\n\
        {\n\
          if (p.Next != pp && p.Prev != pp)\n\
            dups = p;\n\
        }\n\
      }\n\
      p = p.Next;\n\
    }\n\
    if (dups !== null)\n\
    {\n\
      //there appears to be at least 2 vertices at bottomPt so ...\n\
      while (dups != p)\n\
      {\n\
        if (!this.FirstIsBottomPt(p, dups))\n\
          pp = dups;\n\
        dups = dups.Next;\n\
        while (ClipperLib.IntPoint.op_Inequality(dups.Pt, pp.Pt))\n\
          dups = dups.Next;\n\
      }\n\
    }\n\
    return pp;\n\
  };\n\
  ClipperLib.Clipper.prototype.GetLowermostRec = function (outRec1, outRec2)\n\
  {\n\
    //work out which polygon fragment has the correct hole state ...\n\
    if (outRec1.BottomPt === null)\n\
      outRec1.BottomPt = this.GetBottomPt(outRec1.Pts);\n\
    if (outRec2.BottomPt === null)\n\
      outRec2.BottomPt = this.GetBottomPt(outRec2.Pts);\n\
    var bPt1 = outRec1.BottomPt;\n\
    var bPt2 = outRec2.BottomPt;\n\
    if (bPt1.Pt.Y > bPt2.Pt.Y)\n\
      return outRec1;\n\
    else if (bPt1.Pt.Y < bPt2.Pt.Y)\n\
      return outRec2;\n\
    else if (bPt1.Pt.X < bPt2.Pt.X)\n\
      return outRec1;\n\
    else if (bPt1.Pt.X > bPt2.Pt.X)\n\
      return outRec2;\n\
    else if (bPt1.Next == bPt1)\n\
      return outRec2;\n\
    else if (bPt2.Next == bPt2)\n\
      return outRec1;\n\
    else if (this.FirstIsBottomPt(bPt1, bPt2))\n\
      return outRec1;\n\
    else\n\
      return outRec2;\n\
  };\n\
  ClipperLib.Clipper.prototype.Param1RightOfParam2 = function (outRec1, outRec2)\n\
  {\n\
    do {\n\
      outRec1 = outRec1.FirstLeft;\n\
      if (outRec1 == outRec2)\n\
        return true;\n\
    }\n\
    while (outRec1 !== null)\n\
    return false;\n\
  };\n\
  ClipperLib.Clipper.prototype.GetOutRec = function (idx)\n\
  {\n\
    var outrec = this.m_PolyOuts[idx];\n\
    while (outrec != this.m_PolyOuts[outrec.Idx])\n\
      outrec = this.m_PolyOuts[outrec.Idx];\n\
    return outrec;\n\
  };\n\
  ClipperLib.Clipper.prototype.AppendPolygon = function (e1, e2)\n\
  {\n\
    //get the start and ends of both output polygons ...\n\
    var outRec1 = this.m_PolyOuts[e1.OutIdx];\n\
    var outRec2 = this.m_PolyOuts[e2.OutIdx];\n\
    var holeStateRec;\n\
    if (this.Param1RightOfParam2(outRec1, outRec2))\n\
      holeStateRec = outRec2;\n\
    else if (this.Param1RightOfParam2(outRec2, outRec1))\n\
      holeStateRec = outRec1;\n\
    else\n\
      holeStateRec = this.GetLowermostRec(outRec1, outRec2);\n\
    var p1_lft = outRec1.Pts;\n\
    var p1_rt = p1_lft.Prev;\n\
    var p2_lft = outRec2.Pts;\n\
    var p2_rt = p2_lft.Prev;\n\
    var side;\n\
    //join e2 poly onto e1 poly and delete pointers to e2 ...\n\
    if (e1.Side == ClipperLib.EdgeSide.esLeft)\n\
    {\n\
      if (e2.Side == ClipperLib.EdgeSide.esLeft)\n\
      {\n\
        //z y x a b c\n\
        this.ReversePolyPtLinks(p2_lft);\n\
        p2_lft.Next = p1_lft;\n\
        p1_lft.Prev = p2_lft;\n\
        p1_rt.Next = p2_rt;\n\
        p2_rt.Prev = p1_rt;\n\
        outRec1.Pts = p2_rt;\n\
      }\n\
      else\n\
      {\n\
        //x y z a b c\n\
        p2_rt.Next = p1_lft;\n\
        p1_lft.Prev = p2_rt;\n\
        p2_lft.Prev = p1_rt;\n\
        p1_rt.Next = p2_lft;\n\
        outRec1.Pts = p2_lft;\n\
      }\n\
      side = ClipperLib.EdgeSide.esLeft;\n\
    }\n\
    else\n\
    {\n\
      if (e2.Side == ClipperLib.EdgeSide.esRight)\n\
      {\n\
        //a b c z y x\n\
        this.ReversePolyPtLinks(p2_lft);\n\
        p1_rt.Next = p2_rt;\n\
        p2_rt.Prev = p1_rt;\n\
        p2_lft.Next = p1_lft;\n\
        p1_lft.Prev = p2_lft;\n\
      }\n\
      else\n\
      {\n\
        //a b c x y z\n\
        p1_rt.Next = p2_lft;\n\
        p2_lft.Prev = p1_rt;\n\
        p1_lft.Prev = p2_rt;\n\
        p2_rt.Next = p1_lft;\n\
      }\n\
      side = ClipperLib.EdgeSide.esRight;\n\
    }\n\
    outRec1.BottomPt = null;\n\
    if (holeStateRec == outRec2)\n\
    {\n\
      if (outRec2.FirstLeft != outRec1)\n\
        outRec1.FirstLeft = outRec2.FirstLeft;\n\
      outRec1.IsHole = outRec2.IsHole;\n\
    }\n\
    outRec2.Pts = null;\n\
    outRec2.BottomPt = null;\n\
    outRec2.FirstLeft = outRec1;\n\
    var OKIdx = e1.OutIdx;\n\
    var ObsoleteIdx = e2.OutIdx;\n\
    e1.OutIdx = -1;\n\
    //nb: safe because we only get here via AddLocalMaxPoly\n\
    e2.OutIdx = -1;\n\
    var e = this.m_ActiveEdges;\n\
    while (e !== null)\n\
    {\n\
      if (e.OutIdx == ObsoleteIdx)\n\
      {\n\
        e.OutIdx = OKIdx;\n\
        e.Side = side;\n\
        break;\n\
      }\n\
      e = e.NextInAEL;\n\
    }\n\
    outRec2.Idx = outRec1.Idx;\n\
  };\n\
  ClipperLib.Clipper.prototype.ReversePolyPtLinks = function (pp)\n\
  {\n\
    if (pp === null)\n\
      return;\n\
    var pp1;\n\
    var pp2;\n\
    pp1 = pp;\n\
    do {\n\
      pp2 = pp1.Next;\n\
      pp1.Next = pp1.Prev;\n\
      pp1.Prev = pp2;\n\
      pp1 = pp2;\n\
    }\n\
    while (pp1 != pp)\n\
  };\n\
  ClipperLib.Clipper.SwapSides = function (edge1, edge2)\n\
  {\n\
    var side = edge1.Side;\n\
    edge1.Side = edge2.Side;\n\
    edge2.Side = side;\n\
  };\n\
  ClipperLib.Clipper.SwapPolyIndexes = function (edge1, edge2)\n\
  {\n\
    var outIdx = edge1.OutIdx;\n\
    edge1.OutIdx = edge2.OutIdx;\n\
    edge2.OutIdx = outIdx;\n\
  };\n\
  ClipperLib.Clipper.prototype.IntersectEdges = function (e1, e2, pt, protect)\n\
  {\n\
    //e1 will be to the left of e2 BELOW the intersection. Therefore e1 is before\n\
    //e2 in AEL except when e1 is being inserted at the intersection point ...\n\
    var e1stops = !protect && e1.NextInLML === null &&\n\
      e1.Top.X == pt.X && e1.Top.Y == pt.Y;\n\
    var e2stops = !protect && e2.NextInLML === null &&\n\
      e2.Top.X == pt.X && e2.Top.Y == pt.Y;\n\
    var e1Contributing = (e1.OutIdx >= 0);\n\
    var e2Contributing = (e2.OutIdx >= 0);\n\
    if (use_lines)\n\
    {\n\
      //if either edge is on an OPEN path ...\n\
      if (e1.WindDelta === 0 || e2.WindDelta === 0)\n\
      {\n\
        //ignore subject-subject open path intersections UNLESS they\n\
        //are both open paths, AND they are both 'contributing maximas' ...\n\
        if (e1.WindDelta === 0 && e2.WindDelta === 0)\n\
        {\n\
          if ((e1stops || e2stops) && e1Contributing && e2Contributing)\n\
            this.AddLocalMaxPoly(e1, e2, pt);\n\
        }\n\
        //if intersecting a subj line with a subj poly ...\n\
        else if (e1.PolyTyp == e2.PolyTyp &&\n\
          e1.WindDelta != e2.WindDelta && this.m_ClipType == ClipperLib.ClipType.ctUnion)\n\
        {\n\
          if (e1.WindDelta === 0)\n\
          {\n\
            if (e2Contributing)\n\
            {\n\
              this.AddOutPt(e1, pt);\n\
              if (e1Contributing)\n\
                e1.OutIdx = -1;\n\
            }\n\
          }\n\
          else\n\
          {\n\
            if (e1Contributing)\n\
            {\n\
              this.AddOutPt(e2, pt);\n\
              if (e2Contributing)\n\
                e2.OutIdx = -1;\n\
            }\n\
          }\n\
        }\n\
        else if (e1.PolyTyp != e2.PolyTyp)\n\
        {\n\
          if ((e1.WindDelta === 0) && Math.abs(e2.WindCnt) == 1 &&\n\
            (this.m_ClipType != ClipperLib.ClipType.ctUnion || e2.WindCnt2 === 0))\n\
          {\n\
            this.AddOutPt(e1, pt);\n\
            if (e1Contributing)\n\
              e1.OutIdx = -1;\n\
          }\n\
          else if ((e2.WindDelta === 0) && (Math.abs(e1.WindCnt) == 1) &&\n\
            (this.m_ClipType != ClipperLib.ClipType.ctUnion || e1.WindCnt2 === 0))\n\
          {\n\
            this.AddOutPt(e2, pt);\n\
            if (e2Contributing)\n\
              e2.OutIdx = -1;\n\
          }\n\
        }\n\
        if (e1stops)\n\
          if (e1.OutIdx < 0)\n\
            this.DeleteFromAEL(e1);\n\
          else\n\
            ClipperLib.Error(\"Error intersecting polylines\");\n\
        if (e2stops)\n\
          if (e2.OutIdx < 0)\n\
            this.DeleteFromAEL(e2);\n\
          else\n\
            ClipperLib.Error(\"Error intersecting polylines\");\n\
        return;\n\
      }\n\
    }\n\
    //update winding counts...\n\
    //assumes that e1 will be to the Right of e2 ABOVE the intersection\n\
    if (e1.PolyTyp == e2.PolyTyp)\n\
    {\n\
      if (this.IsEvenOddFillType(e1))\n\
      {\n\
        var oldE1WindCnt = e1.WindCnt;\n\
        e1.WindCnt = e2.WindCnt;\n\
        e2.WindCnt = oldE1WindCnt;\n\
      }\n\
      else\n\
      {\n\
        if (e1.WindCnt + e2.WindDelta === 0)\n\
          e1.WindCnt = -e1.WindCnt;\n\
        else\n\
          e1.WindCnt += e2.WindDelta;\n\
        if (e2.WindCnt - e1.WindDelta === 0)\n\
          e2.WindCnt = -e2.WindCnt;\n\
        else\n\
          e2.WindCnt -= e1.WindDelta;\n\
      }\n\
    }\n\
    else\n\
    {\n\
      if (!this.IsEvenOddFillType(e2))\n\
        e1.WindCnt2 += e2.WindDelta;\n\
      else\n\
        e1.WindCnt2 = (e1.WindCnt2 === 0) ? 1 : 0;\n\
      if (!this.IsEvenOddFillType(e1))\n\
        e2.WindCnt2 -= e1.WindDelta;\n\
      else\n\
        e2.WindCnt2 = (e2.WindCnt2 === 0) ? 1 : 0;\n\
    }\n\
    var e1FillType, e2FillType, e1FillType2, e2FillType2;\n\
    if (e1.PolyTyp == ClipperLib.PolyType.ptSubject)\n\
    {\n\
      e1FillType = this.m_SubjFillType;\n\
      e1FillType2 = this.m_ClipFillType;\n\
    }\n\
    else\n\
    {\n\
      e1FillType = this.m_ClipFillType;\n\
      e1FillType2 = this.m_SubjFillType;\n\
    }\n\
    if (e2.PolyTyp == ClipperLib.PolyType.ptSubject)\n\
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
      e1Wc = e1.WindCnt;\n\
      break;\n\
    case ClipperLib.PolyFillType.pftNegative:\n\
      e1Wc = -e1.WindCnt;\n\
      break;\n\
    default:\n\
      e1Wc = Math.abs(e1.WindCnt);\n\
      break;\n\
    }\n\
    switch (e2FillType)\n\
    {\n\
    case ClipperLib.PolyFillType.pftPositive:\n\
      e2Wc = e2.WindCnt;\n\
      break;\n\
    case ClipperLib.PolyFillType.pftNegative:\n\
      e2Wc = -e2.WindCnt;\n\
      break;\n\
    default:\n\
      e2Wc = Math.abs(e2.WindCnt);\n\
      break;\n\
    }\n\
    if (e1Contributing && e2Contributing)\n\
    {\n\
      if (e1stops || e2stops || (e1Wc !== 0 && e1Wc != 1) || (e2Wc !== 0 && e2Wc != 1) ||\n\
        (e1.PolyTyp != e2.PolyTyp && this.m_ClipType != ClipperLib.ClipType.ctXor))\n\
        this.AddLocalMaxPoly(e1, e2, pt);\n\
      else\n\
      {\n\
        this.AddOutPt(e1, pt);\n\
        this.AddOutPt(e2, pt);\n\
        ClipperLib.Clipper.SwapSides(e1, e2);\n\
        ClipperLib.Clipper.SwapPolyIndexes(e1, e2);\n\
      }\n\
    }\n\
    else if (e1Contributing)\n\
    {\n\
      if (e2Wc === 0 || e2Wc == 1)\n\
      {\n\
        this.AddOutPt(e1, pt);\n\
        ClipperLib.Clipper.SwapSides(e1, e2);\n\
        ClipperLib.Clipper.SwapPolyIndexes(e1, e2);\n\
      }\n\
    }\n\
    else if (e2Contributing)\n\
    {\n\
      if (e1Wc === 0 || e1Wc == 1)\n\
      {\n\
        this.AddOutPt(e2, pt);\n\
        ClipperLib.Clipper.SwapSides(e1, e2);\n\
        ClipperLib.Clipper.SwapPolyIndexes(e1, e2);\n\
      }\n\
    }\n\
    else if ((e1Wc === 0 || e1Wc == 1) &&\n\
      (e2Wc === 0 || e2Wc == 1) && !e1stops && !e2stops)\n\
    {\n\
      //neither edge is currently contributing ...\n\
      var e1Wc2, e2Wc2;\n\
      switch (e1FillType2)\n\
      {\n\
      case ClipperLib.PolyFillType.pftPositive:\n\
        e1Wc2 = e1.WindCnt2;\n\
        break;\n\
      case ClipperLib.PolyFillType.pftNegative:\n\
        e1Wc2 = -e1.WindCnt2;\n\
        break;\n\
      default:\n\
        e1Wc2 = Math.abs(e1.WindCnt2);\n\
        break;\n\
      }\n\
      switch (e2FillType2)\n\
      {\n\
      case ClipperLib.PolyFillType.pftPositive:\n\
        e2Wc2 = e2.WindCnt2;\n\
        break;\n\
      case ClipperLib.PolyFillType.pftNegative:\n\
        e2Wc2 = -e2.WindCnt2;\n\
        break;\n\
      default:\n\
        e2Wc2 = Math.abs(e2.WindCnt2);\n\
        break;\n\
      }\n\
      if (e1.PolyTyp != e2.PolyTyp)\n\
        this.AddLocalMinPoly(e1, e2, pt);\n\
      else if (e1Wc == 1 && e2Wc == 1)\n\
        switch (this.m_ClipType)\n\
        {\n\
        case ClipperLib.ClipType.ctIntersection:\n\
          if (e1Wc2 > 0 && e2Wc2 > 0)\n\
            this.AddLocalMinPoly(e1, e2, pt);\n\
          break;\n\
        case ClipperLib.ClipType.ctUnion:\n\
          if (e1Wc2 <= 0 && e2Wc2 <= 0)\n\
            this.AddLocalMinPoly(e1, e2, pt);\n\
          break;\n\
        case ClipperLib.ClipType.ctDifference:\n\
          if (((e1.PolyTyp == ClipperLib.PolyType.ptClip) && (e1Wc2 > 0) && (e2Wc2 > 0)) ||\n\
            ((e1.PolyTyp == ClipperLib.PolyType.ptSubject) && (e1Wc2 <= 0) && (e2Wc2 <= 0)))\n\
            this.AddLocalMinPoly(e1, e2, pt);\n\
          break;\n\
        case ClipperLib.ClipType.ctXor:\n\
          this.AddLocalMinPoly(e1, e2, pt);\n\
          break;\n\
        }\n\
      else\n\
        ClipperLib.Clipper.SwapSides(e1, e2);\n\
    }\n\
    if ((e1stops != e2stops) &&\n\
      ((e1stops && (e1.OutIdx >= 0)) || (e2stops && (e2.OutIdx >= 0))))\n\
    {\n\
      ClipperLib.Clipper.SwapSides(e1, e2);\n\
      ClipperLib.Clipper.SwapPolyIndexes(e1, e2);\n\
    }\n\
    //finally, delete any non-contributing maxima edges  ...\n\
    if (e1stops)\n\
      this.DeleteFromAEL(e1);\n\
    if (e2stops)\n\
      this.DeleteFromAEL(e2);\n\
  };\n\
  ClipperLib.Clipper.prototype.DeleteFromAEL = function (e)\n\
  {\n\
    var AelPrev = e.PrevInAEL;\n\
    var AelNext = e.NextInAEL;\n\
    if (AelPrev === null && AelNext === null && (e != this.m_ActiveEdges))\n\
      return;\n\
    //already deleted\n\
    if (AelPrev !== null)\n\
      AelPrev.NextInAEL = AelNext;\n\
    else\n\
      this.m_ActiveEdges = AelNext;\n\
    if (AelNext !== null)\n\
      AelNext.PrevInAEL = AelPrev;\n\
    e.NextInAEL = null;\n\
    e.PrevInAEL = null;\n\
  };\n\
  ClipperLib.Clipper.prototype.DeleteFromSEL = function (e)\n\
  {\n\
    var SelPrev = e.PrevInSEL;\n\
    var SelNext = e.NextInSEL;\n\
    if (SelPrev === null && SelNext === null && (e != this.m_SortedEdges))\n\
      return;\n\
    //already deleted\n\
    if (SelPrev !== null)\n\
      SelPrev.NextInSEL = SelNext;\n\
    else\n\
      this.m_SortedEdges = SelNext;\n\
    if (SelNext !== null)\n\
      SelNext.PrevInSEL = SelPrev;\n\
    e.NextInSEL = null;\n\
    e.PrevInSEL = null;\n\
  };\n\
  ClipperLib.Clipper.prototype.UpdateEdgeIntoAEL = function (e)\n\
  {\n\
    if (e.NextInLML === null)\n\
      ClipperLib.Error(\"UpdateEdgeIntoAEL: invalid call\");\n\
    var AelPrev = e.PrevInAEL;\n\
    var AelNext = e.NextInAEL;\n\
    e.NextInLML.OutIdx = e.OutIdx;\n\
    if (AelPrev !== null)\n\
      AelPrev.NextInAEL = e.NextInLML;\n\
    else\n\
      this.m_ActiveEdges = e.NextInLML;\n\
    if (AelNext !== null)\n\
      AelNext.PrevInAEL = e.NextInLML;\n\
    e.NextInLML.Side = e.Side;\n\
    e.NextInLML.WindDelta = e.WindDelta;\n\
    e.NextInLML.WindCnt = e.WindCnt;\n\
    e.NextInLML.WindCnt2 = e.WindCnt2;\n\
    e = e.NextInLML;\n\
    //    e.Curr = e.Bot;\n\
    e.Curr.X = e.Bot.X;\n\
    e.Curr.Y = e.Bot.Y;\n\
    e.PrevInAEL = AelPrev;\n\
    e.NextInAEL = AelNext;\n\
    if (!ClipperLib.ClipperBase.IsHorizontal(e))\n\
      this.InsertScanbeam(e.Top.Y);\n\
    return e;\n\
  };\n\
  ClipperLib.Clipper.prototype.ProcessHorizontals = function (isTopOfScanbeam)\n\
  {\n\
    var horzEdge = this.m_SortedEdges;\n\
    while (horzEdge !== null)\n\
    {\n\
      this.DeleteFromSEL(horzEdge);\n\
      this.ProcessHorizontal(horzEdge, isTopOfScanbeam);\n\
      horzEdge = this.m_SortedEdges;\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.GetHorzDirection = function (HorzEdge, $var)\n\
  {\n\
    if (HorzEdge.Bot.X < HorzEdge.Top.X)\n\
    {\n\
        $var.Left = HorzEdge.Bot.X;\n\
        $var.Right = HorzEdge.Top.X;\n\
        $var.Dir = ClipperLib.Direction.dLeftToRight;\n\
    }\n\
    else\n\
    {\n\
        $var.Left = HorzEdge.Top.X;\n\
        $var.Right = HorzEdge.Bot.X;\n\
        $var.Dir = ClipperLib.Direction.dRightToLeft;\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.PrepareHorzJoins = function (horzEdge, isTopOfScanbeam)\n\
  {\n\
    //get the last Op for this horizontal edge\n\
    //the point may be anywhere along the horizontal ...\n\
    var outPt = this.m_PolyOuts[horzEdge.OutIdx].Pts;\n\
    if (horzEdge.Side != ClipperLib.EdgeSide.esLeft)\n\
      outPt = outPt.Prev;\n\
    //First, match up overlapping horizontal edges (eg when one polygon's\n\
    //intermediate horz edge overlaps an intermediate horz edge of another, or\n\
    //when one polygon sits on top of another) ...\n\
    //for (var i = 0, ilen = this.m_GhostJoins.length; i < ilen; ++i) {\n\
    //  var j = this.m_GhostJoins[i];\n\
    //  if (this.HorzSegmentsOverlap(j.OutPt1.Pt, j.OffPt, horzEdge.Bot, horzEdge.Top))\n\
    //    this.AddJoin(j.OutPt1, outPt, j.OffPt);\n\
    //}\n\
\n\
    //Also, since horizontal edges at the top of one SB are often removed from\n\
    //the AEL before we process the horizontal edges at the bottom of the next,\n\
    //we need to create 'ghost' Join records of 'contrubuting' horizontals that\n\
    //we can compare with horizontals at the bottom of the next SB.\n\
    if (isTopOfScanbeam)\n\
      if (ClipperLib.IntPoint.op_Equality(outPt.Pt, horzEdge.Top))\n\
        this.AddGhostJoin(outPt, horzEdge.Bot);\n\
      else\n\
        this.AddGhostJoin(outPt, horzEdge.Top);\n\
  };\n\
  ClipperLib.Clipper.prototype.ProcessHorizontal = function (horzEdge, isTopOfScanbeam)\n\
  {\n\
    var $var = {Dir: null, Left: null, Right: null};\n\
    this.GetHorzDirection(horzEdge, $var);\n\
    var dir = $var.Dir;\n\
    var horzLeft = $var.Left;\n\
    var horzRight = $var.Right;\n\
\n\
    var eLastHorz = horzEdge,\n\
      eMaxPair = null;\n\
    while (eLastHorz.NextInLML !== null && ClipperLib.ClipperBase.IsHorizontal(eLastHorz.NextInLML))\n\
      eLastHorz = eLastHorz.NextInLML;\n\
    if (eLastHorz.NextInLML === null)\n\
      eMaxPair = this.GetMaximaPair(eLastHorz);\n\
    for (;;)\n\
    {\n\
      var IsLastHorz = (horzEdge == eLastHorz);\n\
      var e = this.GetNextInAEL(horzEdge, dir);\n\
      while (e !== null)\n\
      {\n\
        //Break if we've got to the end of an intermediate horizontal edge ...\n\
        //nb: Smaller Dx's are to the right of larger Dx's ABOVE the horizontal.\n\
        if (e.Curr.X == horzEdge.Top.X && horzEdge.NextInLML !== null && e.Dx < horzEdge.NextInLML.Dx)\n\
          break;\n\
        var eNext = this.GetNextInAEL(e, dir);\n\
        //saves eNext for later\n\
        if ((dir == ClipperLib.Direction.dLeftToRight && e.Curr.X <= horzRight) || (dir == ClipperLib.Direction.dRightToLeft && e.Curr.X >= horzLeft))\n\
        {\n\
\n\
          if (horzEdge.OutIdx >= 0 && horzEdge.WindDelta != 0)\n\
            this.PrepareHorzJoins(horzEdge, isTopOfScanbeam);\n\
\n\
          //so far we're still in range of the horizontal Edge  but make sure\n\
          //we're at the last of consec. horizontals when matching with eMaxPair\n\
          if (e == eMaxPair && IsLastHorz)\n\
          {\n\
            if (dir == ClipperLib.Direction.dLeftToRight)\n\
              this.IntersectEdges(horzEdge, e, e.Top, false);\n\
            else\n\
              this.IntersectEdges(e, horzEdge, e.Top, false);\n\
            if (eMaxPair.OutIdx >= 0)\n\
              ClipperLib.Error(\"ProcessHorizontal error\");\n\
            return;\n\
          }\n\
          else if (dir == ClipperLib.Direction.dLeftToRight)\n\
          {\n\
            var Pt = new ClipperLib.IntPoint(e.Curr.X, horzEdge.Curr.Y);\n\
            this.IntersectEdges(horzEdge, e, Pt, true);\n\
          }\n\
          else\n\
          {\n\
            var Pt = new ClipperLib.IntPoint(e.Curr.X, horzEdge.Curr.Y);\n\
            this.IntersectEdges(e, horzEdge, Pt, true);\n\
          }\n\
          this.SwapPositionsInAEL(horzEdge, e);\n\
        }\n\
        else if ((dir == ClipperLib.Direction.dLeftToRight && e.Curr.X >= horzRight) || (dir == ClipperLib.Direction.dRightToLeft && e.Curr.X <= horzLeft))\n\
          break;\n\
        e = eNext;\n\
      }\n\
      //end while\n\
      if (horzEdge.OutIdx >= 0 && horzEdge.WindDelta !== 0)\n\
        this.PrepareHorzJoins(horzEdge, isTopOfScanbeam);\n\
      if (horzEdge.NextInLML !== null && ClipperLib.ClipperBase.IsHorizontal(horzEdge.NextInLML))\n\
      {\n\
        horzEdge = this.UpdateEdgeIntoAEL(horzEdge);\n\
        if (horzEdge.OutIdx >= 0)\n\
          this.AddOutPt(horzEdge, horzEdge.Bot);\n\
          \n\
          var $var = {Dir: dir, Left: horzLeft, Right: horzRight};\n\
          this.GetHorzDirection(horzEdge, $var);\n\
          dir = $var.Dir;\n\
          horzLeft = $var.Left;\n\
          horzRight = $var.Right;\n\
      }\n\
      else\n\
        break;\n\
    }\n\
    //end for (;;)\n\
    if (horzEdge.NextInLML !== null)\n\
    {\n\
      if (horzEdge.OutIdx >= 0)\n\
      {\n\
        var op1 = this.AddOutPt(horzEdge, horzEdge.Top);\n\
        horzEdge = this.UpdateEdgeIntoAEL(horzEdge);\n\
        if (horzEdge.WindDelta === 0)\n\
          return;\n\
        //nb: HorzEdge is no longer horizontal here\n\
        var ePrev = horzEdge.PrevInAEL;\n\
        var eNext = horzEdge.NextInAEL;\n\
        if (ePrev !== null && ePrev.Curr.X == horzEdge.Bot.X &&\n\
          ePrev.Curr.Y == horzEdge.Bot.Y && ePrev.WindDelta !== 0 &&\n\
          (ePrev.OutIdx >= 0 && ePrev.Curr.Y > ePrev.Top.Y &&\n\
            ClipperLib.ClipperBase.SlopesEqual(horzEdge, ePrev, this.m_UseFullRange)))\n\
        {\n\
          var op2 = this.AddOutPt(ePrev, horzEdge.Bot);\n\
          this.AddJoin(op1, op2, horzEdge.Top);\n\
        }\n\
        else if (eNext !== null && eNext.Curr.X == horzEdge.Bot.X &&\n\
          eNext.Curr.Y == horzEdge.Bot.Y && eNext.WindDelta !== 0 &&\n\
          eNext.OutIdx >= 0 && eNext.Curr.Y > eNext.Top.Y &&\n\
          ClipperLib.ClipperBase.SlopesEqual(horzEdge, eNext, this.m_UseFullRange))\n\
        {\n\
          var op2 = this.AddOutPt(eNext, horzEdge.Bot);\n\
          this.AddJoin(op1, op2, horzEdge.Top);\n\
        }\n\
      }\n\
      else horzEdge = this.UpdateEdgeIntoAEL(horzEdge);\n\
    }\n\
    else if (eMaxPair !== null)\n\
    {\n\
      if (eMaxPair.OutIdx >= 0)\n\
      {\n\
        if (dir == ClipperLib.Direction.dLeftToRight)\n\
          this.IntersectEdges(horzEdge, eMaxPair, horzEdge.Top, false);\n\
        else\n\
          this.IntersectEdges(eMaxPair, horzEdge, horzEdge.Top, false);\n\
        if (eMaxPair.OutIdx >= 0)\n\
          ClipperLib.Error(\"ProcessHorizontal error\");\n\
      }\n\
      else\n\
      {\n\
        this.DeleteFromAEL(horzEdge);\n\
        this.DeleteFromAEL(eMaxPair);\n\
      }\n\
    }\n\
    else\n\
    {\n\
      if (horzEdge.OutIdx >= 0)\n\
        this.AddOutPt(horzEdge, horzEdge.Top);\n\
      this.DeleteFromAEL(horzEdge);\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.GetNextInAEL = function (e, Direction)\n\
  {\n\
    return Direction == ClipperLib.Direction.dLeftToRight ? e.NextInAEL : e.PrevInAEL;\n\
  };\n\
  ClipperLib.Clipper.prototype.IsMinima = function (e)\n\
  {\n\
    return e !== null && (e.Prev.NextInLML != e) && (e.Next.NextInLML != e);\n\
  };\n\
  ClipperLib.Clipper.prototype.IsMaxima = function (e, Y)\n\
  {\n\
    return (e !== null && e.Top.Y == Y && e.NextInLML === null);\n\
  };\n\
  ClipperLib.Clipper.prototype.IsIntermediate = function (e, Y)\n\
  {\n\
    return (e.Top.Y == Y && e.NextInLML !== null);\n\
  };\n\
  ClipperLib.Clipper.prototype.GetMaximaPair = function (e)\n\
  {\n\
    var result = null;\n\
    if ((ClipperLib.IntPoint.op_Equality(e.Next.Top, e.Top)) && e.Next.NextInLML === null)\n\
      result = e.Next;\n\
    else if ((ClipperLib.IntPoint.op_Equality(e.Prev.Top, e.Top)) && e.Prev.NextInLML === null)\n\
      result = e.Prev;\n\
    if (result !== null && (result.OutIdx == -2 || (result.NextInAEL == result.PrevInAEL && !ClipperLib.ClipperBase.IsHorizontal(result))))\n\
      return null;\n\
    return result;\n\
  };\n\
  ClipperLib.Clipper.prototype.ProcessIntersections = function (botY, topY)\n\
  {\n\
    if (this.m_ActiveEdges == null)\n\
      return true;\n\
    try\n\
    {\n\
      this.BuildIntersectList(botY, topY);\n\
      if (this.m_IntersectList.length == 0)\n\
        return true;\n\
      if (this.m_IntersectList.length == 1 || this.FixupIntersectionOrder())\n\
        this.ProcessIntersectList();\n\
      else\n\
        return false;\n\
    }\n\
    catch ($$e2)\n\
    {\n\
      this.m_SortedEdges = null;\n\
      this.m_IntersectList.length = 0;\n\
      ClipperLib.Error(\"ProcessIntersections error\");\n\
    }\n\
    this.m_SortedEdges = null;\n\
    return true;\n\
  };\n\
  ClipperLib.Clipper.prototype.BuildIntersectList = function (botY, topY)\n\
  {\n\
    if (this.m_ActiveEdges === null)\n\
      return;\n\
    //prepare for sorting ...\n\
    var e = this.m_ActiveEdges;\n\
    //console.log(JSON.stringify(JSON.decycle( e )));\n\
    this.m_SortedEdges = e;\n\
    while (e !== null)\n\
    {\n\
      e.PrevInSEL = e.PrevInAEL;\n\
      e.NextInSEL = e.NextInAEL;\n\
      e.Curr.X = ClipperLib.Clipper.TopX(e, topY);\n\
      e = e.NextInAEL;\n\
    }\n\
    //bubblesort ...\n\
    var isModified = true;\n\
    while (isModified && this.m_SortedEdges !== null)\n\
    {\n\
      isModified = false;\n\
      e = this.m_SortedEdges;\n\
      while (e.NextInSEL !== null)\n\
      {\n\
        var eNext = e.NextInSEL;\n\
        var pt = new ClipperLib.IntPoint();\n\
        //console.log(\"e.Curr.X: \" + e.Curr.X + \" eNext.Curr.X\" + eNext.Curr.X);\n\
        if (e.Curr.X > eNext.Curr.X)\n\
        {\n\
          if (!this.IntersectPoint(e, eNext, pt) && e.Curr.X > eNext.Curr.X + 1)\n\
          {\n\
            //console.log(\"e.Curr.X: \"+JSON.stringify(JSON.decycle( e.Curr.X )));\n\
            //console.log(\"eNext.Curr.X+1: \"+JSON.stringify(JSON.decycle( eNext.Curr.X+1)));\n\
            ClipperLib.Error(\"Intersection error\");\n\
          }\n\
          if (pt.Y > botY)\n\
          {\n\
            pt.Y = botY;\n\
            if (Math.abs(e.Dx) > Math.abs(eNext.Dx))\n\
              pt.X = ClipperLib.Clipper.TopX(eNext, botY);\n\
            else\n\
              pt.X = ClipperLib.Clipper.TopX(e, botY);\n\
          }\n\
          var newNode = new ClipperLib.IntersectNode();\n\
          newNode.Edge1 = e;\n\
          newNode.Edge2 = eNext;\n\
          //newNode.Pt = pt;\n\
          newNode.Pt.X = pt.X;\n\
          newNode.Pt.Y = pt.Y;\n\
          this.m_IntersectList.push(newNode);\n\
          this.SwapPositionsInSEL(e, eNext);\n\
          isModified = true;\n\
        }\n\
        else\n\
          e = eNext;\n\
      }\n\
      if (e.PrevInSEL !== null)\n\
        e.PrevInSEL.NextInSEL = null;\n\
      else\n\
        break;\n\
    }\n\
    this.m_SortedEdges = null;\n\
  };\n\
  ClipperLib.Clipper.prototype.EdgesAdjacent = function (inode)\n\
  {\n\
    return (inode.Edge1.NextInSEL == inode.Edge2) || (inode.Edge1.PrevInSEL == inode.Edge2);\n\
  };\n\
  ClipperLib.Clipper.IntersectNodeSort = function (node1, node2)\n\
  {\n\
    //the following typecast is safe because the differences in Pt.Y will\n\
    //be limited to the height of the scanbeam.\n\
    return (node2.Pt.Y - node1.Pt.Y);\n\
  };\n\
  ClipperLib.Clipper.prototype.FixupIntersectionOrder = function ()\n\
  {\n\
    //pre-condition: intersections are sorted bottom-most first.\n\
    //Now it's crucial that intersections are made only between adjacent edges,\n\
    //so to ensure this the order of intersections may need adjusting ...\n\
    this.m_IntersectList.sort(this.m_IntersectNodeComparer);\n\
    this.CopyAELToSEL();\n\
    var cnt = this.m_IntersectList.length;\n\
    for (var i = 0; i < cnt; i++)\n\
    {\n\
      if (!this.EdgesAdjacent(this.m_IntersectList[i]))\n\
      {\n\
        var j = i + 1;\n\
        while (j < cnt && !this.EdgesAdjacent(this.m_IntersectList[j]))\n\
          j++;\n\
        if (j == cnt)\n\
          return false;\n\
        var tmp = this.m_IntersectList[i];\n\
        this.m_IntersectList[i] = this.m_IntersectList[j];\n\
        this.m_IntersectList[j] = tmp;\n\
      }\n\
      this.SwapPositionsInSEL(this.m_IntersectList[i].Edge1, this.m_IntersectList[i].Edge2);\n\
    }\n\
    return true;\n\
  };\n\
  ClipperLib.Clipper.prototype.ProcessIntersectList = function ()\n\
  {\n\
    for (var i = 0, ilen = this.m_IntersectList.length; i < ilen; i++)\n\
    {\n\
      var iNode = this.m_IntersectList[i];\n\
      this.IntersectEdges(iNode.Edge1, iNode.Edge2, iNode.Pt, true);\n\
      this.SwapPositionsInAEL(iNode.Edge1, iNode.Edge2);\n\
    }\n\
    this.m_IntersectList.length = 0;\n\
  };\n\
  /*\n\
  --------------------------------\n\
  Round speedtest: http://jsperf.com/fastest-round\n\
  --------------------------------\n\
  */\n\
  var R1 = function (a)\n\
  {\n\
    return a < 0 ? Math.ceil(a - 0.5) : Math.round(a)\n\
  };\n\
  var R2 = function (a)\n\
  {\n\
    return a < 0 ? Math.ceil(a - 0.5) : Math.floor(a + 0.5)\n\
  };\n\
  var R3 = function (a)\n\
  {\n\
    return a < 0 ? -Math.round(Math.abs(a)) : Math.round(a)\n\
  };\n\
  var R4 = function (a)\n\
  {\n\
    if (a < 0)\n\
    {\n\
      a -= 0.5;\n\
      return a < -2147483648 ? Math.ceil(a) : a | 0;\n\
    }\n\
    else\n\
    {\n\
      a += 0.5;\n\
      return a > 2147483647 ? Math.floor(a) : a | 0;\n\
    }\n\
  };\n\
  if (browser.msie) ClipperLib.Clipper.Round = R1;\n\
  else if (browser.chromium) ClipperLib.Clipper.Round = R3;\n\
  else if (browser.safari) ClipperLib.Clipper.Round = R4;\n\
  else ClipperLib.Clipper.Round = R2; // eg. browser.chrome || browser.firefox || browser.opera\n\
  ClipperLib.Clipper.TopX = function (edge, currentY)\n\
  {\n\
    //if (edge.Bot == edge.Curr) alert (\"edge.Bot = edge.Curr\");\n\
    //if (edge.Bot == edge.Top) alert (\"edge.Bot = edge.Top\");\n\
    if (currentY == edge.Top.Y)\n\
      return edge.Top.X;\n\
    return edge.Bot.X + ClipperLib.Clipper.Round(edge.Dx * (currentY - edge.Bot.Y));\n\
  };\n\
  ClipperLib.Clipper.prototype.IntersectPoint = function (edge1, edge2, ip)\n\
  {\n\
    ip.X = 0;\n\
    ip.Y = 0;\n\
    var b1, b2;\n\
    //nb: with very large coordinate values, it's possible for SlopesEqual() to \n\
    //return false but for the edge.Dx value be equal due to double precision rounding.\n\
    if (ClipperLib.ClipperBase.SlopesEqual(edge1, edge2, this.m_UseFullRange) || edge1.Dx == edge2.Dx)\n\
    {\n\
      if (edge2.Bot.Y > edge1.Bot.Y)\n\
      {\n\
        ip.X = edge2.Bot.X;\n\
        ip.Y = edge2.Bot.Y;\n\
      }\n\
      else\n\
      {\n\
        ip.X = edge1.Bot.X;\n\
        ip.Y = edge1.Bot.Y;\n\
      }\n\
      return false;\n\
    }\n\
    else if (edge1.Delta.X === 0)\n\
    {\n\
      ip.X = edge1.Bot.X;\n\
      if (ClipperLib.ClipperBase.IsHorizontal(edge2))\n\
      {\n\
        ip.Y = edge2.Bot.Y;\n\
      }\n\
      else\n\
      {\n\
        b2 = edge2.Bot.Y - (edge2.Bot.X / edge2.Dx);\n\
        ip.Y = ClipperLib.Clipper.Round(ip.X / edge2.Dx + b2);\n\
      }\n\
    }\n\
    else if (edge2.Delta.X === 0)\n\
    {\n\
      ip.X = edge2.Bot.X;\n\
      if (ClipperLib.ClipperBase.IsHorizontal(edge1))\n\
      {\n\
        ip.Y = edge1.Bot.Y;\n\
      }\n\
      else\n\
      {\n\
        b1 = edge1.Bot.Y - (edge1.Bot.X / edge1.Dx);\n\
        ip.Y = ClipperLib.Clipper.Round(ip.X / edge1.Dx + b1);\n\
      }\n\
    }\n\
    else\n\
    {\n\
      b1 = edge1.Bot.X - edge1.Bot.Y * edge1.Dx;\n\
      b2 = edge2.Bot.X - edge2.Bot.Y * edge2.Dx;\n\
      var q = (b2 - b1) / (edge1.Dx - edge2.Dx);\n\
      ip.Y = ClipperLib.Clipper.Round(q);\n\
      if (Math.abs(edge1.Dx) < Math.abs(edge2.Dx))\n\
        ip.X = ClipperLib.Clipper.Round(edge1.Dx * q + b1);\n\
      else\n\
        ip.X = ClipperLib.Clipper.Round(edge2.Dx * q + b2);\n\
    }\n\
    if (ip.Y < edge1.Top.Y || ip.Y < edge2.Top.Y)\n\
    {\n\
      if (edge1.Top.Y > edge2.Top.Y)\n\
      {\n\
        ip.Y = edge1.Top.Y;\n\
        ip.X = ClipperLib.Clipper.TopX(edge2, edge1.Top.Y);\n\
        return ip.X < edge1.Top.X;\n\
      }\n\
      else\n\
        ip.Y = edge2.Top.Y;\n\
      if (Math.abs(edge1.Dx) < Math.abs(edge2.Dx))\n\
        ip.X = ClipperLib.Clipper.TopX(edge1, ip.Y);\n\
      else\n\
        ip.X = ClipperLib.Clipper.TopX(edge2, ip.Y);\n\
    }\n\
    return true;\n\
  };\n\
  ClipperLib.Clipper.prototype.ProcessEdgesAtTopOfScanbeam = function (topY)\n\
  {\n\
    var e = this.m_ActiveEdges;\n\
    while (e !== null)\n\
    {\n\
      //1. process maxima, treating them as if they're 'bent' horizontal edges,\n\
      //   but exclude maxima with horizontal edges. nb: e can't be a horizontal.\n\
      var IsMaximaEdge = this.IsMaxima(e, topY);\n\
      if (IsMaximaEdge)\n\
      {\n\
        var eMaxPair = this.GetMaximaPair(e);\n\
        IsMaximaEdge = (eMaxPair === null || !ClipperLib.ClipperBase.IsHorizontal(eMaxPair));\n\
      }\n\
      if (IsMaximaEdge)\n\
      {\n\
        var ePrev = e.PrevInAEL;\n\
        this.DoMaxima(e);\n\
        if (ePrev === null)\n\
          e = this.m_ActiveEdges;\n\
        else\n\
          e = ePrev.NextInAEL;\n\
      }\n\
      else\n\
      {\n\
        //2. promote horizontal edges, otherwise update Curr.X and Curr.Y ...\n\
        if (this.IsIntermediate(e, topY) && ClipperLib.ClipperBase.IsHorizontal(e.NextInLML))\n\
        {\n\
          e = this.UpdateEdgeIntoAEL(e);\n\
          if (e.OutIdx >= 0)\n\
            this.AddOutPt(e, e.Bot);\n\
          this.AddEdgeToSEL(e);\n\
        }\n\
        else\n\
        {\n\
          e.Curr.X = ClipperLib.Clipper.TopX(e, topY);\n\
          e.Curr.Y = topY;\n\
        }\n\
        if (this.StrictlySimple)\n\
        {\n\
          var ePrev = e.PrevInAEL;\n\
          if ((e.OutIdx >= 0) && (e.WindDelta !== 0) && ePrev !== null &&\n\
            (ePrev.OutIdx >= 0) && (ePrev.Curr.X == e.Curr.X) &&\n\
            (ePrev.WindDelta !== 0))\n\
          {\n\
            var op = this.AddOutPt(ePrev, e.Curr);\n\
            var op2 = this.AddOutPt(e, e.Curr);\n\
            this.AddJoin(op, op2, e.Curr);\n\
            //StrictlySimple (type-3) join\n\
          }\n\
        }\n\
        e = e.NextInAEL;\n\
      }\n\
    }\n\
    //3. Process horizontals at the Top of the scanbeam ...\n\
    this.ProcessHorizontals(true);\n\
    //4. Promote intermediate vertices ...\n\
    e = this.m_ActiveEdges;\n\
    while (e !== null)\n\
    {\n\
      if (this.IsIntermediate(e, topY))\n\
      {\n\
        var op = null;\n\
        if (e.OutIdx >= 0)\n\
          op = this.AddOutPt(e, e.Top);\n\
        e = this.UpdateEdgeIntoAEL(e);\n\
        //if output polygons share an edge, they'll need joining later ...\n\
        var ePrev = e.PrevInAEL;\n\
        var eNext = e.NextInAEL;\n\
        if (ePrev !== null && ePrev.Curr.X == e.Bot.X &&\n\
          ePrev.Curr.Y == e.Bot.Y && op !== null &&\n\
          ePrev.OutIdx >= 0 && ePrev.Curr.Y > ePrev.Top.Y &&\n\
          ClipperLib.ClipperBase.SlopesEqual(e, ePrev, this.m_UseFullRange) &&\n\
          (e.WindDelta !== 0) && (ePrev.WindDelta !== 0))\n\
        {\n\
          var op2 = this.AddOutPt(ePrev, e.Bot);\n\
          this.AddJoin(op, op2, e.Top);\n\
        }\n\
        else if (eNext !== null && eNext.Curr.X == e.Bot.X &&\n\
          eNext.Curr.Y == e.Bot.Y && op !== null &&\n\
          eNext.OutIdx >= 0 && eNext.Curr.Y > eNext.Top.Y &&\n\
          ClipperLib.ClipperBase.SlopesEqual(e, eNext, this.m_UseFullRange) &&\n\
          (e.WindDelta !== 0) && (eNext.WindDelta !== 0))\n\
        {\n\
          var op2 = this.AddOutPt(eNext, e.Bot);\n\
          this.AddJoin(op, op2, e.Top);\n\
        }\n\
      }\n\
      e = e.NextInAEL;\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.DoMaxima = function (e)\n\
  {\n\
    var eMaxPair = this.GetMaximaPair(e);\n\
    if (eMaxPair === null)\n\
    {\n\
      if (e.OutIdx >= 0)\n\
        this.AddOutPt(e, e.Top);\n\
      this.DeleteFromAEL(e);\n\
      return;\n\
    }\n\
    var eNext = e.NextInAEL;\n\
    var use_lines = true;\n\
    while (eNext !== null && eNext != eMaxPair)\n\
    {\n\
      this.IntersectEdges(e, eNext, e.Top, true);\n\
      this.SwapPositionsInAEL(e, eNext);\n\
      eNext = e.NextInAEL;\n\
    }\n\
    if (e.OutIdx == -1 && eMaxPair.OutIdx == -1)\n\
    {\n\
      this.DeleteFromAEL(e);\n\
      this.DeleteFromAEL(eMaxPair);\n\
    }\n\
    else if (e.OutIdx >= 0 && eMaxPair.OutIdx >= 0)\n\
    {\n\
      this.IntersectEdges(e, eMaxPair, e.Top, false);\n\
    }\n\
    else if (use_lines && e.WindDelta === 0)\n\
    {\n\
      if (e.OutIdx >= 0)\n\
      {\n\
        this.AddOutPt(e, e.Top);\n\
        e.OutIdx = -1;\n\
      }\n\
      this.DeleteFromAEL(e);\n\
      if (eMaxPair.OutIdx >= 0)\n\
      {\n\
        this.AddOutPt(eMaxPair, e.Top);\n\
        eMaxPair.OutIdx = -1;\n\
      }\n\
      this.DeleteFromAEL(eMaxPair);\n\
    }\n\
    else\n\
      ClipperLib.Error(\"DoMaxima error\");\n\
  };\n\
  ClipperLib.Clipper.ReversePaths = function (polys)\n\
  {\n\
    for (var i = 0, len = polys.length; i < len; i++)\n\
      polys[i].reverse();\n\
  };\n\
  ClipperLib.Clipper.Orientation = function (poly)\n\
  {\n\
    return ClipperLib.Clipper.Area(poly) >= 0;\n\
  };\n\
  ClipperLib.Clipper.prototype.PointCount = function (pts)\n\
  {\n\
    if (pts === null)\n\
      return 0;\n\
    var result = 0;\n\
    var p = pts;\n\
    do {\n\
      result++;\n\
      p = p.Next;\n\
    }\n\
    while (p != pts)\n\
    return result;\n\
  };\n\
  ClipperLib.Clipper.prototype.BuildResult = function (polyg)\n\
  {\n\
    ClipperLib.Clear(polyg);\n\
    for (var i = 0, ilen = this.m_PolyOuts.length; i < ilen; i++)\n\
    {\n\
      var outRec = this.m_PolyOuts[i];\n\
      if (outRec.Pts === null)\n\
        continue;\n\
      var p = outRec.Pts.Prev;\n\
      var cnt = this.PointCount(p);\n\
      if (cnt < 2)\n\
        continue;\n\
      var pg = new Array(cnt);\n\
      for (var j = 0; j < cnt; j++)\n\
      {\n\
        pg[j] = p.Pt;\n\
        p = p.Prev;\n\
      }\n\
      polyg.push(pg);\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.BuildResult2 = function (polytree)\n\
  {\n\
    polytree.Clear();\n\
    //add each output polygon/contour to polytree ...\n\
    //polytree.m_AllPolys.set_Capacity(this.m_PolyOuts.length);\n\
    for (var i = 0, ilen = this.m_PolyOuts.length; i < ilen; i++)\n\
    {\n\
      var outRec = this.m_PolyOuts[i];\n\
      var cnt = this.PointCount(outRec.Pts);\n\
      if ((outRec.IsOpen && cnt < 2) || (!outRec.IsOpen && cnt < 3))\n\
        continue;\n\
      this.FixHoleLinkage(outRec);\n\
      var pn = new ClipperLib.PolyNode();\n\
      polytree.m_AllPolys.push(pn);\n\
      outRec.PolyNode = pn;\n\
      pn.m_polygon.length = cnt;\n\
      var op = outRec.Pts.Prev;\n\
      for (var j = 0; j < cnt; j++)\n\
      {\n\
        pn.m_polygon[j] = op.Pt;\n\
        op = op.Prev;\n\
      }\n\
    }\n\
    //fixup PolyNode links etc ...\n\
    //polytree.m_Childs.set_Capacity(this.m_PolyOuts.length);\n\
    for (var i = 0, ilen = this.m_PolyOuts.length; i < ilen; i++)\n\
    {\n\
      var outRec = this.m_PolyOuts[i];\n\
      if (outRec.PolyNode === null)\n\
        continue;\n\
      else if (outRec.IsOpen)\n\
      {\n\
        outRec.PolyNode.IsOpen = true;\n\
        polytree.AddChild(outRec.PolyNode);\n\
      }\n\
      else if (outRec.FirstLeft !== null && outRec.FirstLeft.PolyNode != null)\n\
        outRec.FirstLeft.PolyNode.AddChild(outRec.PolyNode);\n\
      else\n\
        polytree.AddChild(outRec.PolyNode);\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.FixupOutPolygon = function (outRec)\n\
  {\n\
    //FixupOutPolygon() - removes duplicate points and simplifies consecutive\n\
    //parallel edges by removing the middle vertex.\n\
    var lastOK = null;\n\
    outRec.BottomPt = null;\n\
    var pp = outRec.Pts;\n\
    for (;;)\n\
    {\n\
      if (pp.Prev == pp || pp.Prev == pp.Next)\n\
      {\n\
        this.DisposeOutPts(pp);\n\
        outRec.Pts = null;\n\
        return;\n\
      }\n\
      //test for duplicate points and collinear edges ...\n\
      if ((ClipperLib.IntPoint.op_Equality(pp.Pt, pp.Next.Pt)) || (ClipperLib.IntPoint.op_Equality(pp.Pt, pp.Prev.Pt)) ||\n\
        (ClipperLib.ClipperBase.SlopesEqual(pp.Prev.Pt, pp.Pt, pp.Next.Pt, this.m_UseFullRange) &&\n\
          (!this.PreserveCollinear || !this.Pt2IsBetweenPt1AndPt3(pp.Prev.Pt, pp.Pt, pp.Next.Pt))))\n\
      {\n\
        lastOK = null;\n\
        var tmp = pp;\n\
        pp.Prev.Next = pp.Next;\n\
        pp.Next.Prev = pp.Prev;\n\
        pp = pp.Prev;\n\
        tmp = null;\n\
      }\n\
      else if (pp == lastOK)\n\
        break;\n\
      else\n\
      {\n\
        if (lastOK === null)\n\
          lastOK = pp;\n\
        pp = pp.Next;\n\
      }\n\
    }\n\
    outRec.Pts = pp;\n\
  };\n\
  ClipperLib.Clipper.prototype.DupOutPt = function (outPt, InsertAfter)\n\
  {\n\
    var result = new ClipperLib.OutPt();\n\
    //result.Pt = outPt.Pt;\n\
    result.Pt.X = outPt.Pt.X;\n\
    result.Pt.Y = outPt.Pt.Y;\n\
    result.Idx = outPt.Idx;\n\
    if (InsertAfter)\n\
    {\n\
      result.Next = outPt.Next;\n\
      result.Prev = outPt;\n\
      outPt.Next.Prev = result;\n\
      outPt.Next = result;\n\
    }\n\
    else\n\
    {\n\
      result.Prev = outPt.Prev;\n\
      result.Next = outPt;\n\
      outPt.Prev.Next = result;\n\
      outPt.Prev = result;\n\
    }\n\
    return result;\n\
  };\n\
  ClipperLib.Clipper.prototype.GetOverlap = function (a1, a2, b1, b2, $val)\n\
  {\n\
    if (a1 < a2)\n\
    {\n\
      if (b1 < b2)\n\
      {\n\
        $val.Left = Math.max(a1, b1);\n\
        $val.Right = Math.min(a2, b2);\n\
      }\n\
      else\n\
      {\n\
        $val.Left = Math.max(a1, b2);\n\
        $val.Right = Math.min(a2, b1);\n\
      }\n\
    }\n\
    else\n\
    {\n\
      if (b1 < b2)\n\
      {\n\
        $val.Left = Math.max(a2, b1);\n\
        $val.Right = Math.min(a1, b2);\n\
      }\n\
      else\n\
      {\n\
        $val.Left = Math.max(a2, b2);\n\
        $val.Right = Math.min(a1, b1);\n\
      }\n\
    }\n\
    return $val.Left < $val.Right;\n\
  };\n\
  ClipperLib.Clipper.prototype.JoinHorz = function (op1, op1b, op2, op2b, Pt, DiscardLeft)\n\
  {\n\
    var Dir1 = (op1.Pt.X > op1b.Pt.X ? ClipperLib.Direction.dRightToLeft : ClipperLib.Direction.dLeftToRight);\n\
    var Dir2 = (op2.Pt.X > op2b.Pt.X ? ClipperLib.Direction.dRightToLeft : ClipperLib.Direction.dLeftToRight);\n\
    if (Dir1 == Dir2)\n\
      return false;\n\
    //When DiscardLeft, we want Op1b to be on the Left of Op1, otherwise we\n\
    //want Op1b to be on the Right. (And likewise with Op2 and Op2b.)\n\
    //So, to facilitate this while inserting Op1b and Op2b ...\n\
    //when DiscardLeft, make sure we're AT or RIGHT of Pt before adding Op1b,\n\
    //otherwise make sure we're AT or LEFT of Pt. (Likewise with Op2b.)\n\
    if (Dir1 == ClipperLib.Direction.dLeftToRight)\n\
    {\n\
      while (op1.Next.Pt.X <= Pt.X &&\n\
        op1.Next.Pt.X >= op1.Pt.X && op1.Next.Pt.Y == Pt.Y)\n\
        op1 = op1.Next;\n\
      if (DiscardLeft && (op1.Pt.X != Pt.X))\n\
        op1 = op1.Next;\n\
      op1b = this.DupOutPt(op1, !DiscardLeft);\n\
      if (ClipperLib.IntPoint.op_Inequality(op1b.Pt, Pt))\n\
      {\n\
        op1 = op1b;\n\
        //op1.Pt = Pt;\n\
        op1.Pt.X = Pt.X;\n\
        op1.Pt.Y = Pt.Y;\n\
        op1b = this.DupOutPt(op1, !DiscardLeft);\n\
      }\n\
    }\n\
    else\n\
    {\n\
      while (op1.Next.Pt.X >= Pt.X &&\n\
        op1.Next.Pt.X <= op1.Pt.X && op1.Next.Pt.Y == Pt.Y)\n\
        op1 = op1.Next;\n\
      if (!DiscardLeft && (op1.Pt.X != Pt.X))\n\
        op1 = op1.Next;\n\
      op1b = this.DupOutPt(op1, DiscardLeft);\n\
      if (ClipperLib.IntPoint.op_Inequality(op1b.Pt, Pt))\n\
      {\n\
        op1 = op1b;\n\
        //op1.Pt = Pt;\n\
        op1.Pt.X = Pt.X;\n\
        op1.Pt.Y = Pt.Y;\n\
        op1b = this.DupOutPt(op1, DiscardLeft);\n\
      }\n\
    }\n\
    if (Dir2 == ClipperLib.Direction.dLeftToRight)\n\
    {\n\
      while (op2.Next.Pt.X <= Pt.X &&\n\
        op2.Next.Pt.X >= op2.Pt.X && op2.Next.Pt.Y == Pt.Y)\n\
        op2 = op2.Next;\n\
      if (DiscardLeft && (op2.Pt.X != Pt.X))\n\
        op2 = op2.Next;\n\
      op2b = this.DupOutPt(op2, !DiscardLeft);\n\
      if (ClipperLib.IntPoint.op_Inequality(op2b.Pt, Pt))\n\
      {\n\
        op2 = op2b;\n\
        //op2.Pt = Pt;\n\
        op2.Pt.X = Pt.X;\n\
        op2.Pt.Y = Pt.Y;\n\
        op2b = this.DupOutPt(op2, !DiscardLeft);\n\
      }\n\
    }\n\
    else\n\
    {\n\
      while (op2.Next.Pt.X >= Pt.X &&\n\
        op2.Next.Pt.X <= op2.Pt.X && op2.Next.Pt.Y == Pt.Y)\n\
        op2 = op2.Next;\n\
      if (!DiscardLeft && (op2.Pt.X != Pt.X))\n\
        op2 = op2.Next;\n\
      op2b = this.DupOutPt(op2, DiscardLeft);\n\
      if (ClipperLib.IntPoint.op_Inequality(op2b.Pt, Pt))\n\
      {\n\
        op2 = op2b;\n\
        //op2.Pt = Pt;\n\
        op2.Pt.X = Pt.X;\n\
        op2.Pt.Y = Pt.Y;\n\
        op2b = this.DupOutPt(op2, DiscardLeft);\n\
      }\n\
    }\n\
    if ((Dir1 == ClipperLib.Direction.dLeftToRight) == DiscardLeft)\n\
    {\n\
      op1.Prev = op2;\n\
      op2.Next = op1;\n\
      op1b.Next = op2b;\n\
      op2b.Prev = op1b;\n\
    }\n\
    else\n\
    {\n\
      op1.Next = op2;\n\
      op2.Prev = op1;\n\
      op1b.Prev = op2b;\n\
      op2b.Next = op1b;\n\
    }\n\
    return true;\n\
  };\n\
  ClipperLib.Clipper.prototype.JoinPoints = function (j, outRec1, outRec2)\n\
  {\n\
    var op1 = j.OutPt1,\n\
      op1b = new ClipperLib.OutPt();\n\
    var op2 = j.OutPt2,\n\
      op2b = new ClipperLib.OutPt();\n\
    //There are 3 kinds of joins for output polygons ...\n\
    //1. Horizontal joins where Join.OutPt1 & Join.OutPt2 are a vertices anywhere\n\
    //along (horizontal) collinear edges (& Join.OffPt is on the same horizontal).\n\
    //2. Non-horizontal joins where Join.OutPt1 & Join.OutPt2 are at the same\n\
    //location at the Bottom of the overlapping segment (& Join.OffPt is above).\n\
    //3. StrictlySimple joins where edges touch but are not collinear and where\n\
    //Join.OutPt1, Join.OutPt2 & Join.OffPt all share the same point.\n\
    var isHorizontal = (j.OutPt1.Pt.Y == j.OffPt.Y);\n\
    if (isHorizontal && (ClipperLib.IntPoint.op_Equality(j.OffPt, j.OutPt1.Pt)) && (ClipperLib.IntPoint.op_Equality(j.OffPt, j.OutPt2.Pt)))\n\
    {\n\
      //Strictly Simple join ...\n\
      op1b = j.OutPt1.Next;\n\
      while (op1b != op1 && (ClipperLib.IntPoint.op_Equality(op1b.Pt, j.OffPt)))\n\
        op1b = op1b.Next;\n\
      var reverse1 = (op1b.Pt.Y > j.OffPt.Y);\n\
      op2b = j.OutPt2.Next;\n\
      while (op2b != op2 && (ClipperLib.IntPoint.op_Equality(op2b.Pt, j.OffPt)))\n\
        op2b = op2b.Next;\n\
      var reverse2 = (op2b.Pt.Y > j.OffPt.Y);\n\
      if (reverse1 == reverse2)\n\
        return false;\n\
      if (reverse1)\n\
      {\n\
        op1b = this.DupOutPt(op1, false);\n\
        op2b = this.DupOutPt(op2, true);\n\
        op1.Prev = op2;\n\
        op2.Next = op1;\n\
        op1b.Next = op2b;\n\
        op2b.Prev = op1b;\n\
        j.OutPt1 = op1;\n\
        j.OutPt2 = op1b;\n\
        return true;\n\
      }\n\
      else\n\
      {\n\
        op1b = this.DupOutPt(op1, true);\n\
        op2b = this.DupOutPt(op2, false);\n\
        op1.Next = op2;\n\
        op2.Prev = op1;\n\
        op1b.Prev = op2b;\n\
        op2b.Next = op1b;\n\
        j.OutPt1 = op1;\n\
        j.OutPt2 = op1b;\n\
        return true;\n\
      }\n\
    }\n\
    else if (isHorizontal)\n\
    {\n\
      //treat horizontal joins differently to non-horizontal joins since with\n\
      //them we're not yet sure where the overlapping is. OutPt1.Pt & OutPt2.Pt\n\
      //may be anywhere along the horizontal edge.\n\
      op1b = op1;\n\
      while (op1.Prev.Pt.Y == op1.Pt.Y && op1.Prev != op1b && op1.Prev != op2)\n\
        op1 = op1.Prev;\n\
      while (op1b.Next.Pt.Y == op1b.Pt.Y && op1b.Next != op1 && op1b.Next != op2)\n\
        op1b = op1b.Next;\n\
      if (op1b.Next == op1 || op1b.Next == op2)\n\
        return false;\n\
      //a flat 'polygon'\n\
      op2b = op2;\n\
      while (op2.Prev.Pt.Y == op2.Pt.Y && op2.Prev != op2b && op2.Prev != op1b)\n\
        op2 = op2.Prev;\n\
      while (op2b.Next.Pt.Y == op2b.Pt.Y && op2b.Next != op2 && op2b.Next != op1)\n\
        op2b = op2b.Next;\n\
      if (op2b.Next == op2 || op2b.Next == op1)\n\
        return false;\n\
      //a flat 'polygon'\n\
      //Op1 -. Op1b & Op2 -. Op2b are the extremites of the horizontal edges\n\
\n\
      var $val = {Left: null, Right: null};\n\
      if (!this.GetOverlap(op1.Pt.X, op1b.Pt.X, op2.Pt.X, op2b.Pt.X, $val))\n\
        return false;\n\
      var Left = $val.Left;\n\
      var Right = $val.Right;\n\
\n\
      //DiscardLeftSide: when overlapping edges are joined, a spike will created\n\
      //which needs to be cleaned up. However, we don't want Op1 or Op2 caught up\n\
      //on the discard Side as either may still be needed for other joins ...\n\
      var Pt = new ClipperLib.IntPoint();\n\
      var DiscardLeftSide;\n\
      if (op1.Pt.X >= Left && op1.Pt.X <= Right)\n\
      {\n\
        //Pt = op1.Pt;\n\
        Pt.X = op1.Pt.X;\n\
        Pt.Y = op1.Pt.Y;\n\
        DiscardLeftSide = (op1.Pt.X > op1b.Pt.X);\n\
      }\n\
      else if (op2.Pt.X >= Left && op2.Pt.X <= Right)\n\
      {\n\
        //Pt = op2.Pt;\n\
        Pt.X = op2.Pt.X;\n\
        Pt.Y = op2.Pt.Y;\n\
        DiscardLeftSide = (op2.Pt.X > op2b.Pt.X);\n\
      }\n\
      else if (op1b.Pt.X >= Left && op1b.Pt.X <= Right)\n\
      {\n\
        //Pt = op1b.Pt;\n\
        Pt.X = op1b.Pt.X;\n\
        Pt.Y = op1b.Pt.Y;\n\
        DiscardLeftSide = op1b.Pt.X > op1.Pt.X;\n\
      }\n\
      else\n\
      {\n\
        //Pt = op2b.Pt;\n\
        Pt.X = op2b.Pt.X;\n\
        Pt.Y = op2b.Pt.Y;\n\
        DiscardLeftSide = (op2b.Pt.X > op2.Pt.X);\n\
      }\n\
      j.OutPt1 = op1;\n\
      j.OutPt2 = op2;\n\
      return this.JoinHorz(op1, op1b, op2, op2b, Pt, DiscardLeftSide);\n\
    }\n\
    else\n\
    {\n\
      //nb: For non-horizontal joins ...\n\
      //    1. Jr.OutPt1.Pt.Y == Jr.OutPt2.Pt.Y\n\
      //    2. Jr.OutPt1.Pt > Jr.OffPt.Y\n\
      //make sure the polygons are correctly oriented ...\n\
      op1b = op1.Next;\n\
      while ((ClipperLib.IntPoint.op_Equality(op1b.Pt, op1.Pt)) && (op1b != op1))\n\
        op1b = op1b.Next;\n\
      var Reverse1 = ((op1b.Pt.Y > op1.Pt.Y) || !ClipperLib.ClipperBase.SlopesEqual(op1.Pt, op1b.Pt, j.OffPt, this.m_UseFullRange));\n\
      if (Reverse1)\n\
      {\n\
        op1b = op1.Prev;\n\
        while ((ClipperLib.IntPoint.op_Equality(op1b.Pt, op1.Pt)) && (op1b != op1))\n\
          op1b = op1b.Prev;\n\
        if ((op1b.Pt.Y > op1.Pt.Y) || !ClipperLib.ClipperBase.SlopesEqual(op1.Pt, op1b.Pt, j.OffPt, this.m_UseFullRange))\n\
          return false;\n\
      }\n\
      op2b = op2.Next;\n\
      while ((ClipperLib.IntPoint.op_Equality(op2b.Pt, op2.Pt)) && (op2b != op2))\n\
        op2b = op2b.Next;\n\
      var Reverse2 = ((op2b.Pt.Y > op2.Pt.Y) || !ClipperLib.ClipperBase.SlopesEqual(op2.Pt, op2b.Pt, j.OffPt, this.m_UseFullRange));\n\
      if (Reverse2)\n\
      {\n\
        op2b = op2.Prev;\n\
        while ((ClipperLib.IntPoint.op_Equality(op2b.Pt, op2.Pt)) && (op2b != op2))\n\
          op2b = op2b.Prev;\n\
        if ((op2b.Pt.Y > op2.Pt.Y) || !ClipperLib.ClipperBase.SlopesEqual(op2.Pt, op2b.Pt, j.OffPt, this.m_UseFullRange))\n\
          return false;\n\
      }\n\
      if ((op1b == op1) || (op2b == op2) || (op1b == op2b) ||\n\
        ((outRec1 == outRec2) && (Reverse1 == Reverse2)))\n\
        return false;\n\
      if (Reverse1)\n\
      {\n\
        op1b = this.DupOutPt(op1, false);\n\
        op2b = this.DupOutPt(op2, true);\n\
        op1.Prev = op2;\n\
        op2.Next = op1;\n\
        op1b.Next = op2b;\n\
        op2b.Prev = op1b;\n\
        j.OutPt1 = op1;\n\
        j.OutPt2 = op1b;\n\
        return true;\n\
      }\n\
      else\n\
      {\n\
        op1b = this.DupOutPt(op1, true);\n\
        op2b = this.DupOutPt(op2, false);\n\
        op1.Next = op2;\n\
        op2.Prev = op1;\n\
        op1b.Prev = op2b;\n\
        op2b.Next = op1b;\n\
        j.OutPt1 = op1;\n\
        j.OutPt2 = op1b;\n\
        return true;\n\
      }\n\
    }\n\
  };\n\
  ClipperLib.Clipper.GetBounds = function (paths)\n\
  {\n\
    var i = 0,\n\
      cnt = paths.length;\n\
    while (i < cnt && paths[i].length == 0) i++;\n\
    if (i == cnt) return new ClipperLib.IntRect(0, 0, 0, 0);\n\
    var result = new ClipperLib.IntRect();\n\
    result.left = paths[i][0].X;\n\
    result.right = result.left;\n\
    result.top = paths[i][0].Y;\n\
    result.bottom = result.top;\n\
    for (; i < cnt; i++)\n\
      for (var j = 0, jlen = paths[i].length; j < jlen; j++)\n\
      {\n\
        if (paths[i][j].X < result.left) result.left = paths[i][j].X;\n\
        else if (paths[i][j].X > result.right) result.right = paths[i][j].X;\n\
        if (paths[i][j].Y < result.top) result.top = paths[i][j].Y;\n\
        else if (paths[i][j].Y > result.bottom) result.bottom = paths[i][j].Y;\n\
      }\n\
    return result;\n\
  }\n\
  ClipperLib.Clipper.prototype.GetBounds2 = function (ops)\n\
  {\n\
    var opStart = ops;\n\
    var result = new ClipperLib.IntRect();\n\
    result.left = ops.Pt.X;\n\
    result.right = ops.Pt.X;\n\
    result.top = ops.Pt.Y;\n\
    result.bottom = ops.Pt.Y;\n\
    ops = ops.Next;\n\
    while (ops != opStart)\n\
    {\n\
      if (ops.Pt.X < result.left)\n\
        result.left = ops.Pt.X;\n\
      if (ops.Pt.X > result.right)\n\
        result.right = ops.Pt.X;\n\
      if (ops.Pt.Y < result.top)\n\
        result.top = ops.Pt.Y;\n\
      if (ops.Pt.Y > result.bottom)\n\
        result.bottom = ops.Pt.Y;\n\
      ops = ops.Next;\n\
    }\n\
    return result;\n\
  };\n\
\n\
  ClipperLib.Clipper.PointInPolygon = function (pt, path)\n\
  {\n\
    //returns 0 if false, +1 if true, -1 if pt ON polygon boundary\n\
    //http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.88.5498&rep=rep1&type=pdf\n\
    var result = 0,\n\
      cnt = path.length;\n\
    if (cnt < 3)\n\
      return 0;\n\
    var ip = path[0];\n\
    for (var i = 1; i <= cnt; ++i)\n\
    {\n\
      var ipNext = (i == cnt ? path[0] : path[i]);\n\
      if (ipNext.Y == pt.Y)\n\
      {\n\
        if ((ipNext.X == pt.X) || (ip.Y == pt.Y && ((ipNext.X > pt.X) == (ip.X < pt.X))))\n\
          return -1;\n\
      }\n\
      if ((ip.Y < pt.Y) != (ipNext.Y < pt.Y))\n\
      {\n\
        if (ip.X >= pt.X)\n\
        {\n\
          if (ipNext.X > pt.X)\n\
            result = 1 - result;\n\
          else\n\
          {\n\
            var d = (ip.X - pt.X) * (ipNext.Y - pt.Y) - (ipNext.X - pt.X) * (ip.Y - pt.Y);\n\
            if (d == 0)\n\
              return -1;\n\
            else if ((d > 0) == (ipNext.Y > ip.Y))\n\
              result = 1 - result;\n\
          }\n\
        }\n\
        else\n\
        {\n\
          if (ipNext.X > pt.X)\n\
          {\n\
            var d = (ip.X - pt.X) * (ipNext.Y - pt.Y) - (ipNext.X - pt.X) * (ip.Y - pt.Y);\n\
            if (d == 0)\n\
              return -1;\n\
            else if ((d > 0) == (ipNext.Y > ip.Y))\n\
              result = 1 - result;\n\
          }\n\
        }\n\
      }\n\
      ip = ipNext;\n\
    }\n\
    return result;\n\
  };\n\
      \n\
  ClipperLib.Clipper.prototype.PointInPolygon = function (pt, op)\n\
  {\n\
    //returns 0 if false, +1 if true, -1 if pt ON polygon boundary\n\
    //http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.88.5498&rep=rep1&type=pdf\n\
    var result = 0;\n\
    var startOp = op;\n\
    for (;;)\n\
    {\n\
      var poly0x = op.Pt.X,\n\
        poly0y = op.Pt.Y;\n\
      var poly1x = op.Next.Pt.X,\n\
        poly1y = op.Next.Pt.Y;\n\
      if (poly1y == pt.Y)\n\
      {\n\
        if ((poly1x == pt.X) || (poly0y == pt.Y && ((poly1x > pt.X) == (poly0x < pt.X))))\n\
          return -1;\n\
      }\n\
      if ((poly0y < pt.Y) != (poly1y < pt.Y))\n\
      {\n\
        if (poly0x >= pt.X)\n\
        {\n\
          if (poly1x > pt.X)\n\
            result = 1 - result;\n\
          else\n\
          {\n\
            var d = (poly0x - pt.X) * (poly1y - pt.Y) - (poly1x - pt.X) * (poly0y - pt.Y);\n\
            if (d == 0)\n\
              return -1;\n\
            if ((d > 0) == (poly1y > poly0y))\n\
              result = 1 - result;\n\
          }\n\
        }\n\
        else\n\
        {\n\
          if (poly1x > pt.X)\n\
          {\n\
            var d = (poly0x - pt.X) * (poly1y - pt.Y) - (poly1x - pt.X) * (poly0y - pt.Y);\n\
            if (d == 0)\n\
              return -1;\n\
            if ((d > 0) == (poly1y > poly0y))\n\
              result = 1 - result;\n\
          }\n\
        }\n\
      }\n\
      op = op.Next;\n\
      if (startOp == op)\n\
        break;\n\
    }\n\
    return result;\n\
  };\n\
\n\
  ClipperLib.Clipper.prototype.Poly2ContainsPoly1 = function (outPt1, outPt2)\n\
  {\n\
    var op = outPt1;\n\
    do {\n\
      var res = this.PointInPolygon(op.Pt, outPt2);\n\
      if (res >= 0)\n\
        return res != 0;\n\
      op = op.Next;\n\
    }\n\
    while (op != outPt1)\n\
    return true;\n\
  };\n\
  ClipperLib.Clipper.prototype.FixupFirstLefts1 = function (OldOutRec, NewOutRec)\n\
  {\n\
    for (var i = 0, ilen = this.m_PolyOuts.length; i < ilen; i++)\n\
    {\n\
      var outRec = this.m_PolyOuts[i];\n\
      if (outRec.Pts !== null && outRec.FirstLeft == OldOutRec)\n\
      {\n\
        if (this.Poly2ContainsPoly1(outRec.Pts, NewOutRec.Pts))\n\
          outRec.FirstLeft = NewOutRec;\n\
      }\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.FixupFirstLefts2 = function (OldOutRec, NewOutRec)\n\
  {\n\
    for (var $i2 = 0, $t2 = this.m_PolyOuts, $l2 = $t2.length, outRec = $t2[$i2]; $i2 < $l2; $i2++, outRec = $t2[$i2])\n\
      if (outRec.FirstLeft == OldOutRec)\n\
        outRec.FirstLeft = NewOutRec;\n\
  };\n\
  ClipperLib.Clipper.ParseFirstLeft = function (FirstLeft)\n\
  {\n\
    while (FirstLeft != null && FirstLeft.Pts == null)\n\
      FirstLeft = FirstLeft.FirstLeft;\n\
    return FirstLeft;\n\
  };\n\
  ClipperLib.Clipper.prototype.JoinCommonEdges = function ()\n\
  {\n\
    for (var i = 0, ilen = this.m_Joins.length; i < ilen; i++)\n\
    {\n\
      var join = this.m_Joins[i];\n\
      var outRec1 = this.GetOutRec(join.OutPt1.Idx);\n\
      var outRec2 = this.GetOutRec(join.OutPt2.Idx);\n\
      if (outRec1.Pts == null || outRec2.Pts == null)\n\
        continue;\n\
      //get the polygon fragment with the correct hole state (FirstLeft)\n\
      //before calling JoinPoints() ...\n\
      var holeStateRec;\n\
      if (outRec1 == outRec2)\n\
        holeStateRec = outRec1;\n\
      else if (this.Param1RightOfParam2(outRec1, outRec2))\n\
        holeStateRec = outRec2;\n\
      else if (this.Param1RightOfParam2(outRec2, outRec1))\n\
        holeStateRec = outRec1;\n\
      else\n\
        holeStateRec = this.GetLowermostRec(outRec1, outRec2);\n\
\n\
      if (!this.JoinPoints(join, outRec1, outRec2)) continue;\n\
\n\
      if (outRec1 == outRec2)\n\
      {\n\
        //instead of joining two polygons, we've just created a new one by\n\
        //splitting one polygon into two.\n\
        outRec1.Pts = join.OutPt1;\n\
        outRec1.BottomPt = null;\n\
        outRec2 = this.CreateOutRec();\n\
        outRec2.Pts = join.OutPt2;\n\
        //update all OutRec2.Pts Idx's ...\n\
        this.UpdateOutPtIdxs(outRec2);\n\
        //We now need to check every OutRec.FirstLeft pointer. If it points\n\
        //to OutRec1 it may need to point to OutRec2 instead ...\n\
        if (this.m_UsingPolyTree)\n\
          for (var j = 0, jlen = this.m_PolyOuts.length; j < jlen - 1; j++)\n\
          {\n\
            var oRec = this.m_PolyOuts[j];\n\
            if (oRec.Pts == null || ClipperLib.Clipper.ParseFirstLeft(oRec.FirstLeft) != outRec1 || oRec.IsHole == outRec1.IsHole)\n\
              continue;\n\
            if (this.Poly2ContainsPoly1(oRec.Pts, join.OutPt2))\n\
              oRec.FirstLeft = outRec2;\n\
          }\n\
        if (this.Poly2ContainsPoly1(outRec2.Pts, outRec1.Pts))\n\
        {\n\
          //outRec2 is contained by outRec1 ...\n\
          outRec2.IsHole = !outRec1.IsHole;\n\
          outRec2.FirstLeft = outRec1;\n\
          //fixup FirstLeft pointers that may need reassigning to OutRec1\n\
          if (this.m_UsingPolyTree)\n\
            this.FixupFirstLefts2(outRec2, outRec1);\n\
          if ((outRec2.IsHole ^ this.ReverseSolution) == (this.Area(outRec2) > 0))\n\
            this.ReversePolyPtLinks(outRec2.Pts);\n\
        }\n\
        else if (this.Poly2ContainsPoly1(outRec1.Pts, outRec2.Pts))\n\
        {\n\
          //outRec1 is contained by outRec2 ...\n\
          outRec2.IsHole = outRec1.IsHole;\n\
          outRec1.IsHole = !outRec2.IsHole;\n\
          outRec2.FirstLeft = outRec1.FirstLeft;\n\
          outRec1.FirstLeft = outRec2;\n\
          //fixup FirstLeft pointers that may need reassigning to OutRec1\n\
          if (this.m_UsingPolyTree)\n\
            this.FixupFirstLefts2(outRec1, outRec2);\n\
          if ((outRec1.IsHole ^ this.ReverseSolution) == (this.Area(outRec1) > 0))\n\
            this.ReversePolyPtLinks(outRec1.Pts);\n\
        }\n\
        else\n\
        {\n\
          //the 2 polygons are completely separate ...\n\
          outRec2.IsHole = outRec1.IsHole;\n\
          outRec2.FirstLeft = outRec1.FirstLeft;\n\
          //fixup FirstLeft pointers that may need reassigning to OutRec2\n\
          if (this.m_UsingPolyTree)\n\
            this.FixupFirstLefts1(outRec1, outRec2);\n\
        }\n\
      }\n\
      else\n\
      {\n\
        //joined 2 polygons together ...\n\
        outRec2.Pts = null;\n\
        outRec2.BottomPt = null;\n\
        outRec2.Idx = outRec1.Idx;\n\
        outRec1.IsHole = holeStateRec.IsHole;\n\
        if (holeStateRec == outRec2)\n\
          outRec1.FirstLeft = outRec2.FirstLeft;\n\
        outRec2.FirstLeft = outRec1;\n\
        //fixup FirstLeft pointers that may need reassigning to OutRec1\n\
        if (this.m_UsingPolyTree)\n\
          this.FixupFirstLefts2(outRec2, outRec1);\n\
      }\n\
    }\n\
  };\n\
  ClipperLib.Clipper.prototype.UpdateOutPtIdxs = function (outrec)\n\
  {\n\
    var op = outrec.Pts;\n\
    do {\n\
      op.Idx = outrec.Idx;\n\
      op = op.Prev;\n\
    }\n\
    while (op != outrec.Pts)\n\
  };\n\
  ClipperLib.Clipper.prototype.DoSimplePolygons = function ()\n\
  {\n\
    var i = 0;\n\
    while (i < this.m_PolyOuts.length)\n\
    {\n\
      var outrec = this.m_PolyOuts[i++];\n\
      var op = outrec.Pts;\n\
      if (op === null)\n\
        continue;\n\
      do //for each Pt in Polygon until duplicate found do ...\n\
      {\n\
        var op2 = op.Next;\n\
        while (op2 != outrec.Pts)\n\
        {\n\
          if ((ClipperLib.IntPoint.op_Equality(op.Pt, op2.Pt)) && op2.Next != op && op2.Prev != op)\n\
          {\n\
            //split the polygon into two ...\n\
            var op3 = op.Prev;\n\
            var op4 = op2.Prev;\n\
            op.Prev = op4;\n\
            op4.Next = op;\n\
            op2.Prev = op3;\n\
            op3.Next = op2;\n\
            outrec.Pts = op;\n\
            var outrec2 = this.CreateOutRec();\n\
            outrec2.Pts = op2;\n\
            this.UpdateOutPtIdxs(outrec2);\n\
            if (this.Poly2ContainsPoly1(outrec2.Pts, outrec.Pts))\n\
            {\n\
              //OutRec2 is contained by OutRec1 ...\n\
              outrec2.IsHole = !outrec.IsHole;\n\
              outrec2.FirstLeft = outrec;\n\
            }\n\
            else if (this.Poly2ContainsPoly1(outrec.Pts, outrec2.Pts))\n\
            {\n\
              //OutRec1 is contained by OutRec2 ...\n\
              outrec2.IsHole = outrec.IsHole;\n\
              outrec.IsHole = !outrec2.IsHole;\n\
              outrec2.FirstLeft = outrec.FirstLeft;\n\
              outrec.FirstLeft = outrec2;\n\
            }\n\
            else\n\
            {\n\
              //the 2 polygons are separate ...\n\
              outrec2.IsHole = outrec.IsHole;\n\
              outrec2.FirstLeft = outrec.FirstLeft;\n\
            }\n\
            op2 = op;\n\
            //ie get ready for the next iteration\n\
          }\n\
          op2 = op2.Next;\n\
        }\n\
        op = op.Next;\n\
      }\n\
      while (op != outrec.Pts)\n\
    }\n\
  };\n\
  ClipperLib.Clipper.Area = function (poly)\n\
  {\n\
    var cnt = poly.length;\n\
    if (cnt < 3)\n\
      return 0;\n\
    var a = 0;\n\
    for (var i = 0, j = cnt - 1; i < cnt; ++i)\n\
    {\n\
      a += (poly[j].X + poly[i].X) * (poly[j].Y - poly[i].Y);\n\
      j = i;\n\
    }\n\
    return -a * 0.5;\n\
  };\n\
  ClipperLib.Clipper.prototype.Area = function (outRec)\n\
  {\n\
    var op = outRec.Pts;\n\
    if (op == null)\n\
      return 0;\n\
    var a = 0;\n\
    do {\n\
      a = a + (op.Prev.Pt.X + op.Pt.X) * (op.Prev.Pt.Y - op.Pt.Y);\n\
      op = op.Next;\n\
    }\n\
    while (op != outRec.Pts)\n\
    return a * 0.5;\n\
  };\n\
  if (use_deprecated)\n\
  {\n\
    ClipperLib.Clipper.OffsetPaths = function (polys, delta, jointype, endtype, MiterLimit)\n\
    {\n\
      var result = new ClipperLib.Paths();\n\
      var co = new ClipperLib.ClipperOffset(MiterLimit, MiterLimit);\n\
      co.AddPaths(polys, jointype, endtype);\n\
      co.Execute(result, delta);\n\
      return result;\n\
    };\n\
  }\n\
  ClipperLib.Clipper.SimplifyPolygon = function (poly, fillType)\n\
  {\n\
    var result = new Array();\n\
    var c = new ClipperLib.Clipper(0);\n\
    c.StrictlySimple = true;\n\
    c.AddPath(poly, ClipperLib.PolyType.ptSubject, true);\n\
    c.Execute(ClipperLib.ClipType.ctUnion, result, fillType, fillType);\n\
    return result;\n\
  };\n\
  ClipperLib.Clipper.SimplifyPolygons = function (polys, fillType)\n\
  {\n\
    if (typeof (fillType) == \"undefined\") fillType = ClipperLib.PolyFillType.pftEvenOdd;\n\
    var result = new Array();\n\
    var c = new ClipperLib.Clipper(0);\n\
    c.StrictlySimple = true;\n\
    c.AddPaths(polys, ClipperLib.PolyType.ptSubject, true);\n\
    c.Execute(ClipperLib.ClipType.ctUnion, result, fillType, fillType);\n\
    return result;\n\
  };\n\
  ClipperLib.Clipper.DistanceSqrd = function (pt1, pt2)\n\
  {\n\
    var dx = (pt1.X - pt2.X);\n\
    var dy = (pt1.Y - pt2.Y);\n\
    return (dx * dx + dy * dy);\n\
  };\n\
  ClipperLib.Clipper.DistanceFromLineSqrd = function (pt, ln1, ln2)\n\
  {\n\
    //The equation of a line in general form (Ax + By + C = 0)\n\
    //given 2 points (x¹,y¹) & (x²,y²) is ...\n\
    //(y¹ - y²)x + (x² - x¹)y + (y² - y¹)x¹ - (x² - x¹)y¹ = 0\n\
    //A = (y¹ - y²); B = (x² - x¹); C = (y² - y¹)x¹ - (x² - x¹)y¹\n\
    //perpendicular distance of point (x³,y³) = (Ax³ + By³ + C)/Sqrt(A² + B²)\n\
    //see http://en.wikipedia.org/wiki/Perpendicular_distance\n\
    var A = ln1.Y - ln2.Y;\n\
    var B = ln2.X - ln1.X;\n\
    var C = A * ln1.X + B * ln1.Y;\n\
    C = A * pt.X + B * pt.Y - C;\n\
    return (C * C) / (A * A + B * B);\n\
  };\n\
  ClipperLib.Clipper.SlopesNearCollinear = function (pt1, pt2, pt3, distSqrd)\n\
  {\n\
    return ClipperLib.Clipper.DistanceFromLineSqrd(pt2, pt1, pt3) < distSqrd;\n\
  };\n\
  ClipperLib.Clipper.PointsAreClose = function (pt1, pt2, distSqrd)\n\
  {\n\
    var dx = pt1.X - pt2.X;\n\
    var dy = pt1.Y - pt2.Y;\n\
    return ((dx * dx) + (dy * dy) <= distSqrd);\n\
  };\n\
  //------------------------------------------------------------------------------\n\
  ClipperLib.Clipper.ExcludeOp = function (op)\n\
  {\n\
    var result = op.Prev;\n\
    result.Next = op.Next;\n\
    op.Next.Prev = result;\n\
    result.Idx = 0;\n\
    return result;\n\
  };\n\
  ClipperLib.Clipper.CleanPolygon = function (path, distance)\n\
  {\n\
    if (typeof (distance) == \"undefined\") distance = 1.415;\n\
    //distance = proximity in units/pixels below which vertices will be stripped. \n\
    //Default ~= sqrt(2) so when adjacent vertices or semi-adjacent vertices have \n\
    //both x & y coords within 1 unit, then the second vertex will be stripped.\n\
    var cnt = path.length;\n\
    if (cnt == 0)\n\
      return new Array();\n\
    var outPts = new Array(cnt);\n\
    for (var i = 0; i < cnt; ++i)\n\
      outPts[i] = new ClipperLib.OutPt();\n\
    for (var i = 0; i < cnt; ++i)\n\
    {\n\
      outPts[i].Pt = path[i];\n\
      outPts[i].Next = outPts[(i + 1) % cnt];\n\
      outPts[i].Next.Prev = outPts[i];\n\
      outPts[i].Idx = 0;\n\
    }\n\
    var distSqrd = distance * distance;\n\
    var op = outPts[0];\n\
    while (op.Idx == 0 && op.Next != op.Prev)\n\
    {\n\
      if (ClipperLib.Clipper.PointsAreClose(op.Pt, op.Prev.Pt, distSqrd))\n\
      {\n\
        op = ClipperLib.Clipper.ExcludeOp(op);\n\
        cnt--;\n\
      }\n\
      else if (ClipperLib.Clipper.PointsAreClose(op.Prev.Pt, op.Next.Pt, distSqrd))\n\
      {\n\
        ClipperLib.Clipper.ExcludeOp(op.Next);\n\
        op = ClipperLib.Clipper.ExcludeOp(op);\n\
        cnt -= 2;\n\
      }\n\
      else if (ClipperLib.Clipper.SlopesNearCollinear(op.Prev.Pt, op.Pt, op.Next.Pt, distSqrd))\n\
      {\n\
        op = ClipperLib.Clipper.ExcludeOp(op);\n\
        cnt--;\n\
      }\n\
      else\n\
      {\n\
        op.Idx = 1;\n\
        op = op.Next;\n\
      }\n\
    }\n\
    if (cnt < 3)\n\
      cnt = 0;\n\
    var result = new Array(cnt);\n\
    for (var i = 0; i < cnt; ++i)\n\
    {\n\
      result[i] = new ClipperLib.IntPoint(op.Pt);\n\
      op = op.Next;\n\
    }\n\
    outPts = null;\n\
    return result;\n\
  };\n\
  ClipperLib.Clipper.CleanPolygons = function (polys, distance)\n\
  {\n\
    var result = new Array(polys.length);\n\
    for (var i = 0, ilen = polys.length; i < ilen; i++)\n\
      result[i] = ClipperLib.Clipper.CleanPolygon(polys[i], distance);\n\
    return result;\n\
  };\n\
  ClipperLib.Clipper.Minkowski = function (pattern, path, IsSum, IsClosed)\n\
  {\n\
    var delta = (IsClosed ? 1 : 0);\n\
    var polyCnt = pattern.length;\n\
    var pathCnt = path.length;\n\
    var result = new Array();\n\
    if (IsSum)\n\
      for (var i = 0; i < pathCnt; i++)\n\
      {\n\
        var p = new Array(polyCnt);\n\
        for (var j = 0, jlen = pattern.length, ip = pattern[j]; j < jlen; j++, ip = pattern[j])\n\
          p[j] = new ClipperLib.IntPoint(path[i].X + ip.X, path[i].Y + ip.Y);\n\
        result.push(p);\n\
      }\n\
    else\n\
      for (var i = 0; i < pathCnt; i++)\n\
      {\n\
        var p = new Array(polyCnt);\n\
        for (var j = 0, jlen = pattern.length, ip = pattern[j]; j < jlen; j++, ip = pattern[j])\n\
          p[j] = new ClipperLib.IntPoint(path[i].X - ip.X, path[i].Y - ip.Y);\n\
        result.push(p);\n\
      }\n\
    var quads = new Array();\n\
    for (var i = 0; i < pathCnt - 1 + delta; i++)\n\
      for (var j = 0; j < polyCnt; j++)\n\
      {\n\
        var quad = new Array();\n\
        quad.push(result[i % pathCnt][j % polyCnt]);\n\
        quad.push(result[(i + 1) % pathCnt][j % polyCnt]);\n\
        quad.push(result[(i + 1) % pathCnt][(j + 1) % polyCnt]);\n\
        quad.push(result[i % pathCnt][(j + 1) % polyCnt]);\n\
        if (!ClipperLib.Clipper.Orientation(quad))\n\
          quad.reverse();\n\
        quads.push(quad);\n\
      }\n\
    var c = new ClipperLib.Clipper(0);\n\
    c.AddPaths(quads, ClipperLib.PolyType.ptSubject, true);\n\
    c.Execute(ClipperLib.ClipType.ctUnion, result, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);\n\
    return result;\n\
  };\n\
\n\
  ClipperLib.Clipper.MinkowskiSum = function ()\n\
  {\n\
    var a = arguments,\n\
      alen = a.length;\n\
    if (alen == 3) // MinkowskiSum(Path pattern, path, pathIsClosed)\n\
    {\n\
      var pattern = a[0],\n\
        path = a[1],\n\
        pathIsClosed = a[2];\n\
      return ClipperLib.Clipper.Minkowski(pattern, path, true, pathIsClosed);\n\
    }\n\
    else if (alen == 4) // MinkowskiSum(pattern, paths, pathFillType, pathIsClosed)\n\
    {\n\
      var pattern = a[0],\n\
        paths = a[1],\n\
        pathFillType = a[2],\n\
        pathIsClosed = a[3];\n\
      var c = new ClipperLib.Clipper(),\n\
        tmp;\n\
      for (var i = 0, ilen = paths.length; i < ilen; ++i)\n\
      {\n\
        var tmp = ClipperLib.Clipper.Minkowski(pattern, paths[i], true, pathIsClosed);\n\
        c.AddPaths(tmp, ClipperLib.PolyType.ptSubject, true);\n\
      }\n\
      if (pathIsClosed) c.AddPaths(paths, ClipperLib.PolyType.ptClip, true);\n\
      var solution = new ClipperLib.Paths();\n\
      c.Execute(ClipperLib.ClipType.ctUnion, solution, pathFillType, pathFillType);\n\
      return solution;\n\
    }\n\
  };\n\
\n\
  ClipperLib.Clipper.MinkowskiDiff = function (pattern, path, pathIsClosed)\n\
  {\n\
    return ClipperLib.Clipper.Minkowski(pattern, path, false, pathIsClosed);\n\
  };\n\
\n\
  ClipperLib.Clipper.PolyTreeToPaths = function (polytree)\n\
  {\n\
    var result = new Array();\n\
    //result.set_Capacity(polytree.get_Total());\n\
    ClipperLib.Clipper.AddPolyNodeToPaths(polytree, ClipperLib.Clipper.NodeType.ntAny, result);\n\
    return result;\n\
  };\n\
  ClipperLib.Clipper.AddPolyNodeToPaths = function (polynode, nt, paths)\n\
  {\n\
    var match = true;\n\
    switch (nt)\n\
    {\n\
    case ClipperLib.Clipper.NodeType.ntOpen:\n\
      return;\n\
    case ClipperLib.Clipper.NodeType.ntClosed:\n\
      match = !polynode.IsOpen;\n\
      break;\n\
    default:\n\
      break;\n\
    }\n\
    if (polynode.m_polygon.length > 0 && match)\n\
      paths.push(polynode.m_polygon);\n\
    for (var $i3 = 0, $t3 = polynode.Childs(), $l3 = $t3.length, pn = $t3[$i3]; $i3 < $l3; $i3++, pn = $t3[$i3])\n\
      ClipperLib.Clipper.AddPolyNodeToPaths(pn, nt, paths);\n\
  };\n\
  ClipperLib.Clipper.OpenPathsFromPolyTree = function (polytree)\n\
  {\n\
    var result = new ClipperLib.Paths();\n\
    //result.set_Capacity(polytree.ChildCount());\n\
    for (var i = 0, ilen = polytree.ChildCount(); i < ilen; i++)\n\
      if (polytree.Childs()[i].IsOpen)\n\
        result.push(polytree.Childs()[i].m_polygon);\n\
    return result;\n\
  };\n\
  ClipperLib.Clipper.ClosedPathsFromPolyTree = function (polytree)\n\
  {\n\
    var result = new ClipperLib.Paths();\n\
    //result.set_Capacity(polytree.Total());\n\
    ClipperLib.Clipper.AddPolyNodeToPaths(polytree, ClipperLib.Clipper.NodeType.ntClosed, result);\n\
    return result;\n\
  };\n\
  Inherit(ClipperLib.Clipper, ClipperLib.ClipperBase);\n\
  ClipperLib.Clipper.NodeType = {\n\
    ntAny: 0,\n\
    ntOpen: 1,\n\
    ntClosed: 2\n\
  };\n\
  ClipperLib.ClipperOffset = function (miterLimit, arcTolerance)\n\
  {\n\
    if (typeof (miterLimit) == \"undefined\") miterLimit = 2;\n\
    if (typeof (arcTolerance) == \"undefined\") arcTolerance = ClipperLib.ClipperOffset.def_arc_tolerance;\n\
    this.m_destPolys = new ClipperLib.Paths();\n\
    this.m_srcPoly = new ClipperLib.Path();\n\
    this.m_destPoly = new ClipperLib.Path();\n\
    this.m_normals = new Array();\n\
    this.m_delta = 0;\n\
    this.m_sinA = 0;\n\
    this.m_sin = 0;\n\
    this.m_cos = 0;\n\
    this.m_miterLim = 0;\n\
    this.m_StepsPerRad = 0;\n\
    this.m_lowest = new ClipperLib.IntPoint();\n\
    this.m_polyNodes = new ClipperLib.PolyNode();\n\
    this.MiterLimit = miterLimit;\n\
    this.ArcTolerance = arcTolerance;\n\
    this.m_lowest.X = -1;\n\
  };\n\
  ClipperLib.ClipperOffset.two_pi = 6.28318530717959;\n\
  ClipperLib.ClipperOffset.def_arc_tolerance = 0.25;\n\
  ClipperLib.ClipperOffset.prototype.Clear = function ()\n\
  {\n\
    ClipperLib.Clear(this.m_polyNodes.Childs());\n\
    this.m_lowest.X = -1;\n\
  };\n\
  ClipperLib.ClipperOffset.Round = ClipperLib.Clipper.Round;\n\
  ClipperLib.ClipperOffset.prototype.AddPath = function (path, joinType, endType)\n\
  {\n\
    var highI = path.length - 1;\n\
    if (highI < 0)\n\
      return;\n\
    var newNode = new ClipperLib.PolyNode();\n\
    newNode.m_jointype = joinType;\n\
    newNode.m_endtype = endType;\n\
    //strip duplicate points from path and also get index to the lowest point ...\n\
    if (endType == ClipperLib.EndType.etClosedLine || endType == ClipperLib.EndType.etClosedPolygon)\n\
      while (highI > 0 && ClipperLib.IntPoint.op_Equality(path[0], path[highI]))\n\
        highI--;\n\
    //newNode.m_polygon.set_Capacity(highI + 1);\n\
    newNode.m_polygon.push(path[0]);\n\
    var j = 0,\n\
      k = 0;\n\
    for (var i = 1; i <= highI; i++)\n\
      if (ClipperLib.IntPoint.op_Inequality(newNode.m_polygon[j], path[i]))\n\
      {\n\
        j++;\n\
        newNode.m_polygon.push(path[i]);\n\
        if (path[i].Y > newNode.m_polygon[k].Y || (path[i].Y == newNode.m_polygon[k].Y && path[i].X < newNode.m_polygon[k].X))\n\
          k = j;\n\
      }\n\
    if ((endType == ClipperLib.EndType.etClosedPolygon && j < 2) || (endType != ClipperLib.EndType.etClosedPolygon && j < 0))\n\
      return;\n\
    this.m_polyNodes.AddChild(newNode);\n\
    //if this path's lowest pt is lower than all the others then update m_lowest\n\
    if (endType != ClipperLib.EndType.etClosedPolygon)\n\
      return;\n\
    if (this.m_lowest.X < 0)\n\
      this.m_lowest = new ClipperLib.IntPoint(0, k);\n\
    else\n\
    {\n\
      var ip = this.m_polyNodes.Childs()[this.m_lowest.X].m_polygon[this.m_lowest.Y];\n\
      if (newNode.m_polygon[k].Y > ip.Y || (newNode.m_polygon[k].Y == ip.Y && newNode.m_polygon[k].X < ip.X))\n\
        this.m_lowest = new ClipperLib.IntPoint(this.m_polyNodes.ChildCount() - 1, k);\n\
    }\n\
  };\n\
  ClipperLib.ClipperOffset.prototype.AddPaths = function (paths, joinType, endType)\n\
  {\n\
    for (var i = 0, ilen = paths.length; i < ilen; i++)\n\
      this.AddPath(paths[i], joinType, endType);\n\
  };\n\
  ClipperLib.ClipperOffset.prototype.FixOrientations = function ()\n\
  {\n\
    //fixup orientations of all closed paths if the orientation of the\n\
    //closed path with the lowermost vertex is wrong ...\n\
    if (this.m_lowest.X >= 0 && !ClipperLib.Clipper.Orientation(this.m_polyNodes.Childs()[this.m_lowest.X].m_polygon))\n\
    {\n\
      for (var i = 0; i < this.m_polyNodes.ChildCount(); i++)\n\
      {\n\
        var node = this.m_polyNodes.Childs()[i];\n\
        if (node.m_endtype == ClipperLib.EndType.etClosedPolygon || (node.m_endtype == ClipperLib.EndType.etClosedLine && ClipperLib.Clipper.Orientation(node.m_polygon)))\n\
          node.m_polygon.reverse();\n\
      }\n\
    }\n\
    else\n\
    {\n\
      for (var i = 0; i < this.m_polyNodes.ChildCount(); i++)\n\
      {\n\
        var node = this.m_polyNodes.Childs()[i];\n\
        if (node.m_endtype == ClipperLib.EndType.etClosedLine && !ClipperLib.Clipper.Orientation(node.m_polygon))\n\
          node.m_polygon.reverse();\n\
      }\n\
    }\n\
  };\n\
  ClipperLib.ClipperOffset.GetUnitNormal = function (pt1, pt2)\n\
  {\n\
    var dx = (pt2.X - pt1.X);\n\
    var dy = (pt2.Y - pt1.Y);\n\
    if ((dx == 0) && (dy == 0))\n\
      return new ClipperLib.DoublePoint(0, 0);\n\
    var f = 1 / Math.sqrt(dx * dx + dy * dy);\n\
    dx *= f;\n\
    dy *= f;\n\
    return new ClipperLib.DoublePoint(dy, -dx);\n\
  };\n\
  ClipperLib.ClipperOffset.prototype.DoOffset = function (delta)\n\
  {\n\
    this.m_destPolys = new Array();\n\
    this.m_delta = delta;\n\
    //if Zero offset, just copy any CLOSED polygons to m_p and return ...\n\
    if (ClipperLib.ClipperBase.near_zero(delta))\n\
    {\n\
      //this.m_destPolys.set_Capacity(this.m_polyNodes.ChildCount);\n\
      for (var i = 0; i < this.m_polyNodes.ChildCount(); i++)\n\
      {\n\
        var node = this.m_polyNodes.Childs()[i];\n\
        if (node.m_endtype == ClipperLib.EndType.etClosedPolygon)\n\
          this.m_destPolys.push(node.m_polygon);\n\
      }\n\
      return;\n\
    }\n\
    //see offset_triginometry3.svg in the documentation folder ...\n\
    if (this.MiterLimit > 2)\n\
      this.m_miterLim = 2 / (this.MiterLimit * this.MiterLimit);\n\
    else\n\
      this.m_miterLim = 0.5;\n\
    var y;\n\
    if (this.ArcTolerance <= 0)\n\
      y = ClipperLib.ClipperOffset.def_arc_tolerance;\n\
    else if (this.ArcTolerance > Math.abs(delta) * ClipperLib.ClipperOffset.def_arc_tolerance)\n\
      y = Math.abs(delta) * ClipperLib.ClipperOffset.def_arc_tolerance;\n\
    else\n\
      y = this.ArcTolerance;\n\
    //see offset_triginometry2.svg in the documentation folder ...\n\
    var steps = 3.14159265358979 / Math.acos(1 - y / Math.abs(delta));\n\
    this.m_sin = Math.sin(ClipperLib.ClipperOffset.two_pi / steps);\n\
    this.m_cos = Math.cos(ClipperLib.ClipperOffset.two_pi / steps);\n\
    this.m_StepsPerRad = steps / ClipperLib.ClipperOffset.two_pi;\n\
    if (delta < 0)\n\
      this.m_sin = -this.m_sin;\n\
    //this.m_destPolys.set_Capacity(this.m_polyNodes.ChildCount * 2);\n\
    for (var i = 0; i < this.m_polyNodes.ChildCount(); i++)\n\
    {\n\
      var node = this.m_polyNodes.Childs()[i];\n\
      this.m_srcPoly = node.m_polygon;\n\
      var len = this.m_srcPoly.length;\n\
      if (len == 0 || (delta <= 0 && (len < 3 || node.m_endtype != ClipperLib.EndType.etClosedPolygon)))\n\
        continue;\n\
      this.m_destPoly = new Array();\n\
      if (len == 1)\n\
      {\n\
        if (node.m_jointype == ClipperLib.JoinType.jtRound)\n\
        {\n\
          var X = 1,\n\
            Y = 0;\n\
          for (var j = 1; j <= steps; j++)\n\
          {\n\
            this.m_destPoly.push(new ClipperLib.IntPoint(ClipperLib.ClipperOffset.Round(this.m_srcPoly[0].X + X * delta), ClipperLib.ClipperOffset.Round(this.m_srcPoly[0].Y + Y * delta)));\n\
            var X2 = X;\n\
            X = X * this.m_cos - this.m_sin * Y;\n\
            Y = X2 * this.m_sin + Y * this.m_cos;\n\
          }\n\
        }\n\
        else\n\
        {\n\
          var X = -1,\n\
            Y = -1;\n\
          for (var j = 0; j < 4; ++j)\n\
          {\n\
            this.m_destPoly.push(new ClipperLib.IntPoint(ClipperLib.ClipperOffset.Round(this.m_srcPoly[0].X + X * delta), ClipperLib.ClipperOffset.Round(this.m_srcPoly[0].Y + Y * delta)));\n\
            if (X < 0)\n\
              X = 1;\n\
            else if (Y < 0)\n\
              Y = 1;\n\
            else\n\
              X = -1;\n\
          }\n\
        }\n\
        this.m_destPolys.push(this.m_destPoly);\n\
        continue;\n\
      }\n\
      //build m_normals ...\n\
      this.m_normals.length = 0;\n\
      //this.m_normals.set_Capacity(len);\n\
      for (var j = 0; j < len - 1; j++)\n\
        this.m_normals.push(ClipperLib.ClipperOffset.GetUnitNormal(this.m_srcPoly[j], this.m_srcPoly[j + 1]));\n\
      if (node.m_endtype == ClipperLib.EndType.etClosedLine || node.m_endtype == ClipperLib.EndType.etClosedPolygon)\n\
        this.m_normals.push(ClipperLib.ClipperOffset.GetUnitNormal(this.m_srcPoly[len - 1], this.m_srcPoly[0]));\n\
      else\n\
        this.m_normals.push(new ClipperLib.DoublePoint(this.m_normals[len - 2]));\n\
      if (node.m_endtype == ClipperLib.EndType.etClosedPolygon)\n\
      {\n\
        var k = len - 1;\n\
        for (var j = 0; j < len; j++)\n\
          k = this.OffsetPoint(j, k, node.m_jointype);\n\
        this.m_destPolys.push(this.m_destPoly);\n\
      }\n\
      else if (node.m_endtype == ClipperLib.EndType.etClosedLine)\n\
      {\n\
        var k = len - 1;\n\
        for (var j = 0; j < len; j++)\n\
          k = this.OffsetPoint(j, k, node.m_jointype);\n\
        this.m_destPolys.push(this.m_destPoly);\n\
        this.m_destPoly = new Array();\n\
        //re-build m_normals ...\n\
        var n = this.m_normals[len - 1];\n\
        for (var j = len - 1; j > 0; j--)\n\
          this.m_normals[j] = new ClipperLib.DoublePoint(-this.m_normals[j - 1].X, -this.m_normals[j - 1].Y);\n\
        this.m_normals[0] = new ClipperLib.DoublePoint(-n.X, -n.Y);\n\
        k = 0;\n\
        for (var j = len - 1; j >= 0; j--)\n\
          k = this.OffsetPoint(j, k, node.m_jointype);\n\
        this.m_destPolys.push(this.m_destPoly);\n\
      }\n\
      else\n\
      {\n\
        var k = 0;\n\
        for (var j = 1; j < len - 1; ++j)\n\
          k = this.OffsetPoint(j, k, node.m_jointype);\n\
        var pt1;\n\
        if (node.m_endtype == ClipperLib.EndType.etOpenButt)\n\
        {\n\
          var j = len - 1;\n\
          pt1 = new ClipperLib.IntPoint(ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].X + this.m_normals[j].X * delta), ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].Y + this.m_normals[j].Y * delta));\n\
          this.m_destPoly.push(pt1);\n\
          pt1 = new ClipperLib.IntPoint(ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].X - this.m_normals[j].X * delta), ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].Y - this.m_normals[j].Y * delta));\n\
          this.m_destPoly.push(pt1);\n\
        }\n\
        else\n\
        {\n\
          var j = len - 1;\n\
          k = len - 2;\n\
          this.m_sinA = 0;\n\
          this.m_normals[j] = new ClipperLib.DoublePoint(-this.m_normals[j].X, -this.m_normals[j].Y);\n\
          if (node.m_endtype == ClipperLib.EndType.etOpenSquare)\n\
            this.DoSquare(j, k);\n\
          else\n\
            this.DoRound(j, k);\n\
        }\n\
        //re-build m_normals ...\n\
        for (var j = len - 1; j > 0; j--)\n\
          this.m_normals[j] = new ClipperLib.DoublePoint(-this.m_normals[j - 1].X, -this.m_normals[j - 1].Y);\n\
        this.m_normals[0] = new ClipperLib.DoublePoint(-this.m_normals[1].X, -this.m_normals[1].Y);\n\
        k = len - 1;\n\
        for (var j = k - 1; j > 0; --j)\n\
          k = this.OffsetPoint(j, k, node.m_jointype);\n\
        if (node.m_endtype == ClipperLib.EndType.etOpenButt)\n\
        {\n\
          pt1 = new ClipperLib.IntPoint(ClipperLib.ClipperOffset.Round(this.m_srcPoly[0].X - this.m_normals[0].X * delta), ClipperLib.ClipperOffset.Round(this.m_srcPoly[0].Y - this.m_normals[0].Y * delta));\n\
          this.m_destPoly.push(pt1);\n\
          pt1 = new ClipperLib.IntPoint(ClipperLib.ClipperOffset.Round(this.m_srcPoly[0].X + this.m_normals[0].X * delta), ClipperLib.ClipperOffset.Round(this.m_srcPoly[0].Y + this.m_normals[0].Y * delta));\n\
          this.m_destPoly.push(pt1);\n\
        }\n\
        else\n\
        {\n\
          k = 1;\n\
          this.m_sinA = 0;\n\
          if (node.m_endtype == ClipperLib.EndType.etOpenSquare)\n\
            this.DoSquare(0, 1);\n\
          else\n\
            this.DoRound(0, 1);\n\
        }\n\
        this.m_destPolys.push(this.m_destPoly);\n\
      }\n\
    }\n\
  };\n\
  ClipperLib.ClipperOffset.prototype.Execute = function ()\n\
  {\n\
    var a = arguments,\n\
      ispolytree = a[0] instanceof ClipperLib.PolyTree;\n\
    if (!ispolytree) // function (solution, delta)\n\
    {\n\
      var solution = a[0],\n\
        delta = a[1];\n\
      ClipperLib.Clear(solution);\n\
      this.FixOrientations();\n\
      this.DoOffset(delta);\n\
      //now clean up 'corners' ...\n\
      var clpr = new ClipperLib.Clipper(0);\n\
      clpr.AddPaths(this.m_destPolys, ClipperLib.PolyType.ptSubject, true);\n\
      if (delta > 0)\n\
      {\n\
        clpr.Execute(ClipperLib.ClipType.ctUnion, solution, ClipperLib.PolyFillType.pftPositive, ClipperLib.PolyFillType.pftPositive);\n\
      }\n\
      else\n\
      {\n\
        var r = ClipperLib.Clipper.GetBounds(this.m_destPolys);\n\
        var outer = new ClipperLib.Path();\n\
        outer.push(new ClipperLib.IntPoint(r.left - 10, r.bottom + 10));\n\
        outer.push(new ClipperLib.IntPoint(r.right + 10, r.bottom + 10));\n\
        outer.push(new ClipperLib.IntPoint(r.right + 10, r.top - 10));\n\
        outer.push(new ClipperLib.IntPoint(r.left - 10, r.top - 10));\n\
        clpr.AddPath(outer, ClipperLib.PolyType.ptSubject, true);\n\
        clpr.ReverseSolution = true;\n\
        clpr.Execute(ClipperLib.ClipType.ctUnion, solution, ClipperLib.PolyFillType.pftNegative, ClipperLib.PolyFillType.pftNegative);\n\
        if (solution.length > 0)\n\
          solution.splice(0, 1);\n\
      }\n\
      //console.log(JSON.stringify(solution));\n\
    }\n\
    else // function (polytree, delta)\n\
    {\n\
      var solution = a[0],\n\
        delta = a[1];\n\
      solution.Clear();\n\
      this.FixOrientations();\n\
      this.DoOffset(delta);\n\
      //now clean up 'corners' ...\n\
      var clpr = new ClipperLib.Clipper(0);\n\
      clpr.AddPaths(this.m_destPolys, ClipperLib.PolyType.ptSubject, true);\n\
      if (delta > 0)\n\
      {\n\
        clpr.Execute(ClipperLib.ClipType.ctUnion, solution, ClipperLib.PolyFillType.pftPositive, ClipperLib.PolyFillType.pftPositive);\n\
      }\n\
      else\n\
      {\n\
        var r = ClipperLib.Clipper.GetBounds(this.m_destPolys);\n\
        var outer = new ClipperLib.Path();\n\
        outer.push(new ClipperLib.IntPoint(r.left - 10, r.bottom + 10));\n\
        outer.push(new ClipperLib.IntPoint(r.right + 10, r.bottom + 10));\n\
        outer.push(new ClipperLib.IntPoint(r.right + 10, r.top - 10));\n\
        outer.push(new ClipperLib.IntPoint(r.left - 10, r.top - 10));\n\
        clpr.AddPath(outer, ClipperLib.PolyType.ptSubject, true);\n\
        clpr.ReverseSolution = true;\n\
        clpr.Execute(ClipperLib.ClipType.ctUnion, solution, ClipperLib.PolyFillType.pftNegative, ClipperLib.PolyFillType.pftNegative);\n\
        //remove the outer PolyNode rectangle ...\n\
        if (solution.ChildCount() == 1 && solution.Childs()[0].ChildCount() > 0)\n\
        {\n\
          var outerNode = solution.Childs()[0];\n\
          //solution.Childs.set_Capacity(outerNode.ChildCount);\n\
          solution.Childs()[0] = outerNode.Childs()[0];\n\
          for (var i = 1; i < outerNode.ChildCount(); i++)\n\
            solution.AddChild(outerNode.Childs()[i]);\n\
        }\n\
        else\n\
          solution.Clear();\n\
      }\n\
    }\n\
  };\n\
  ClipperLib.ClipperOffset.prototype.OffsetPoint = function (j, k, jointype)\n\
  {\n\
    this.m_sinA = (this.m_normals[k].X * this.m_normals[j].Y - this.m_normals[j].X * this.m_normals[k].Y);\n\
    if (this.m_sinA < 0.00005 && this.m_sinA > -0.00005)\n\
      return k;\n\
    else if (this.m_sinA > 1)\n\
      this.m_sinA = 1.0;\n\
    else if (this.m_sinA < -1)\n\
      this.m_sinA = -1.0;\n\
    if (this.m_sinA * this.m_delta < 0)\n\
    {\n\
      this.m_destPoly.push(new ClipperLib.IntPoint(ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].X + this.m_normals[k].X * this.m_delta),\n\
        ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].Y + this.m_normals[k].Y * this.m_delta)));\n\
      this.m_destPoly.push(new ClipperLib.IntPoint(this.m_srcPoly[j]));\n\
      this.m_destPoly.push(new ClipperLib.IntPoint(ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].X + this.m_normals[j].X * this.m_delta),\n\
        ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].Y + this.m_normals[j].Y * this.m_delta)));\n\
    }\n\
    else\n\
      switch (jointype)\n\
      {\n\
      case ClipperLib.JoinType.jtMiter:\n\
        {\n\
          var r = 1 + (this.m_normals[j].X * this.m_normals[k].X + this.m_normals[j].Y * this.m_normals[k].Y);\n\
          if (r >= this.m_miterLim)\n\
            this.DoMiter(j, k, r);\n\
          else\n\
            this.DoSquare(j, k);\n\
          break;\n\
        }\n\
      case ClipperLib.JoinType.jtSquare:\n\
        this.DoSquare(j, k);\n\
        break;\n\
      case ClipperLib.JoinType.jtRound:\n\
        this.DoRound(j, k);\n\
        break;\n\
      }\n\
    k = j;\n\
    return k;\n\
  };\n\
  ClipperLib.ClipperOffset.prototype.DoSquare = function (j, k)\n\
  {\n\
    var dx = Math.tan(Math.atan2(this.m_sinA,\n\
      this.m_normals[k].X * this.m_normals[j].X + this.m_normals[k].Y * this.m_normals[j].Y) / 4);\n\
    this.m_destPoly.push(new ClipperLib.IntPoint(\n\
      ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].X + this.m_delta * (this.m_normals[k].X - this.m_normals[k].Y * dx)),\n\
      ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].Y + this.m_delta * (this.m_normals[k].Y + this.m_normals[k].X * dx))));\n\
    this.m_destPoly.push(new ClipperLib.IntPoint(\n\
      ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].X + this.m_delta * (this.m_normals[j].X + this.m_normals[j].Y * dx)),\n\
      ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].Y + this.m_delta * (this.m_normals[j].Y - this.m_normals[j].X * dx))));\n\
  };\n\
  ClipperLib.ClipperOffset.prototype.DoMiter = function (j, k, r)\n\
  {\n\
    var q = this.m_delta / r;\n\
    this.m_destPoly.push(new ClipperLib.IntPoint(\n\
      ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].X + (this.m_normals[k].X + this.m_normals[j].X) * q),\n\
      ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].Y + (this.m_normals[k].Y + this.m_normals[j].Y) * q)));\n\
  };\n\
  ClipperLib.ClipperOffset.prototype.DoRound = function (j, k)\n\
  {\n\
    var a = Math.atan2(this.m_sinA,\n\
      this.m_normals[k].X * this.m_normals[j].X + this.m_normals[k].Y * this.m_normals[j].Y);\n\
    var steps = ClipperLib.Cast_Int32(ClipperLib.ClipperOffset.Round(this.m_StepsPerRad * Math.abs(a)));\n\
    var X = this.m_normals[k].X,\n\
      Y = this.m_normals[k].Y,\n\
      X2;\n\
    for (var i = 0; i < steps; ++i)\n\
    {\n\
      this.m_destPoly.push(new ClipperLib.IntPoint(\n\
        ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].X + X * this.m_delta),\n\
        ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].Y + Y * this.m_delta)));\n\
      X2 = X;\n\
      X = X * this.m_cos - this.m_sin * Y;\n\
      Y = X2 * this.m_sin + Y * this.m_cos;\n\
    }\n\
    this.m_destPoly.push(new ClipperLib.IntPoint(\n\
      ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].X + this.m_normals[j].X * this.m_delta),\n\
      ClipperLib.ClipperOffset.Round(this.m_srcPoly[j].Y + this.m_normals[j].Y * this.m_delta)));\n\
  };\n\
  ClipperLib.Error = function (message)\n\
  {\n\
    try\n\
    {\n\
      throw new Error(message);\n\
    }\n\
    catch (err)\n\
    {\n\
      console.error(err.message);\n\
    }\n\
  };\n\
  // ---------------------------------\n\
  // JS extension by Timo 2013\n\
  ClipperLib.JS = {};\n\
  ClipperLib.JS.AreaOfPolygon = function (poly, scale)\n\
  {\n\
    if (!scale) scale = 1;\n\
    return ClipperLib.Clipper.Area(poly) / (scale * scale);\n\
  };\n\
  ClipperLib.JS.AreaOfPolygons = function (poly, scale)\n\
  {\n\
    if (!scale) scale = 1;\n\
    var area = 0;\n\
    for (var i = 0; i < poly.length; i++)\n\
    {\n\
      area += ClipperLib.Clipper.Area(poly[i]);\n\
    }\n\
    return area / (scale * scale);\n\
  };\n\
  ClipperLib.JS.BoundsOfPath = function (path, scale)\n\
  {\n\
    return ClipperLib.JS.BoundsOfPaths([path], scale);\n\
  };\n\
  ClipperLib.JS.BoundsOfPaths = function (paths, scale)\n\
  {\n\
    if (!scale) scale = 1;\n\
    var bounds = ClipperLib.Clipper.GetBounds(paths);\n\
    bounds.left /= scale;\n\
    bounds.bottom /= scale;\n\
    bounds.right /= scale;\n\
    bounds.top /= scale;\n\
    return bounds;\n\
  };\n\
  // Clean() joins vertices that are too near each other\n\
  // and causes distortion to offsetted polygons without cleaning\n\
  ClipperLib.JS.Clean = function (polygon, delta)\n\
  {\n\
    if (!(polygon instanceof Array)) return [];\n\
    var isPolygons = polygon[0] instanceof Array;\n\
    var polygon = ClipperLib.JS.Clone(polygon);\n\
    if (typeof delta != \"number\" || delta === null)\n\
    {\n\
      ClipperLib.Error(\"Delta is not a number in Clean().\");\n\
      return polygon;\n\
    }\n\
    if (polygon.length === 0 || (polygon.length == 1 && polygon[0].length === 0) || delta < 0) return polygon;\n\
    if (!isPolygons) polygon = [polygon];\n\
    var k_length = polygon.length;\n\
    var len, poly, result, d, p, j, i;\n\
    var results = [];\n\
    for (var k = 0; k < k_length; k++)\n\
    {\n\
      poly = polygon[k];\n\
      len = poly.length;\n\
      if (len === 0) continue;\n\
      else if (len < 3)\n\
      {\n\
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
    else if (!isPolygons && results.length === 0) results = [];\n\
    else if (isPolygons && results.length === 0) results = [\n\
      []\n\
    ];\n\
    return results;\n\
  }\n\
  // Make deep copy of Polygons or Polygon\n\
  // so that also IntPoint objects are cloned and not only referenced\n\
  // This should be the fastest way\n\
  ClipperLib.JS.Clone = function (polygon)\n\
  {\n\
    if (!(polygon instanceof Array)) return [];\n\
    if (polygon.length === 0) return [];\n\
    else if (polygon.length == 1 && polygon[0].length === 0) return [[]];\n\
    var isPolygons = polygon[0] instanceof Array;\n\
    if (!isPolygons) polygon = [polygon];\n\
    var len = polygon.length,\n\
      plen, i, j, result;\n\
    var results = new Array(len);\n\
    for (i = 0; i < len; i++)\n\
    {\n\
      plen = polygon[i].length;\n\
      result = new Array(plen);\n\
      for (j = 0; j < plen; j++)\n\
      {\n\
        result[j] = {\n\
          X: polygon[i][j].X,\n\
          Y: polygon[i][j].Y\n\
        };\n\
      }\n\
      results[i] = result;\n\
    }\n\
    if (!isPolygons) results = results[0];\n\
    return results;\n\
  };\n\
  // Removes points that doesn't affect much to the visual appearance.\n\
  // If middle point is at or under certain distance (tolerance) of the line segment between \n\
  // start and end point, the middle point is removed.\n\
  ClipperLib.JS.Lighten = function (polygon, tolerance)\n\
  {\n\
    if (!(polygon instanceof Array)) return [];\n\
    if (typeof tolerance != \"number\" || tolerance === null)\n\
    {\n\
      ClipperLib.Error(\"Tolerance is not a number in Lighten().\")\n\
      return ClipperLib.JS.Clone(polygon);\n\
    }\n\
    if (polygon.length === 0 || (polygon.length == 1 && polygon[0].length === 0) || tolerance < 0)\n\
    {\n\
      return ClipperLib.JS.Clone(polygon);\n\
    }\n\
    if (!(polygon[0] instanceof Array)) polygon = [polygon];\n\
    var i, j, poly, k, poly2, plen, A, B, P, d, rem, addlast;\n\
    var bxax, byay, l, ax, ay;\n\
    var len = polygon.length;\n\
    var toleranceSq = tolerance * tolerance;\n\
    var results = [];\n\
    for (i = 0; i < len; i++)\n\
    {\n\
      poly = polygon[i];\n\
      plen = poly.length;\n\
      if (plen == 0) continue;\n\
      for (k = 0; k < 1000000; k++) // could be forever loop, but wiser to restrict max repeat count\n\
      {\n\
        poly2 = [];\n\
        plen = poly.length;\n\
        // the first have to added to the end, if first and last are not the same\n\
        // this way we ensure that also the actual last point can be removed if needed\n\
        if (poly[plen - 1].X != poly[0].X || poly[plen - 1].Y != poly[0].Y)\n\
        {\n\
          addlast = 1;\n\
          poly.push(\n\
          {\n\
            X: poly[0].X,\n\
            Y: poly[0].Y\n\
          });\n\
          plen = poly.length;\n\
        }\n\
        else addlast = 0;\n\
        rem = []; // Indexes of removed points\n\
        for (j = 0; j < plen - 2; j++)\n\
        {\n\
          A = poly[j]; // Start point of line segment\n\
          P = poly[j + 1]; // Middle point. This is the one to be removed.\n\
          B = poly[j + 2]; // End point of line segment\n\
          ax = A.X;\n\
          ay = A.Y;\n\
          bxax = B.X - ax;\n\
          byay = B.Y - ay;\n\
          if (bxax !== 0 || byay !== 0) // To avoid Nan, when A==P && P==B. And to avoid peaks (A==B && A!=P), which have lenght, but not area.\n\
          {\n\
            l = ((P.X - ax) * bxax + (P.Y - ay) * byay) / (bxax * bxax + byay * byay);\n\
            if (l > 1)\n\
            {\n\
              ax = B.X;\n\
              ay = B.Y;\n\
            }\n\
            else if (l > 0)\n\
            {\n\
              ax += bxax * l;\n\
              ay += byay * l;\n\
            }\n\
          }\n\
          bxax = P.X - ax;\n\
          byay = P.Y - ay;\n\
          d = bxax * bxax + byay * byay;\n\
          if (d <= toleranceSq)\n\
          {\n\
            rem[j + 1] = 1;\n\
            j++; // when removed, transfer the pointer to the next one\n\
          }\n\
        }\n\
        // add all unremoved points to poly2\n\
        poly2.push(\n\
        {\n\
          X: poly[0].X,\n\
          Y: poly[0].Y\n\
        });\n\
        for (j = 1; j < plen - 1; j++)\n\
          if (!rem[j]) poly2.push(\n\
          {\n\
            X: poly[j].X,\n\
            Y: poly[j].Y\n\
          });\n\
        poly2.push(\n\
        {\n\
          X: poly[plen - 1].X,\n\
          Y: poly[plen - 1].Y\n\
        });\n\
        // if the first point was added to the end, remove it\n\
        if (addlast) poly.pop();\n\
        // break, if there was not anymore removed points\n\
        if (!rem.length) break;\n\
        // else continue looping using poly2, to check if there are points to remove\n\
        else poly = poly2;\n\
      }\n\
      plen = poly2.length;\n\
      // remove duplicate from end, if needed\n\
      if (poly2[plen - 1].X == poly2[0].X && poly2[plen - 1].Y == poly2[0].Y)\n\
      {\n\
        poly2.pop();\n\
      }\n\
      if (poly2.length > 2) // to avoid two-point-polygons\n\
        results.push(poly2);\n\
    }\n\
    if (!polygon[0] instanceof Array) results = results[0];\n\
    if (typeof (results) == \"undefined\") results = [\n\
      []\n\
    ];\n\
    return results;\n\
  }\n\
  ClipperLib.JS.PerimeterOfPath = function (path, closed, scale)\n\
  {\n\
    if (typeof (path) == \"undefined\") return 0;\n\
    var sqrt = Math.sqrt;\n\
    var perimeter = 0.0;\n\
    var p1, p2, p1x = 0.0,\n\
      p1y = 0.0,\n\
      p2x = 0.0,\n\
      p2y = 0.0;\n\
    var j = path.length;\n\
    if (j < 2) return 0;\n\
    if (closed)\n\
    {\n\
      path[j] = path[0];\n\
      j++;\n\
    }\n\
    while (--j)\n\
    {\n\
      p1 = path[j];\n\
      p1x = p1.X;\n\
      p1y = p1.Y;\n\
      p2 = path[j - 1];\n\
      p2x = p2.X;\n\
      p2y = p2.Y;\n\
      perimeter += sqrt((p1x - p2x) * (p1x - p2x) + (p1y - p2y) * (p1y - p2y));\n\
    }\n\
    if (closed) path.pop();\n\
    return perimeter / scale;\n\
  };\n\
  ClipperLib.JS.PerimeterOfPaths = function (paths, closed, scale)\n\
  {\n\
    if (!scale) scale = 1;\n\
    var perimeter = 0;\n\
    for (var i = 0; i < paths.length; i++)\n\
    {\n\
      perimeter += ClipperLib.JS.PerimeterOfPath(paths[i], closed, scale);\n\
    }\n\
    return perimeter;\n\
  };\n\
  ClipperLib.JS.ScaleDownPath = function (path, scale)\n\
  {\n\
    var i, p;\n\
    if (!scale) scale = 1;\n\
    i = path.length;\n\
    while (i--)\n\
    {\n\
      p = path[i];\n\
      p.X = p.X / scale;\n\
      p.Y = p.Y / scale;\n\
    }\n\
  };\n\
  ClipperLib.JS.ScaleDownPaths = function (paths, scale)\n\
  {\n\
    var i, j, p, round = Math.round;\n\
    if (!scale) scale = 1;\n\
    i = paths.length;\n\
    while (i--)\n\
    {\n\
      j = paths[i].length;\n\
      while (j--)\n\
      {\n\
        p = paths[i][j];\n\
        p.X = p.X / scale;\n\
        p.Y = p.Y / scale;\n\
      }\n\
    }\n\
  };\n\
  ClipperLib.JS.ScaleUpPath = function (path, scale)\n\
  {\n\
    var i, p, round = Math.round;\n\
    if (!scale) scale = 1;\n\
    i = path.length;\n\
    while (i--)\n\
    {\n\
      p = path[i];\n\
      p.X = round(p.X * scale);\n\
      p.Y = round(p.Y * scale);\n\
    }\n\
  };\n\
  ClipperLib.JS.ScaleUpPaths = function (paths, scale)\n\
  {\n\
    var i, j, p, round = Math.round;\n\
    if (!scale) scale = 1;\n\
    i = paths.length;\n\
    while (i--)\n\
    {\n\
      j = paths[i].length;\n\
      while (j--)\n\
      {\n\
        p = paths[i][j];\n\
        p.X = round(p.X * scale);\n\
        p.Y = round(p.Y * scale);\n\
      }\n\
    }\n\
  };\n\
  ClipperLib.ExPolygons = function ()\n\
  {\n\
    return [];\n\
  }\n\
  ClipperLib.ExPolygon = function ()\n\
  {\n\
    this.outer = null;\n\
    this.holes = null;\n\
  };\n\
  ClipperLib.JS.AddOuterPolyNodeToExPolygons = function (polynode, expolygons)\n\
  {\n\
    var ep = new ClipperLib.ExPolygon();\n\
    ep.outer = polynode.Contour();\n\
    var childs = polynode.Childs();\n\
    var ilen = childs.length;\n\
    ep.holes = new Array(ilen);\n\
    var node, n, i, j, childs2, jlen;\n\
    for (i = 0; i < ilen; i++)\n\
    {\n\
      node = childs[i];\n\
      ep.holes[i] = node.Contour();\n\
      //Add outer polygons contained by (nested within) holes ...\n\
      for (j = 0, childs2 = node.Childs(), jlen = childs2.length; j < jlen; j++)\n\
      {\n\
        n = childs2[j];\n\
        ClipperLib.JS.AddOuterPolyNodeToExPolygons(n, expolygons);\n\
      }\n\
    }\n\
    expolygons.push(ep);\n\
  };\n\
  ClipperLib.JS.ExPolygonsToPaths = function (expolygons)\n\
  {\n\
    var a, i, alen, ilen;\n\
    var paths = new ClipperLib.Paths();\n\
    for (a = 0, alen = expolygons.length; a < alen; a++)\n\
    {\n\
      paths.push(expolygons[a].outer);\n\
      for (i = 0, ilen = expolygons[a].holes.length; i < ilen; i++)\n\
      {\n\
        paths.push(expolygons[a].holes[i]);\n\
      }\n\
    }\n\
    return paths;\n\
  }\n\
  ClipperLib.JS.PolyTreeToExPolygons = function (polytree)\n\
  {\n\
    var expolygons = new ClipperLib.ExPolygons();\n\
    var node, i, childs, ilen;\n\
    for (i = 0, childs = polytree.Childs(), ilen = childs.length; i < ilen; i++)\n\
    {\n\
      node = childs[i];\n\
      ClipperLib.JS.AddOuterPolyNodeToExPolygons(node, expolygons);\n\
    }\n\
    return expolygons;\n\
  };\n\
\n\
\n\
  // I added this\n\
  module.exports = ClipperLib;\n\
})();\n\
\n\
\n\
//@ sourceURL=gcanvas/lib/clipper.js"
));
require.register("gcanvas/lib/motion.js", Function("exports, require, module",
"module.exports = Motion;\n\
\n\
var Point = require('./math/point')\n\
  , Path = require('./path')\n\
  , SubPath = require('./subpath')\n\
  , utils = require('./utils');\n\
\n\
/**\n\
 * Realtime motion interface\n\
 * This actually sends commands to the driver.\n\
 * */\n\
function Motion(ctx) {\n\
  this.ctx = ctx;\n\
  this.position = new Point(0,0,0);\n\
}\n\
\n\
Motion.prototype = {\n\
  retract: function() {\n\
    this.rapid({z:0});\n\
  }\n\
, plunge: function() {\n\
    this.rapid({z:this.ctx.top});\n\
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
    // if(params.z - this.position.z > 10)\n\
    //   debugger;\n\
\n\
    this.ctx.driver.linear.call(this.ctx.driver, params);\n\
    this.position = newPosition;\n\
  }\n\
, arcCW: function(params) {\n\
    return this.arc(params,false);\n\
  }\n\
, arcCCW: function(params) {\n\
    return this.arc(params,true);\n\
  }\n\
, arc: function(params,ccw) {\n\
    var newPosition = this.postProcess(params);\n\
    // Note: Can be cyclic so we don't\n\
    // ignore it if the position is the same\n\
\n\
    if(!ccw && this.ctx.driver.arcCW) {\n\
      this.ctx.driver.arcCW.call(this.ctx.driver, params);\n\
    }\n\
    else if(ccw && this.ctx.driver.arcCCW) {\n\
      this.ctx.driver.arcCCW.call(this.ctx.driver, params);\n\
    }\n\
    else {\n\
      var cx = this.position.x + params.i;\n\
      var cy = this.position.y + params.j;\n\
      var arc = utils.pointsToArc({\n\
        x: cx,\n\
        y: cy \n\
      },\n\
      this.position, {\n\
        x: params.x,\n\
        y: params.y\n\
      });\n\
\n\
      this.interpolate('arc',[\n\
                       cx,\n\
                       cy,\n\
                       arc.radius,\n\
                       arc.start,\n\
                       arc.end,\n\
                       ccw],\n\
                       params.z||0);\n\
    }\n\
\n\
    if(newPosition) {\n\
      this.position = newPosition;\n\
    }\n\
  }\n\
, postProcess: function(params) {\n\
\n\
    this.ctx.filters.forEach(function(f) {\n\
      var tmp = f.call(this.ctx, params);\n\
\n\
      if(tmp) {\n\
        for(var k in params) {\n\
          delete params[k];\n\
        }\n\
\n\
        for(var k in tmp) {\n\
          params[k] = tmp[k];\n\
        }\n\
        // params = tmp;\n\
      }\n\
    });\n\
\n\
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
, interpolate: function(name, args, zEnd) {\n\
    var path = new SubPath();\n\
    path[name].apply(path, args);\n\
\n\
    var curLen = 0;\n\
    var totalLen = path.getLength();\n\
    var zStart = this.position.z;\n\
\n\
    function helix() {\n\
      var fullDelta = zEnd - zStart;\n\
      var ratio = (curLen / totalLen);\n\
      var curDelta = fullDelta * ratio;\n\
      return zStart + curDelta;\n\
    }\n\
\n\
    var pts = path.getPoints(40);\n\
    for(var i=0,l=pts.length; i < l; ++i) {\n\
      var p=pts[i];\n\
\n\
      var xo = p.x - this.position.x;\n\
      var yo = p.y - this.position.y;\n\
      curLen += Math.sqrt(xo*xo + yo*yo);\n\
\n\
      this.linear({x:p.x, y:p.y, z:helix()});\n\
    }\n\
  }\n\
\n\
, followPath: function(path, zEnd) {\n\
    if(!path) return false;\n\
\n\
    if(path.subPaths) {\n\
      path.subPaths.forEach(function(subPath) {\n\
        this.followPath(subPath, zEnd);\n\
      }, this);\n\
      return;\n\
    }\n\
\n\
    var zStart = this.position.z;\n\
    var totalLen = path.getLength();\n\
    var curLen = 0;\n\
    var each = {};\n\
    var motion = this;\n\
    var driver = this.ctx.driver;\n\
\n\
    function helix() {\n\
      if(!path.isClosed()) {\n\
        return zEnd;\n\
      }\n\
\n\
      var fullDelta = zEnd - zStart;\n\
      var ratio = (curLen / totalLen);\n\
      var curDelta = fullDelta * ratio;\n\
\n\
      return zStart + curDelta;\n\
    }\n\
\n\
    function interpolate(name, args) {\n\
      var path = new SubPath();\n\
      path.moveTo(motion.position.x, motion.position.y);\n\
      path[name].apply(path, args);\n\
\n\
      var pts = path.getPoints(40);\n\
      for(var i=0,l=pts.length; i < l; ++i) {\n\
        var p=pts[i];\n\
\n\
        motion.linear({x:p.x, y:p.y, z:helix()});\n\
      }\n\
    }\n\
\n\
    each[Path.actions.MOVE_TO] = function(x,y) {\n\
      // Optimize out 0 distances moves\n\
      if(utils.sameFloat(x, this.position.x) &&\n\
         utils.sameFloat(y, this.position.y)) {\n\
\n\
        return;\n\
      }\n\
\n\
      motion.retract();\n\
      motion.rapid({x:x,y:y});\n\
      motion.plunge();\n\
\n\
      if(!path.isClosed()) {\n\
         motion.linear({z:zStart});\n\
      }\n\
\n\
      zStart = motion.position.z;\n\
    };\n\
\n\
    each[Path.actions.LINE_TO] = function(x,y) {\n\
      motion.linear({x:x,y:y,z:helix()});\n\
    };\n\
\n\
    each[Path.actions.ELLIPSE] = function(x, y, rx, ry,\n\
\t\t\t\t\t\t\t\t\t  aStart, aEnd, ccw) {\n\
      // Detect plain arc\n\
      if(utils.sameFloat(rx,ry)) {\n\
          var points = utils.arcToPoints(x, y,\n\
                                         aStart,\n\
                                         aEnd,\n\
                                         rx);\n\
          var params = {\n\
            x: points.end.x, y: points.end.y,\n\
            i: x-points.start.x, j: y-points.start.y,\n\
            z: helix()\n\
          };\n\
\n\
          motion.arc(params, ccw);\n\
\n\
      }\n\
      else {\n\
        interpolate('ellipse', arguments, mx, my);\n\
      }\n\
    };\n\
\n\
    each[Path.actions.BEZIER_CURVE_TO] = function() {\n\
      interpolate('bezierCurveTo', arguments);\n\
    };\n\
\n\
    each[Path.actions.QUADRATIC_CURVE_TO] = function() {\n\
      interpolate('quadraticCurveTo', arguments);\n\
    };\n\
\n\
    for(var i = 0, l = path.actions.length; i < l; ++i) {\n\
      item = path.actions[i]\n\
\n\
      if(i != 0) {\n\
        var x0 = this.position.x;\n\
        var y0 = this.position.y;\n\
        curLen += path.getActionLength(x0, y0, i);\n\
      }\n\
\n\
\n\
      // Every action should be plunged except for move\n\
      // if(item.action !== Path.actions.MOVE_TO) {\n\
        // motion.plunge();\n\
      // }\n\
\n\
      each[item.action].apply(this, item.args);\n\
    }\n\
  }\n\
\n\
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
var EPSILON = 0.000001;\n\
\n\
module.exports = {\n\
  /*\n\
   * Convert start+end angle arc to start/end points.\n\
   * */\n\
  arcToPoints: function(x, y, astart, aend, radius) {\n\
    astart = astart % Math.PI;\n\
    aend = aend % Math.PI;\n\
\n\
    var a = new Point(), // start point\n\
        b = new Point(); // end point\n\
\n\
    a.x = radius * Math.cos(astart) + x\n\
    a.y = radius * Math.sin(astart) + y\n\
\n\
    b.x = radius * Math.cos(aend) + x\n\
    b.y = radius * Math.sin(aend) + y\n\
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
        radius = center.sub(start).magnitude();\n\
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
\n\
    if(Math.abs(a-b) < EPSILON)\n\
      return true;\n\
\n\
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
, spiral: function(divisions,r0,r1,loops,start,ccw,callback) {\n\
    if(loops == 0 || loops == Infinity) {\n\
      if(loops)\n\
        debugger;\n\
      return start;\n\
    }\n\
\n\
    // var divisions = 40;\n\
    var end = Math.abs(loops) * divisions * 2;\n\
    var delta = r1-r0;\n\
    var pitch = divisions/end*delta;\n\
    var a = r0;\n\
    var b = pitch/Math.PI;\n\
    var stepAngle = Math.PI/divisions;\n\
    start = start || 0;\n\
    var x,y,t;\n\
    var angle;\n\
\n\
    for(var i = 1; i < end; i++) {\n\
      angle = stepAngle * i;\n\
      if(ccw) {\n\
        x = (a + b * angle) * Math.sin(angle+start);\n\
        y = (a + b * angle) * Math.cos(angle+start);\n\
      }\n\
      else {\n\
        x = (a + b * angle) * Math.cos(angle+start);\n\
        y = (a + b * angle) * Math.sin(angle+start);\n\
      }\n\
\n\
      t = i/end; \n\
\n\
      var proceed = callback(x, y, t);\n\
      if(proceed === false) {\n\
        break;\n\
      }\n\
    }\n\
\n\
    return angle+start;\n\
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
      if(params[k] === undefined || params[k] === null)\n\
        continue;\n\
\n\
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
, zero: function(params) {\n\
    this.send('G28.3', params);\n\
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
var Point = require('../math/point');\n\
\n\
function Simulator(scene) {\n\
  this.scene = scene;\n\
  this.dist = 0;\n\
  this.all = [];\n\
}\n\
\n\
Simulator.prototype = {\n\
  setPathMode: function(mode) {\n\
    if(mode === this.mode) return;\n\
\n\
    var geometry = new THREE.Geometry();\n\
\n\
    var cur = this.src.motion.position;\n\
\n\
    geometry.vertices.push(\n\
      new THREE.Vector3(cur.x,cur.y,cur.z)\n\
    );\n\
\n\
    var material = new THREE.LineBasicMaterial({\n\
      color: mode=='rapid' ? 0x0000cc : 0x333333\n\
      , shadow: true\n\
    });\n\
\n\
    material.opacity = 0.75;\n\
    material.linewidth = 1;\n\
\n\
    var line = new THREE.Line(geometry, material);\n\
    scene.add(line);\n\
    this.toolpath = geometry;\n\
    this.mode = mode;\n\
\n\
    line.castShadow = true;\n\
  }\n\
\n\
, addPoint: function(p) {\n\
    var cur = this.src.motion.position;\n\
    var x = p.x === undefined ? cur.x : p.x;\n\
    var y = p.y === undefined ? cur.y : p.y;\n\
    var z = p.z === undefined ? cur.z : p.z;\n\
\n\
    var xo = x-cur.x;\n\
    var yo = y-cur.y;\n\
    var len = Math.sqrt(xo*xo + yo*yo);\n\
    this.dist += len;\n\
\n\
    this.all.push(new THREE.Vector3(x,y,z));\n\
\n\
    this.toolpath.vertices.push(\n\
      new THREE.Vector3(x,y,z)\n\
    );\n\
  }\n\
\n\
, rapid: function(p) {\n\
    this.setPathMode('rapid');\n\
    this.addPoint(p);\n\
    return;\n\
\n\
    // if(p.x === undefined) p.x = cur.x;\n\
    // if(p.y === undefined) p.y = cur.y;\n\
\n\
    // this.ctx.beginPath();\n\
    // // this.ctx.setLineDash([2,2]);\n\
    // this.ctx.moveTo(cur.x, cur.y);\n\
    // this.ctx.strokeStyle = 'rgba(0,0,255,0.5)';\n\
    // this.ctx.lineTo(p.x, p.y);\n\
    // this.n++;\n\
    // this.ctx.stroke();\n\
\n\
    // arrow(this.ctx, cur.x, cur.y, p.x, p.y, 5);\n\
\n\
    // // this.ctx.fillStyle = 'rgba(0,0,0,1)';\n\
    // this.ctx.fillText(this.n, cur.x+10, cur.y+10);\n\
\n\
  } \n\
, linear: function(p) {\n\
    this.setPathMode('linear');\n\
    this.addPoint(p);\n\
    return;\n\
\n\
    this.ctx.beginPath();\n\
    this.ctx.moveTo(cur.x, cur.y);\n\
    this.ctx.lineTo(p.x, p.y);\n\
\n\
    // var za = p.z/1000;\n\
\n\
    // this.ctx.lineWidth = p.z/20;\n\
\n\
    var distc = Math.round(this.dist/2);\n\
    this.ctx.strokeStyle = 'rgba('+(255-distc)+','+distc+',0,0.5)';\n\
    // if(cur.z <= 0) {\n\
    //   this.ctx.strokeStyle = 'rgba(10,200,10,1)';\n\
    // }\n\
    this.ctx.stroke();\n\
\n\
    // this.ctx.lineWidth = 0.5;\n\
\n\
    this.ctx.save();\n\
    this.ctx.strokeStyle = 'rgba(255,0,0,.01)';\n\
    this.ctx.lineWidth = this.src.toolDiameter || 0.5;\n\
    this.ctx.lineCap = 'round';\n\
    this.ctx.stroke();\n\
    this.ctx.restore();\n\
\n\
\n\
    // this.ctx.lineWidth = this.src.toolDiameter || 5;\n\
    // this.ctx.stroke();\n\
    // this.ctx.lineCap = 'round';\n\
    // this.ctx.strokeStyle = 'rgba(0,0,0,1)';\n\
    // this.ctx.lineWidth = 1;\n\
\n\
    arrow(this.ctx, cur.x, cur.y, p.x, p.y, 5);\n\
  }\n\
, send: function() {\n\
  }\n\
, zero: function() {\n\
  }\n\
, draw: function() {\n\
  }\n\
};\n\
\n\
\n\
var d = 0;\n\
function arrow(ctx, x1,y1,x2,y2,size) {\n\
  size = 2;\n\
  var p1 = new Point(x1, y1);\n\
  var p2 = new Point(x2, y2);\n\
  var center = p2.sub(p1); // delta\n\
\n\
  d += center.magnitude()\n\
  if(d < 20) {\n\
    return;\n\
  }\n\
  d = 0;\n\
\n\
  center = center.magnitude( center.magnitude() / 2 );\n\
  center = center.add(p1); // move back relative to p1\n\
  var dir = Point.direction(p1, p2);\n\
\n\
  ctx.save();\n\
  ctx.translate(center.x, center.y);\n\
  ctx.beginPath();\n\
  ctx.rotate(dir+Math.PI*2);\n\
  ctx.moveTo(-size,-size);\n\
  ctx.lineTo(0, 0);\n\
  ctx.lineTo(-size, size);\n\
  ctx.stroke();\n\
  ctx.restore();\n\
}\n\
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