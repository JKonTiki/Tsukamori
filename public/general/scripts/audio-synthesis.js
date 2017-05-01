var errors = require('./../../general/scripts/errors');

const TOTAL_DURATION = 10;
const FREQ_MIN = 30;
const FREQ_MAX = 800;

var audioContext = null;
var synths = null;
var freqInterval = null;
var timeInterval = null;

exports.init = function(colNum, rowNum){
  // define our audio context
  try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioContext) {
      audioContext = new AudioContext();
    }
    if (!timeInterval) {
      timeInterval = (TOTAL_DURATION / colNum);
    }
    if (!freqInterval) {
      freqInterval = (FREQ_MAX - FREQ_MIN) / rowNum;
      // ^^the actual freqeuncies that we want aren't linear, this is just a test setup
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
        synths[rowKey].gain.gain.setValueAtTime(.001, now + (colKey * timeInterval));
        // attack
        synths[rowKey].gain.gain.exponentialRampToValueAtTime(.2, now + (colKey * timeInterval) + timeInterval * .3);
        synths[rowKey].oscillator.start(now + (colKey * timeInterval));
        synthsPlaying[rowKey] = synths[rowKey];
      }
      if (!continuesPlaying) {
        // sustain
        synths[rowKey].gain.gain.exponentialRampToValueAtTime(.1, now + (colKey * timeInterval) + timeInterval * .6);
        // release
        synths[rowKey].gain.gain.exponentialRampToValueAtTime(.001, now + (colKey * timeInterval) + timeInterval);
        synths[rowKey].oscillator.stop(now + (colKey * timeInterval) + timeInterval);
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
      let frequency = parseFloat(FREQ_MIN + (freqInterval * i)).toFixed(3);
      //create synth's gain
      let gain = audioContext.createGain();
      gain.connect(audioContext.destination);
      //create synth's oscillator
      let oscillator = audioContext.createOscillator();
      oscillator.type = 'sawtooth';
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      // set to synth object
      synths[i] = {};
      synths[i]['oscillator'] = oscillator;
      synths[i]['gain'] = gain;
    }
  }
  return synths;
}
