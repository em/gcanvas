module.exports = GCodeDriver;

function GCodeDriver(stream) {
  this.stream = stream || {
    write: function(str) {
      console.log(str);
    }
  };
}

GCodeDriver.prototype = {
  send: function(code, params) {
    var command = code;
    for(var k in params) {
      command += ' ' + k.toUpperCase() + params[k];
    }
    this.stream.write(command);
  }
, speed: function(n) {
    this.send('S'+n);
  }
, feed: function(n) {
    this.send('F'+n);
  }
, coolant: function(type) {
    if(type === 'mist') {
      // special
      this.send('M07');
    }
    else if(type) {
      // flood
      this.send('M08');
    }
    else {
      // off
      this.send('M09');
    }
  }
, rapid: function(params) {
    this.send('G0', params);
  }
, linear: function(params) {
    this.send('G1', params);
  }
, arcCW: function(params) {
    this.send('G2', params);
  }
, arcCCW: function(params) {
    this.send('G3', params);
  }
};
