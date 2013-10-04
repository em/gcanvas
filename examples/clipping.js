example('clipping', function(ctx) {
  ctx.toolDiameter = 10;
  ctx.arc(100, 50, 55, 0, Math.PI*2);
  ctx.arc(100, 120, 55, 0, Math.PI*2);
  ctx.clip();

  ctx.beginPath();
  ctx.rect(20, 60, 160, 80, Math.PI*2);
  ctx.fill();
});
