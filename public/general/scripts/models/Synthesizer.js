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
    this.startTime = 0;
    this.data = null;
    this.dataByRow = {};
    this.usedRows = null;
    this.timeInterval = config.TOTAL_DURATION / config.COL_COUNT;
    this.rowsStarted = [];
  }

  playData(data, timeElapsed, callback){
    let audioContext = this.audioContext;
    if (!audioContext) {
      throw errors.uninitiatedOscillator;
    }
    // refresh things we track
    this.instruments = {};
    this.dataByRow = {};
    this.rowsStarted = [];
    this.startTime = audioContext.currentTime + .01 - timeElapsed;
    this.data = data;
    this.usedRows = this.getUsedRows(data);
    this.setSynths(this.usedRows);
    //this.rowsStarted = [];
    // TODO reset all values
    for (let colKey in data){
      colKey = parseInt(colKey);
      for (let rowKey in data[colKey]){
        rowKey = parseInt(rowKey);
        if (!this.dataByRow[rowKey]) {
          this.dataByRow[rowKey] = {};
        }
        this.dataByRow[rowKey][colKey] = data[colKey][rowKey];
        this.scheduleActivity(colKey, rowKey);
        this.stopInstrument(this.instruments[rowKey], this.startTime + config.TOTAL_DURATION);
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

  scheduleActivity(colKey, rowKey){
    let alreadyPlaying = this.isAlreadyPlaying(colKey, rowKey);
    let continuesPlaying = this.willContinuePlaying(colKey, rowKey);
    if (!alreadyPlaying || this.Instrument.noSustain) {
      this.playInstrument(colKey, rowKey);
    }
    if (!continuesPlaying) {
      this.pauseInstrument(colKey, rowKey);
    }
  }

  playInstrument(colKey, rowKey){
    let instrument = this.instruments[rowKey];
    if (!instrument) {
      console.warn('no instrument at rowKey', rowKey);
      return;
    }
    let triggerTime = this.startTime + (colKey * this.timeInterval)
    if (triggerTime < 0) {
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
    instrument.gain.gain.setValueAtTime(MIN_GAIN, triggerTime);
    instrument.gain.gain.exponentialRampToValueAtTime(PEAK_GAIN, triggerTime + instrument.attack);
    if (instrument.attack + instrument.delay > this.timeInterval) {
      instrument.gain.gain.exponentialRampToValueAtTime(PEAK_GAIN * instrument.sustain, triggerTime + instrument.attack + instrument.decay);
    }
    if (!hasStarted) {
      for (var i = 0; i < instrument.harmonics.length; i++) {
        let harmonic = instrument.harmonics[i];
        harmonic.oscillator.start(triggerTime);
      }
    }
    // launch LFO
    if (instrument.lfo) {
      if (!hasStarted) {
        instrument.lfo.oscillator.start(triggerTime);
      } else {
        instrument.lfo.gain.gain.exponentialRampToValueAtTime(PEAK_GAIN, triggerTime + this.timeInterval);
      }
    }
    if (instrument.noise) {
      // launch breathiness, increase gain over time starting from sustain
      if (!hasStarted) {
        instrument.noise.node.start(triggerTime);
        instrument.noise.gain.gain.linearRampToValueAtTime(instrument.noise.peakGain, triggerTime + this.timeInterval); // we take extra time to avoid harsh cut
      } else {
        instrument.noise.gain.gain.linearRampToValueAtTime(instrument.noise.peakGain, triggerTime + this.timeInterval); // we take extra time to avoid harsh cut
      }
    }
  }

  pauseInstrument(colKey, rowKey){
    let instrument = this.instruments[rowKey];
    if (!instrument) {
      console.warn('no instrument at rowKey', rowKey);
      return;
    }
    let triggerTime = this.startTime + (colKey * this.timeInterval) + this.timeInterval;
    if (triggerTime < 0) {
      return;
    }
    let triggerRelease = triggerTime - instrument.release;
    if (triggerRelease > 0 || (this.isAlreadyPlaying(colKey, rowKey) && Math.abs(triggerRelease) < this.timeInterval)) {
      // TODO this only starts release within one column, we could also make it recur checkhow long it has (how many prev columns already playing) to trigger release
      instrument.gain.gain.setValueAtTime(PEAK_GAIN * instrument.sustain, triggerRelease);
    }
    instrument.gain.gain.exponentialRampToValueAtTime(MIN_GAIN, triggerTime);
    // stop LFO
    if (instrument.lfo) {
      instrument.lfo.gain.gain.exponentialRampToValueAtTime(MIN_GAIN, triggerTime);
    }
    // stop noise
    if (instrument.noise) {
      instrument.noise.gain.gain.linearRampToValueAtTime(MIN_GAIN, triggerTime); // we need extra small gain for this as its pretty loud
    }
  }

  stopInstrument(instrument, stopTime){
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

  stopAllInstruments(){
    for(let rowKey in this.instruments){
      this.stopInstrument(this.instruments[rowKey], 0);
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
    if (!this.dataByRow[row]) {
      this.dataByRow[row] = {};
    }
    this.dataByRow[row][col] = this.data[col][row];
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
      this.stopInstrument(this.instruments[row], this.startTime + config.TOTAL_DURATION);
    }
  }

  cancelAllEvents(row){
    let instrument = this.instruments[row];
    if (!instrument) {
      console.warn('no instrument at rowKey', row);
      return;
    }
    instrument.gain.gain.cancelScheduledValues(this.audioContext.currentTime);
    if (instrument.lfo) {
      instrument.lfo.gain.gain.cancelScheduledValues(this.audioContext.currentTime);
    }
    if (instrument.noise) {
      instrument.noise.gain.gain.cancelScheduledValues(this.audioContext.currentTime);
    }
  }

  extendSustain(col, row){
    this.cancelAllEvents(row)
    for(let colKey in this.dataByRow[row]){
      this.scheduleActivity(parseInt(colKey), row);
    }
  }

  cancelNxtAttack(col, row){
    this.cancelAllEvents(row);
    for(let colKey in this.dataByRow[row]){
      this.scheduleActivity(parseInt(colKey), row);
    }
  }


  // ___HELPERS___
  setSynths(synthRows){
    for (var i = 0; i < synthRows.length; i++) {
      let rowIndex = synthRows[i];
      let fundFreq = helpers.getFrequency(rowIndex, this.scaleKey);
      let newInstrument = new this.Instrument(this.audioContext, fundFreq, config.BASE_FREQ);
      this.instruments[rowIndex] = newInstrument;
      this.instruments[rowIndex].connectTo(this.synthGain);
    }
  }

  getUsedRows(data){
    let usedRows = [];
    for (let colKey in data){
      for (let rowKey in data[colKey]){
        let row = parseInt(rowKey);
        if (usedRows.indexOf(row) === -1) {
          usedRows.push(parseInt(row));
        }
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
