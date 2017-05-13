import Tuna  from 'tunajs';

import Harmonic  from './Harmonic';

import config  from './../config';
import constants  from './../constants';

export default class Pluck {
  constructor(audioContext, fundFreq, baseFreq){
    this.audioContext = audioContext;
    this.harmonics = [];
    this.gain = audioContext.createGain();
    this.gain.gain.value = constants.MIN_GAIN;
    // attack, decay and release are in sec(s)
    this.attack = .1;
    this.decay = .2;
    this.release = .1;
    // sustain is percentage of peak gain we sustain at
    this.sustain = .4;
    // these are our harmonics
    this.frequency = fundFreq;
    let waveShape = 'triangle';
    this.harmonics.push(new Harmonic(audioContext, fundFreq, 1, 1, this.gain, waveShape, null));
    this.harmonics.push(new Harmonic(audioContext, fundFreq, 2, 1, this.gain, waveShape, null));
    // this.processor = this.audioContext.createScriptProcessor( 512, 0, 2);
    //
    //
    //
    //
    // var sampleRate = this.audioContext.sampleRate;
    // var N = Math.round( sampleRate / fundFreq ),
    //   impulse = sampleRate / 1000,
    //   y = new Float32Array( N ),
    //   n = 0;
    // this.processor.onaudioprocess = function( e ) {
    //   var out = e.outputBuffer.getChannelData( 0 ), i = 0, xn;
    //   for ( ; i < out.length; ++i ) {
    //     xn = ( --impulse >= 0 ) ? Math.random() - 0.5 : 0;
    //     out[ i ] = y[ n ] = xn + ( y[ n ] + y[ ( n + 1 ) % N ] ) / 2;
    //     if ( ++n >= N) {
    //       n = 0;
    //     }
    //   }
    // }.bind( this );
    //
    //

    this.noise = this.initializeNoise(); // we play with the buffer during attack for a little breathiness
  }

  static getInstrGain(){
    return 1;
  }

  pluck(freq){
    return;
    var sampleRate = this.audioContext.sampleRate;
    var N = Math.round( sampleRate / freq ),
      impulse = sampleRate / 1000,
      y = new Float32Array( N ),
      n = 0;
    this.processor.onaudioprocess = function( e ) {
      var out = e.outputBuffer.getChannelData( 0 ), i = 0, xn;
      for ( ; i < out.length; ++i ) {
        xn = ( --impulse >= 0 ) ? Math.random() - 0.5 : 0;
        out[ i ] = y[ n ] = xn + ( y[ n ] + y[ ( n + 1 ) % N ] ) / 2;
        if ( ++n >= N) {
          n = 0;
        }
      }
    }.bind( this );
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
    noise.peakGain = 15;
    noise.node.connect(noise.gain);
    noise.gain.connect(this.gain);
    return noise;
  }

  connectTo(destination){
    this.gain.connect(destination)
    // this.processor.connect(destination)
  }

  static getEffects(tuna){
    let effects = {};
    effects.entryPoint = 'wahwah';
    effects.exitPoint = 'wahwah';
    effects.tremolo = new tuna.Tremolo({
      intensity: .1,
      rate: 8,
      stereoPhase: 0,
      bypass: 0
    });
    effects.moog = new tuna.MoogFilter({
      cutoff: 0.65,    //0 to 1
      resonance: 1,   //0 to 4
      bufferSize: 4096  //256 to 16384
    });
    effects.phaser = new tuna.Phaser({
      rate: 1.2,                     //0.01 to 8 is a decent range, but higher values are possible
      depth: 0.3,                    //0 to 1
      feedback: 0.2,                 //0 to 1+
      stereoPhase: 30,               //0 to 180
      baseModulationFrequency: 700,  //500 to 1500
      bypass: 0
    });
    effects.bitcrusher = new tuna.Bitcrusher({
      bits: 8,          //1 to 16
      normfreq: 1,    //0 to 1
      bufferSize: 4096  //256 to 16384
    });
    effects.reverb = new tuna.Convolver({
      highCut: 22050,                         //20 to 22050
      lowCut: 20,                             //20 to 22050
      dryLevel: 1,                            //0 to 1+
      wetLevel: .1,                            //0 to 1+
      level: 1,                               //0 to 1+, adjusts total output of both wet and dry
      impulse: `./../../assets/impulse-responses/Large Wide Echo Hall.wav`,
      bypass: 0
    });
    effects.wahwah = new tuna.WahWah({
      automode: true,                //true/false
      baseFrequency: 0.5,            //0 to 1
      excursionOctaves: 2,           //1 to 6
      sweep: 0.5,                    //0 to 1
      resonance: 10,                 //1 to 100
      sensitivity: 0.5,              //-1 to 1
      bypass: 0
    });
    effects.lowPassFilter = new tuna.Filter({
        frequency: 1200, //20 to 22050
        Q: 5, //0.001 to 100
        gain: 1, //-40 to 40 (in decibels)
        filterType: "lowpass",
        bypass: 0
    });
    return effects;
  }

}
