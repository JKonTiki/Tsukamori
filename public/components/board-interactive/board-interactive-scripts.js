/* jshint esversion: 6 */

var Helpers = require('./../../general/scripts/Helpers/canvas-helpers');

exports.mount = function(){
  const BOARD_WIDTH = 2000;
  const BOARD_HEIGHT = 2000;
  const BRUSH_RADIUS = 20;
  const COL_COUNT = 45;
  const ROW_COUNT = 10;
  const PXLS_PER_COL = Math.floor(BOARD_WIDTH / COL_COUNT);
  const PXLS_PER_ROW = Math.floor(BOARD_WIDTH / ROW_COUNT);

  var boardDom = document.querySelector('#board-interactive');
  boardDom.width = BOARD_WIDTH;
  boardDom.height = BOARD_HEIGHT;

  var context = boardDom.getContext('2d');
  context.lineWidth = BRUSH_RADIUS * 2;
  var mouseHeld = false;

  var putPointProxy = function(event){
    Helpers.putPoint(event, mouseHeld, boardDom, context, BRUSH_RADIUS);
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
  var testButton = document.querySelector('#testButton');
  var testButtonFunc = function(){
    var parsedData = Helpers.getPxlData(context, BOARD_WIDTH, BOARD_HEIGHT, PXLS_PER_COL, PXLS_PER_ROW);
    Helpers.visualizeMIDI(parsedData, context, BOARD_WIDTH, BOARD_HEIGHT, PXLS_PER_COL, PXLS_PER_ROW);
  }
  testButton.addEventListener('click', testButtonFunc);

  exports.unmount = function(){
    document.removeEventListener('mousemove', putPointProxy);
    document.removeEventListener('mousedown', mousedownFunc);
    document.removeEventListener('mouseup', mouseupFunc);
    testButton.removeEventListener('click', testButtonFunc);
  }
};
