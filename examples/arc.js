function main(ctx) {
  ctx.feed = 1000;
  ctx.arc(100, 100, 80, 0, Math.PI * 1.5);
  ctx.arc(100, 100, 60, 0, Math.PI * 1.5, true);
  ctx.arc(100, 100, 40, 0, Math.PI * 1.5, true);
  ctx.stroke();

  // Isolated circle with beginPath
  ctx.beginPath();
  ctx.arc(100, 100, 20, 0, Math.PI * 2);
  ctx.stroke();
}

if(this.example) this.example('arcs', main);
