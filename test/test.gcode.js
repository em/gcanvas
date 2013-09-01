describe('GcodeDriver', function() {
  var expect = require('chai').expect
    , GCodeDriver = require('../lib/drivers/gcode');

  var driver, result;
  beforeEach(function() {
    result = [];
    driver = new GCodeDriver({write: function(str) {
      result.push(str);
    }});
  });

  it('#rapid', function() {
    driver.rapid({x:10,y:10});
    expect(result).eql(['G0 X10 Y10']);
  });

  it('#linear', function() {
    driver.linear({x:10,y:10});
    expect(result).eql(['G1 X10 Y10']);
  });

  it('#arcCW', function() {
    driver.arcCW({x:0,y:10,i:10, j:5});
    expect(result).eql(['G2 X0 Y10 I10 J5']);
  });

  it('#arcCCW', function() {
    driver.arcCCW({x:0,y:10,i:10, j:5});
    expect(result).eql(['G3 X0 Y10 I10 J5']);
  });
});
