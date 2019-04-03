var fs = require('fs');


var exports = {};
var files = fs.readdirSync(__dirname);


files = files
.filter( (filename) => {
  return filename !== 'index.js'
})
.map( (filename) => {
  return filename.split('.')[0];
})
.forEach( (filename) => {
  exports[filename] = require('./'+filename+'.fixtures.js');
})


module.exports = exports;