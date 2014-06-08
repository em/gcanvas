describe('utils', function() {
  var expect = require('chai').expect
    , utils = require('../lib/utils');

  it('#arcToPoints', function() {
    var result = utils.arcToPoints(
      5, 5, // x,y
      0,       // start angle
      Math.PI, // 180 degrees
      10      // radius
    );

    expect(result.start.x).closeTo(15, 0.000001);
    expect(result.start.y).closeTo(5, 0.000001);
    expect(result.end.x).closeTo(-5, 0.000001);
    expect(result.end.y).closeTo(5, 0.000001);
  });

  it('#pointsToArc', function() {
    var result = utils.pointsToArc(
      {x: 5, y: 5},
      {x: 15, y: 5},
      {x: -5, y: 5}
    );
    
    expect(result.start).closeTo(0, 0.000001);
    expect(result.end).closeTo(Math.PI, 0.000001);
    expect(result.radius).closeTo(10, 0.000001);
  });

  describe('#normalizeAngle', function() {
    it('converts 370 degrees to 10 degrees', function() {
      var input = Math.PI / 180 * 370;
      var output = Math.PI / 180 * 10;
      expect(utils.normalizeAngle(input)).closeTo(output, 0.00001);
    });

    it('converts -370 degrees to -10 degrees', function() {
      var input = Math.PI / 180 * -370;
      var output = Math.PI / 180 * -10;
      expect(utils.normalizeAngle(input)).closeTo(output, 0.00001);
    });

    it('converts -370 degrees to 350 degrees', function() {
      var input = Math.PI / 180 * -370;
      var output = Math.PI / 180 * -10;
      expect(utils.normalizeAngle(input)).closeTo(output, 0.00001);
    });
  });

});
