import config  from './../config';
import errors  from './../errors';
import helpers  from './../helpers';

const PEAK_GAIN = 1;
const MIN_GAIN = .00001;


export default class Synthesizer {
  constructor(audioContext, destination, Instrument, scaleKey, tuna){
    this.audioContext = audioContext;
    this.Instrument = Instrument;
    this.instruments = {};
    this.scaleKey = scaleKey;
    this.synthGain = audioContext.createGain();
    this.synthGain.gain.value = .02 * Instrument.getInstrGain();
    this.effects = this.initializeConnections(tuna, destination);
  }

  translateData(data){
    let audioContext = this.audioContext;
    if (!audioContext) {
      throw errors.uninitiatedOscillator;
    }
    // console.log(data);
    // console.log(instruments);
    let now = audioContext.currentTime + .01;
    let timeInterval = (config.TOTAL_DURATION / config.COL_COUNT);
    let usedRows = this.getUsedRows(data);
    // reset instruments to play again on next column
    this.instruments = this.setSynths(usedRows);
    let rowsStarted = [];
    for (let colKey in data){
      colKey = parseInt(colKey);
      let starting = [];
      let stopping = [];
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
        let instrument = this.instruments[rowKey];
        if (!alreadyPlaying || this.Instrument.noSustain) {
          if (!instrument) {
            console.warn(this.instruments, rowKey);
          }
          // ADSR envelope for instrument as a whole
          instrument.gain.gain.setValueAtTime(MIN_GAIN, now + (colKey * timeInterval));
          instrument.gain.gain.exponentialRampToValueAtTime(PEAK_GAIN, now + (colKey * timeInterval) + instrument.attack);
          instrument.gain.gain.exponentialRampToValueAtTime(PEAK_GAIN * instrument.sustain, now + (colKey * timeInterval) + instrument.attack + instrument.decay);
          // see if oscillators have been started
          let haveStarted = false;
          if (rowsStarted.indexOf(rowKey) !== -1) {
            haveStarted = true;
          } else {
            rowsStarted.push(rowKey);
          }
          // start oscillators for individual harmonics
          for (var i = 0; i < instrument.harmonics.length; i++) {
            let harmonic = instrument.harmonics[i];
            if (!haveStarted) {
              harmonic.oscillator.start(now + (colKey * timeInterval));
            } else {
              harmonic.gain.gain.setValueAtTime(harmonic.gainRatio, now + (colKey * timeInterval));
            }
          }
          // launch LFO
          if (instrument.lfo) {
            if (!haveStarted) {
              instrument.lfo.oscillator.start(now + (colKey * timeInterval));
            } else {
              instrument.lfo.gain.gain.exponentialRampToValueAtTime(PEAK_GAIN, now + (colKey * timeInterval) + timeInterval);
            }
          }
          if (instrument.noise) {
            // launch breathiness, increase gain over time starting from sustain
            if (!haveStarted) {
              instrument.noise.node.start(now + (colKey * timeInterval));
              instrument.noise.gain.gain.linearRampToValueAtTime(instrument.noise.peakGain, now + (colKey * timeInterval) + timeInterval); // we take extra time to avoid harsh cut
            } else {
              instrument.noise.gain.gain.linearRampToValueAtTime(instrument.noise.peakGain, now + (colKey * timeInterval) + timeInterval); // we take extra time to avoid harsh cut
            }
          }
        }
        if (!continuesPlaying) {
          let startRelease = (colKey * timeInterval) + (timeInterval - instrument.release);
          if (startRelease > 0) {
            instrument.gain.gain.setValueAtTime(PEAK_GAIN * instrument.sustain, now + startRelease);
          }
          instrument.gain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + (colKey * timeInterval) + timeInterval);
          for (var i = 0; i < instrument.harmonics.length; i++) {
            let harmonic = instrument.harmonics[i];
            harmonic.gain.gain.setValueAtTime(MIN_GAIN, now + (colKey * timeInterval) + timeInterval + 1);
          }
          // stop LFO
          if (instrument.lfo) {
            instrument.lfo.gain.gain.exponentialRampToValueAtTime(MIN_GAIN, now + (colKey * timeInterval) + timeInterval);
          }
          // stop noise
          if (instrument.noise) {
            instrument.noise.gain.gain.linearRampToValueAtTime(MIN_GAIN, now + (colKey * timeInterval) + timeInterval * 2); // we need extra small gain for this as its pretty loud
          }
        }
        for (var i = 0; i < instrument.harmonics.length; i++) {
          let harmonic = instrument.harmonics[i];
          harmonic.oscillator.stop(now + config.TOTAL_DURATION);
          if (instrument.lfo) {
            instrument.lfo.oscillator.stop(now + config.TOTAL_DURATION);
          }
          if (instrument.noise) {
            instrument.noise.node.stop(now + config.TOTAL_DURATION);
          }
        }
      }
    }
  }


  // ___HELPERS___
  setSynths(usedRows, _Instrument){
    let instruments = {};
    for (var i = 0; i < config.ROW_COUNT; i++) {
      if (usedRows.includes(i)) {
        let fundFreq = helpers.getFrequency(i, this.scaleKey);
        let newInstrument = new this.Instrument(this.audioContext, fundFreq, config.BASE_FREQ);
        instruments[i] = newInstrument;
        // instrument history is so we can stop all if needed
        instruments[i].connectTo(this.synthGain);
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

  initializeConnections(tuna, destination){
    if (this.Instrument.getEffects) {
      let effects = this.Instrument.getEffects(tuna);
      if (effects.entryPoint && effects.exitPoint) {
        this.synthGain.connect(effects[effects.entryPoint]);
        effects[effects.exitPoint].connect(destination);
      } else {
        this.synthGain.connect(destination);
      }
    } else {
      this.synthGain.connect(destination);
    }
  }

}
