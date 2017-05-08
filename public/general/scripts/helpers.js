import config  from './config';

module.exports = {
  getFrequency: function(index, scaleKey){
    let intervals = config.scales[scaleKey];
    let octave = Math.floor(index / (intervals.length));
    let degree = (index % intervals.length) + 1;
    let semitones = (octave * 12) + intervals[degree - 1];
    // console.log('index', index, 'octave', octave, 'degree', degree, 'semitones', semitones);
    let frequency = Math.pow(Math.pow(2, 1/12), semitones) * config.BASE_FREQ;
    return frequency;
  },

}
