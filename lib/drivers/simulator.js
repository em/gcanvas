module.exports = Simulator;

var Point = require('../math/point');

function Simulator(ctx) {
  this.ctx = ctx;
  this.n = 0;
  ctx.font = "3pt helvetica";
  cur = {x:0,y:0};
}

Simulator.prototype = {
  rapid: function(p) {
    cur = this.src.motion.position;

    this.ctx.beginPath();
    // this.ctx.setLineDash([2,2]);
    this.ctx.moveTo(cur.x, cur.y);
    this.ctx.strokeStyle = 'rgba(0,0,255,0.5)';
    this.ctx.lineTo(p.x, p.y);
    this.n++;
    this.ctx.stroke();

    arrow(this.ctx, cur.x, cur.y, p.x, p.y, 5);

    // this.ctx.fillStyle = 'rgba(0,0,0,1)';
    this.ctx.fillText(this.n, cur.x+10, cur.y+10);

  } 
, linear: function(p) {
    var cur = this.src.motion.position;

    this.ctx.beginPath();
    this.ctx.moveTo(cur.x, cur.y);
    this.ctx.lineTo(p.x, p.y);

    // var za = p.z/1000;

    // this.ctx.lineWidth = p.z/20;

    this.ctx.strokeStyle = 'rgba(255,0,0,0.5)';
    if(cur.z <= 0) {
      this.ctx.strokeStyle = 'rgba(10,200,10,1)';
    }
    this.ctx.stroke();

    // this.ctx.lineWidth = 0.5;

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255,0,0,.01)';
    this.ctx.lineWidth = this.src.toolDiameter || 0.5;
    this.ctx.lineCap = 'round';
    this.ctx.stroke();
    this.ctx.restore();


    // this.ctx.lineWidth = this.src.toolDiameter || 5;
    // this.ctx.stroke();
    // this.ctx.lineCap = 'round';
    // this.ctx.strokeStyle = 'rgba(0,0,0,1)';
    // this.ctx.lineWidth = 1;

    arrow(this.ctx, cur.x, cur.y, p.x, p.y, 5);
  }
, send: function() {
  }
, zero: function() {
  }
, draw: function() {
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
