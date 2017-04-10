/* jshint esversion: 6 */

const Constants = require('./../../general/scripts/Constants');

const BOARD_WIDTH = 300;
const BOARD_HEIGHT = 300;
const BRUSH_RADIUS = 20;

var roundCount = function(count, type){
  let pxlCapacity;
  if (type === Constants.column) {
    pxlCapacity = BOARD_WIDTH;
  } else if (type === Constants.row) {
    pxlCapacity = BOARD_HEIGHT;
  } else {
    console.error('Something is wrong with your Constants');
  }
  let remainder = pxlCapacity % count;
  if (remainder === 0) {
    return count;
  } else {
    return Math.floor(count-remainder);
  }
}

var putPoint = function(event, _mouseHeld, _boardDom, _context, _radius){
  if (_mouseHeld) {
    if (event.srcElement === _boardDom) {
      _context.lineTo(event.offsetX, event.offsetY);
      _context.stroke();
      _context.beginPath();
      _context.arc(event.offsetX, event.offsetY, _radius, 0, 2 * Math.PI, false);
      _context.fill();
      _context.beginPath();
      _context.moveTo(event.offsetX, event.offsetY);
    } else {
      // if mouse moves off canvas, we want to reset path beginning pts
      _context.beginPath();
    }
  }
}

var getPxlData = function(_context, _boardWidth, _boardHeight, _pxlsPerCol, _pxlsPerRow){
  var data = _context.getImageData(0, 0, _boardWidth, _boardHeight).data;
  // TODO handle decimal values for pxlsPer...
  console.log('PXLS_PER_COL', _pxlsPerCol);
  console.log('PXLS_PER_ROW', _pxlsPerRow);
  var parsedDataByCol = {};
  var currentRow = 0;
  // for now we start at 3 because we are only checking black color value
  for (var i = 3; i < data.length; i++) {
    // there are four values per pixel. this will be range 1-[_boardWidth]
    // First we get our row
    var pxlPositionHorz = (i+1)/4;
    var pxlPositionVert = pxlPositionHorz/_boardWidth;
    var thisRow = Math.floor(pxlPositionVert/_pxlsPerRow);
    if (thisRow !== currentRow) {
      // set to beginning of new row in case we overstep
      // reverse engineering position in imageData array after rounding to row
      i = thisRow * _pxlsPerRow * _boardWidth * 4 + 3;
      currentRow = thisRow;
    }
    // if non-zero value for canvas pixel
    if (data[i] !== 0) {
      // we need the index for beginning of our pxlRow, or pxlPositionVert
      var prevPxlsPassed = Math.floor(pxlPositionVert) * _boardWidth * 4;
      var thisCol = Math.floor((i - prevPxlsPassed - 3)/(4 * _pxlsPerCol));
      if (!parsedDataByCol[`col${thisCol}`]) {
        parsedDataByCol[`col${thisCol}`] = {};
      }
      if (!parsedDataByCol[`col${thisCol}`][currentRow]) {
        parsedDataByCol[`col${thisCol}`][currentRow] = 1;
      } else {
        parsedDataByCol[`col${thisCol}`][currentRow]++;
      }
      // }
    }
    // skip non-black color values and to next column
    i += (4*_pxlsPerCol-1);
  }
  return parsedDataByCol;
}

var visualizeMIDI = function(data, _context, _boardWidth, _boardHeight, _pxlsPerCol, _pxlsPerRow){
  console.log(data);
  _context.clearRect(0, 0, _boardWidth, _boardHeight);
  for (var column in data){
    let colIndex = column.slice(3);
    let width = _pxlsPerCol;
    let height = _pxlsPerRow;
    let x = colIndex * _pxlsPerCol;
    for (var rowIndex in data[column]){
      let y = rowIndex * _pxlsPerRow;
      // if (data[column][rowIndex] >= 25) {
        // console.log(x, y, width, height);
        _context.fillRect(x, y, width, height);
      // }
    }
  }
  // context.fillRect(PXLS_PER_COL*3, 0, PXLS_PER_COL, PXLS_PER_ROW);
}

exports.mount = function(){
  // counts should be manually set, but must pass through this helper function
  const COL_COUNT = roundCount(12.5, Constants.column);
  const ROW_COUNT = roundCount(13, Constants.row);
  const PXLS_PER_COL = BOARD_WIDTH / COL_COUNT;
  const PXLS_PER_ROW = BOARD_WIDTH / ROW_COUNT;

  var boardDom = document.querySelector('#board-interactive');
  boardDom.width = BOARD_WIDTH;
  boardDom.height = BOARD_HEIGHT;

  var context = boardDom.getContext('2d');
  context.lineWidth = BRUSH_RADIUS * 2;
  var mouseHeld = false;

  var putPointProxy = function(event){
    putPoint(event, mouseHeld, boardDom, context, BRUSH_RADIUS);
  }

  document.addEventListener('mousemove', putPointProxy);
  document.addEventListener('mousedown', function(event){
    mouseHeld = true;
    putPointProxy(event);
  });
  document.addEventListener('mouseup', function(event){
    mouseHeld = false;
    context.beginPath();
  });

  var testButton = document.querySelector('#testButton').addEventListener('click', function(){
    var parsedData = getPxlData(context, BOARD_WIDTH, BOARD_HEIGHT, PXLS_PER_COL, PXLS_PER_ROW);
    visualizeMIDI(parsedData, context, BOARD_WIDTH, BOARD_HEIGHT, PXLS_PER_COL, PXLS_PER_ROW);
  });

};
