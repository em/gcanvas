function main(ctx) {
  ctx.moveTo(20,20);
  ctx.quadraticCurveTo(20,100,180,20);
  ctx.stroke();
}

if(this.example) this.example('quadratic curves', main);
