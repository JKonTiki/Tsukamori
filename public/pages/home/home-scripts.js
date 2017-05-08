/* jshint esversion: 6 */

import board from './../../components/board/board-scripts';
import config from './../../general/scripts/config';
import Preset from './../../general/scripts/models/Preset';
import Flute from './../../general/scripts/models/Flute';
import visualizer from './../../components/visualizer/visualizer-scripts';

let audioContext = null;
let analyser = null;

let activePreset = null;
let activeColor = null;
let colorDivs = {};

exports.mount = function(){
  try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioContext) {
      audioContext = new AudioContext();
    }
    if (!analyser) {
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.connect(audioContext.destination);
    }
  } catch(e){
    console.warn(e);
  }
  // eventually we want to pull presets from DB, for now we just manual generate here
  let view3 = new Preset('view3', null, {
    '2f5f53': 'majI',
    '5a5542': 'majIV',
    'dfd560': 'majV',
    '122b62': 'minIII',
    '9fb4b3': 'minVI',
  });
  activePreset = view3;
  buildPalette(activePreset.colorChords);
  board.mount(activePreset.colorChords);
  board.setActiveColor(activeColor);
  visualizer.mount();
};

exports.unmount = function(){
  audioContext.close();
  audioContext = null;
  analyser = null;
  board.unmount();
  visualizer.unmount();
}

let playButton = document.querySelector('#play-button');
  playButton.addEventListener('click', function(){
    board.stop(audioContext);
    audioContext.close();
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.connect(audioContext.destination);
    setTimeout(()=>{
      analyser.connect(audioContext.destination);
      board.play(audioContext, analyser, Flute);
    }, 50);
});

let buildPalette = function(colorChords){
  let paletteContainer = document.querySelector('#palette');
  let counter = 0;
  for (let color in colorChords){
    let colorDiv = document.createElement('div');
    colorDiv.className += "color-selector";
    colorDiv.style = `background-color: #${color}`;
    colorDiv.id = color + "-selector"; // remove hashtag from color
    if (config.chordLabels) {
      let labelContainer = document.createElement('div');
      labelContainer.className += " label-container";
      let labelText1 = document.createTextNode(colorChords[color].slice(0, 3) + ' ');
      let labelText2 = document.createTextNode(colorChords[color].slice(3));
      labelContainer.appendChild(labelText1);
      labelContainer.appendChild(labelText2);
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
