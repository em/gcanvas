example('clipping', function(ctx) {
  ctx.toolDiameter = 10;
  ctx.rect(20, 20, 160, 160);
  ctx.clip();

  ctx.beginPath();
  ctx.arc(100, 100, 90, 0, Math.PI*2);
  ctx.fill();
});
