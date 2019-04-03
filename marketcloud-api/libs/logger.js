
var fs = require('fs')


module.exports = function(mongo) {


// Sanitize a JS object to be safely written into MongoDB
// Removes _id, $ and .
var _sanitize = function(input){
  var output = {}
  for (var k in input){
    var key = k;

    // We don't log eventual _id
    // TODO, detect this so we can remove them
    if (key === "_id")
      continue;

    // MongoDB keys cannot start with "$"
     if (key[0] === "$")
       key = key.replace(/^\$/,"_$")
     
     // MongoDB keys cannot contain "."
     if (key.indexOf(".") > -1)
      key = key
        .replace(/\./g,"_")
    
    if (input[k] instanceof Date)
      output[key] = input[k];    
    else if ("object" === typeof input[k])
      output[key] = _sanitize(input[k]);
    else
      output[key] = input[k];    
  }
  return output;
}

if (process.env.MUTE_LOGGERS === "true")
  return function(){};


var loggers = {
  production : function(log, callback){
     mongo.collection('logs').insert(_sanitize(log),callback)
     
  },
  any : function(log, callback){
    
      if ("object" === typeof log)
        log = JSON.stringify(_sanitize(log) );

      console.log("[LOGGER]" + (new Date()).toString() +" "+  String(log) );
  }
}

  if (loggers.hasOwnProperty(process.env.NODE_ENV) )
    return loggers[process.env.NODE_ENV];
  else
    return loggers.any;
  
}


