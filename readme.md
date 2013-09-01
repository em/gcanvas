# GCanvas
A nodejs and browser HTML Canvas API implementation that generates Gcode for CNC milling

#Example
  ```
  var ctx = new GCanvas();  
  ctx.depth = 1;
  ctx.depthOfCut = 0.25; // 4 passes
  ctx.strokeText("Robots are cool", "20pt");
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
