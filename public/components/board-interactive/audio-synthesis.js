var errors = require('./../../general/scripts/errors');

const TOTAL_DURATION = 10;
const FREQ_MIN = 27.5;
const FREQ_MAX = 3000;

var audioContext = null;
var synths = null;
var gainGlobal = null;
var freqInterval = null;
var timeInterval = null;

exports.init = function(colNum, rowNum){
  // define our audio context
  try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioContext) {
      audioContext = new AudioContext();
    }
    timeInterval = (TOTAL_DURATION / colNum);
    freqInterval = (FREQ_MAX - FREQ_MIN) / rowNum;
    // ^^the actual freqeuncies that we want aren't linear, this is just a test setup
    gainGlobal = audioContext.createGain();
    synths = resetSynths(rowNum);
  } catch (e) {
    console.warn(e);
    return;
  }
}

exports.translateData = function(colNum, rowNum, data){
  if (!audioContext) {
    throw errors.uninitiatedOscillator;
  }
  console.log(data);
  console.log(synths);
  let now = audioContext.currentTime;

  for (let colKey in data){
    colKey = parseInt(colKey);
    // reset synths to play again on next column
    synths = resetSynths(rowNum);
    for (let rowKey in data[colKey]){
      synths[rowKey].gain.gain.setValueAtTime(now, .5);
      synths[rowKey].oscillator.start(now + (colKey * timeInterval))
      synths[rowKey].oscillator.stop(now + (colKey * timeInterval) + timeInterval)
    }
  }


}

exports.playAudio = function(){


}


var resetSynths = function(rowNum){
  let synths = {};
  for (var i = 0; i < rowNum; i++) {
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
  return synths;
}
