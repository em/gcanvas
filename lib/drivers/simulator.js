module.exports = Simulator;

var Point = require('../math/point');

function Simulator(ctx) {
  this.ctx = ctx;
  this.n = 0;
  ctx.font = "6pt helvetica";
  this.prev = {x:0,y:0};
}

Simulator.prototype = {
  rapid: function(p) {
    this.ctx.beginPath();
    // this.ctx.setLineDash([2,2]);
    this.ctx.moveTo(this.prev.x, this.prev.y);
    this.ctx.strokeStyle = 'rgba(0,0,255,0.1)';
    this.ctx.lineTo(p.x, p.y);
    this.n++;
    this.ctx.stroke();

    arrow(this.ctx, this.prev.x, this.prev.y, p.x, p.y, 5);

    this.ctx.fillStyle = 'rgba(0,0,0,1)';
    this.ctx.fillText(this.n, this.prev.x+10, this.prev.y+10);

    this.prev = this.src.motion.position;
  } 
, linear: function(p) {
    this.prev = this.src.motion.position;

    this.ctx.beginPath();
    this.ctx.moveTo(this.prev.x, this.prev.y);
    this.ctx.lineTo(p.x, p.y);

    this.ctx.strokeStyle = 'rgba(255,0,0,.5)';
    // this.ctx.lineWidth = this.src.toolDiameter || 5;
    // this.ctx.stroke();
    // this.ctx.lineCap = 'round';
    // this.ctx.strokeStyle = 'rgba(0,0,0,1)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    arrow(this.ctx, this.prev.x, this.prev.y, p.x, p.y, 5);
  }
, send: function() {
  }
};


var d = 0;
function arrow(ctx, x1,y1,x2,y2,size) {
  size = 2;
  var p1 = new Point(x1, y1);
  var p2 = new Point(x2, y2);
  var center = p2.sub(p1); // delta

  d += center.magnitude()
  if(d < 20) {
    return;
  }
  d = 0;

  center = center.magnitude( center.magnitude() / 2 );
  center = center.add(p1); // move back relative to p1
  var dir = Point.direction(p1, p2);

  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.beginPath();
  ctx.rotate(dir+Math.PI*2);
  ctx.moveTo(-size,-size);
  ctx.lineTo(0, 0);
  ctx.lineTo(-size, size);
  ctx.stroke();
  ctx.restore();
}
