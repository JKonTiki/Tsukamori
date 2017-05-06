/* jshint esversion: 6 */

var backdrop = require('./backdrop');
var config = require('./../../general/scripts/config');
var dataParsing = require('./data-parsing');
var helpers = require('./../../general/scripts/helpers');
var synthesis = require('./../../general/scripts/audio-synthesis');
var visualizer = require('./../audio-visualizer/audio-visualizer-scripts');

exports.mount = function(){
  const BOARD_WIDTH = 1500;
  const BOARD_HEIGHT = 1500;
  const BRUSH_RADIUS = 20;
  const COL_COUNT = config.COL_COUNT;
  const ROW_COUNT = config.ROW_COUNT;

  const PXLS_PER_COL = Math.floor(BOARD_WIDTH / COL_COUNT);
  const PXLS_PER_ROW = Math.floor(BOARD_WIDTH / ROW_COUNT);
  // this is the number of pxl rows we checkPt per Row when parsing canvas data
  const PXL_ROWS_TO_COUNT = 4;

  var boardDom = document.querySelector('#board-interactive');
  var boardBackdrop = document.querySelector('#board-backdrop');
  var playhead = document.querySelector('#playhead');

  boardDom.width = BOARD_WIDTH;
  boardDom.height = BOARD_HEIGHT;

  boardBackdrop.width = BOARD_WIDTH;
  boardBackdrop.height = BOARD_HEIGHT;
  playhead.setAttribute('style', `height: ${BOARD_HEIGHT}px;`);

  var context = boardDom.getContext('2d');
  context.lineWidth = BRUSH_RADIUS * 2;
  var mouseHeld = false;

  var putPointProxy = function(event){
    dataParsing.putPoint(event, mouseHeld, boardDom, context, BRUSH_RADIUS);
  }
  document.addEventListener('mousemove', putPointProxy);
  var mousedownFunc = function(event){
    mouseHeld = true;
    putPointProxy(event);
  }
  document.addEventListener('mousedown', mousedownFunc);
  var mouseupFunc = function(event){
    mouseHeld = false;
    context.beginPath();
  }
  document.addEventListener('mouseup', mouseupFunc);



  backdrop.drawGridlines(boardBackdrop.getContext('2d'), BOARD_WIDTH, BOARD_HEIGHT, PXLS_PER_COL, PXLS_PER_ROW, COL_COUNT, ROW_COUNT);
  var boardWrapper = document.querySelector('#board-wrapper');
  for (var i = 0; i < ROW_COUNT; i++) {
    var newDiv = document.createElement('div');
    var label = document.createTextNode(synthesis.getFrequency(ROW_COUNT - 1 - i, ROW_COUNT).toFixed(1).toString() + ' Hz');
    newDiv.style.top = (PXLS_PER_ROW * (i + 1) - 10).toString() + 'px';
    newDiv.className += ' frequency-label'
    newDiv.appendChild(label);
    boardWrapper.appendChild(newDiv);
  }

  var testButton = document.querySelector('#testButton');





  var testButtonFunc = function(){
    var parsedData = dataParsing.getPxlData(context, BOARD_WIDTH, BOARD_HEIGHT, PXLS_PER_COL, PXLS_PER_ROW, PXL_ROWS_TO_COUNT, COL_COUNT);
    dataParsing.visualizeMIDI(parsedData, context, BOARD_WIDTH, BOARD_HEIGHT, PXLS_PER_COL, PXLS_PER_ROW);
    backdrop.animatePlayhead(playhead, BOARD_WIDTH, BOARD_HEIGHT, config.TOTAL_DURATION);

    let invertedData = helpers.invertCanvasData(parsedData, ROW_COUNT);
    synthesis.clearContext();
    synthesis.init(COL_COUNT, ROW_COUNT);
    synthesis.translateData(COL_COUNT, ROW_COUNT, invertedData);
  }
  testButton.addEventListener('click', testButtonFunc);

  exports.unmount = function(){
    document.removeEventListener('mousemove', putPointProxy);
    document.removeEventListener('mousedown', mousedownFunc);
    document.removeEventListener('mouseup', mouseupFunc);
    testButton.removeEventListener('click', testButtonFunc);
  }
};
