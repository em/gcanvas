module.exports = GCanvas;

var Path = require('./path')
  , Motion = require('./motion')
  , GcodeDriver = require('./drivers/gcode')
  , Point = require('./math/point')
  , Matrix = require('./math/matrix')
  , Font = require('./font')
  , parseFont = require('./parsefont')
  , utils = require('./utils');

function GCanvas(driver, width, height) {
  var self = this;
  this.canvas = {
    width: width,
    height: height,
    getContext: function() {
      return self;
    }
  };

  this.font = "7pt Helvetiker";
  this.matrix = new Matrix();
  this.rotation = 0; 
  this.depth = 0;
  this.depthOfCut = 0;
  this.top = 0;
  this.aboveTop = 0;
  this.strokeAlign = 'center';
  this.feed = 1000;
  this.driver = driver || new GcodeDriver();
  this.driver.src = this;
  this.stack = [];
  this.motion = new Motion(this);
  this.surfaceTolerance = 0;

  this.beginPath();
}

GCanvas.prototype = {
  save: function() {
    this.stack.push({
      matrix: this.matrix.clone(),
      rotation: this.rotation
    });
  }
, restore: function() {
    var prev = this.stack.pop();
    if(!prev) return;
    this.matrix = prev.matrix;
    this.rotation = prev.rotation;
  }
, beginPath: function() {
    // this.prevSubPaths = this.subPaths;
    this.path = new Path();
    // this.subPaths = [this.path];
  }
, _restorePath: function() {
    this.subPaths = this.prevSubPaths;
    this.path = this.subPaths[this.subPaths.length-1] || new Path();
  }
, transform: function(a, b, c, d, e, f) {
    this.matrix = this.matrix.concat(
      new Matrix(a, b, c, d, e, f)
    );
  }
, setTransform: function(a, b, c, d, e, f) {
    this.matrix = new Matrix(a, b, c, d, e, f);
  }
, resetTransform: function() {
    this.matrix = new Matrix();
  }
, rotate: function(angle) {
    this.matrix = this.matrix.rotate(angle);
  }
, translate: function(x,y) {
    this.matrix = this.matrix.translate(x,y);
  }
, scale: function(x,y) {
    this.matrix = this.matrix.scale(x,y);
  }
  // TODO: clean up
, _transformPoint: function(a, i) {
    i = i || 0;
    if(a.length) {
      var v = new Point(a[i], a[i+1]);
      v = this.matrix.transformPoint(v);
      a[i] = v.x; 
      a[i+1] = v.y; 
    }
    else if(a.x) {
      var v = new Point(a.x, a.y);
      v = this.matrix.transformPoint(v);
      a.x = v.x; 
      a.y = v.y; 
    }
  }
, _ensurePath: function(x,y) {
    if(this.path.subPaths.length === 0) {
      this.path.moveTo(x,y);
    }
  }
, moveTo: function(x,y) {
    this._transformPoint(arguments);
    // this.path = new Path();
    this.path.moveTo(x,y);
    // this.subPaths.push( this.path );
  }
, lineTo: function(x,y) {
    this._transformPoint(arguments);
    this._ensurePath(x,y);
    this.path.lineTo(x,y);
  }
, arc: function (x, y, radius,
									  aStartAngle,
                    aEndAngle,
                    aClockwise ) {
    // In the conversion to points we lose the distinction
    // between 0 and pi2 so we must optimize out 0 here 
    // or else they will be treated as full circles.
    if(aStartAngle - aEndAngle === 0) {
      return;
    }

    // See portal2 example
    if(aEndAngle-aStartAngle === -Math.PI*2)
      aEndAngle = Math.PI*2;

    var center = new Point(x, y, 0);
    var points = utils.arcToPoints(center,
                                   aStartAngle,
                                   aEndAngle,
                                   radius);
    // center.applyMatrix(this.matrix);
    this._transformPoint(center);
    this._transformPoint(points.start);
    this._transformPoint(points.end);

    var res = utils.pointsToArc(center,
                                points.start,
                                points.end);

    this._ensurePath(points.start.x, points.start.y);
    this.path.arc(center.x, center.y, res.radius, res.start, res.end, aClockwise);
  }
, bezierCurveTo: function( aCP1x, aCP1y,
                           aCP2x, aCP2y,
                           aX, aY ) {

    this._transformPoint(arguments, 0);
    this._transformPoint(arguments, 2);
    this._transformPoint(arguments, 4);

    this.path.bezierCurveTo.apply(this.path, arguments);
  }

, quadraticCurveTo: function( aCPx, aCPy, aX, aY ) {
    this._transformPoint(arguments, 0);
    this._transformPoint(arguments, 2);

    this.path.quadraticCurveTo.apply(this.path, arguments);
  }

, clip: function() {
    this.clipRegion = this.path;
    // this.clipRegion = this.subPaths.slice(0,-1);
    // this.clipRegion.push(this.path.clone());
  }
, rect: function(x,y,w,h) {
    this.moveTo(x,y);
    this.lineTo(x+w,y);
    this.lineTo(x+w,y+h);
    this.lineTo(x,y+h);
    this.lineTo(x,y);
  }
, fillRect: function(x,y,w,h) { 
    this.beginPath();
    this.rect.apply(this, arguments);
    this.fill();
  }
, measureText: function(text) {
    // Removed until I have cleaner way to do it
  }
, stroke: function() {
    var offset = 0;
    if(this.strokeAlign === 'outset') {
      offset = this.toolDiameter;
    }
    if(this.strokeAlign === 'inset') {
      offset = -this.toolDiameter;
      console.log(offset);
    }

    var path = this.path;
    path = path.offset(offset);
    // path = path.clip(this.clipRegion);

    this._layer(function() {
      this.motion.followPath(path);
    });
  }
, fill: function(windingRule) {

    if(!this.toolDiameter) {
      throw 'You must set context.toolDiameter to use fill()'
    }

    var path = this.path;
    path = path.simplify(windingRule);
    path = path.clip(this.clipRegion);
    path = path.fillPath(this.toolDiameter);

    this._layer(function(depth) {
      this.motion.followPath(path);
    });

  }
, _layer: function(fn) {
    var depthOfCut = this.depthOfCut || this.depth;
    var start = this.top + depthOfCut;

    if(depthOfCut === 0) {
      this.motion.targetDepth = start;
      fn.call(this);
      return;
    }

    for(var depth=start;
        depth <= this.top+this.depth;
        depth += depthOfCut) {
      // Clip to actual depth
      depth = Math.min(depth, this.top+this.depth);
      // Set new target depth in motion
      this.motion.targetDepth = depth;
      // Remove the material at this depth
      fn.call(this, depth);
    }
  }
, text: function(text, x, y, params) {
      var fontProps = parseFont(this.font);
      var font = new Font(fontProps);

      this.beginPath();
      this.save();
      this.translate(x, y);
      font.drawText(this, text);
      this.restore();
  }

, fillText: function(text, x, y, params) {
      var fontProps = parseFont(this.font);
      var font = new Font(fontProps);

      this.beginPath();
      this.save();
      this.translate(x, y);
      font.drawText(this, text);
      this.fill();
      this.restore();
  }

, strokeText: function(text, x, y, params) {
    this._layer(function() {
      var fontProps = parseFont(this.font);
      var font = new Font(fontProps);

      this.beginPath();
      this.save();
      this.translate(x, y);
      font.drawText(this, text);
      this.stroke();
      this.restore();
    });
  }
, clearRect: function() {}
, closePath: function() {
    this.path.close();
  }
};

GCanvas.Filter = require('./drivers/filter');
GCanvas.Simulator = require('./drivers/simulator');
GCanvas.GcodeDriver = GcodeDriver;

var helvetiker = require('./fonts/helvetiker_regular.typeface');
Font.load(helvetiker);
