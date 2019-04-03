/*!
 * Marketcloud storefront API
 * Copyright(c) 2004-2017 Mattia Alfieri, Simone Imbrescia, Herapi SRLS
 *
 */

'use strict';


// Loading the ExpressJS application
var app = require('./app.js')

// Loading the configuration file
var configuration = require('./config/default.js')

// The HTTP port to run the server on
var port = configuration.server.port


console.log('Marketcloud Storefront api server starting...');
console.log("Configuration is",configuration)

// Starting the HTTP Server
var server = app.listen(process.env.PORT || port, function () {
  console.log('Detected environment: NODE_ENV=' + process.env.NODE_ENV)
  console.log('Marketcloud api server listening on port ' + server.address().port)
  console.log('Marketcloud api server listening on address ' + server.address().address)
})
