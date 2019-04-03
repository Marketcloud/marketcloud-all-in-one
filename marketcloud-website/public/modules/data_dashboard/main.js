//require('./src/app.js');

function requireAll(requireContext) {
  return requireContext.keys().map(requireContext);
}


// Require all JS files, including subdirectories
// This will require every controller/factory/service/component
var modules = requireAll(require.context("./src", true, /\.js/));