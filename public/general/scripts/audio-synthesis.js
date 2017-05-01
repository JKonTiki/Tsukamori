var errors = require('./../../general/scripts/errors');

const TOTAL_DURATION = 15;
const FREQ_MIN = 30;
const FREQ_MAX = 2000;

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
  for (let colKey in data){
    colKey = parseInt(colKey);
    // reset synths to play again on next column
    synths = setSynths(rowNum, usedRows);
    for (let rowKey in data[colKey]){
      synths[rowKey].gain.gain.setValueAtTime(now + (colKey * timeInterval), .1);
      synths[rowKey].gain.gain.exponentialRampToValueAtTime(now + (colKey * timeInterval) + (colKey * timeInterval)/2, .4);
      synths[rowKey].gain.gain.exponentialRampToValueAtTime(now + (colKey * timeInterval) + (colKey * timeInterval), .1);
      synths[rowKey].oscillator.start(now + (colKey * timeInterval))
      synths[rowKey].oscillator.stop(now + (colKey * timeInterval) + timeInterval)
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

var setSynths = function(rowNum, usedRows){
  let synths = {};
  for (var i = 0; i < rowNum; i++) {
    if (usedRows.includes(i)) {
      let frequency = parseFloat(FREQ_MIN + (freqInterval * i)).toFixed(3);
      //create synth's gain
      let gain = audioContext.createGain();
      gain.connect(audioContext.destination);
      //create synth's oscillator
      let oscillator = audioContext.createOscillator();
      oscillator.type = 'sine';
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
