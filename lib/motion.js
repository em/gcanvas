module.exports = Motion;

var Vector3 = require('./math/Vector3')
  , utils = require('./utils');

/**
 * Realtime motion interface
 * These actually send commands to the driver.
 * */
function Motion(ctx) {
  this.ctx = ctx;
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
    this.ctx.position = newPosition;
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

    var v1 = new Vector3(
          params.x === undefined ? this.ctx.position.x : params.x
        , params.y === undefined ? this.ctx.position.y : params.y
        , params.z === undefined ? this.ctx.position.z : params.z);

    if(utils.samePos(this.ctx.position, v1)) {
      return false;
    }

    return v1;
  }
};
