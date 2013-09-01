/*
 * This driver passes straight through to another canvas,
 * but can disable the presence of certain methods.
 * This allows us to test the failover routines with image fixtures.
 **/ 

module.exports = TestDriver;

var Canvas = require('canvas');

function TestDriver(resultCanvas) { 
  GCodeDriver.apply(this, arguments);
  this.result = resultCanvas || new Canvas();

  // Pass all methods through
  for(var k in result) {
    if(typeof result[k] === 'function') {
      this[k] = function() {
        this.result[k].apply(this.result, arguments);
      }
    }
  }
};

TestDriver.prototype = {
  matchesFixture: function(name) {
    fs.readFile(__dirname + '../fixtures/'+name+'.png', function(err, file){
      if (err) throw err;
      img = new Image;
      img.src = squid;
      ctx.drawImage(img, 0, 0, img.width, img.height);
    });
  }
};

TestDriver.prototype.reset = function() {
  this.lines = [];
}
