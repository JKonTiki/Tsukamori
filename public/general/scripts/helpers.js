import config  from './config';

exports.getFrequency = function(index, scaleKey){
  let intervals = config.scales[scaleKey];
  let octave = Math.floor(index / (intervals.length));
  let degree = (index % intervals.length) + 1;
  let semitones = (octave * 12) + intervals[degree - 1];
  // console.log('index', index, 'octave', octave, 'degree', degree, 'semitones', semitones);
  let frequency = Math.pow(Math.pow(2, 1/12), semitones) * config.BASE_FREQ;
  return frequency;
};


let clone = function(item) {
  if (!item) { return item; } // null, undefined values check

  var types = [ Number, String, Boolean ],
      result;

  // normalizing primitives if someone did new String('aaa'), or new Number('444');
  types.forEach(function(type) {
      if (item instanceof type) {
          result = type( item );
      }
  });

  if (typeof result == "undefined") {
      if (Object.prototype.toString.call( item ) === "[object Array]") {
          result = [];
          item.forEach(function(child, index, array) {
              result[index] = clone( child );
          });
      } else if (typeof item == "object") {
          // testing that this is DOM
          if (item.nodeType && typeof item.cloneNode == "function") {
              var result = item.cloneNode( true );
          } else if (!item.prototype) { // check that this is a literal
              if (item instanceof Date) {
                  result = new Date(item);
              } else {
                  // it is an object literal
                  result = {};
                  for (var i in item) {
                      result[i] = clone( item[i] );
                  }
              }
          } else {
              // depending what you would like here,
              // just keep the reference, or create new object
              if (false && item.constructor) {
                  // would not advice to do that, reason? Read below
                  result = new item.constructor();
              } else {
                  result = item;
              }
          }
      } else {
          result = item;
      }
  }

  return result;
};
exports.deepClone = clone;

let hexToHsl = function(hex){
  var shorthandRegex = /^([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        return r + r + g + g + b + b;
    });
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    result = {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    };
  var { r, g, b } = result;
    r /= 255, g /= 255, b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if(max == min){
        h = s = 0; // achromatic
    }else{
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return {h: Math.floor(h * 360),
      s: Math.floor(s * 100),
      l: Math.floor(l * 100),
    };
}

exports.hexToHsl = hexToHsl;

exports.getHslDifferences = function(target){
  let assetHex = '9374ee';
  let asset = hexToHsl(assetHex);
  let rotation = target.h - asset.h;
  if (rotation < 0){
    rotation += 360.0;
  }
  let saturation = (100 + asset.s - target.s).toFixed(1);
  let luminosity = (100 + target.l - asset.l).toFixed(1);
  if (rotation == 146) { // custom adjustment because filter is just imperfect
    rotation = 140;
    luminosity = 280;
    saturation = 40;
  }
  // console.log(rotation, saturation, luminosity);
  // console.log(asset, target);
  return {rotation, saturation, luminosity};
}
