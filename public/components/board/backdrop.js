var config = require('./../../general/scripts/config');

let startingPt = -15; // the width of our #playhead div
let destPt = config.BOARD_WIDTH + 2 * Math.abs(startingPt);

var drawGridlines = function(_context){
  for (var i = 0; i < config.ROW_COUNT; i++) {
    _context.fillRect(0, config.PXLS_PER_ROW * i, config.BOARD_WIDTH, 3);
  }
  for (var i = 0; i < config.COL_COUNT; i++) {
    _context.fillRect(config.PXLS_PER_COL * i, 0, 3, config.BOARD_HEIGHT);
  }
}
exports.drawGridlines = drawGridlines;

let setPlayhead = function(playhead, pausePoint){
  playhead.style.transform = `none`;
  playhead.style[`transition-property`] = `none`;
  if (pausePoint) {
    playhead.style.left = `${pausePoint}px`;
  } else {
    playhead.style.left = `${startingPt}px`;
  }
}
exports.setPlayhead = setPlayhead;

exports.animatePlayhead = function(playhead, timeElapsed){
  let progress = timeElapsed / config.TOTAL_DURATION;
  if (progress > 0) {
    playhead.style.transform = `translateX(${destPt * (1 - progress)}px)`;
    playhead.style.transition = `transform ${config.TOTAL_DURATION * (1 - progress)}s linear`;
  } else {
    playhead.style.transform = `translateX(${destPt}px)`;
    playhead.style.transition = `transform ${config.TOTAL_DURATION}s linear`;
  }
}

exports.pausePlayhead = function(timeElapsed){
  let progress = timeElapsed / config.TOTAL_DURATION;
  let pausePoint = startingPt + destPt * progress;
  setPlayhead(playhead, pausePoint);
}
