import Tuna  from 'tunajs';

import config  from './../config';
import errors  from './../errors';
import helpers  from './../helpers';

const PEAK_GAIN = .02;
const MIN_GAIN = .000001;


export default class Synthesizer {
  constructor(audioContext, scaleKey){
    this.audioContext = audioContext;
    this.scaleKey = scaleKey;
    // init masterGain
    this.masterGain = audioContext.createGain();
    this.masterGain.gain.value = .5;
    // init analyser
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    // init effects && instruments
    this.effects = this.initializeEffects();
    this.instruments = {};
    this.connectPlugins();
  }

  initializeEffects(){
    let effects = {};
    let tuna = new Tuna(this.audioContext);
    // lowpass filter
    effects.lowpassFilter = this.audioContext.createBiquadFilter();
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
      impulse: `./../../assets/impulse-responses/${config.IMPULSE_RESPONSE_FILE}.wav`,
      bypass: 0
    });
    return effects;
  }

  connectPlugins(){
    this.effects.lowpassFilter.connect(this.effects.chorus);
    this.effects.chorus.connect(this.effects.tremolo);
    this.effects.tremolo.connect(this.effects.compressor);
    this.effects.compressor.connect(this.effects.reverb);
    this.effects.reverb.connect(this.analyser);
    this.analyser.connect(this.masterGain);
    this.masterGain.connect(this.audioContext.destination);
  }


  getAnalyser(){
    return this.analyser;
  }

  setEffect(effectKey, newEffect){
    this[effectKey] = newEffect;
  }

  translateData(data, _Instrument, callback){
    let audioContext = this.audioContext;
    if (!audioContext) {
      throw errors.uninitiatedOscillator;
    }
    // console.log(data);
    // console.log(instruments);
    let now = audioContext.currentTime + .01;
    let timeInterval = (config.TOTAL_DURATION / config.COL_COUNT);
    let usedRows = this.getUsedRows(data);
    let instrumentsPlaying = {};
    for (let colKey in data){
      colKey = parseInt(colKey);
      // reset instruments to play again on next column
      this.instruments = this.setSynths(usedRows, instrumentsPlaying, _Instrument);
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
          let instrument = this.instruments[rowKey];
          if (!instrument) {
            console.warn(this.instruments, rowKey);
          }
          // ADSR envelope for instrument as a whole
          instrument.gain.gain.setValueAtTime(MIN_GAIN, now + (colKey * timeInterval));
          instrument.gain.gain.exponentialRampToValueAtTime(PEAK_GAIN, now + (colKey * timeInterval) + timeInterval * instrument.attack);
          instrument.gain.gain.exponentialRampToValueAtTime(PEAK_GAIN * instrument.sustain, now + (colKey * timeInterval) + timeInterval * instrument.decay);
          instrumentsPlaying[rowKey] = instrument;
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
          let instrument = this.instruments[rowKey];
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
          instrumentsPlaying[rowKey] = false;
        }
      }
    }
    // this.instruments = null;
    callback();
  }

  stopOscillation(audioContext){
    for (var i = 0; i < this.instruments.length; i++) {
      let instrument = this.instruments[i];
      for (var i = 0; i < instrument.harmonics.length; i++) {
        let harmonic = instrument.harmonics[i];
        harmonic.oscillator.stop();
      }
    }
  }


  // ___HELPERS___
  setSynths(usedRows, instrumentsPlaying, _Instrument){
    let instruments = instrumentsPlaying || {};
    for (var i = 0; i < config.ROW_COUNT; i++) {
      if (usedRows.includes(i) && !instrumentsPlaying[i]) {
        let fundFreq = helpers.getFrequency(i, config.ROW_COUNT);
        instruments[i] = new _Instrument(this.audioContext, fundFreq, config.BASE_FREQ);
        instruments[i].connectTo(this.effects.lowpassFilter);
      }
    }
    return instruments;
  }

  getUsedRows(data){
    let usedRows = [];
    for (let colKey in data){
      for (let rowKey in data[colKey]){
        usedRows.push(parseInt(rowKey));
      }
    }
    return usedRows;
  }

}
