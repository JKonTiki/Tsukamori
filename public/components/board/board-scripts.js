/* jshint esversion: 6 */

import backdrop from './backdrop';
import drawing from './drawing';
import parsing from './parsing';

import config from './../../general/scripts/config';
import helpers from './../../general/scripts/helpers';
import Synthesizer from './../../general/scripts/models/Synthesizer';
import visualizer from './../visualizer/visualizer-scripts';

let visualizerInterval = null;
let activeBoard = null;
let activeScaleKey = null;
let boards = {};

// get our DOM elements
let boardBackdrop = document.querySelector('#board-backdrop');
let boardWrapper = document.querySelector('#board-wrapper');
let playhead = document.querySelector('#playhead');

exports.mount = function(colorTones, scaleKey){
  const BRUSH_RADIUS = 20;
  activeScaleKey = scaleKey;
  // generate canvases for color
  for (let color in colorTones){
    let newCanvas = document.createElement('canvas');
    newCanvas.width = config.BOARD_WIDTH;
    newCanvas.height = config.BOARD_HEIGHT;
    newCanvas.className += " board";
    newCanvas.id = color + '-board';
    boardWrapper.appendChild(newCanvas);
    let newContext = newCanvas.getContext('2d');
    newContext.lineWidth = BRUSH_RADIUS * 2;
    newContext.fillStyle = `#${color}`;
    newContext.strokeStyle = `#${color}`;
    boards[color] = {};
    boards[color]['color'] = color;
    boards[color]['tone'] = colorTones[color];
    boards[color]['DOM'] = newCanvas;
    boards[color]['context'] = newContext;
  }

  // dynamically set dimens
  boardBackdrop.width = config.BOARD_WIDTH;
  boardBackdrop.height = config.BOARD_HEIGHT;
  playhead.setAttribute('style', `height: ${config.BOARD_HEIGHT}px;`);

  // init background things
  if (config.gridlines) {
    backdrop.drawGridlines(boardBackdrop.getContext('2d'));
  }

    // mouse event activity listeners
    let mouseHeld = false;
    let putPointProxy = function(event){
      drawing.putPoint(event, mouseHeld, activeBoard.DOM, activeBoard.context, activeBoard.color, BRUSH_RADIUS);
    }
    let mousedownFunc = function(event){
      mouseHeld = true;
      putPointProxy(event);
    }
    let mouseupFunc = function(event){
      mouseHeld = false;
      activeBoard.context.beginPath();
    }
    document.addEventListener('mousemove', putPointProxy);
    document.addEventListener('mousedown', mousedownFunc);
    document.addEventListener('mouseup', mouseupFunc);
}

let setFreqeuncies = function(){
  let preFreqs = document.querySelectorAll('.frequency-label');
  for (var i = 0; i < preFreqs.length; i++) {
    boardWrapper.removeChild(preFreqs[i])
  }
  for (let i = 0; i < config.ROW_COUNT; i++) {
    let newDiv = document.createElement('div');
    let label = helpers.getFrequency(config.ROW_COUNT - 1 - i, activeScaleKey).toFixed(1).toString() + ' Hz';
    let labelDom = document.createTextNode(label);
    newDiv.style.top = (config.PXLS_PER_ROW * (i + 1) - 10).toString() + 'px';
    newDiv.className += ' frequency-label'
    newDiv.appendChild(labelDom);
    boardWrapper.appendChild(newDiv);
  }
}

exports.setActiveColor = function(color){
  if (activeBoard) {
    activeBoard.DOM.classList.remove('active-board');
  }
  activeBoard = boards[color];
  activeBoard.DOM.className += ' active-board';
  if (config.frequencies) {
    setFreqeuncies();
  }
}

exports.unmount = function(){
  document.removeEventListener('mousemove', putPointProxy);
  document.removeEventListener('mousedown', mousedownFunc);
  document.removeEventListener('mouseup', mouseupFunc);
};

exports.play = function(audioContext, destination, analyser, tuna){
  for (let color in boards){
    let board = boards[color];
    let parsedData = parsing.getPxlData(board.context);
    let invertedData = parsing.invertCanvasData(parsedData);
    if (config.midify) {
      drawing.visualizeMIDI(board.context, parsedData);
    }
    let synthesizer = new Synthesizer(audioContext, destination, board.tone, activeScaleKey, tuna);
    synthesizer.translateData(invertedData);
    boards[color]['synthesizer'] = synthesizer;
  }
  // PLAYHEAD
  let playheadCallback = function(){
    backdrop.animatePlayhead(playhead);
  }
  playheadCallback();
  // set current visualizerInterval globally
  visualizerInterval = setInterval(()=>{
    visualizer.visualizeAudio(audioContext, analyser);
  }, config.VISUALIZER_FRAME_RATE);
  // set to clear at the end of the run
  let thisInterval = visualizerInterval;
  setTimeout(()=>{
    clearInterval(thisInterval);
  }, (config.TOTAL_DURATION + (config.TOTAL_DURATION * .1)) * 1000); // a bit extra just in case
}

let stop = function(audioContext){
  backdrop.resetPlayhead(playhead);
  clearInterval(visualizerInterval);
}

exports.stop = stop;
