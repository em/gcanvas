function hexagon(ctx, x, y, size) {
  var numberOfSides = 6,
      size = size,
      Xcenter = x,
      Ycenter = y;

  ctx.beginPath();
  ctx.moveTo (Xcenter +  size * Math.cos(0), Ycenter +  size *  Math.sin(0));          

  for (var i = 1; i <= numberOfSides; i += 1) {
      ctx.lineTo (Xcenter + size * Math.cos(i * 2 * Math.PI / numberOfSides), Ycenter + size * Math.sin(i * 2 * Math.PI / numberOfSides));
  }

  ctx.lineWidth = 1;
  ctx.fill();
}

function main(ctx) {
  var size = 20;

  for(var x = 0; x < ctx.canvas.width; x += size*2) {
    for(var y = 0; y < ctx.canvas.height; y += size*2) {
      hexagon(ctx, x, y, size);
    }
  }
}

function portal2(ctx) {
	//function to convert deg to radian
    var acDegToRad = function(deg){
			return deg* (-(Math.PI / 180.0));    
		}

	//save the initial state of the context
	ctx.save();		
	//set fill color to gray
	ctx.fillStyle = "rgb(110,110,110)";
	//save the current state with fillcolor
	ctx.save();

	//draw 2's base rectangle
	ctx.fillRect(20,200,120,35);
	//bring origin to 2's base
	ctx.translate(20,200);
	//rotate the canvas 35 deg anti-clockwise
	ctx.rotate(acDegToRad(35));
	//draw 2's slant rectangle
	ctx.fillRect(0,0,100,35);
	//restore the canvas to reset transforms
	ctx.restore();
	//set stroke color width and draw the 2's top semi circle
	ctx.strokeStyle = "rgb(110,110,110)";
	ctx.lineWidth = 35;
	ctx.beginPath();
	ctx.arc(77,135,40,acDegToRad(-40),acDegToRad(180),true);
	ctx.stroke();

	//reset canvas transforms
	ctx.restore();

	//change color to blue
	ctx.fillStyle = "rgb(0,160,212)";
	//save current state of canvas
	ctx.save();
	//draw long dividing rectangle 
	ctx.fillRect(162,20,8,300);
	//draw player head circle
	ctx.beginPath();
	ctx.arc(225,80,35,acDegToRad(0),acDegToRad(360));
	ctx.fill();

	//start new path for tummy :)
	ctx.beginPath();
	ctx.moveTo(170,90);
	ctx.lineTo(230,140);
	ctx.lineTo(170,210);
	ctx.fill();

	//start new path for hand
	//set lineCap and lineJoin to "round", blue color 
	//for stroke, and width of 25px
	ctx.lineWidth = 25;
	ctx.lineCap = "round";
	ctx.strokeStyle = "rgb(0,160,212)";
	ctx.lineJoin = "round";
	ctx.beginPath();
	ctx.moveTo(222,150);
	ctx.lineTo(230,190);
	ctx.lineTo(270,220);
	ctx.stroke();

	ctx.beginPath();
	ctx.moveTo(170, 200);
	ctx.lineTo(250, 260);
	ctx.lineTo(170,320);
	ctx.clip();	

	//begin new path for drawing leg
	ctx.beginPath();
	ctx.moveTo(160,210);
	ctx.lineTo(195,260);
	ctx.lineTo(160,290);
	ctx.stroke();
	
	//restore the <code class="prettyprint">context</code> 
         //back to its initial state
	ctx.restore();
  // body...
}

function test(ctx) {
  portal2(ctx);

  return;
  ctx.font="99pt Helvetica";
  ctx.fillText("Hello",20,100);
  // return;

  // main(ctx); return;
  // star(ctx, 100, 100, 90, 5, 0.5);
  // ctx.arc(50, 50, 20, 0, Math.PI * 2, false);
  // ctx.fill();
  ctx.translate(20, 0);
  pentagram ( ctx, 400, 90, 60, Math.PI/2);
  ctx.beginPath();
  square(ctx, 200,20, 300, 200);

  
  // test3(ctx);
}

function square(ctx,x,y,w,h) {
  // ctx.moveTo(0,0);
  // ctx.lineTo(20,20);
  // ctx.lineTo(50,90);

  ctx.moveTo(x,y);
  ctx.lineTo(w+40,y);
  ctx.lineTo(w,h);
  ctx.lineTo(x,h);
  ctx.lineTo(x,y);

  // ctx.stroke();
  ctx.fill();
}

function star(ctx, x, y, r, p, m)
{
    ctx.save();
    ctx.beginPath();
    ctx.translate(x, y);
    ctx.moveTo(0,0-r);
    for (var i = 0; i < p; i++)
    {
        ctx.rotate(Math.PI / p);
        ctx.lineTo(0, 0 - (r*m));
        ctx.rotate(Math.PI / p);
        ctx.lineTo(0, 0 - r);
    }
    ctx.fill();
    ctx.restore();
}

// draws rotated pentagram with or without cirle
function pentagram( ctx, x, y, radius, rotate, circle )
{
    ctx.beginPath();
 
    for ( var i = 0; i <= 4 * Math.PI; i += ( 4 * Math.PI ) / 5 ) {
        ctx.lineTo( x + radius * Math.cos(i + rotate), y + radius * Math.sin(i + rotate));
    }
 
    if ( circle ) {
        ctx.moveTo( x + radius, y );
        ctx.arc(x, y, radius, 0, Math.PI * 2, false);
    }
 
    ctx.fill();
}
 
// pentagram ( ctx, 250, 250, 60, Math.PI/2, true);

function test2(ctx) {
  var path = new THREE.Path();

  path.arc( 100,    // x
               100,    // y
               50,     // radius
               0,      // start
               Math.PI+1, // end
               true);  // anti-clockwise
// 
//   path.absarc( 110,    // x
//                110,    // y
//                50,     // radius
//                2,      // start
//                6,      // end
//                true);  // anti-clockwise


  path.lineTo(200, 0);

  var pts = path.getSpacedPoints();

  pts.forEach(function(p) {
    ctx.lineTo(p.x, p.y);
  });

  ctx.stroke();
}

function test3(ctx) {
  // spirotest(ctx);
  // return;

  ctx.scale(2,2);
  ctx.translate(100,0)
  ctx.rotate(1);
  ctx.moveTo(0,0);
  ctx.lineTo(10,0);
  ctx.lineTo(10,10);
  ctx.lineTo(0,10);
  ctx.lineTo(0,0);

  for(var i = 0; i < 10; ++i) {
    ctx.save();
      ctx.arc(100,100, 100, 0, Math.PI*2);
      ctx.lineTo(500, 0);
    ctx.restore();
  }
  ctx.stroke();

  ctx.font="29pt Helvetica";
  ctx.strokeText("Hello",0,70);

}

function spirotest(ctx) {
  for (var i=0;i<3;i++) {
    for (var j=0;j<3;j++) {
      ctx.save();
      // ctx.strokeStyle = "#9CFF00";
      ctx.translate(50+j*100,50+i*100);
      drawSpirograph(ctx,20*(j+2)/(j+1),-8*(i+3)/(i+1),50);
      ctx.restore();
    }
  }
}

function drawSpirograph(ctx,R,r,O){
  var x1 = R-O;
  var y1 = 0;
  var i  = 1;
  ctx.beginPath();
  ctx.moveTo(x1,y1);
  do {
    if (i>20000) break;
    var x2 = (R+r)*Math.cos(i*Math.PI/72) - (r+O)*Math.cos(((R+r)/r)*(i*Math.PI/72))
    var y2 = (R+r)*Math.sin(i*Math.PI/72) - (r+O)*Math.sin(((R+r)/r)*(i*Math.PI/72))
    ctx.lineTo(x2,y2);
    x1 = x2;
    y1 = y2;
    i++;
  } while (x2 != R-O && y2 != 0 );
  ctx.stroke()
}

if(typeof window === 'undefined') {

  var GCanvas = require('./');
  var gctx = new GCanvas();
  test(gctx);
}
