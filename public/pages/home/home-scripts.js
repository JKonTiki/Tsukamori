/* jshint esversion: 6 */

var boardInteractive = require('./../../components/board-interactive/board-interactive-scripts')
var audioVisualizer = require('./../../components/audio-visualizer/audio-visualizer-scripts')

exports.mount = function(){
  boardInteractive.mount();
  audioVisualizer.mount();
};

exports.unmount = function(){
  boardInteractive.unmount();
  audioVisualizer.unmount();
}
