module.exports = Motion;

var Point = require('./math/point')
  , Path = require('./path')
  , utils = require('./utils');

/**
 * Realtime motion interface
 * These actually send commands to the driver.
 * */
function Motion(ctx) {
  this.ctx = ctx;
  this.position = new Point(0,0,0);
}

Motion.prototype = {
  retract: function() {
  this.prevZ = this.ctx.position.z;
  this.linear({z:0});
}
, plunge: function() {
  if(this.prevZ)
    this.linear({z: this.prevZ});
  else
    this.linear({z: this.ctx.depthOfCut});
}
, rapid: function(params) {
    var newPosition = this.mergePosition(params);
    if(!newPosition) return;

    this.ctx.driver.rapid.call(this.ctx.driver, params);
    this.position = newPosition;
  }
, linear: function(params) {
    var newPosition = this.mergePosition(params);
    if(!newPosition) return;

    this.ctx.driver.linear.call(this.ctx.driver, params);
    this.ctx.position = newPosition;
  }
, arcCW: function(params) {
    var newPosition = this.mergePosition(params);
    // if(!newPosition) return;

    this.ctx.driver.arcCW.call(this.ctx.driver, params);
    this.ctx.position = newPosition;
  }
, arcCCW: function(params) {
    var newPosition = this.mergePosition(params);
    // if(!newPosition) return;

    this.ctx.driver.arcCCW.call(this.ctx.driver, params);
    this.ctx.position = newPosition;
  }
, mergePosition: function(params) {
    if(params.x)
      params.x = Math.round(params.x * 1000000) / 1000000;
    if(params.y)
      params.y = Math.round(params.y * 1000000) / 1000000;
    if(params.z)
      params.z = Math.round(params.z * 1000000) / 1000000;

    var v1 = new Point(
          params.x === undefined ? this.ctx.position.x : params.x
        , params.y === undefined ? this.ctx.position.y : params.y
        , params.z === undefined ? this.ctx.position.z : params.z);

    if(utils.samePos(this.ctx.position, v1)) {
      return false;
    }

    return v1;
  }

, followPath: function(path) {
    var each = {};
    var motion = this;
    var driver = this.ctx.driver;
    var item;

    each[Path.actions.MOVE_TO] = function(x,y) {
      motion.retract();
      motion.rapid({x:x,y:y});
    };

    each[Path.actions.LINE_TO] = function(x,y) {
      motion.plunge();
      motion.linear({x:x,y:y});
    };

    each[Path.actions.ELLIPSE] = function(x, y, rx, ry,
									  aStart, aEnd, aClockwise , mx, my) {
      motion.plunge();

      // Detect plain arc
      if(utils.sameFloat(rx,ry) &&
        (driver.arcCW && !aClockwise) ||
        (driver.arcCCW && aClockwise) ) {
          var center = new Point(x, y);
          var points = utils.arcToPoints(center,
                                         aStart,
                                         aEnd,
                                         rx);
          var params = {
            x: points.end.x, y: points.end.y,
            i: x, j: y
          };

          if(aClockwise)
            motion.arcCCW(params);
          else
            motion.arcCW(params);
      }
      else {
        this._interpolate('ellipse', arguments, mx, my);
      }
    };

    each[Path.actions.BEZIER_CURVE_TO] = function() {
      var lastargs = path.actions[ i - 1 ].args;
      var x0 = lastargs[ lastargs.length - 2 ];
      var y0 = lastargs[ lastargs.length - 1 ];

      this._interpolate('bezierCurveTo', arguments, x0, y0);
    };

    each[Path.actions.QUADRATIC_CURVE_TO] = function() {
      var lastargs = path.actions[ i - 1 ].args;
      var x0 = lastargs[ lastargs.length - 2 ];
      var y0 = lastargs[ lastargs.length - 1 ];

      this._interpolate('quadraticCurveTo', arguments, x0, y0);
    };

    for(var i = 0, l = path.actions.length; i < l; ++i) {
      item = path.actions[i]
      each[item.action].apply(this, item.args);
    }
  }

, _interpolate: function(name, args, mx, my) {
    var path = new Path();
    path.moveTo(mx,my);
    path[name].apply(path, args);

    var pts = path.getPoints(40);
    for(var i=0,l=pts.length; i < l; ++i) {
      var p=pts[i];
      this.linear({x:p.x, y:p.y});
    };
  }
};
