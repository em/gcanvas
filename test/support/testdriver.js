module.exports = TestDriver;


function TestDriver() { 
  this.result = [];
};

[
  'rapid'
, 'linear'
, 'arcCW'
, 'arcCCW'
, 'speed'
, 'feed'
, 'coolant'
, 'send'
].forEach(function(name) {
  TestDriver.prototype[name] = function(params) {
    var id = name;
    if(typeof params === 'object') {
      Object.keys(params).sort().forEach(function(k) {
        id += ' ' + k + Number(params[k]).toFixed()
      });
    }
    else {
      id = name + ' ' + params;
    }

    this.result.push(id); 
  }
});
