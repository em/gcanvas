function main(ctx) {
  ctx.toolDiameter = 10;
  ctx.rect(20, 20, 160, 160);
  ctx.arc(10, 10, 100, 0, Math.PI*2);
  ctx.clip();

  ctx.beginPath();
  ctx.arc(100, 100, 90, 0, Math.PI*2);
  ctx.arc(150, 150, 50, 0, Math.PI*2);
  ctx.fill();
}

if(this.example) this.example('clipping', main);
