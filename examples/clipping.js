example('clipping', function(ctx) {
  ctx.arc(100, 100, 75, 0, Math.PI*2);
  ctx.clip();

  ctx.beginPath();
  ctx.rect(20, 60, 160, 80, Math.PI*2);
  ctx.fill();
});

function star(ctx, x, y, r, p, m)
{
  ctx.save();
  ctx.translate(x, y);
  ctx.moveTo(0,0-r);
  for (var i = 0; i < p; i++)
  {
    ctx.rotate(Math.PI / p);
    ctx.lineTo(0, 0 - (r*m));
    ctx.rotate(Math.PI / p);
    ctx.lineTo(0, 0 - r);
  }
  ctx.restore();
}

