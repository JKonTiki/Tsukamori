exports.putPoint = function(event, _mouseHeld, _boardDom, _context, _radius){
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

exports.getPxlData = function(_context, _boardWidth, _boardHeight, _pxlsPerCol, _pxlsPerRow, _pxlRowsToCount){
  if (_pxlsPerCol === 0 || _pxlsPerRow === 0) {
    console.error('Column and Row counts must be smaller than corresponding board dimens');
    return;
  }
  var data = _context.getImageData(0, 0, _boardWidth, _boardHeight).data;
  // this parser is predicated on ^^ this data structure, which is an array of every pixel going row by row (LtR)
  // for each of our rows, we count _pxlRowsToCount pxl rows along the way as checkpoints
  var rowPxlsToSkip = Math.floor(_pxlsPerRow/_pxlRowsToCount);
  var parsedDataByCol = {};
  var currentRow = 0;
  var currentPxlRow = 0;
  // there are four values per pixel (RGB & Key).
  // we start at 3 because we are only checking key color value
  for (var i = 3; i < data.length; i++) {
    // First we get our row
    // pxlPositionHorz will be range 1-[_boardWidth]
    var pxlPositionHorz = (i+1)/4;
    var pxlPositionVert = Math.floor(pxlPositionHorz/_boardWidth);
    // upon changing pxlRows we jump to next desired PxlRow
    if (currentPxlRow !== pxlPositionVert) {
      currentPxlRow = pxlPositionVert;
      // when we get to the first pxlRow to skip
      if (currentPxlRow % rowPxlsToSkip === 1) {
        // set i to beginning of desired (post pxlRow jump) row
        i += _boardWidth * 4 * 3;
      }
    }
    var thisRow = Math.floor(pxlPositionVert/_pxlsPerRow);
    if (currentRow !== thisRow) {
      // set to beginning of new row in case we overstep
      // reverse engineering position in imageData array after rounding to row
      i = thisRow * _pxlsPerRow * _boardWidth * 4 + 3;
      currentRow = thisRow;
    }
    // if non-zero value for canvas pixel
    if (data[i] !== 0) {
      // we need the index for beginning of our pxlRow, or pxlPositionVert
      var prevPxlsPassed = pxlPositionVert * _boardWidth * 4;
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
    i += (4 * _pxlsPerCol-1);
  }
  return parsedDataByCol;
}

exports.visualizeMIDI = function(data, _context, _boardWidth, _boardHeight, _pxlsPerCol, _pxlsPerRow){
  console.log(data);
  _context.clearRect(0, 0, _boardWidth, _boardHeight);
  for (var column in data){
    let colIndex = column.slice(3);
    let width = _pxlsPerCol;
    let height = _pxlsPerRow;
    let x = colIndex * _pxlsPerCol;
    for (var rowIndex in data[column]){
      let y = rowIndex * _pxlsPerRow;
      // wrap this in if statement if  pxl-hit frequency threshold desired
        _context.fillRect(x, y, width, height);
    }
  }
}
