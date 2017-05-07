let config = {
  TOTAL_DURATION: 25, // in seconds
  BASE_FREQ: 35,
  SCALE_KEY: 'pentMinor',
  IMPULSE_RESPONSE_FILE: 'Large Wide Echo Hall',
  COL_COUNT: 25,
  ROW_COUNT: 25,
  BOARD_WIDTH: 1800,
  BOARD_HEIGHT: 1800,
  VISUALIZER_FRAME_RATE: 50,
  gridlines: false,
  midify: false,
  frequencies: false,
  scales: {
    aeolian: [0, 2, 3, 5, 7, 8, 10],
    blues: [0, 3, 5, 6, 7, 10],
    fourths: [0, 4, 8],
    ionian: [0, 2, 4, 5, 7, 9, 11],
    gypsyMinor: [0, 2, 3, 6, 7, 8, 11],
    pentatonic: [0, 2, 4, 7, 9],
    pentMinor: [0, 3, 5, 7, 10],
    triadMajI: [0, 5, 7],
    triadMinI: [0, 4, 7],
  },
}

config['PXLS_PER_COL'] = Math.floor(config.BOARD_WIDTH / config.COL_COUNT);
config['PXLS_PER_ROW'] = Math.floor(config.BOARD_WIDTH / config.ROW_COUNT);

module.exports = config;
