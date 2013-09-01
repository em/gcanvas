module.exports = Filter;

var all = [
  'rapid'
, 'linear'
, 'arcCW'
, 'arcCCW'
];

function Filter(output, whitelist) {
  whitelist = whitelist || all;

  whitelist.forEach(function(name) {
    if(!output[name]) return;

    this[name] = function passthrough() {
      output[name].apply(output, arguments);
    };
  }, this);
}
