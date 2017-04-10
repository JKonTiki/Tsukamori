/* jshint esversion: 6 */

var boardInteractive = require('./../../components/board-interactive/board-interactive-scripts')

exports.mount = function(){
  boardInteractive.mount();
};

exports.unmount = function(){
  boardInteractive.unmount();
}
