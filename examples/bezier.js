function main(ctx) {
  ctx.moveTo(20,20);
  ctx.bezierCurveTo(20,100,180,100,180,20);
  ctx.stroke();
}

if(this.example) this.example('bezier curves', main);
