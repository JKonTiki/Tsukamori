var config = require('./../../general/scripts/config');

exports.invertCanvasData = function(data){
  let newData = {};
  for (let colKey in data){
    newData[colKey] = {};
    for (let rowKey in data[colKey]){
      let newRowKey = config.ROW_COUNT - 1 - parseInt(rowKey);
      if (newRowKey >= 0) {
        // more error catching. should be redundant as we check this when parsing
        newData[colKey][newRowKey] = data[colKey][rowKey];
      }
    }
  }
  return newData;
},

exports.getPxlData = function(context){
  var { PXLS_PER_ROW, PXLS_PER_COL, BOARD_WIDTH, BOARD_HEIGHT, ROW_COUNT, COL_COUNT, PXL_ROW_CHKPTS, PXL_COL_CHKPTS } = config;
  if (PXLS_PER_COL === 0 || PXLS_PER_ROW === 0) {
    console.error('Column and Row counts must be smaller than corresponding board dimens');
    return;
  }
  var data = context.getImageData(0, 0, BOARD_WIDTH, BOARD_HEIGHT).data;
  // this parser is predicated on ^^ this data structure, which is an array of every pixel going row by row (LtR)
  // this is the number of pxls we checkpt along each row and col

  var rowPxlsToSkip = Math.floor(PXLS_PER_ROW/PXL_ROW_CHKPTS);
  var colPxlsToSkip = Math.floor(PXLS_PER_COL/PXL_COL_CHKPTS);
  var parsedDataByCol = {};
  var currentRow = 0;
  var currentPxlRow = 0;
  // there are four values per pixel (RGB & Key).
  // we start at 3 because we are only checking key color value
  for (var i = 3; i < data.length; i++) {
    let skippingRows = false;
    // First we get our row
    // pxlPositionHorz will be range 1-[BOARD_WIDTH]
    var pxlPositionHorz = (i+1)/4;
    var pxlPositionVert = Math.floor(pxlPositionHorz/BOARD_WIDTH);
    // upon changing pxlRows we jump to next desired PxlRow
    if (currentPxlRow !== pxlPositionVert) {
      currentPxlRow = pxlPositionVert;
      // when we get to the first pxlRow to skip
      if (currentPxlRow % rowPxlsToSkip === 1) {
        // set i to beginning of desired (post pxlRow jump) row
        skippingRows = true;
      }
    }
    var thisRow = Math.floor(pxlPositionVert/PXLS_PER_ROW);
    if (currentRow !== thisRow) {
      // set to beginning of new row in case we overstep
      // reverse engineering position in imageData array after rounding to row
      i = thisRow * PXLS_PER_ROW * BOARD_WIDTH * 4 + 3;
      currentRow = thisRow;
    }
    // if non-zero value for canvas pixel
    if (data[i] !== 0 && i < data.length) {
      // we need the index for beginning of our pxlRow, or pxlPositionVert
      var prevPxlsPassed = pxlPositionVert * BOARD_WIDTH * 4;
      var thisCol = Math.floor((i - prevPxlsPassed - 3)/(4 * PXLS_PER_COL));
      if ((currentRow < ROW_COUNT && currentRow >= 0) && (thisCol >= 0 && thisCol <= COL_COUNT)) {
        if (!parsedDataByCol[`${thisCol}`]) {
          parsedDataByCol[`${thisCol}`] = {};
        }
        if (!parsedDataByCol[`${thisCol}`][currentRow]) {
          parsedDataByCol[`${thisCol}`][currentRow] = 1;
        } else {
          parsedDataByCol[`${thisCol}`][currentRow]++;
        }
      }
    }
    if (skippingRows) {
      i += (BOARD_WIDTH * 4) * rowPxlsToSkip;
    }
    // skip by fours to stay with non-black color values, and to next column checkpt
    i += (4 * colPxlsToSkip-1);
  }
  // console.log(data.length, testCount, data.length/testCount);
  return parsedDataByCol;
}
