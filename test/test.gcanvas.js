describe('GCanvas', function() {
  var expect = require('chai').expect
  var GCanvas = require('../')
  var TestDriver = require('./support/testdriver')

  var ctx, robot, hand;
  beforeEach(function() {
    robot = new TestDriver();
    hand = new TestDriver();
    ctx = new GCanvas(robot);
    ctx.depth = 0;
    ctx.depthOfCut = 0;
  });

  describe('#moveTo', function() {
    it('sends #rapid', function() {
      ctx.moveTo(10,10);
      ctx.stroke();
      hand.rapid({x:10,y:10});
      expect(robot.result).eql(hand.result);
    });

    it('retracts tool', function() {
      ctx.depth = 1;
      ctx.moveTo(0,0);
      ctx.lineTo(10,0);
      ctx.moveTo(10,10);
      ctx.stroke();

      hand.linear({z:1}); // plunge
      hand.linear({x:10,y:0,z:1}); // lineTo
      hand.rapid({z:0}); // retract
      hand.rapid({x:10,y:10}); // moveTo

      expect(robot.result).eql(hand.result);
    });

    it('optimizes out 0 distance moves', function() {
      ctx.moveTo(10,10);
      ctx.moveTo(10,10);
      ctx.stroke();
      hand.rapid({x:10,y:10});
      expect(robot.result).eql(hand.result);
    });


  });

  describe('#lineTo', function() {
    it('sends #linear', function() {
      ctx.moveTo(0,0);
      ctx.lineTo(10,10);
      ctx.stroke();

      hand.linear({x:10,y:10,z:0});

      expect(robot.result).eql(hand.result);
    });

    it('just moves if no subpath', function() {
      ctx.lineTo(10,10);
      ctx.stroke();

      hand.rapid({x:10,y:10});

      expect(robot.result).eql(hand.result);
    });

    it('plunges tool', function() {
      ctx.depth = 1;
      ctx.moveTo(0,0);
      ctx.lineTo(10,10);
      ctx.stroke();

      hand.linear({z:1});
      hand.linear({x:10,y:10,z:1});
      hand.rapid({z:0});
      expect(robot.result).eql(hand.result);
    });

    it('plunges tool (inverted z)', function() {
      ctx.depth = -1;
      ctx.moveTo(0,0);
      ctx.lineTo(10,10);
      ctx.stroke();

      hand.linear({z:-1});
      hand.linear({x:10,y:10,z:-1});
      hand.rapid({z:0});

      expect(robot.result).eql(hand.result);
    });

    it('plunges tool (inverted z and +depthOfCut)', function() {
      ctx.depth = -1;
      ctx.depthOfCut = 1;
      ctx.moveTo(0,0);
      ctx.lineTo(10,10);
      ctx.stroke();

      hand.linear({z:-1});
      hand.linear({x:10,y:10,z:-1});
      hand.rapid({z:0});

      expect(robot.result).eql(hand.result);
    });
  });

  describe('#arc', function() {
    it('sends native #arcCW when possible', function() {
      ctx.arc(10, 10, 10, 0, Math.PI);
      ctx.stroke();

      hand.rapid({x:20,y:10});
      hand.arcCW({x:0,y:10,z:0,i:-10,j:0});

      expect(robot.result).eql(hand.result);
    });

    it('sends native #arcCCW when possible', function() {
      ctx.arc(10, 10, 10, 0, Math.PI, true);
      ctx.stroke();

      hand.rapid({x:20,y:10});
      hand.arcCCW({x:0,y:10,z:0,i:-10,j:0});

      expect(robot.result).eql(hand.result);
    });

    it('plunges and retracts semi-circles', function() {
      ctx.depth = 1;
      ctx.arc(10, 10, 10, 0, Math.PI);
      ctx.stroke();

      hand.rapid({x:20,y:10});
      hand.linear({z:1});
      hand.arcCW({x:0,y:10,i:-10,j:0,z:1});
      hand.rapid({z:0});

      expect(robot.result).eql(hand.result);
    });

    it('spirals through full circles', function() {
      ctx.depth = 2;
      ctx.depthOfCut=1;
      ctx.arc(10, 10, 10, 0, Math.PI*2);
      ctx.stroke();

      hand.rapid({x:20,y:10});
      hand.arcCW({x:20,y:10,z:1,i:-10,j:0});
      hand.arcCW({x:20,y:10,z:2,i:-10,j:0});
      hand.arcCW({x:20,y:10,z:2,i:-10,j:0});
      hand.rapid({z:0});

      expect(robot.result).eql(hand.result);
    });
  });


  describe('context.feed', function() {
    it('inits inverse time mode and calculates F', function() {
      ctx.moveTo(0,0);
      ctx.lineTo(10,10);
      ctx.feed = 100;
      ctx.stroke();

      hand.send('G93');
      hand.linear({x:10,y:10,z:0,f:1414});

      expect(robot.result).eql(hand.result);
    });
  });

  describe('context.speed', function() {
    it('calls driver.speed() before next move', function() {
      ctx.moveTo(0,0);
      ctx.lineTo(10,10);
      ctx.speed = 100;
      ctx.stroke();

      hand.speed(100);
      hand.linear({x:10,y:10,z:0});

      expect(robot.result).eql(hand.result);
    });
  });

  describe('context.coolant', function() {
    it('calls driver.coolant() before next move', function() {
      ctx.moveTo(0,0);
      ctx.lineTo(10,10);
      ctx.coolant = "flood";
      ctx.stroke();

      hand.coolant("flood");
      hand.linear({x:10,y:10,z:0});

      expect(robot.result).eql(hand.result);
    });
  });

  describe('#_layer', function() {
    it('increments in depthOfCut to depth', function() {
      ctx.depth = 2;
      ctx.depthOfCut = 1;
      ctx.moveTo(0,0);
      ctx.lineTo(10,10);
      ctx.stroke();

      // first layer
      hand.linear({z:1}); // plunge
      hand.linear({x:10,y:10,z:1}); // lineTo

      // return to start
      hand.rapid({z:0}); // retract
      hand.rapid({x:0,y:0}); // moveTo

      // second layer
      hand.linear({z:2}); // plunge
      hand.linear({x:10,y:10,z:2}); // lineTo

      hand.rapid({z:0});

      expect(robot.result).eql(hand.result);
    });

    it('increments in depthOfCut to depth (-z, +doc)', function() {
      ctx.depth = -2;
      ctx.depthOfCut = 1;
      ctx.moveTo(0,0);
      ctx.lineTo(10,10);
      ctx.stroke();

      // first layer
      hand.linear({z:-1}); // plunge
      hand.linear({x:10,y:10,z:-1}); // lineTo

      // return to start
      hand.rapid({z:0}); // retract
      hand.rapid({x:0,y:0}); // moveTo

      // second layer
      hand.linear({z:-2}); // plunge
      hand.linear({x:10,y:10,z:-2}); // lineTo

      hand.rapid({z:0}); // retract
      expect(robot.result).eql(hand.result);
    });

    it('increments in depthOfCut to depth (-z, -doc)', function() {
      ctx.depth = -2;
      ctx.depthOfCut = -1;
      ctx.moveTo(0,0);
      ctx.lineTo(10,10);
      ctx.stroke();

      // first layer
      hand.linear({z:-1}); // plunge
      hand.linear({x:10,y:10,z:-1}); // lineTo

      // return to start
      hand.rapid({z:0}); // retract
      hand.rapid({x:0,y:0}); // moveTo

      // second layer
      hand.linear({z:-2}); // plunge
      hand.linear({x:10,y:10,z:-2}); // lineTo

      hand.rapid({z:0}); // retract
      expect(robot.result).eql(hand.result);
    });
  });

  describe('#fill', function() {
  });
});
