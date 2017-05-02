var errors = require('./../../general/scripts/errors');

const TOTAL_DURATION = 10;
const BASE_FREQ = 440;
const SCALE_KEY = 'aeolian';


var audioContext = null;
var synths = null;
var timeInterval = null;
var scales = {
  ionian: {
    steps: [2, 2, 1, 2, 2, 2, 1],
    cumulative: null,
    revCumulative: null,
  },
  aeolian: {
    steps: [2, 1, 2, 2, 1, 2, 2],
    cumulative: null,
    revCumulative: null,
  },
}

for (let scaleKey in scales){
  let scale = scales[scaleKey];
  let cumSteps = [0];
  let cumSum = 0;
  for (var i = 0; i < scale.steps.length; i++) {
    cumSum += scale.steps[i];
    cumSteps.push(cumSum);
  }
  let revCumSteps = [0]
  let revCumSum = 0;
  for (var i = scale.steps.length - 1; i >= 0; i--) {
    revCumSum += scale.steps[i];
    revCumSteps.push(revCumSum);
  }
  scales[scaleKey].cumulative = cumSteps;
  scales[scaleKey].revCumulative = revCumSteps;
}

exports.init = function(colNum, rowNum){
  // define our audio context
  try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioContext) {
      audioContext = new AudioContext();
    }
    if (!timeInterval) {
      timeInterval = (TOTAL_DURATION / colNum);
    }
  } catch (e) {
    console.warn(e);
    return;
  }
}

exports.translateData = function(colNum, rowNum, data){
  if (!audioContext) {
    throw errors.uninitiatedOscillator;
  }
  // console.log(data);
  // console.log(synths);
  let now = audioContext.currentTime + .01;
  let usedRows = getUsedRows(data);
  let synthsPlaying = {};
  for (let colKey in data){
    colKey = parseInt(colKey);
    // reset synths to play again on next column
    synths = setSynths(rowNum, usedRows, synthsPlaying);
    for (let rowKey in data[colKey]){
      rowKey = parseInt(rowKey);
      let alreadyPlaying = false;
      let continuesPlaying = false;
      if (data[colKey - 1]) {
        if (data[colKey - 1][rowKey]) {
          alreadyPlaying = true;
        }
      }
      if (data[colKey + 1]) {
        if (data[colKey + 1][rowKey]) {
          continuesPlaying = true;
        }
      }
      if (!alreadyPlaying) {
        let instrument = synths[rowKey];
        for (var i = 0; i < instrument.harmonics.length; i++) {
          let harmonic = instrument.harmonics[i];
          harmonic.gain.gain.setValueAtTime(.001 * harmonic.gainRatio, now + (colKey * timeInterval));
          // attack
          harmonic.gain.gain.exponentialRampToValueAtTime(.2 * harmonic.gainRatio, now + (colKey * timeInterval) + timeInterval * .3);
          harmonic.oscillator.start(now + (colKey * timeInterval));
        }
        synthsPlaying[rowKey] = instrument;
      }
      if (!continuesPlaying) {
        let instrument = synths[rowKey];
        for (var i = 0; i < instrument.harmonics.length; i++) {
          let harmonic = instrument.harmonics[i];
          // sustain
          harmonic.gain.gain.exponentialRampToValueAtTime(.2 * harmonic.gainRatio, now + (colKey * timeInterval) + timeInterval * .6);
          // release
          harmonic.gain.gain.exponentialRampToValueAtTime(.001 * harmonic.gainRatio, now + (colKey * timeInterval) + timeInterval);
          harmonic.oscillator.stop(now + (colKey * timeInterval) + timeInterval);
        }
        synthsPlaying[rowKey] = false;
      }
    }
  }
  synths = null;
}

exports.clearContext = function(){
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
}

var getUsedRows = function(data){
  let usedRows = [];
  for (let colKey in data){
    for (let rowKey in data[colKey]){
      usedRows.push(parseInt(rowKey));
    }
  }
  return usedRows;
}

var setSynths = function(rowNum, usedRows, synthsPlaying){
  let synths = synthsPlaying || {};
  for (var i = 0; i < rowNum; i++) {
    if (usedRows.includes(i) && !synthsPlaying[i]) {
      let fundFreq = getFreqOnKey(i, rowNum);
      synths[i] = new Flute(fundFreq);
    }
  }
  return synths;
}

function Flute(fundFreq){
  this.harmonics = [];
  this.harmonics.push(new Harmonic(fundFreq, 1, .03, .05, .04));
  this.harmonics.push(new Harmonic(fundFreq, 2, .4, .05, .04));
  this.harmonics.push(new Harmonic(fundFreq, 3, 1, .05, .04));
  this.harmonics.push(new Harmonic(fundFreq, 4, .6, .05, .04));
  this.harmonics.push(new Harmonic(fundFreq, 5, .3, .05, .04));
  this.harmonics.push(new Harmonic(fundFreq, 6, .1, .05, .04));
}

function Harmonic(fundFreq, number, gainRatio, modRange, gainRange) {
  this.frequency = fundFreq * number;
  this.gainRatio = gainRatio;
  this.modRange = this.frequency * modRange;
  this.gainRange = gainRange;
  this.gain = audioContext.createGain();
  this.gain.connect(audioContext.destination);
  this.oscillator = audioContext.createOscillator();
  this.oscillator.type = 'sine';
  this.oscillator.frequency.value = this.frequency;
  this.oscillator.connect(this.gain);
}

var getFreqOnKey = function(index, rowNum){
  let centerRow = Math.round(rowNum/2);
  index -= centerRow;
  let octave = 0;
  let degree = 1;
  let semitones = 0;
  if (index < 0) {
    var intervals = scales[SCALE_KEY].revCumulative;
    octave = Math.ceil(index / 7);
    degree = 7 + 1 - Math.abs(index % 7);
    semitones = (octave * 12) - intervals[intervals.length - degree];
    if (degree === 8) {
      degree = 1;
    }
  } else {
    var intervals = scales[SCALE_KEY].cumulative;
    octave = Math.floor(index / 7);
    degree = index % 7 + 1;
    semitones = (octave * 12) + intervals[degree - 1];
  }
  // console.log('index', index, 'octave', octave, 'degree', degree, 'semitones', semitones);
  let frequency = Math.pow(Math.pow(2, 1/12), semitones) * BASE_FREQ;
  return frequency;
}

exports.getFrequency = getFreqOnKey;
