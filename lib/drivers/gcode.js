module.exports = GCodeDriver;

function GCodeDriver(stream) {
  this.stream = stream || {
    write: function(str) {
      console.log(str);
    }
  };
}

GCodeDriver.prototype = {
  g: function(code, params) {
    var command = 'G'+code;
    for(var k in params) {
      command += ' ' + k.toUpperCase() + params[k];
    }
    this.stream.write(command);
  }
, rapid: function(params) {
    this.g(0, params);
  }
, linear: function(params) {
    this.g(1, params);
  }
, arcCW: function(params) {
    this.g(2, params);
  }
, arcCCW: function(params) {
    this.g(3, params);
  }
};
