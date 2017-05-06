var Tuna = require('tunajs');

var config = require('./../../general/scripts/config');
var errors = require('./../../general/scripts/errors');
var visualizer = require('./../../components/audio-visualizer/audio-visualizer-scripts');

const TOTAL_DURATION = config.TOTAL_DURATION;
const BASE_FREQ = config.BASE_FREQ;
const SCALE_KEY = config.SCALE_KEY;
const IMPULSE_RESPONSE_FILE = config.IMPULSE_RESPONSE_FILE;
const PEAK_GAIN = .02;
const MIN_GAIN = .000001;
const RENDER_FRAME_RATE = 50; // in ms

// initialize our global variables
var analyser, audioContext, effects, lfo, masterGain, synths, timeInterval, tuna, visualizerInterval;

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
    effects = null;
    lfo = null;
    masterGain = null;
  }
}

exports.init = function(colNum, rowNum){
  // define our audio context
  // try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioContext) {
      audioContext = new AudioContext();
      tuna = new Tuna(audioContext);
    }
    if (!masterGain) {
      masterGain = audioContext.createGain();
      masterGain.connect(audioContext.destination);
      masterGain.gain.value = .5;
    }
    if(!analyser){
      analyser = audioContext.createAnalyser();
      analyser.connect(masterGain);
      analyser.fftSize = 2048;
    }
    if (!effects) {
      effects = {};
      // lowpassfilter
      effects.lowpassFilter = audioContext.createBiquadFilter();
      effects.lowpassFilter.type = "lowpass";
      effects.lowpassFilter.frequency.value = 5000;
      effects.lowpassFilter.gain.value = 1;
      // chorus
      effects.chorus = new tuna.Chorus({
        rate: 2,
        feedback: 0,
        delay: .005,
        bypass: 0
      });
      // tremolo
      effects.tremolo = new tuna.Tremolo({
        intensity: 0.1,
        rate: 4,
        stereoPhase: 0,
        bypass: 0
      });
      // compressor
      effects.compressor = new tuna.Compressor({
        threshold: -1,    //-100 to 0
        makeupGain: 1,     //0 and up (in decibels)
        attack: 100,         //0 to 1000
        release: 0,        //0 to 3000
        ratio: 4,          //1 to 20
        knee: 2,           //0 to 40
        automakeup: false,  //true/false
        bypass: 0
      });
      effects.reverb = new tuna.Convolver({
        highCut: 22050,                         //20 to 22050
        lowCut: 20,                             //20 to 22050
        dryLevel: .5,                            //0 to 1+
        wetLevel: .8,                            //0 to 1+
        level: 1,                               //0 to 1+, adjusts total output of both wet and dry
        impulse: `./../../assets/impulse-responses/${IMPULSE_RESPONSE_FILE}.wav`,
        bypass: 0
      });
      effects.lowpassFilter.connect(effects.chorus);
      effects.chorus.connect(effects.tremolo);
      effects.tremolo.connect(effects.compressor);
      effects.compressor.connect(effects.reverb);
      effects.reverb.connect(analyser);
    }
    if (!timeInterval) {
      timeInterval = (TOTAL_DURATION / colNum);
    }
  // } catch (e) {
    // console.warn(e);
    // return;
  // }
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
  }, (TOTAL_DURATION + (TOTAL_DURATION * .1)) * 1000);
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
  this.decay = .1;
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
  let wavePts = (TOTAL_DURATION) + (TOTAL_DURATION - Math.ceil(Math.random() * TOTAL_DURATION))
  let real = new Float32Array(wavePts);
  let imag = new Float32Array(wavePts);
  let cachedReal = null;
  let cachedImag = null;
  // our custom lfo waveform algorithm, varies at {wavePts} times during TOTAL_DURATION and meant to control jumps
  let masterVariance = .1;
  for (var i = 0; i < real.length; i++) {
    // to have effect build up over duration, like a flute player losing stability towards end of lungspan
    let variance = masterVariance * Math.sqrt( i / real.length);
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
  this.lfo.oscillator.frequency.value = 1/(TOTAL_DURATION);
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
  let lastOut = 0.0;
  for (var i = 0; i < (audioContext.sampleRate * 2.0); i++) {
    let white = (Math.random()* 2 - 1) * .5;
    let brown = (lastOut + (0.02 * white)) / 1.02;
    data[0][i] = brown;
    data[1][i] = brown;
    lastOut = brown;
  }
  this.noise.node.buffer = buffer;
  this.noise.node.loop = true;
  this.noise.gain = audioContext.createGain();
  this.noise.gain.gain.value = 1;
  this.noise.peakGain = 5;
  this.noise.node.connect(this.noise.gain);
  this.noise.gain.connect(this.gain);
  // we connect the instruments gain to the master filter
  this.gain.connect(effects.lowpassFilter);
}

function Harmonic(fundFreq, number, gainRatio, instrumentGain) {
  this.frequency = fundFreq * number;
  this.gainRatio = gainRatio;
  this.gain = audioContext.createGain();
  // reduce gain above a certain frequency, kind of like our own custom filter
  let gain = gainRatio;
  if (this.frequency >= 1500) {
    gain = 1/Math.sqrt(Math.sqrt(this.frequency - 1500));
  }
  this.gain.gain.value = gain;
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
