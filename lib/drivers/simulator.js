module.exports = Simulator;

function Simulator(ctx) {
  this.ctx = ctx;
  this.n = 0;
  ctx.font = "6pt helvetica";
  this.prev = {x:0,y:0};
}

Simulator.prototype = {
  rapid: function(p) {
    this.ctx.beginPath();
    this.ctx.setLineDash([2,2]);
    this.ctx.moveTo(this.prev.x, this.prev.y);
    this.ctx.strokeStyle = 'rgba(0,0,255,0.5)';
    this.ctx.lineTo(p.x, p.y);
    this.n++;
    this.ctx.stroke();
    this.ctx.setLineDash([0,0]);

    this.ctx.fillStyle = 'rgba(0,0,0,1)';
    this.ctx.fillText(this.n, this.prev.x, this.prev.y+10);

    this.prev = p;

  } 
, linear: function(p) {
    this.ctx.beginPath();
    this.ctx.strokeStyle = 'rgba(0,0,0,1)';
    this.ctx.moveTo(this.prev.x, this.prev.y);
    this.ctx.lineTo(p.x, p.y);
    this.ctx.stroke();

    this.prev = p;
  }
};
