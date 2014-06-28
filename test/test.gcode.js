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

  it('#speed', function() {
    driver.speed(100);
    expect(result).eql(['S100']);
  });

  it('#feed', function() {
    driver.feed(100);
    expect(result).eql(['F100']);
  });

  it('#meta', function() {
    driver.meta({hello:'world'});
    expect(result).eql(['(hello=world)']);
  });

  describe('#coolant', function() {
    it('uses M07 if "mist"', function() {
      driver.coolant("mist");
      expect(result).eql(['M07']);
    })

    it('uses M08 if true or "flood"', function() {
      driver.coolant(true);
      expect(result).eql(['M08']);
    })

    it('sends M09 if false or "off"', function() {
      driver.coolant(false);
      expect(result).eql(['M09']);
    })
  });
});
