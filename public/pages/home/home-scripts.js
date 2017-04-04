/* jshint esversion: 6 */
console.log(__dirname);
var boardInteractive = require('./../../components/board-interactive/board-interactive-scripts')

exports.mount = function(){
  boardInteractive.mount();
};
