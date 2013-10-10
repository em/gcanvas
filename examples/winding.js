function main(ctx) {
  ctx.toolDiameter = 10;
  ctx.arc(100, 100, 90, 0, Math.PI*2, true);
  star(ctx, 100, 100, 40, 5, 0.5);
  // ctx.arc(100, 130, 30, 0, Math.PI*2);
  ctx.fill('nonzero');
}

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


if(this.example) example('winding', main);
