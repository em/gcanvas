module.exports = Simulator;

var Point = require('../math/point');

function Simulator(scene) {
  this.scene = scene;
  this.dist = 0;
  this.all = [];
}

Simulator.prototype = {
  setPathMode: function(mode) {
    if(mode === this.mode) return;

    var geometry = new THREE.Geometry();

    var cur = this.src.motion.position;

    geometry.vertices.push(
      new THREE.Vector3(cur.x,cur.y,cur.z)
    );

    var material = new THREE.LineBasicMaterial({
      color: mode=='rapid' ? 0x0000cc : 0x333333
      , shadow: true
    });

    material.opacity = 0.75;
    material.linewidth = 1;

    var line = new THREE.Line(geometry, material);
    scene.add(line);
    this.toolpath = geometry;
    this.mode = mode;

    line.castShadow = true;
  }

, addPoint: function(p) {
    var cur = this.src.motion.position;
    var x = p.x === undefined ? cur.x : p.x;
    var y = p.y === undefined ? cur.y : p.y;
    var z = p.z === undefined ? cur.z : p.z;

    var xo = x-cur.x;
    var yo = y-cur.y;
    var len = Math.sqrt(xo*xo + yo*yo);
    this.dist += len;

    this.all.push(new THREE.Vector3(x,y,z));

    this.toolpath.vertices.push(
      new THREE.Vector3(x,y,z)
    );
  }

, rapid: function(p) {
    this.setPathMode('rapid');
    this.addPoint(p);
    return;

    // if(p.x === undefined) p.x = cur.x;
    // if(p.y === undefined) p.y = cur.y;

    // this.ctx.beginPath();
    // // this.ctx.setLineDash([2,2]);
    // this.ctx.moveTo(cur.x, cur.y);
    // this.ctx.strokeStyle = 'rgba(0,0,255,0.5)';
    // this.ctx.lineTo(p.x, p.y);
    // this.n++;
    // this.ctx.stroke();

    // arrow(this.ctx, cur.x, cur.y, p.x, p.y, 5);

    // // this.ctx.fillStyle = 'rgba(0,0,0,1)';
    // this.ctx.fillText(this.n, cur.x+10, cur.y+10);

  } 
, linear: function(p) {
    this.setPathMode('linear');
    this.addPoint(p);
    return;

    this.ctx.beginPath();
    this.ctx.moveTo(cur.x, cur.y);
    this.ctx.lineTo(p.x, p.y);

    // var za = p.z/1000;

    // this.ctx.lineWidth = p.z/20;

    var distc = Math.round(this.dist/2);
    this.ctx.strokeStyle = 'rgba('+(255-distc)+','+distc+',0,0.5)';
    // if(cur.z <= 0) {
    //   this.ctx.strokeStyle = 'rgba(10,200,10,1)';
    // }
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
