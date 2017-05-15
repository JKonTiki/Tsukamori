/* jshint esversion: 6 */

exports.mount = function(){
};

var visualizer = document.getElementById("visualizer");
var context = visualizer.getContext("2d");

var visualizeAudio = function(audioContext, analyser){

  var bufferLength = analyser.frequencyBinCount;
  var dataArray = new Uint8Array(bufferLength);
  analyser.getByteTimeDomainData(dataArray);

  var draw = function() {
    // let drawVisual = requestAnimationFrame(draw);
    context.fillStyle = '#eee';
    context.fillRect(0, 0, visualizer.width, visualizer.height);
    context.lineWidth = 5;
    context.strokeStyle = '#333';
    context.beginPath();
    var sliceWidth = visualizer.width * 1.0 / bufferLength;
    var x = 0;
    for (var i = 0; i < bufferLength; i++) {
      var v = dataArray[i] / 128.0;
      var y = v * visualizer.height / 2;
      if (i === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }

      x += sliceWidth;
    }
    context.lineTo(visualizer.width, visualizer.height / 2);
    context.stroke();
  };
  draw();
}

exports.clear = function(){
  context.fillStyle = '#eee';
  context.fillRect(0, 0, visualizer.width, visualizer.height);
}

exports.visualizeAudio = visualizeAudio;
