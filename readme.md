# GCanvas
A nodejs and browser HTML Canvas API implementation that generates Gcode for CNC milling


#Example
  ```
  var ctx = new GCanvas();
  ctx.depth = 1;
  ctx.depthOfCut = 0.25; // 4 passes
  ctx.strokeText("Robots are cool", "20pt");
  ```

  http://emery.denucc.io/gcanvas/examples

# Unit conversion
  GCanvas doesn't do any initial setup routine defining units.
  I usually mill in mm's which means if I do a `lineTo(0,10)`,
  on my CNC machine that is 10mm on the X axis, but in a browser
  canvas that's 10px. That isn't always so bad but if I am working
  on something really detailed I usually `scale(10,10)` the preview only,
  independent of the actual drawing making 1mm = 10px.

  You can use `scale()` the other way too to convert pixels to real-world
  dimensions.

  Or to work in inches (if your machine is in mm), `scale(25.4, 25.4)`

  You could also issue the `G20` (use inches) command directly through the driver.
  ```
  context.driver.send('G20');
  ```

# Differences from HTML Canvas
  Additional context properties are added to bring 2D to 2.5D,
  and to support stroke-alignment which the canvas spec doesn't have yet (but really needs).

  * `context.depth` specifies the total resultant depth of all layered cuts.
  * `context.depthOfCut` specifies the depth of each cut per layer.
  * `context.strokeAlign` can be 'inset', 'outset', or 'center' (default)

# Why
1. The most common machining tasks are 2.5D. Doing that in 3D makes everything so much harder than it needs to be.
2. Easily run drawing code against a real canvas for previewing.
3. A good basis for implementing other 2.5D milling in js. 
