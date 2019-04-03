var winston = require('winston')
var path = require('path');
var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.File)({
      name: 'info-file',
      filename: path.join(__dirname,'..','/logs.log'),
      level: 'info'
    }),
    new (winston.transports.File)({
      name: 'error-file',
      filename: path.join(__dirname,'..','/error-logs.log'),
      level: 'error'
    })
  ]
});

module.exports = logger;