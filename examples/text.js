example('text', function(ctx) {
  ctx.translate(0.5, 0.5);

  ctx.font = "36pt Helvetica";
  ctx.strokeText("Stroke", 20, 70);

  ctx.font = "56pt Helvetica";
  ctx.toolDiameter = 2;
  ctx.fillText("Fill", 20, 160);
});


