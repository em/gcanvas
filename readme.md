Gcanvas
========
An HTML5 Canvas API implementation that generates Gcode for CNC milling. Runs in node and the browser. 

### Installation
First make sure you have [nodejs](http://nodejs.org) installed.
```
npm install -g gcanvas
```

### Example
test.js
```
function main(ctx) {
  ctx.depth = 1;
  ctx.depthOfCut = 0.25; // 4 passes
  ctx.strokeText("Robots are cool", "20pt");
}
```
```
$ gcanvas test.js
```
More examples: http://emery.denucc.io/gcanvas/examples

### TODO (Current Limitations)
The project is still very new and some things are missing:

* Read system ttf fonts. Right now, any fonts defaults to a single built-in Helvetiker font.

* lineWidth, endCap, and miterLimit
   Currently stroke() does nothing but follow the path.
   Eventually it will respect toolDiameter like fill() does
   and produce the same results.

* drawImage should eventually do something.

### Non-standard extensions to Canvas 

Additional context properties are added for milling
and to support stroke-alignment which the canvas spec doesn't have yet (but really needs).

* `context.depth` Specifies the total Z depth to cut into the work relative to `context.top`. If not set the Z axis never changes. 

* `context.depthOfCut` Specifies an incrementing depth of cut in layers up to `context.depth`.

* `context.top` The Z position of the work surface. Use with depthOfCut otherwise you'll make make several passes before cutting anything. Defaults to 0.
 
* `context.aboveTop` The Z position of a safe area above the surface of the work. This is where the tool retracts to before rapid moves. It should be top-(a reasonable surface tolerance). Defaults to 0.

* `context.toolDiameter` This must be set for fill() to work properly because it has to calculate tool offsets.

* `context.atc` Auto tool change. Sends `M06 T{context.atc}`. Make sure you update toolDiameter.

* `context.feed` Sets the feedrate by sending a single F command.

* `context.speed` Sets the spindle speed by sending a single S command.

* `context.coolant` Can be true, false, "mist" (M07) or "flood" (M08). True defaults to "flood".

* `context.align` Can be 'inner', 'outer', or 'center' (default). Non-center alignment closes the path.

### Unit conversion
GCanvas doesn't have any built-in understanding of units,
because `scale()` works perfectly for this, and is compatible
with a normal canvas.

I usually mill in mm's which means if I do a `lineTo(10,0)`,
on my CNC machine that is 10mm on the X axis, but in a browser
canvas that's 10px. That isn't always so bad but if I am working
on something really detailed I usually `scale(10,10)` the preview only,
independent of the actual drawing making 1mm = 10px.

To work in inches I `scale(25.4, 25.4)` rather than bothering to issue a G20 to the driver.
  
### Defining stock material
Draw it and use `clip()`! It works perfectly.


### Command line utility
GCanvas comes with a command line utility that you can use to write
machining tasks as simple standalone .js files. Just define a main(context) function in the script, and gcanvas will pass it a
pre-built context that outputs to stdout.

```
// helloworld.js
function main(ctx) {
  ctx.strokeText("Hello World");
}
```
```
$ gcanvas helloworld.js | serialportterm -baud 9600 /dev/tty.usbmodem1337
```

#### Setups and tool changes

The CLI exposes a global function `setup(name, fn)` which prompts for user
intervention and raises the Z axis to 0.

If the part requires multiple work setups and tool changes, break them into setup blocks:

```
setup('1/2" endmill', function(ctx) { 
  ctx.toolDiameter = 1/2*25.4;
  // ...
});

setup('face down', function(ctx) { 
  // ...
});
```

### Why

1. The most common machining tasks are 2.5D.
2. Easily run drawing code against a real canvas for previewing.
3. A good basis for implementing more specific Javascript milling tools. e.g. svg, pcbs

### License

MIT
