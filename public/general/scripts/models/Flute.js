import Harmonic  from './Harmonic';

import config  from './../config';
import constants  from './../constants';

export default class Flute {
  constructor(audioContext, fundFreq, baseFreq){
    this.harmonics = [];
    this.gain = audioContext.createGain();
    this.gain.gain.value = constants.MIN_GAIN;
    // attack, decay and release are pts on line from 0 to 1
    this.attack = .05;
    this.decay = .1;
    this.release = .8;
    // sustain is percentage of peak gain we sustain at
    this.sustain = .8;
    // these are our harmonics
    // our overtones' gainRatios are custom tailored per instrument
    let gainRatio = (fundFreq / baseFreq);
    this.harmonics.push(new Harmonic(audioContext, fundFreq, 1, .7 * gainRatio, this.gain));
    this.harmonics.push(new Harmonic(audioContext, fundFreq, 2, .3 * gainRatio, this.gain));
    this.harmonics.push(new Harmonic(audioContext, fundFreq, 3,  1 * gainRatio, this.gain));
    this.harmonics.push(new Harmonic(audioContext, fundFreq, 4, .6 * gainRatio, this.gain));
    // TODO have to cut so many oscillators, too expensive
    // this.harmonics.push(new Harmonic(audioContext, fundFreq, 5, .8 / gainRatio, this.gain));
    // this.harmonics.push(new Harmonic(audioContext, fundFreq, 6, .5 / gainRatio, this.gain));
    // this.harmonics.push(new Harmonic(audioContext, fundFreq, 7, .3 / gainRatio, this.gain));
    // a little dissonance is always healthy
    let dissonantFreq = fundFreq + fundFreq * .01;
    this.harmonics.push(new Harmonic(audioContext, dissonantFreq, 1, .3 * gainRatio, this.gain));
    this.harmonics.push(new Harmonic(audioContext, dissonantFreq, 2, .3 * gainRatio, this.gain));
    // this.harmonics.push(new Harmonic(audioContext, dissonantFreq, 3, .3 / gainRatio, this.gain));
    // this.harmonics.push(new Harmonic(audioContext, dissonantFreq, 4, .3 / gainRatio, this.gain));
    // each instrument has its own lfo for vibrato simulation
    this.lfo = {};
    this.lfo.oscillator =  audioContext.createOscillator();
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
    let wave = audioContext.createPeriodicWave(real, imag, {disableNormalization: true});
    this.lfo.oscillator.setPeriodicWave(wave);
    this.lfo.oscillator.frequency.value = 1/(config.TOTAL_DURATION);
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
  }

  connectTo(destination){
    this.gain.connect(destination);
  }

}
