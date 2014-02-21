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

### Non-standard extensions to Canvas 

Additional context properties are added for milling
and to support stroke-alignment which the canvas spec doesn't have yet (but really needs).

* `context.depth` Specifies the total Z depth to cut into the work relative to `context.top`. If not set the Z axis never changes. 

* `context.depthOfCut` Specifies an incrementing depth of cut in layers up to `context.depth`.

* `context.top` The Z offset to the top of work surface. When this is set all cuts with plunge down to this depth before spiraling to their full depth. Use cautiously. If the actual work surface is closer this will break tools.

* `context.toolDiameter` This must be set for fill() to work properly because it has to calculate tool offsets.

* `context.atc` Auto tool change. Sends `M06 T{context.atc}`. Make sure you update toolDiameter.

* `context.feed` Sets the feedrate by sending a single F command.

* `context.speed` Sets the spindle speed by sending a single S command.

* `context.coolant` Can be true, false, "mist" (M07) or "flood" (M08). True defaults to "flood".

* `context.align` Can be 'inner', 'outer', or 'center' (default). Non-center alignment closes the path.

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

1. The most common machining tasks are 2.5D and can be done much faster with a little code than with CAD.
2. The Canvas API is well documented and prolific.
3. Especially good for parametric parts.
4. A lib for implementing more specific Javascript milling tools. e.g. svg, pcbs.

### License

MIT
