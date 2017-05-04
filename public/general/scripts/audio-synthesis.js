var errors = require('./../../general/scripts/errors');
var visualizer = require('./../../components/audio-visualizer/audio-visualizer-scripts');

const TOTAL_DURATION = 20;
const BASE_FREQ = 65;
const SCALE_KEY = 'triadMajI';
const PEAK_GAIN = .02;
const MIN_GAIN = .000001;
const RENDER_FRAME_RATE = 50; // in ms

// initialize our global variables
var analyser, audioContext, lowpassFilter, lfo, masterGain, synths, timeInterval, visualizerInterval;

var scales = {
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  blues: [0, 3, 5, 6, 7, 10],
  fourths: [0, 4, 8],
  ionian: [0, 2, 4, 5, 7, 9, 11],
  gypsyMinor: [0, 2, 3, 6, 7, 8, 11],
  pentatonic: [0, 2, 4, 7, 9],
  pentMinor: [0, 3, 5, 7, 10],
  triadMajI: [0, 5, 7],
  triadMinI: [0, 4, 7],
}

exports.clearContext = function(){
  if (audioContext) {
    audioContext.close();
    clearInterval(visualizerInterval);
    analyser = null;
    audioContext = null;
    lowpassFilter = null;
    lfo = null;
    masterGain = null;
  }
}

exports.init = function(colNum, rowNum){
  // define our audio context
  try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioContext) {
      audioContext = new AudioContext();
    }
    if (!masterGain) {
      masterGain = audioContext.createGain();
      masterGain.connect(audioContext.destination);
    }
    if(!analyser){
      analyser = audioContext.createAnalyser();
      analyser.connect(masterGain);
      analyser.fftSize = 2048;
    }
    if (!lowpassFilter) {
      lowpassFilter = audioContext.createBiquadFilter();
      lowpassFilter.type = "lowpass";
      lowpassFilter.frequency.value = 7000;
      lowpassFilter.gain.value = .5;
      lowpassFilter.connect(analyser);
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
    let starting = [];
    let stopping = [];
    for (let rowKey in data[colKey]){
      let alreadyPlaying = false;
      let continuesPlaying = false;
      rowKey = parseInt(rowKey);
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
      if (!continuesPlaying) {
        stopping.push(rowKey);
      }
      if (!alreadyPlaying){
        starting.push(rowKey);
      }
    }
    for (let rowKey in data[colKey]){
      rowKey = parseInt(rowKey);
      if (starting.includes(rowKey)) {
        let instrument = synths[rowKey];
        // ADSR envelope for instrument as a whole
        instrument.gain.gain.setValueAtTime(MIN_GAIN, now + (colKey * timeInterval));
        instrument.gain.gain.exponentialRampToValueAtTime(PEAK_GAIN, now + (colKey * timeInterval) + timeInterval * instrument.attack);
        instrument.gain.gain.exponentialRampToValueAtTime(PEAK_GAIN * instrument.sustain, now + (colKey * timeInterval) + timeInterval * instrument.decay);
        synthsPlaying[rowKey] = instrument;
        // start oscillators for individual harmonics
        for (var i = 0; i < instrument.harmonics.length; i++) {
          let harmonic = instrument.harmonics[i];
          harmonic.oscillator.start(now + (colKey * timeInterval));
        }
        // launch LFO
        instrument.lfo.oscillator.start(now + (colKey * timeInterval));
        // launch breathiness, increase gain over time starting from sustain
        instrument.noise.node.start(now + (colKey * timeInterval));
        instrument.noise.gain.gain.linearRampToValueAtTime(instrument.noise.peakGain, now + (colKey * timeInterval) + timeInterval * 2);
        // remove from starting index so we can keep track of what remains to be started (if later needed)
        starting.splice(starting.indexOf(rowKey), 1);
      }
      if (stopping.includes(rowKey)) {
        let instrument = synths[rowKey];
        instrument.gain.gain.exponentialRampToValueAtTime(PEAK_GAIN, now + (colKey * timeInterval) + timeInterval * instrument.release);
        instrument.gain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + (colKey * timeInterval) + timeInterval);
        for (var i = 0; i < instrument.harmonics.length; i++) {
          let harmonic = instrument.harmonics[i];
          harmonic.oscillator.stop(now + (colKey * timeInterval) + timeInterval);
        }
        // stop LFO
        instrument.lfo.oscillator.stop(now + (colKey * timeInterval) + timeInterval);
        // stop noise
        instrument.noise.node.stop(now + (colKey * timeInterval) + timeInterval);
        synthsPlaying[rowKey] = false;
      }
    }
  }
  synths = null;
  // lastly we trigger render function for audio data visualization
  visualizerInterval = setInterval(()=>{
    visualizer.visualizeAudio(audioContext, analyser);
  }, RENDER_FRAME_RATE);
  let thisInterval = visualizerInterval;
  setTimeout(()=>{
    clearInterval(thisInterval);
  }, (TOTAL_DURATION + 1) * 1000);
}

var getUsedRows = function(data){
  // we only need to set oscillators for rows being employed
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
  this.gain.gain.value = MIN_GAIN;
  // attack, decay and release are pts on line from 0 to 1
  this.attack = .05;
  this.decay = .2;
  this.release = .8;
  // sustain is percentage of peak gain we sustain at
  this.sustain = .8;
  // these are our harmonics
  this.harmonics.push(new Harmonic(fundFreq, 1, .7 * (fundFreq / baseFreq), this.gain));
  this.harmonics.push(new Harmonic(fundFreq, 2, .3 * (fundFreq / baseFreq), this.gain));
  this.harmonics.push(new Harmonic(fundFreq, 3,  1 * (fundFreq / baseFreq), this.gain));
  this.harmonics.push(new Harmonic(fundFreq, 4, .6 * (fundFreq / baseFreq), this.gain));
  this.harmonics.push(new Harmonic(fundFreq, 5, .8 / (fundFreq / baseFreq), this.gain));
  this.harmonics.push(new Harmonic(fundFreq, 6, .5 / (fundFreq / baseFreq), this.gain));
  this.harmonics.push(new Harmonic(fundFreq, 7, .3 / (fundFreq / baseFreq), this.gain));
  // a little dissonance is always healthy
  this.harmonics.push(new Harmonic(fundFreq + fundFreq * .01, 1, .3 * (fundFreq / baseFreq), this.gain));
  this.harmonics.push(new Harmonic(fundFreq + fundFreq * .01, 2, .3 * (fundFreq / baseFreq), this.gain));
  this.harmonics.push(new Harmonic(fundFreq + fundFreq * .01, 3, .3 / (fundFreq / baseFreq), this.gain));
  this.harmonics.push(new Harmonic(fundFreq + fundFreq * .01, 4, .3 / (fundFreq / baseFreq), this.gain));
  // each instrument has its own lfo for vibrato simulation
  this.lfo = {};
  this.lfo.oscillator =  audioContext.createOscillator();
  let wavePts = (TOTAL_DURATION * 3) + (TOTAL_DURATION - Math.ceil(Math.random() * TOTAL_DURATION))
  let real = new Float32Array(wavePts);
  let imag = new Float32Array(wavePts);
  let cachedReal = null;
  let cachedImag = null;
  // our custom lfo waveform algorithm, varies at {wavePts} times during TOTAL_DURATION and meant to control jumps
  let variance = .02;
  for (var i = 0; i < real.length; i++) {
    real[i] = Math.abs((cachedReal || .5) + (variance - Math.random() * (variance * 2)));
    imag[i] = Math.abs((cachedImag || .5) + (variance - Math.random() * (variance * 2)));
    if (real[i] > 1) {
      real[i] = 1
    }
    if (imag[i] > 1) {
      imag[i] = 1
    }
    cachedReal = real[i];
    cachedImag = imag[i];
  }
  let wave = audioContext.createPeriodicWave(real, imag, {disableNormalization: true});
  this.lfo.oscillator.setPeriodicWave(wave);
  this.lfo.oscillator.frequency.value = 2/(TOTAL_DURATION);
  this.lfo.gain = audioContext.createGain();
  this.lfo.gain.gain.value = .001;
  this.lfo.oscillator.connect(this.lfo.gain);
  this.lfo.gain.connect(this.gain.gain);
  // we play with the buffer during attack for a little breathiness
  this.noise = {};
  this.noise.node = audioContext.createBufferSource();
  let buffer = audioContext.createBuffer(2, (audioContext.sampleRate * 2.0), audioContext.sampleRate);
  let data = [0, 1]; // here we assume two channels. intial values are placeholders
  data[0] = buffer.getChannelData(0);
  data[1] = buffer.getChannelData(1);
  for (var i = 0; i < (audioContext.sampleRate * 2.0); i++) {
   data[0][i] = (Math.random()* 2 - 1) * .1;
   data[1][i] = (Math.random()* 2 - 1) * .1;
  }
  this.noise.node.buffer = buffer;
  this.noise.node.loop = true;
  this.noise.gain = audioContext.createGain();
  this.noise.gain.gain.value = 1;
  this.noise.peakGain = 3;
  this.noise.node.connect(this.noise.gain);
  this.noise.gain.connect(this.gain);
  // we connect the instruments gain to the master filter
  this.gain.connect(lowpassFilter);
}

function Harmonic(fundFreq, number, gainRatio, instrumentGain) {
  this.frequency = fundFreq * number;
  this.gainRatio = gainRatio;
  this.gain = audioContext.createGain();
  this.gain.gain.value = this.gainRatio;
  this.oscillator = audioContext.createOscillator();
  this.oscillator.type = 'triangle';
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
exports.getAudioContext = function(){
  return audioContext;
}
