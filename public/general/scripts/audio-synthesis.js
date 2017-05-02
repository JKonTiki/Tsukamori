var errors = require('./../../general/scripts/errors');

const TOTAL_DURATION = 10;
const BASE_FREQ = 65;
const SCALE_KEY = 'triadMaj';
const PEAK_GAIN = .01;
const MIN_GAIN = .0001;


var audioContext = null;
var lowpassFilter = null;
var highShelfFilter = null;
var synths = null;
var timeInterval = null;
var scales = {
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  blues: [0, 3, 5, 6, 7, 10],
  fourths: [0, 4, 8],
  ionian: [0, 2, 4, 5, 7, 9, 11],
  gypsyMinor: [0, 2, 3, 6, 7, 8, 11],
  pentatonic: [0, 2, 4, 7, 9],
  pentMinor: [0, 3, 5, 7, 10],
  triadMaj: [0, 5, 7],
  triadMin: [0, 4, 7],
}

exports.init = function(colNum, rowNum){
  // define our audio context
  try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioContext) {
      audioContext = new AudioContext();
    }
    if (!highShelfFilter) {
      highShelfFilter = audioContext.createBiquadFilter();
      highShelfFilter.type = "highshelf";
      highShelfFilter.frequency.value = 400;
      highShelfFilter.gain.value = 1;
      highShelfFilter.connect(audioContext.destination);
    }
    if (!lowpassFilter) {
      lowpassFilter = audioContext.createBiquadFilter();
      lowpassFilter.type = "lowpass";
      lowpassFilter.frequency.value = 5000;
      lowpassFilter.gain.value = 2;
      lowpassFilter.connect(highShelfFilter);
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
        instrument.gain.gain.setValueAtTime(MIN_GAIN, now + (colKey * timeInterval));
        instrument.gain.gain.exponentialRampToValueAtTime(PEAK_GAIN, now + (colKey * timeInterval) + timeInterval * instrument.attack);
        instrument.gain.gain.exponentialRampToValueAtTime(PEAK_GAIN * instrument.sustain, now + (colKey * timeInterval) + timeInterval * instrument.decay);
        synthsPlaying[rowKey] = instrument;
        for (var i = 0; i < instrument.harmonics.length; i++) {
          let harmonic = instrument.harmonics[i];
          harmonic.oscillator.start(now + (colKey * timeInterval));
        }
      }
      if (!continuesPlaying) {
        let instrument = synths[rowKey];
        instrument.gain.gain.exponentialRampToValueAtTime(PEAK_GAIN, now + (colKey * timeInterval) + timeInterval * instrument.release);
        instrument.gain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + (colKey * timeInterval) + timeInterval);
        for (var i = 0; i < instrument.harmonics.length; i++) {
          let harmonic = instrument.harmonics[i];
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
    lowpassFilter = null;
    highShelfFilter = null;
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
      let fundFreq = getFrequency(i, rowNum);
      synths[i] = new Flute(fundFreq, BASE_FREQ);
    }
  }
  return synths;
}

function Flute(fundFreq, baseFreq){
  this.harmonics = [];
  this.gain = audioContext.createGain();
  this.gain.connect(lowpassFilter);
  this.gain.gain.value = MIN_GAIN;
  // attack, decay and release are pts on line from 0 to 1
  this.attack = .1;
  this.decay = .3;
  this.release = .8;
  // sustain is percentage of peak gain we sustain at
  this.sustain = .4;
  // these are our harmonics
  this.harmonics.push(new Harmonic(fundFreq, 1, .7 * (fundFreq / baseFreq * 4), .05, .04, this.gain));
  this.harmonics.push(new Harmonic(fundFreq, 2, .3 * (fundFreq / baseFreq * 4), .05, .04, this.gain));
  this.harmonics.push(new Harmonic(fundFreq, 3, 1 * (fundFreq / baseFreq * 4), .05, .04, this.gain));
  this.harmonics.push(new Harmonic(fundFreq, 4, .6 * (fundFreq / baseFreq * 4), .05, .04, this.gain));
  this.harmonics.push(new Harmonic(fundFreq, 5, .8 * (fundFreq / baseFreq * 4), .05, .04, this.gain));
  this.harmonics.push(new Harmonic(fundFreq, 6, .5 * (fundFreq / baseFreq * 4), .05, .04, this.gain));
  this.harmonics.push(new Harmonic(fundFreq, 7, .3 * (fundFreq / baseFreq * 4), .05, .04, this.gain));
  // a little dissonance is always healthy
  this.harmonics.push(new Harmonic(fundFreq + fundFreq * .01, 1, .7 * (fundFreq / baseFreq * 4), .05, .04, this.gain));
  this.harmonics.push(new Harmonic(fundFreq + fundFreq * .01, 2, .7 * (fundFreq / baseFreq * 4), .05, .04, this.gain));
  this.harmonics.push(new Harmonic(fundFreq + fundFreq * .01, 3, .7 * (fundFreq / baseFreq * 4), .05, .04, this.gain));
  this.harmonics.push(new Harmonic(fundFreq + fundFreq * .01, 4, .7 * (fundFreq / baseFreq * 4), .05, .04, this.gain));
}

function Harmonic(fundFreq, number, gainRatio, modRange, gainRange, instrumentGain) {
  this.frequency = fundFreq * number;
  this.gainRatio = gainRatio;
  this.modRange = this.frequency * modRange;
  this.gainRange = gainRange;
  this.gain = audioContext.createGain();
  this.gain.gain.value = this.gainRatio;
  this.oscillator = audioContext.createOscillator();
  this.oscillator.type = 'sine';
  this.oscillator.frequency.value = this.frequency;
  this.oscillator.connect(this.gain);
  this.gain.connect(instrumentGain);
}

var getFrequency = function(index, rowNum){
  let intervals = scales[SCALE_KEY];
  let octave = Math.floor(index / (intervals.length));
  let degree = (index % intervals.length) + 1;
  let semitones = (octave * 12) + intervals[degree - 1];
  // console.log('index', index, 'octave', octave, 'degree', degree, 'semitones', semitones);
  let frequency = Math.pow(Math.pow(2, 1/12), semitones) * BASE_FREQ;
  return frequency;
}

exports.getFrequency = getFrequency;
