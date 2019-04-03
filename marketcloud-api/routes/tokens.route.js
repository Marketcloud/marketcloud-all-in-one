var express = require('express')
var router = express.Router()
var uuid = require('uuid/v4')
var crypto = require('crypto')
var Errors = require('../models/errors.js')
var Middlewares = require('../middlewares.js')
var Utils = require('../libs/util.js')

router.post('/', function (req, res, next) {
  var redis = req.app.get('redis')
  var sequelize = req.app.get('sequelize')

  // Verifica che il timestamp sia recente di qualche secondo

  if (!req.body.hasOwnProperty('publicKey')) {
    return next(new Errors.BadRequest('Missing required parameter "publicKey"'))
  }
  if (req.body.hasOwnProperty('secretKey') && !req.body.hasOwnProperty('timestamp')) {
    return next(new Errors.BadRequest('Missing required parameter "timestamp"'))
  }
  if (req.body.hasOwnProperty('timestamp') && isNaN(req.body.timestamp)) {
    return next(new Errors.BadRequest('Invalid timestamp'))
  }

  if (req.body.hasOwnProperty('timestamp')) {
    var currentTime = Date.now()

    // Some OS such as OS X can't easily generate UTC unix timestamps to milliseconds
    // therefore, we support UTC unix timestamps to seconds
    if (String(currentTime).length > String(req.body.timestamp).length) {
      currentTime = currentTime / 1000
    }

    // If the time difference between the current time and the timestamp on the reuest is too high, we reject the request
    if (Math.abs((Number(currentTime) - Number(req.body.timestamp)) / 1000) > 100) {
      return next(new Errors.BadRequest('Expired request. Please make sure you are using the correct timestamp format'))
    }
  }
  // TODO check if token already exists for this publicKey
  sequelize.query(
    "SELECT * FROM applications WHERE public_key = :pub AND status != 'inactive' AND status != 'blocked';", {
      replacements: {
        pub: req.body.publicKey
      },
      type: sequelize.QueryTypes.SELECT
    }
  ).then(function (data) {
    if (data.length === 0) {
      // We didn t find any active and unblocked app with the given credentials
      return next(new Errors.Unauthorized('Wrong credentials'))
    }

    // This object contains app's information
    var applicationData = data[0]

    if (req.body.hasOwnProperty('secretKey') && req.body.hasOwnProperty('timestamp')) {
      var hashedSecret = crypto
        .createHash('sha256') // Meglio createHash o createHmac?
        .update(applicationData.secret_key + req.body.timestamp)
        .digest('base64')
      // console.log("Hased secret è ",hashedSecret);
      // console.log("Tu mi hai mandato  ",req.body.secretKey);

      // If the secret key does not match, return a wrong credentials error
      if (req.body.secretKey !== hashedSecret) { return next(new Errors.Unauthorized('Wrong credentials')) }

      var token = crypto
        .createHash('sha256') // Meglio createHash o ->createHmac<- ?
        .update(uuid() + String(Date.now()))
        .digest('base64')

      redis.hmset('auth_' + req.body.publicKey + ':' + token, {
        'access': 'admin',
        'application_id': applicationData.id,
        'application': JSON.stringify(applicationData)
      }, function (err) {
        if (err) {
          return next(new Errors.InternalServerError())
        } else {
          // Token lasting 4 hours
          var TTL = 4 * 60 * 60 // Redis uses seconds to express TTLs
          var now = Date.now()
          var expirationTimestamp = now + TTL * 1000
          redis.expire('auth_' + req.body.publicKey + ':' + token, TTL, function (err) {
            if (err) {
              return next(err)
            } else {
              return res.send({
                status: true,
                token: token,
                data: {
                  token: token,
                  access: 'admin',
                  expire: expirationTimestamp
                }
              })
            }
          })
        }
      })
    } else if (!req.body.hasOwnProperty('secretKey') && !req.body.hasOwnProperty('timestamp')) {
      // Public key auth doesn't need a token
      return next(new Errors.BadRequest('Wrong credentials'))
    }
  })
    .catch(Utils.getSequelizeErrorHandler(req, res, next))
})

module.exports = router
