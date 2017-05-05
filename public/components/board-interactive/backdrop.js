var drawGridlines = function(_context, _boardWidth, _boardHeight, _pxlsPerCol, _pxlsPerRow, _colNum, _rowNum){
  for (var i = 0; i < _rowNum; i++) {
    _context.fillRect(0, _pxlsPerRow * i, _boardWidth, 3);
  }
  for (var i = 0; i < _colNum; i++) {
    _context.fillRect(_pxlsPerCol * i, 0, 3, _boardHeight);
  }
}
exports.drawGridlines = drawGridlines;

exports.animatePlayhead = function(playhead, _boardWidth, _boardHeight, duration){
  let borderSizeInPx = 30;
  let endPt = _boardWidth;
  // reset position
  playhead.style.transform = `none`;
  playhead.style[`transition-property`] = `none`;
  setTimeout(()=>{ // this is improper, resetting and setting seem to be in a weird async race
    // direct new position and transition to get there
    playhead.style.transform = `translateX(${endPt}px)`;
    playhead.style.transition = `transform ${duration}s linear`;
  }, .1)
}
