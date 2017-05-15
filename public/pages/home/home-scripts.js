/* jshint esversion: 6 */

import Tuna  from 'tunajs';

import board from './../../components/board/board-scripts';
import config from './../../general/scripts/config';
import constants from './../../general/scripts/constants';
import Preset from './../../general/scripts/models/Preset';
import visualizer from './../../components/visualizer/visualizer-scripts';

import Flute from './../../general/scripts/models/Flute';
import Kazoo from './../../general/scripts/models/Kazoo';
import Pluck from './../../general/scripts/models/Pluck';
import Wind from './../../general/scripts/models/Wind';

let audioContext = null;
let mixer = null;
let tuna = null;
let destinationPt = null;

let activePreset = null;
let activeColor = null;
let colorDivs = {};

let isPaused = false;

exports.mount = function(){
  try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioContext) {
      audioContext = new AudioContext();
    }
  } catch(e){
    console.warn(e);
  }
  if (!mixer) {
    mixer = initializeMixer();
  }
  // eventually we want to pull presets from DB, for now we just manual generate here
  let view3 = new Preset('view3', null, 'pentMinor', {
    '2f5f53': Flute,
    '9fb4b3': Kazoo,
    '122b62': Wind,
    // 'dfd560': Kazoo,
    // '5a5542': Flute,
  });
  let view11 = new Preset('view11', null, 'pentMinor', {
    '2a6263': Flute,
    'f9dd9c': Kazoo,
    '204a9b': Wind,
  });
  activePreset = view11;
  buildPalette(activePreset.colorTones);
  board.mount(activePreset.colorTones, activePreset.scaleKey);
  board.setActiveColor(activeColor);
  visualizer.mount();
};

exports.unmount = function(){
  audioContext.close();
  audioContext = null;
  mixer = null;
  board.unmount();
  visualizer.unmount();
}

let initializeMixer = function(){
  tuna = new Tuna(audioContext);
  let mixer = {};
  mixer.gain = audioContext.createGain();
  mixer.filter = audioContext.createBiquadFilter();
  mixer.filter.type = "lowpass";
  mixer.filter.frequency.value = 5000;
  mixer.compressor = new tuna.Compressor({
    threshold: -10,    //-100 to 0
    makeupGain: 1,     //0 and up (in decibels)
    attack: 0,         //0 to 1000
    release: 0,        //0 to 3000
    ratio: 8,          //1 to 20
    knee: 10,           //0 to 40
    automakeup: false,  //true/false
    bypass: 0
  });
  mixer.analyser = audioContext.createAnalyser();
  mixer.analyser.fftSize = 2048;
  // connect equipment
  mixer.gain.connect(mixer.filter);
  mixer.filter.connect(mixer.analyser);
  mixer.analyser.connect(audioContext.destination);
  // mixer.compressor.connect(audioContext.destination);
  destinationPt = mixer.gain;
  return mixer;
}

let playButton = document.querySelector('#play-button');
let pauseButton = document.querySelector('#pause-button');
let stopButton = document.querySelector('#stop-button');
let loopButton = document.querySelector('#loop-button');

let stop = function(){
  if (audioContext) {
    mixer.gain.gain.value = constants.MIN_GAIN;
    board.stop();
  }
}

let play = function(){
  if (!isPaused) {
    stop();
  }
  isPaused = false;
  if (mixer.gain.gain.value !== 1) {
    mixer.gain.gain.value = 1;
  }
  setTimeout(()=>{
    board.play(audioContext, destinationPt, mixer.analyser, tuna);
  }, 20);
}

let loop = function(){
  if (!isPaused) {
    stop();
  }
  setTimeout(()=>{
    board.loop(audioContext, destinationPt, mixer.analyser, tuna);
  }, 20);
}

let pause = function(){
  if (!isPaused) {
    isPaused = true;
    mixer.gain.gain.value = constants.MIN_GAIN;
    board.pause(audioContext, destinationPt, mixer.analyser, tuna);
  } else {
    play();
  }
}


stopButton.addEventListener('click', ()=>{stop()});
playButton.addEventListener('click', ()=>{play()});
loopButton.addEventListener('click', ()=>{loop()});
pauseButton.addEventListener('click', ()=>{pause()});

let buildPalette = function(colorTones){
  let paletteContainer = document.querySelector('#palette');
  let counter = 0;
  for (let color in colorTones){
    let colorDiv = document.createElement('div');
    colorDiv.className += "color-selector";
    colorDiv.style = `background-color: #${color}`;
    colorDiv.id = color + "-selector"; // remove hashtag from color
    if (config.paletteLabels) {
      let labelContainer = document.createElement('div');
      labelContainer.className += " label-container";
      let labelText = document.createTextNode(colorTones[color].name);
      labelContainer.appendChild(labelText);
      colorDiv.appendChild(labelContainer);
    }
    paletteContainer.appendChild(colorDiv);

    colorDivs[color] = colorDiv;
    colorDiv.addEventListener('click', ()=>{
      changeActiveColor(color)
    });
    if (counter === 0) {
      activeColor = color;
      colorDiv.className += " active-color";
    }
    counter++;
  }
}

let changeActiveColor = function(newColor){
  let oldDiv = colorDivs[activeColor];
  oldDiv.classList.remove('active-color');
  let newDiv = colorDivs[newColor];
  newDiv.className += " active-color";
  activeColor = newColor;
  board.setActiveColor(activeColor);
}
