/* jshint esversion: 6 */

import domToImage from 'dom-to-image'

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

let brushImg = null;
let brushImg1 = {};
let lastPoint = null;
let onTarget = false;
let timeElapsed = 0;
let lastStartTime = 0;

// get our DOM elements
let boardBackdrop = document.querySelector('#board-backdrop');
let boardSurface = document.querySelector('#board-surface');
let boardSurfaceCtx = boardSurface.getContext('2d');
let boardWrapper = document.querySelector('#board-wrapper');
let playhead = document.querySelector('#playhead');

exports.mount = function(colorTones, scaleKey){
  const BRUSH_RADIUS = 40;
  activeScaleKey = scaleKey;
  let brushImgSrc = './../../assets/images/brush.png';
  // generate canvases for color
  for (let color in colorTones){
    let newCanvas = document.createElement('canvas');
    newCanvas.width = config.BOARD_WIDTH;
    newCanvas.height = config.BOARD_HEIGHT;
    newCanvas.className += " board";
    newCanvas.id =  'board-' + color;
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

    let brushOriginal = document.createElement('img');
    brushOriginal.src = brushImgSrc;
    brushOriginal.classList = 'brush';
    brushOriginal.style.height = `${BRUSH_RADIUS}px`;
    let hsl = helpers.hexToHsl(color);
    let differences = helpers.getHslDifferences(hsl);
    brushOriginal.style.filter = `hue-rotate(${differences.rotation}deg) saturate(${differences.saturation}%) brightness(${differences.luminosity}%)`;
    boardWrapper.appendChild(brushOriginal)
    setTimeout(()=>{ // what we really want is this as a callback to appendChild
      let brush = domToImage.toPng(brushOriginal)
        .then(function(dataUrl){
          var img = new Image();
          img.src = dataUrl;
          boards[color]['brush'] = img;
        })
    }, 20)
  }

  // dynamically set dimens
  boardBackdrop.width = config.BOARD_WIDTH;
  boardBackdrop.height = config.BOARD_HEIGHT;
  boardSurface.width = config.BOARD_WIDTH;
  boardSurface.height = config.BOARD_HEIGHT;
  boardSurfaceCtx.lineWidth = BRUSH_RADIUS * 2;
  playhead.setAttribute('style', `height: ${config.BOARD_HEIGHT}px;`);

  // init background things
  if (config.gridlines) {
    backdrop.drawGridlines(boardBackdrop.getContext('2d'));
  }

  let newQuadrant = function(point){
    if (!activeBoard.data) return;
    // step 1: get quadrant of point pressed
    let pointCol = Math.floor(point.x / config.PXLS_PER_COL);
    let pointRow = Math.floor(point.y / config.PXLS_PER_ROW);
    let colExists = false;
    if (activeBoard.data[pointCol]) {
      colExists = true;
      if (activeBoard.data[pointCol][pointRow]) {
        return false;
      }
    }
    if (pointCol < 0 || pointRow < 0 || pointCol >= config.COL_COUNT || pointRow >= config.ROW_COUNT) {
      return false;
    }
    // update our boards data
    if (!colExists) {
      activeBoard.data[pointCol] = {};
    }
    let value = true;
    activeBoard.data[pointCol][pointRow] = value; // later if we want number value we will have to reparse
    let pointObj = {[pointCol] : { [pointRow]: value}};
    return pointObj;
  }


  // mouse event activity listeners
  let mouseHeld = false;
  boardSurfaceCtx.lineJoin = boardSurfaceCtx.lineCap = 'round';
  let mousedownFunc = function(event){
    mouseHeld = true;
    lastPoint = { x: event.offsetX, y: event.offsetY };
    if (event.target.classList.value.indexOf('board') > -1) {
      onTarget = true;
    } else {
      onTarget = false;
    }
  }

  let paintPoint = function(x, y){
    activeBoard.context.drawImage(activeBoard.brush, x, y);
    boardSurfaceCtx.drawImage(activeBoard.brush, x, y);
    let newQuad = newQuadrant({x, y});
    if (visualizerInterval && newQuad) {
      activeBoard.synthesizer.mergeInData(parsing.invertCanvasData(newQuad));
      if (config.midify) {
        drawing.visualizeMIDI(activeBoard.context, activeBoard.data);
        activeBoard.DOM.style.opacity = .5;
      }
    }
  }

  let mouseupFunc = function(event){
    mouseHeld = false;
    activeBoard.context.beginPath();
    let thisPoint = { x: event.offsetX, y: event.offsetY };
    if (lastPoint && onTarget) {
      if (thisPoint.x === lastPoint.x && thisPoint.y === lastPoint.y) {
        paintPoint(thisPoint.x, thisPoint.y)
      }
    }
  }

  let mouseMoveProxy = function(event){
    helpers.pauseEvent(event);
    if (!mouseHeld) return;
    if (event.target.classList.value.indexOf('board') > -1 && !onTarget) {
      // if we are coming back on board, make this the new last point
      onTarget = true;
      lastPoint = { x: event.offsetX, y: event.offsetY };
    } else if (event.target.classList.value.indexOf('board') === -1){
      onTarget = false;
      return;
    }
      var thisPoint = { x: event.offsetX, y: event.offsetY };
      var dist = drawing.distanceBetween(lastPoint, thisPoint);
      var angle = drawing.angleBetween(lastPoint, thisPoint);
      let x, y;
      for (var i = 0; i < dist; i++) {
        x = lastPoint.x + (Math.sin(angle) * i) - 25;
        y = lastPoint.y + (Math.cos(angle) * i) - 25;
        paintPoint(x, y);
      }
      lastPoint = thisPoint;
  }
  document.addEventListener('mousemove', mouseMoveProxy);
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
  boardSurfaceCtx.fillStyle = `#${color}`;
  boardSurfaceCtx.strokeStyle = `#${color}`;
  if (config.frequencies) {
    setFreqeuncies();
  }
}

exports.unmount = function(){
  document.removeEventListener('mousemove', putPointProxy);
  document.removeEventListener('mousedown', mousedownFunc);
  document.removeEventListener('mouseup', mouseupFunc);
};

let play = function(audioContext, destination, analyser, tuna){
  lastStartTime = audioContext.currentTime;
  // PLAYHEAD
  let playheadCallback = function(){
    backdrop.animatePlayhead(playhead, timeElapsed || 0);
  }
  let counter = 0;
  for (let color in boards){
    let board = boards[color];
    let parsedData = parsing.getPxlData(board.context);
    let invertedData = parsing.invertCanvasData(parsedData);
    boards[color]['data'] = parsedData;
    if (config.midify) {
      drawing.visualizeMIDI(board.context, parsedData);
      board.DOM.style.opacity = .5;
    }
    let synthesizer = new Synthesizer(audioContext, destination, board.tone, activeScaleKey, tuna);
    boards[color]['synthesizer'] = synthesizer;
    if (counter === 0) {
      synthesizer.playData(invertedData, timeElapsed, playheadCallback);
    } else {
      synthesizer.playData(invertedData, timeElapsed, function(){});
    }
    if (counter === 0) {
      counter++; // for now this is just to trigger the callback uniquely only one time
    }
  }
  // set current visualizerInterval globally
  visualizerInterval = setInterval(()=>{
    visualizer.visualizeAudio(audioContext, analyser);
  }, config.VISUALIZER_FRAME_RATE);
  // set to clear at the end of the run
  let thisInterval = visualizerInterval;
  setTimeout(()=>{
    clearInterval(thisInterval);
    if (thisInterval === visualizerInterval) {
      visualizerInterval = null;
      visualizer.clear();
    }
  }, (config.TOTAL_DURATION) * 1000);
}

exports.play = play;

exports.loop = function(){
  console.log('coming soon!');
}

let clearSounds = function(){
  for (let color in boards){
    let board = boards[color];
    if (board.synthesizer && visualizerInterval) {
      board.synthesizer.stopAllInstruments();
    } else {
      break;
    }
  }
}

exports.pause = function(audioContext){
  if (!visualizerInterval) return;
  timeElapsed += audioContext.currentTime - lastStartTime;
  lastStartTime = 0;
  // pause playhead
  backdrop.pausePlayhead(timeElapsed);
  clearSounds();
}

let stop = function(audioContext){
  timeElapsed = 0;
  lastStartTime = 0;
  backdrop.setPlayhead(playhead);
  clearInterval(visualizerInterval);
  visualizerInterval = null;
  visualizer.clear();
  clearSounds();
}

exports.stop = stop;
