var webpack = require('webpack');

module.exports = {
    entry: "./public/modules/admin_dashboard/main.js",
    output: {
        path: "./public/modules/admin_dashboard/dist",
        filename: "admin.bundle.js"
    },
    module: {
        loaders: [{
             path : './public/modules/admin_dashboard/src',
             test: /\.js$/,
             exclude: /(node_modules|bower_components)/,
             loader: 'babel-loader',
             query: {
                presets: ['es2015']
              }
         },]
    },
    plugins: [
        new webpack.optimize.UglifyJsPlugin({
            compress: {
                warnings: false,
            },
            output: {
                comments: false,
            },
            mangle : false,
            sourceMap:true
        })
    ]
};