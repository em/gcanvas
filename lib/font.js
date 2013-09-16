/**
 * Derived from code originally written by zz85 for three.js
 * http://www.lab4games.net/zz85/blog
 * Thanks zz85!
 **/

module.exports = Font;

var Path = require('./path');

function Font(props) {
  this.face = Font.faces[props.family] ? props.family : 'helvetiker';
	this.weight = props.weight || "normal";
	this.style = props.style || "normal";
  this.size = props.size || 20;
  this.divisions = 10;
}

Font.faces = {}; // cache

Font.prototype = {
	getFace : function() {
		return Font.faces[ this.face ][ this.weight ][ this.style ];
	},

	drawText : function(ctx, text) {
		var i, p,
			face = this.getFace(),
			scale = this.size / face.resolution,
			offset = 0,
			chars = String( text ).split( '' ),
			length = chars.length;

		var fontPaths = [];

		for ( i = 0; i < length; i ++ ) {
			var ret = this.extractGlyphPoints( chars[ i ], face, scale, offset, ctx );
			offset += ret.offset;
		}

		var width = offset / 2;
		
		return { paths : fontPaths, offset : width };
	},

	extractGlyphPoints : function( c, face, scale, offset, path ) {

		var pts = [];

		var i, i2, divisions,
			outline, action, length,
			scaleX, scaleY,
			x, y, cpx, cpy, cpx0, cpy0, cpx1, cpy1, cpx2, cpy2,
			laste,
			glyph = face.glyphs[ c ] || face.glyphs[ '?' ];

		if ( !glyph ) return;

		if ( glyph.o ) {

			outline = glyph._cachedOutline || ( glyph._cachedOutline = glyph.o.split( ' ' ) );
			length = outline.length;

			scaleX = scale;
			scaleY = -scale;

			for ( i = 0; i < length; ) {

				action = outline[ i ++ ];

				//console.log( action );

				switch( action ) {

				case 'm':

					// Move To

					x = outline[ i++ ] * scaleX + offset;
					y = outline[ i++ ] * scaleY;

					path.moveTo( x, y );
					break;

				case 'l':

					// Line To

					x = outline[ i++ ] * scaleX + offset;
					y = outline[ i++ ] * scaleY;
					path.lineTo(x,y);
					break;

				case 'q':

					// QuadraticCurveTo

					cpx  = outline[ i++ ] * scaleX + offset;
					cpy  = outline[ i++ ] * scaleY;
					cpx1 = outline[ i++ ] * scaleX + offset;
					cpy1 = outline[ i++ ] * scaleY;

					path.quadraticCurveTo(cpx1, cpy1, cpx, cpy);

					laste = pts[ pts.length - 1 ];

					if ( laste ) {

						cpx0 = laste.x;
						cpy0 = laste.y;

						for ( i2 = 1, divisions = this.divisions; i2 <= divisions; i2 ++ ) {

							var t = i2 / divisions;
							var tx = Shape.Utils.b2( t, cpx0, cpx1, cpx );
							var ty = Shape.Utils.b2( t, cpy0, cpy1, cpy );
					  }

				  }

				  break;

				case 'b':

					// Cubic Bezier Curve

					cpx  = outline[ i++ ] *  scaleX + offset;
					cpy  = outline[ i++ ] *  scaleY;
					cpx1 = outline[ i++ ] *  scaleX + offset;
					cpy1 = outline[ i++ ] * -scaleY;
					cpx2 = outline[ i++ ] *  scaleX + offset;
					cpy2 = outline[ i++ ] * -scaleY;

					path.bezierCurveTo( cpx, cpy, cpx1, cpy1, cpx2, cpy2 );

					laste = pts[ pts.length - 1 ];

					if ( laste ) {

						cpx0 = laste.x;
						cpy0 = laste.y;

						for ( i2 = 1, divisions = this.divisions; i2 <= divisions; i2 ++ ) {

							var t = i2 / divisions;
							var tx = Shape.Utils.b3( t, cpx0, cpx1, cpx2, cpx );
							var ty = Shape.Utils.b3( t, cpy0, cpy1, cpy2, cpy );

						}

					}

					break;

				}

			}
		}

		return { offset: glyph.ha*scale, path:path};
	}

};

Font.load = function( data ) {
  var family = data.familyName.toLowerCase();
  Font.faces[ family ] = Font.faces[ family ] || {};
  Font.faces[ family ][ data.cssFontWeight ] = Font.faces[ family ][ data.cssFontWeight ] || {};
  Font.faces[ family ][ data.cssFontWeight ][ data.cssFontStyle ] = data;
  var face = Font.faces[ family ][ data.cssFontWeight ][ data.cssFontStyle ] = data;
  return data;
};

