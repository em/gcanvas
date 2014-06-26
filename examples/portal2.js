function main(ctx) {
  ctx.depth = 100;
  ctx.toolDiameter = 1/4*25.4;
  portal2(ctx);

  // Good example of a bunch of different canvas features.
  // http://www.codeproject.com/Articles/237065/Introduction-to-HTML5-Canvas-Part-2-Example
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

    //restore the context
    //back to its initial state
    ctx.restore();
    // body...
  }
}

if(this.example) this.example('portal2', main);
