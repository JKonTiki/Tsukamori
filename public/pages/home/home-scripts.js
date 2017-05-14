/* jshint esversion: 6 */

import Tuna  from 'tunajs';

import board from './../../components/board/board-scripts';
import config from './../../general/scripts/config';
import Preset from './../../general/scripts/models/Preset';
import visualizer from './../../components/visualizer/visualizer-scripts';

import Flute from './../../general/scripts/models/Flute';
import Kazoo from './../../general/scripts/models/Kazoo';
import Pluck from './../../general/scripts/models/Pluck';
import Wind from './../../general/scripts/models/Wind';

let audioContext = null;
let mixer = null;
let tuna = null;

let activePreset = null;
let activeColor = null;
let colorDivs = {};

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
  mixer.filter.connect(mixer.analyser);
  mixer.analyser.connect(audioContext.destination);
  // mixer.compressor.connect(audioContext.destination);
  return mixer;
}

let playButton = document.querySelector('#play-button');
let pauseButton = document.querySelector('#pause-button');
let stopButton = document.querySelector('#stop-button');
let loopButton = document.querySelector('#loop-button');

playButton.addEventListener('click', function(){
  if (audioContext) {
    board.stop(audioContext);
    try {
      mixer.analyser.disconnect(audioContext.destination);
    } catch(e){}
    audioContext.close();
    audioContext = null;
  }
  audioContext = new AudioContext();
  mixer = initializeMixer();
  setTimeout(()=>{
    mixer.analyser.connect(audioContext.destination);
    board.play(audioContext, mixer.filter, mixer.analyser, tuna); // we pass in immediate destination for connection
  }, 50);
});

stopButton.addEventListener('click', function(){
  if (audioContext) {
    board.stop(audioContext);
    try {
      mixer.analyser.disconnect(audioContext.destination);
    } catch(e){}
    audioContext.close();
    audioContext = null;
  }
});

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
