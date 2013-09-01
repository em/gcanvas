module.exports = TestDriver;


function TestDriver() { 
  this.result = [];
};

['rapid', 'linear', 'arcCW', 'arcCCW'].forEach(function(name) {
  TestDriver.prototype[name] = function(params) {
    var id = name;
    Object.keys(params).sort().forEach(function(k) {
      id += ' ' + k + Number(params[k]).toFixed()
    });

    this.result.push(id); 
  }
});
