var config = require('./../../general/scripts/config');

var drawGridlines = function(_context){
  for (var i = 0; i < config.ROW_COUNT; i++) {
    _context.fillRect(0, config.PXLS_PER_ROW * i, config.BOARD_WIDTH, 3);
  }
  for (var i = 0; i < config.COL_COUNT; i++) {
    _context.fillRect(config.PXLS_PER_COL * i, 0, 3, config.BOARD_HEIGHT);
  }
}
exports.drawGridlines = drawGridlines;

exports.resetPlayhead = function(playhead){
  playhead.style.transform = `none`;
  playhead.style[`transition-property`] = `none`;
}

exports.animatePlayhead = function(playhead){
  let borderSizeInPx = 30;
  let endPt = config.BOARD_WIDTH;
  // direct new position and transition to get there
  playhead.style.transform = `translateX(${endPt}px)`;
  playhead.style.transition = `transform ${config.TOTAL_DURATION}s linear`;
}
