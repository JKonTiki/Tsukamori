/* jshint esversion: 6 */

import board from './../../components/board/board-scripts';
import config from './../../general/scripts/config';
import Flute from './../../general/scripts/models/Flute';
import visualizer from './../../components/visualizer/visualizer-scripts';

let audioContext = null;

exports.mount = function(){
  try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioContext) {
      audioContext = new AudioContext();
    }
  } catch(e){
    console.warn(e);
  }
  board.mount();
  visualizer.mount();
};

exports.unmount = function(){
  audioContext.close();
  audioContext = null;
  board.unmount();
  visualizer.unmount();
}

let playButton = document.querySelector('#play-button');
  playButton.addEventListener('click', function(){
  board.stop(audioContext);
  board.play(audioContext, config.SCALE_KEY, Flute);
});
