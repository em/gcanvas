module.export = parseFont;

// stolen from node-canvas

/**
 * Text baselines.
 */

var baselines = ['alphabetic', 'top', 'bottom', 'middle', 'ideographic', 'hanging'];

/**
 * Font RegExp helpers.
 */

var weights = 'normal|bold|bolder|lighter|[1-9]00'
  , styles = 'normal|italic|oblique'
  , units = 'px|pt|pc|in|cm|mm|%'
  , string = '\'([^\']+)\'|"([^"]+)"|[\\w-]+';
/**
 * Font parser RegExp;
 */

var fontre = new RegExp('^ *'
  + '(?:(' + weights + ') *)?'
  + '(?:(' + styles + ') *)?'
  + '([\\d\\.]+)(' + units + ') *'
  + '((?:' + string + ')( *, *(?:' + string + '))*)'
  );

/**
 * Parse font `str`.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

var parseFont = module.exports = function(str){
  var font = {}
    , captures = fontre.exec(str);

  // Invalid
  if (!captures) return;

  // // Cached
  // if (cache[str]) return cache[str];

  // Populate font object
  font.weight = captures[1] || 'normal';
  font.style = captures[2] || 'normal';
  font.size = parseFloat(captures[3]);
  font.unit = captures[4];
  font.family = captures[5].replace(/["']/g, '').split(',')[0];

  switch (font.unit) {
    case 'pt':
      font.size / 72;
      break;
    case 'in':
      font.size *= 96;
      break;
    case 'mm':
      font.size *= 96.0 / 25.4;
      break;
    case 'cm':
      font.size *= 96.0 / 2.54;
      break;
  }

  return  font;
};
