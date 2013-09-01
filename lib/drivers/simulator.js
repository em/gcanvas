module.exports = Simulator;

function Simulator(ctx) {
  this.ctx = ctx;
}

Simulator.prototype = {
  rapid: function(p) {
    this.ctx.moveTo(p.x, p.y);
  } 
, linear: function(p) {
    this.ctx.lineTo(p.x, p.y);
  }
};
