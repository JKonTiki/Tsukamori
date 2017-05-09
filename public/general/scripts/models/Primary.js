import Tuna  from 'tunajs';

import Harmonic  from './Harmonic';

import config  from './../config';
import constants  from './../constants';

export default class Primary {
  constructor(audioContext, fundFreq, baseFreq){
    this.audioContext = audioContext;
    this.harmonics = [];
    this.gain = audioContext.createGain();
    this.gain.gain.value = constants.MIN_GAIN;
    // attack, decay and release are in sec(s)
    this.attack = .05;
    this.decay = .1;
    this.release = .8;
    // sustain is percentage of peak gain we sustain at
    this.sustain = .8;
    // these are our harmonics
    let gainRatio = (fundFreq / baseFreq);
    let waveShape = 'triangle';
    this.harmonics.push(new Harmonic(audioContext, fundFreq, 1, .7 * gainRatio, this.gain, waveShape));
    this.harmonics.push(new Harmonic(audioContext, fundFreq, 2, .3 * gainRatio, this.gain, waveShape));
    this.harmonics.push(new Harmonic(audioContext, fundFreq, 3,  1 * gainRatio, this.gain, waveShape));
    this.harmonics.push(new Harmonic(audioContext, fundFreq, 4, .6 * gainRatio, this.gain, waveShape));
    // a little dissonance is always healthy
    let dissonantFreq = fundFreq + fundFreq * .01;
    this.harmonics.push(new Harmonic(audioContext, dissonantFreq, 1, .3 * gainRatio, this.gain, waveShape));
    this.harmonics.push(new Harmonic(audioContext, dissonantFreq, 2, .3 * gainRatio, this.gain, waveShape));
    // this.lfo = this.initializeLFO(); // each instrument has its own lfo for vibrato simulation
    // this.noise = this.initializeNoise(); // we play with the buffer during attack for a little breathiness
  }

  initializeNoise(){
    let noise = {};
    noise.node = this.audioContext.createBufferSource();
    let buffer = this.audioContext.createBuffer(2, (this.audioContext.sampleRate * 2.0), this.audioContext.sampleRate);
    let data = [0, 1]; // here we assume two channels. intial values are placeholders
    data[0] = buffer.getChannelData(0);
    data[1] = buffer.getChannelData(1);
    let lastOut = 0.0;
    for (var i = 0; i < (this.audioContext.sampleRate * 2.0); i++) {
      let white = (Math.random()* 2 - 1) * .5;
      let brown = (lastOut + (0.02 * white)) / 1.02;
      data[0][i] = brown;
      data[1][i] = brown;
      lastOut = brown;
    }
    noise.node.buffer = buffer;
    noise.node.loop = true;
    noise.gain = this.audioContext.createGain();
    noise.gain.value = 0;
    noise.peakGain = 5;
    noise.node.connect(noise.gain);
    noise.gain.connect(this.gain);
    return noise;
  }

  initializeLFO(){
    let lfo = {};
    lfo.oscillator =  this.audioContext.createOscillator();
    let wavePts = (config.TOTAL_DURATION) + (config.TOTAL_DURATION - Math.ceil(Math.random() * config.TOTAL_DURATION))
    let real = new Float32Array(wavePts);
    let imag = new Float32Array(wavePts);
    let cachedReal = null;
    let cachedImag = null;
    // our custom lfo waveform algorithm, varies at {wavePts} times during config.TOTAL_DURATION and meant to control jumps
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
    let wave = this.audioContext.createPeriodicWave(real, imag, {disableNormalization: true});
    lfo.oscillator.setPeriodicWave(wave);
    lfo.oscillator.frequency.value = 1/(config.TOTAL_DURATION);
    lfo.gain = this.audioContext.createGain();
    lfo.gain.gain.value = .0005;
    lfo.oscillator.connect(lfo.gain);
    lfo.gain.connect(this.gain.gain);
    return lfo;
  }

  connectTo(destination){
    this.gain.connect(destination)
  }

  static getEffects(tuna){
    let effects = {};
    effects.entryPoint = 'tremolo';
    effects.exitPoint = 'compressor';
    effects.tremolo = new tuna.Tremolo({
      intensity: 0.1,
      rate: 4,
      stereoPhase: 0,
      bypass: 0
    });
    effects.chorus = new tuna.Chorus({
      rate: 2,
      feedback: 0,
      delay: .005,
      bypass: 0
    });
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
      impulse: `./../../assets/impulse-responses/Vocal Duo.wav`,
      bypass: 0
    });
    effects.tremolo.connect(effects.chorus);
    effects.chorus.connect(effects.compressor);
    effects.compressor.connect(effects.reverb);
    return effects;
  }

}