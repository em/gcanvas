function main(ctx) {
  star(ctx, 100, 100, 90, 5, 0.5);

  function star(ctx, x, y, r, p, m) {
    ctx.translate(x, y);
    ctx.moveTo(0,0-r);
    for (var i = 0; i < p; i++) {
      ctx.rotate(Math.PI / p);
      ctx.lineTo(0, 0 - (r*m));
      ctx.rotate(Math.PI / p);
      ctx.lineTo(0, 0 - r);
    }
    ctx.fill();
  }
}

if(this.example) this.example('filling', main);
