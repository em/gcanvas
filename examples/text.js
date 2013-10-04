example('text', function(ctx) {
  ctx.translate(0.5, 0.5);

  ctx.lineTo(40,40);

  ctx.font = "50pt Helvetica";
  ctx.strokeText("Poop.", 20, 110);

  ctx.lineTo(22,20);
  ctx.stroke();
});


