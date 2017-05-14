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
    this.startTime = null;
    this.pauseTime = null;
    this.data = null;
    this.usedRows = null;
    this.timeInterval = config.TOTAL_DURATION / config.COL_COUNT;
    this.rowsStarted = [];
  }

  playData(data, startTime, callback){
    let audioContext = this.audioContext;
    if (!audioContext) {
      throw errors.uninitiatedOscillator;
    }
    this.startTime = audioContext.currentTime + .01;
    this.data = data;
    this.usedRows = this.getUsedRows(data);
    this.setSynths(this.usedRows);
    //this.rowsStarted = [];
    // TODO reset all values
    for (let colKey in data){
      colKey = parseInt(colKey);
      for (let rowKey in data[colKey]){
        rowKey = parseInt(rowKey);
        let alreadyPlaying = this.isAlreadyPlaying(colKey, rowKey);
        let continuesPlaying = this.willContinuePlaying(colKey, rowKey);
        if (!alreadyPlaying || this.Instrument.noSustain) {
          this.playInstrument(colKey, rowKey);
        }
        if (!continuesPlaying) {
          this.pauseInstrument(colKey, rowKey);
        }
        this.scheduleInstrumentStop(this.instruments[rowKey], this.startTime + config.TOTAL_DURATION);
      }
    }
    if (callback) {
      callback();
    }
  }

  isAlreadyPlaying(colKey, rowKey){
    if (this.data[colKey - 1]) {
      if (this.data[colKey - 1][rowKey]) {
        return true;
      }
    }
    return false;
  }

  willContinuePlaying(colKey, rowKey){
    if (this.data[colKey + 1]) {
      if (this.data[colKey + 1][rowKey]) {
        return true;
      }
    }
    return false;
  }

  playInstrument(colKey, rowKey){
    let instrument = this.instruments[rowKey];
    if (!instrument) {
      console.warn('no instrument at rowKey', rowKey);
      return;
    }
    // console.log(this.data);
    let value = this.data[colKey][rowKey];
    let hasStarted = false;
    if (this.rowsStarted.indexOf(rowKey) !== -1) {
      hasStarted = true;
    } else {
      this.rowsStarted.push(rowKey);
    }
    // ADSR envelope for instrument as a whole
    instrument.gain.gain.setValueAtTime(MIN_GAIN, this.startTime + (colKey * this.timeInterval));
    instrument.gain.gain.exponentialRampToValueAtTime(PEAK_GAIN, this.startTime + (colKey * this.timeInterval) + instrument.attack);
    if (instrument.attack + instrument.delay > this.timeInterval) {
      instrument.gain.gain.exponentialRampToValueAtTime(PEAK_GAIN * instrument.sustain, this.startTime + (colKey * this.timeInterval) + instrument.attack + instrument.decay);
    }
    if (!hasStarted) {
      for (var i = 0; i < instrument.harmonics.length; i++) {
        let harmonic = instrument.harmonics[i];
        harmonic.oscillator.start(this.startTime + (colKey * this.timeInterval));
      }
    }
    // launch LFO
    if (instrument.lfo) {
      if (!hasStarted) {
        instrument.lfo.oscillator.start(this.startTime + (colKey * this.timeInterval));
      } else {
        instrument.lfo.gain.gain.exponentialRampToValueAtTime(PEAK_GAIN, this.startTime + (colKey * this.timeInterval) + this.timeInterval);
      }
    }
    if (instrument.noise) {
      // launch breathiness, increase gain over time starting from sustain
      if (!hasStarted) {
        instrument.noise.node.start(this.startTime + (colKey * this.timeInterval));
        instrument.noise.gain.gain.linearRampToValueAtTime(instrument.noise.peakGain, this.startTime + (colKey * this.timeInterval) + this.timeInterval); // we take extra time to avoid harsh cut
      } else {
        instrument.noise.gain.gain.linearRampToValueAtTime(instrument.noise.peakGain, this.startTime + (colKey * this.timeInterval) + this.timeInterval); // we take extra time to avoid harsh cut
      }
    }
  }

  pauseInstrument(colKey, rowKey){
    let instrument = this.instruments[rowKey];
    if (!instrument) {
      console.warn('no instrument at rowKey', rowKey);
      return;
    }
    // let startRelease = (colKey * this.timeInterval) + (this.timeInterval - instrument.release);
    // if (startRelease > 0 && instrument.release > 0) {
    //   instrument.gain.gain.setValueAtTime(PEAK_GAIN * instrument.sustain, this.startTime + startRelease);
    // }
    instrument.gain.gain.exponentialRampToValueAtTime(MIN_GAIN, this.startTime + (colKey * this.timeInterval) + this.timeInterval);
    // stop LFO
    if (instrument.lfo) {
      instrument.lfo.gain.gain.exponentialRampToValueAtTime(MIN_GAIN, this.startTime + (colKey * this.timeInterval) + this.timeInterval);
    }
    // stop noise
    if (instrument.noise) {
      instrument.noise.gain.gain.linearRampToValueAtTime(MIN_GAIN, this.startTime + (colKey * this.timeInterval) + this.timeInterval * 2); // we need extra small gain for this as its pretty loud
    }
  }

  pause(){
    if (this.audioContext) {
      this.pauseTime = audioContext.currentTime;
    }
  }

  scheduleInstrumentStop(instrument, stopTime){
    for (var i = 0; i < instrument.harmonics.length; i++) {
      let harmonic = instrument.harmonics[i];
      try{
        harmonic.oscillator.stop(stopTime);
      } catch(e){console.log(e);};
      if (instrument.lfo) {
        try{
          instrument.lfo.oscillator.stop(stopTime);
        } catch(e){console.log(e);};
      }
      if (instrument.noise) {
        try{
          instrument.noise.node.stop(stopTime);
        } catch(e){console.log(e);};
      }
    }
  }



  mergeInData(point){
    if (!point || !this.startTime) return;
    let col, row;
    // there should be only one iteration here as its only for single new points
    for (let colKey in point){
      col = parseInt(colKey);
      for (let rowKey in point[colKey]){
        row = parseInt(rowKey);
      }
    }
    let newRow = this.usedRows.indexOf(row) === -1;
    if (newRow) {
      this.usedRows.push(row);
      this.setSynths([row]);
    }
    if (!this.data[col]) {
      this.data[col] = {};
    }
    this.data[col][row] = point[col][row];
    let instrument = this.instruments[row];
    let alreadyPlaying = this.isAlreadyPlaying(col, row);
    let continuesPlaying = this.willContinuePlaying(col, row);
    if (!alreadyPlaying) {
      this.playInstrument(col, row);
    } else {
      this.extendSustain(col, row);
    }
    if (!continuesPlaying) {
      this.pauseInstrument(col, row);
    } else {
      this.cancelNxtAttack(col, row);
    }
    if (newRow) {
      this.scheduleInstrumentStop(this.instruments[row], this.startTime + config.TOTAL_DURATION);
    }
  }

  extendSustain(col, row){
    // cancel stop and add new one at Col
    this.playInstrument(col, row);
  }

  cancelNxtAttack(col, row){
    // cancel start for col + 1
    this.pauseInstrument(col, row);
  }


  // ___HELPERS___
  setSynths(synthRows){
    for (var i = 0; i < config.ROW_COUNT; i++) {
      if (synthRows.includes(i)) {
        let fundFreq = helpers.getFrequency(i, this.scaleKey);
        let newInstrument = new this.Instrument(this.audioContext, fundFreq, config.BASE_FREQ);
        this.instruments[i] = newInstrument;
        // instrument history is so we can stop all if needed
        this.instruments[i].connectTo(this.synthGain);
      }
    }
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
