var config = require('./../../general/scripts/config');

exports.putPoint = function(event, _mouseHeld, _boardDom, _context, _color, _radius){
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

exports.distanceBetween = function(point1, point2) {
  return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));
}
exports.angleBetween = function(point1, point2) {
  return Math.atan2( point2.x - point1.x, point2.y - point1.y );
}


exports.visualizeMIDI = function(_context, data){
  _context.clearRect(0, 0, config.BOARD_WIDTH, config.BOARD_HEIGHT);
  for (var colIndex in data){
    let width = config.PXLS_PER_COL;
    let height = config.PXLS_PER_ROW;
    let x = colIndex * config.PXLS_PER_COL;
    for (var rowIndex in data[colIndex]){
      rowIndex = parseInt(rowIndex);
      let y = rowIndex * config.PXLS_PER_ROW;
      // wrap this in if statement if  pxl-hit frequency threshold desired
      // console.log(colIndex, data[colIndex]);
        _context.fillRect(x, y, width, height);
    }
  }
}
