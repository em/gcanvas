module.exports = SerialBus;

var serialport = require("serialport")
  , SerialPort = serialport.SerialPort

function SerialBus() {
}

SerialBus.prototype = {
  write: function() {
  }
, read: function() {
  }
};
