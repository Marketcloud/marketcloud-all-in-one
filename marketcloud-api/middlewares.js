var Errors = require('./models/errors.js')
var os = require('os')
var Utils = require('./libs/util.js')
var map = require('./libs/access.js')
var mongodb = require('./services/mongodb.service.js')
const uuid = require('uuid/v4')

var Middlewares = {}

Middlewares.setContentType = function setContentType (req, res, next) {
  res.header('Content-Type', 'application/json')
  next()
}

Middlewares.checkAcceptHeader = function checkAcceptHeader (req, res, next) {
  if (typeof req.accepts('application/json') === 'undefined') {
    res.send(406, {
      status: false,
      errors: [new Errors.NotAcceptable()]
    })
  }
  next()
}

Middlewares.allowCrossDomain = function allowCrossDomain (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization, X-sdk-version, X-sdk-variant')

  if (req.method !== 'OPTIONS') {
    next()
  } else {
    res.send()
  }
}

Middlewares.reviveJSONQuery = function reviveJSONQuery (req, res, next) {
  var notToRevive = ['sku']

  // Casting req.query values to boolean or number if possible
  for (var k in req.query) {
    if (notToRevive.indexOf(k) > -1) {
      continue
    }
    // If the query param is a number we cast it to number
    // since isNaN("") is false, we have to add an exceptional check
    if (!isNaN(req.query[k]) && req.query[k] !== '') {
      req.query[k] = Number(req.query[k])
    }

    if (req.query[k] === 'true') {
      req.query[k] = true
    }

    if (req.query[k] === 'false') {
      req.query[k] = false
    }

    if (req.query[k] === 'null') {
      req.query[k] = null
    }
  }
  next()
}

/*
 * DEPRECATED. ONLY USED FOR HTTP QUERY
 *
 */
Middlewares.reviveJSONBody = function reviveJSONBody (req, res, next) {
  if (!req.hasOwnProperty('body')) {
    next()
  }

  /*
   * Takes an object and tries to cast its values from string to number or boolean
   *
   * @param {Object} obj The object to re-type
   * @returns {Object} Returns the input object with revived types
   */
  var reviveJson = function (obj) {
    for (var k in obj) {
      if (!isNaN(obj[k])) {
        obj[k] = Number(obj[k])
      }
      if (obj[k] === 'true') {
        obj[k] = true
      }
      if (obj[k] === 'false') {
        obj[k] = false
      }

      if (typeof obj[k] === 'object') {
        obj[k] = reviveJson(obj[k])
      }
    }
    return obj
  }

  req.body = reviveJson(req.body)
  next()
}

/*
 *   This middleware updates the number of api calls available for the current app
 *
 */
Middlewares.checkAndUpdateQuota = function checkAndUpdateQuota (req, res, next) {
  //  disabling quota check in the open source version
  // This can be removed
  return next()

  var sequelize = req.app.get('sequelize')

  // If the request is generated from the dashboard, we don't bill it.
  if (req.headers.hasOwnProperty('mc-dashboard-request') && req.headers['mc-dashboard-request'] === 'mc-dashboard-request-@rca09719') {
    return next()
  }

  return sequelize.query('SELECT status,api_calls_quota_left FROM applications WHERE id = :applicationId', {
    replacements: {
      applicationId: req.client.application_id
    }
  })
    .then(function (result) {
      var appStatus = result[0][0]['status']
      var appQuota = result[0][0]['api_calls_quota_left']
        // If the status is blocked or inactive, the request is refused
      if (appStatus === 'blocked' || appStatus === 'inactive') {
        res.status(401).send({
          status: false,
          errors: [new Errors.Unauthorized('Application is deleted or inactive')]
        })
      } else {
        // Else we get to the response, but we adjust some stuff
        var qry = 'UPDATE applications SET api_calls_quota_left = api_calls_quota_left - 1 WHERE id = :applicationId;'
        if (appQuota <= 0 && appStatus !== 'exceeded_quota') {
          qry += 'UPDATE applications SET status = \'exceeded_quota\' WHERE id = :applicationId ;'
        }

        return sequelize.query(qry, {
          replacements: {
            applicationId: req.client.application_id
          }
        }).then(function (result) {
          return next()
        })
          .catch(Utils.getSequelizeErrorHandler(req, res, next))
      }
    })
    .catch(Utils.getSequelizeErrorHandler(req, res, next))
}

// We switched to a batched model for updating quotas
// We register the count of requests for each application id
// THen every X minutes we issue a query to update counters
Middlewares.checkAndUpdateQuota = function checkAndUpdateQuota (req, res, next) {
  var callsRegister = req.app.get('requests_register')
  if (callsRegister.hasOwnProperty(req.client.application_id)) { callsRegister[req.client.application_id] += 1 } else { callsRegister[req.client.application_id] = 1 }

  return next()
}

/*
    Tests the format of the authorization header.
    @param {HTTPRequest} request the request object provided by ExpressJS
    @returns {Boolean} True if the header is valid, false otherwise
*/
function validateAuthorizationHeader (request) {
  if (!('authorization' in request.headers)) {
    return false
  }

  return (request.headers['authorization'].length > 0 && request.headers['authorization'].length < 120)
}

/*
 *   Verifies the authorization header and assign the proper access level
 */
Middlewares.verifyToken = function verifyToken (req, res, next) {

  var token = null
  var publicKey = null
  var redisClient = req.app.get('redis')

  // Checking auth header length, in loving memory
  // of a paranoid developer who thought you can just send a 2GB file
  // to this api to crash everything, as if expressjs, the http module and the tcp module
  // didnt validate fields using defaults (80KB is max length for a header in the HTTP module.)
  if (validateAuthorizationHeader(req) === false) {
    return next(new Errors.BadRequest('Invalid authorization header. Please check the documentation at https://www.marketcloud.it/documentation'))
  }

  // Checking if the client is providing an authorization header
  if (!req.headers.hasOwnProperty('authorization')) {
    // If there is no authorization header, then we reject the request as unauthorized
    // Since we dont care about these requests, we termiiinate here the execution
    return res.status(401).send(new Errors.Unauthorized('Missing required header "Authorization"'))
  }

  // Lets see if the Auth header has only a public key or also a token
  // the structure is <public_key>:<token>
  if (req.headers['authorization'].indexOf(':') < 0) {
    publicKey = req.headers['authorization']
  } else {
    publicKey = req.headers['authorization'].split(':')[0]
    token = req.headers['authorization'].split(':')[1]
  }

  var sequelize = req.app.get('sequelize')
  // If the requests does not provide an auth token, we use
  // only the public_key to authenticate and authorize the request.
  if (token === null) {
    sequelize.query('SELECT * FROM applications WHERE public_key = :publicKey;', {
      replacements: {
        publicKey: publicKey
      },
      type: sequelize.QueryTypes.SELECT
    })
      .then(function (rows) {
        if (rows.length === 0) {
          return next(new Errors.Unauthorized('Unauthorized'))
        }

        // If the requests does not provide an auth token
        // but the public key matches, we assign the minimum access level
        // which is "public" level
        req.client = {
          access: 'public',
          publicKey: publicKey,
          application_id: rows[0].id,
          application: rows[0]
        }

        return next()
      })
      .catch(Utils.getSequelizeErrorHandler(req, res, next))
  } else {
    // Devo controllare che ci sia un token
    // Checking if the client provided a valid token
    redisClient.hgetall('auth_' + req.headers['authorization'], function (err, authData) {
      if (err) {
        return next(err)
      }

      // The token is wrong or expired
      if (authData === null) {
        // Bad public Key
        var _err = new Errors.Unauthorized('The provided authorization header (' + req.headers['authorization'] + ') is invalid. The token might be expired or you provided a wrong public key. Read more at https://www.marketcloud.it/documentation/rest-api/authentication')
        _err.type = 'INVALID_TOKEN'
        return next(_err)
      }

      // Client data is injected into the request for further processing
      for (var k in authData) {
        if (!isNaN(authData[k])) {
          authData[k] = Number(authData[k])
        }

        if (authData[k] === 'true') {
          authData[k] = true
        }

        if (authData[k] === 'false') {
          authData[k] = false
        }
      }

      // Storing authorization data in the request object for further processing.
      req.client = authData

      req.client.application = JSON.parse(req.client.application)
        // Checking for booleans and integers

      req.client.publicKey = publicKey
      req.client.token = token

      // important cast to number
      req.client.application_id = Number(req.client.application_id)

      if (req.client.user_id) { req.client.user_id = Number(req.client.user_id) }

      return next()
    })
  }
}

// This middleware ensure that we have an updated context for every request
// Also uses caching to ensure a not so high impact on requests and on mysql load
Middlewares.loadCachedApplicationData = function loadCachedApplicationData (req, res, next) {
  var ApiCache = req.app.get('apicache')

  return ApiCache.get(req.client.application_id, 'application')
  .then(cachedData => {
    // If the cache HAS the application's data we load it and use it
    if (cachedData !== null) {
      cachedData = JSON.parse(cachedData)
      req.client.application = cachedData
      req.applicationDataFoundInCache = true
    } else {
      req.applicationDataFoundInCache = false
    }

    return next()
  })
  .catch(error => {
    // Log the cache error
    return next()
  })
}
Middlewares.loadApplicationData = function loadApplicationData (req, res, next) {
  // If the application data was in cache, we don't need to load it from the DB
  if (req.applicationDataFoundInCache === true) { return next() }

  var sequelize = req.app.get('sequelize')
  var Application = sequelize.import(__dirname + '/models/applications.model.js')

  var ApiCache = req.app.get('apicache')

  Application.findById(req.client.application_id, {
    plain: true
  })
    .then(applicationData => {
      req.client.application = applicationData.toJSON()
      return ApiCache.set(req.client.application_id, 'application', applicationData.toJSON())
    })
    .then(() => {
      return next()
    })
    .catch(Utils.getSequelizeErrorHandler(req, res, next))
}

/*
 *
 *   Verifies that the client has the required authorization to make the
 *   current Request.
 *
 *   Endpoints are mapped through a Access Control Layer map. We check this map to
 *   tell wether the client is authorized or not.
 */
Middlewares.verifyClientAuthorization = function verifyClientAuthorization (resourceName, endpoint) {
  return function (req, res, next) {
    var role = req.client.access

    if (role === 'user' && req.client.hasOwnProperty('role')) {
      role = req.client.role
    }

    if (map.hasOwnProperty(role)) {
      // TODO check existance of this path, otherwise will cause runtime errors
      if (map[role][resourceName][endpoint] === true) {
        return next()
      } else if (map[role][resourceName][endpoint] === '$owner') {
        // Then this role can perform this action only if owning the resource
        // e.g. can't read/update/delete a resource he does not own

        // we can't decide now if the user can perform the action
        req.acl = map[role][resourceName][endpoint]
        return next()
      } else {
        return next(new Errors.Unauthorized('Client is not authorized to perform this action, its role is "' + req.client.access + '" but a higher authorization level is required.'))
      }
    } else {
      // Allora la cerco nel db
      var mongo = req.app.get('mongodb')

      mongo.collection('roles')
        .findOne({
          application_id: req.client.application_id,
          name: role
        }, function (err, roleDefinition) {
          if (err) {
            return next(err)
          } else if (roleDefinition === null) {
            // Non abbiamo trovato il ruolo cercato, il che è un problema
            return res.status(401).send({
              status: false,
              errors: [new Errors.Unauthorized('Role ' + role + ' not found.')]
            })
          } else {
            // We found the role, if the auth is set to true, then we allow the method.
            if (roleDefinition.endpoints[resourceName][endpoint] === true) {
              // Then this role can always perform this action
              return next()
            } else if (roleDefinition.endpoints[resourceName][endpoint] === '$owner') {
              // Then this role can perform this action only if owning the resource
              // e.g. can't read/update/delete a resource he does not own

              // we can't decide now if the user can perform the action
              req.acl = roleDefinition.endpoints[resourceName][endpoint]
              return next()
            } else {
              console.log('Giving 401 because ' + roleDefinition.endpoints[resourceName][endpoint])
              return res.status(401).send({
                status: false,
                errors: [new Errors.Unauthorized('Client is not authorized to perform this action, its role is "' + req.client.access + '" and the role definition does not allow the requested action.')]
              })
            }
          }
        })
    }
  }
}

/*
 *   Checks for duplicate GET parameterss
 */
Middlewares.checkDoubleParameters = function checkDoubleParameters (req, res, next) {
  if (!req.query) { return next() }

  for (var k in req.query) {
    if (req.query[k].constructor === Array) {
      return next(new Errors.BadRequest('Duplicate query parameter ' + k + ' found. Duplicate parameters are not allowed.'))
    }
  }

  return next()
}

/*
 *   Attaches a property 'body' to the response object, for logging
 */
Middlewares.interceptResponseBody = function interceptResponseBody (req, res, next) {
  var oldWrite = res.write
  var oldEnd = res.end

  var chunks = []

  res.write = function (chunk) {
    chunks.push(chunk)

    oldWrite.apply(res, arguments)
  }

  res.end = function (chunk) {
    if (chunk) {
      chunks.push(chunk)
    }

    res.body = Buffer.concat(chunks).toString('utf8')

    oldEnd.apply(res, arguments)
  }

  next()
}

/*
 *   Logs finished requests to MongoDB
 */
Middlewares.logFinishedRequests = function logFinishedRequests (req, res, next) {
  req.fullpath = req.path

  res.on('finish', function () {
    var log = {
      type: 'response',
      source: 'api',
      hostname: os.hostname(),
      time: new Date(),
      duration: res._responseTime,
      request_id: req._request_id,
      request: {
        access: req.client.access,
        method: req.method,
        path: req.fullpath,
        headers: req.headers,
        query: req.query || {},
        body: req.body || {}
      },
      response: {
        status: res.statusCode
      }

    }

    if (req.hasOwnProperty('client')) {
      log.request.application_id = req.client.application_id
      log.request.publicKey = req.client.publicKey

      if (req.client.access === 'user') {
        log.request.user_id = req.client.user_id
        log.request.user_email = req.client.email
      }
    }

    // Not logging anymore, no space left
    // req.app.get('logger')(log)

    // Sending to webhook processor
    // only if it is a create/update/delete
    // and only if it was successful
    //

    var goodForWebhook = function (log) {
      var httpMethodsForWebhooks = ['POST', 'PUT', 'DELETE', 'PATCH']
      return httpMethodsForWebhooks.indexOf(log.request.method) >= 0 && log.response.status < 400
    }

    if (goodForWebhook(log)) {
      log.response.body = res.body
      var queue = req.app.get('webhook-queue')
      var message = {
        type: 'api_request',
        data: log
      }

      return queue.sendToQueue('marketcloud-webhooks', message)
        .then(function () {
          // return console.log("Message enqueued to Webhook queue correctly");
          return true
        }).catch(function (err) {
          return console.log('Message was not enqueued', err)
        })
    }
  })

  next()
}

/*
 *   Logs internal errors to MongoDB (Not HTTP Errors)
 */
Middlewares.logErrors = function logErrors (err, req, res, next) {
  // We want to log only internal errors, not requests with status >= 400
  if (err instanceof Errors.HTTPError) {
    return next(err)
  }

  var log = {
    type: 'error',
    source: 'api',
    time: new Date(),
    error: err,
    duration: res._responseTime,
    request: {
      method: req.method,
      path: req.fullpath,
      headers: req.headers,
      query: req.query || {},
      body: req.body || {}
    },
    response: {
      status: 500
    }

  }

  if (typeof err.code === 'number') {
    log.response.status = err.code
  }

  if (req.hasOwnProperty('client')) {
    log.request.application_id = req.client.application_id
    log.request.token = req.client.token
    log.request.publicKey = req.client.publicKey
  }

  // req.app.get('logger')(log)

  next(err)
}

/*
 *   Adds a response time header and a response time field to the response
 *
 *   Useful for internal logging.
 */
Middlewares.responseTime = function responseTime () {
  return function (req, res, next) {
    var start = new Date()

    if (res._responseTime) return next()
    res._responseTime = true

    res.on('header', function () {
      var duration = new Date() - start
      res.setHeader('X-Response-Time', duration + 'ms')
    })

    next()
  }
}

Middlewares.attachRequestId = function attachRequestId (req, res, next) {
  var id = uuid.v4()
  req.id = id
  res.set('X-Request-Id', id)
  return next()
}

module.exports = Middlewares
