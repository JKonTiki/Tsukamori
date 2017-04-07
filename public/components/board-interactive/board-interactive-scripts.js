/* jshint esversion: 6 */

exports.mount = function(){
  var boardWidth = 1500;
  var boardHeight = 1500;
  var colNum = 100;
  var rowNum = 20;
  var pxlsPerCol = boardWidth/colNum;
  var pxlsPerRow = boardWidth/rowNum;

  var board = document.querySelector('#board-interactive');
  board.width = boardWidth;
  board.height = boardHeight;
  var context = board.getContext('2d');
  var radius = 40;
  var mouseHeld = false;

  context.lineWidth = radius * 2;

  var putPoint = function(event){
    if (mouseHeld) {
      if (event.srcElement === board) {
        context.lineTo(event.offsetX, event.offsetY);
        context.stroke();
        context.beginPath();
        context.arc(event.offsetX, event.offsetY, radius, 0, 2 * Math.PI, false);
        context.fill();
        context.beginPath();
        context.moveTo(event.offsetX, event.offsetY);
      } else {
        // if mouse moves off canvas, we want to reset path beginning pts
        context.beginPath();
      }
    }
  }

  document.addEventListener('mousemove', putPoint);

  document.addEventListener('mousedown', function(event){
    mouseHeld = true;
    putPoint(event);
  });

  document.addEventListener('mouseup', function(event){
    mouseHeld = false;
    context.beginPath();
    var parsedData = getPxlData();
    // visualizeMIDI(parsedData);
  });

  var getPxlData = function(){
    var data = context.getImageData(0, 0, boardWidth, boardHeight).data;
    // TODO handle decimal values for pxlsPer...
    console.log('pxlsPerCol', pxlsPerCol);
    console.log('pxlsPerRow', pxlsPerRow);
    var parsedDataByCol = {};
    var cachedRow = 0;
    for (var i = 3; i < data.length; i++) {
      // reset i we've crossed to new row
      var thisRow = Math.floor((i / boardWidth)/pxlsPerRow);
      if (thisRow !== cachedRow) {
        // set to beginning of new row in case we overstep
        i = boardWidth * thisRow * pxlsPerRow + 3;
        cachedRow = thisRow;
      }
      // if non-zero value
      if (data[i] !== 0) {
        var pxlsPassed = Math.floor(i/(boardWidth*4))*boardWidth*4;
        var thisCol = (i - pxlsPassed-3)/(4*pxlsPerCol);
        if (!parsedDataByCol[`col${thisCol}`]) {
          parsedDataByCol[`col${thisCol}`] = {};
        }
        // we add it only once, when it cross threshold of 2
        if (!parsedDataByCol[`col${thisCol}`][thisRow]) {
          parsedDataByCol[`col${thisCol}`][thisRow] = 1;
        } else {
          parsedDataByCol[`col${thisCol}`][thisRow]++;
        }
        // }
      }
      // skip non-black color values and to next column
      i += (4*pxlsPerCol-1);
    }
    return parsedDataByCol;
  }

  var visualizeMIDI = function(data){
    console.log(data);
    context.clearRect(0, 0, boardWidth, boardHeight);
    for (var column in data){
      let colNum = column.slice(3);
      let width = pxlsPerCol;
      let height = pxlsPerRow;
      let x = colNum*pxlsPerCol;
      for (var rowNum in data[column]){
        let y = rowNum*pxlsPerRow;
        context.fillRect(x, y, width, height);
      }
    }
  }

};
