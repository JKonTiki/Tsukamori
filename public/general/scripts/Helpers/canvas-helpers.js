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

exports.getPxlData = function(_context, _boardWidth, _boardHeight, _pxlsPerCol, _pxlsPerRow){
  var data = _context.getImageData(0, 0, _boardWidth, _boardHeight).data;
  // this parser is predicated on ^^ this data structure, which is an array of every pixel going row by row (LtR)
  console.log('PXLS_PER_COL', _pxlsPerCol);
  console.log('PXLS_PER_ROW', _pxlsPerRow);
  var parsedDataByCol = {};
  var currentRow = 0;
  // we start at 3 because we are only checking black color value
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
