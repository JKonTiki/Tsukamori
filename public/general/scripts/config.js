let config = {
  TOTAL_DURATION: 25, // in seconds
  BASE_FREQ: 35,
  COL_COUNT: 30,
  ROW_COUNT: 30,
  BOARD_WIDTH: 2000,
  BOARD_HEIGHT: 1500,
  VISUALIZER_FRAME_RATE: 50,
  gridlines: false,
  midify: false,
  frequencies: false,
  paletteLabels: false,
  scales: {
    aeolian: [0, 2, 3, 5, 7, 8, 10],
    blues: [0, 3, 5, 6, 7, 10],
    fourths: [0, 4, 8],
    ionian: [0, 2, 4, 5, 7, 9, 11],
    gypsyMinor: [0, 2, 3, 6, 7, 8, 11],
    pentatonic: [0, 2, 4, 7, 9],
    pentMinor: [0, 3, 5, 7, 10, 12],
    yo: [0, 2, 5, 7, 9, 12],
    // chords
    majI: [0, 5, 7],
    minII: [2, 5, 9],
    minIII: [4, 7, 11],
    majIV: [5, 9, 12],
    majV: [2, 7, 11],
    minVI: [0, 4, 9],
    minVIIdim: [4, 7, 11],
  },

}

config['PXLS_PER_COL'] = Math.floor(config.BOARD_WIDTH / config.COL_COUNT);
config['PXLS_PER_ROW'] = Math.floor(config.BOARD_HEIGHT / config.ROW_COUNT);

module.exports = config;
