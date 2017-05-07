/* jshint esversion: 6 */

import backdrop from './backdrop';
import drawing from './drawing';
import parsing from './parsing';

import config from './../../general/scripts/config';
import helpers from './../../general/scripts/helpers';
import Synthesizer from './../../general/scripts/models/Synthesizer';
import visualizer from './../visualizer/visualizer-scripts';

let visualizerInterval;
let synthesizers = [];
let board1ctx;

exports.mount = function(){
  const BRUSH_RADIUS = 20;

  // get our DOM elements
  let board1 = document.querySelector('#board1');
  let boardBackdrop = document.querySelector('#board-backdrop');
  let boardWrapper = document.querySelector('#board-wrapper');
  let playhead = document.querySelector('#playhead');

  // dynamically set dimens
  board1.width = config.BOARD_WIDTH;
  board1.height = config.BOARD_HEIGHT;
  boardBackdrop.width = config.BOARD_WIDTH;
  boardBackdrop.height = config.BOARD_HEIGHT;
  playhead.setAttribute('style', `height: ${config.BOARD_HEIGHT}px;`);

  // init board(s)
  board1ctx = board1.getContext('2d');
  board1ctx.lineWidth = BRUSH_RADIUS * 2;
  if (config.gridlines) {
    backdrop.drawGridlines(boardBackdrop.getContext('2d'));
  }
  if (config.frequencies) {
    for (let i = 0; i < config.ROW_COUNT; i++) {
      let newDiv = document.createElement('div');
      let label = helpers.getFrequency(config.ROW_COUNT - 1 - i).toFixed(1).toString() + ' Hz';
      let labelDom = document.createTextNode(label);
      newDiv.style.top = (config.PXLS_PER_ROW * (i + 1) - 10).toString() + 'px';
      newDiv.className += ' frequency-label'
      newDiv.appendChild(labelDom);
      boardWrapper.appendChild(newDiv);
    }
  }

    // mouse event activity listeners
    let mouseHeld = false;
    let activeBoardCtx = board1ctx;
    let putPointProxy = function(event){
      drawing.putPoint(event, mouseHeld, board1, activeBoardCtx, BRUSH_RADIUS);
    }
    let mousedownFunc = function(event){
      mouseHeld = true;
      putPointProxy(event);
    }
    let mouseupFunc = function(event){
      mouseHeld = false;
      activeBoardCtx.beginPath();
    }
    document.addEventListener('mousemove', putPointProxy);
    document.addEventListener('mousedown', mousedownFunc);
    document.addEventListener('mouseup', mouseupFunc);
}

exports.unmount = function(){
  document.removeEventListener('mousemove', putPointProxy);
  document.removeEventListener('mousedown', mousedownFunc);
  document.removeEventListener('mouseup', mouseupFunc);
};

exports.play = function(audioContext, scaleKey, Instrument){
  stop(audioContext);
  let playheadCallback = function(){
    backdrop.animatePlayhead(playhead);
  }
  let parsedData = parsing.getPxlData(board1ctx);
  let invertedData = parsing.invertCanvasData(parsedData);

  if (config.midify) {
    drawing.visualizeMIDI(board1ctx, parsedData);
  }
  let synthesizer = new Synthesizer(audioContext, scaleKey);
  synthesizers.push(synthesizer);
  synthesizer.translateData(invertedData, Instrument, playheadCallback);
  // set current visualizerInterval globally
  visualizerInterval = setInterval(()=>{
    visualizer.visualizeAudio(audioContext, synthesizer.getAnalyser());
  }, config.VISUALIZER_FRAME_RATE);
  // set to clear at the end of the run
  let thisInterval = visualizerInterval;
  setTimeout(()=>{
    clearInterval(thisInterval);
  }, (config.TOTAL_DURATION + (config.TOTAL_DURATION * .1)) * 1000); // a bit extra just in case
}

let stop = function(audioContext){
  clearInterval(visualizerInterval);
  for (var i = 0; i < synthesizers.length; i++) {
    synthesizers[i].stopOscillation(audioContext);
  }
}

exports.stop = stop;
