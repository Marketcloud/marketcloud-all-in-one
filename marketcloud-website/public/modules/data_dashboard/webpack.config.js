var webpack = require('webpack')
var StatsWriterPlugin = require('webpack-stats-plugin').StatsWriterPlugin

module.exports = {
  entry: './public/modules/data_dashboard/main.js',
  output: {
    path: './public/modules/data_dashboard/dist',
    filename: 'app.bundle.js',
    sourceMapFilename: 'app.bundle.map'
  },
  devtool: '#hidden-source-map',
  module: {
    loaders: [{
      path: './public/modules/data_dashboard/src',
      test: /\.js$/,
      exclude: /(node_modules|bower_components)/,
      loader: 'babel-loader',
      query: {
        presets: ['es2015']
      }
    } ]
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      compress: true,
      output: {
        comments: false,
        wrap_iife: true
      },
      mangle: false,
      parallel: {
        cache: true,
        workers: 3 // for e.g
      }
            /* mangle: {
              except: ['angular', '$']
            } */
    }),
    new webpack.optimize.DedupePlugin(),
        // Write out stats file to build directory.
    new StatsWriterPlugin({
      fields: null,
      filename: 'storm-webpack-stats.json' // Default
    })
  ]
}
