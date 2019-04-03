/*
jshint asi:true, node:true

*/
/* exported Router,userController */
'use strict'

var express = require('express')
var Router = express.Router()
var Types = require('../models/types.js')
var Errors = require('../models/errors.js')
var Utils = require('../libs/util.js')
var Middlewares = require('../middlewares.js')
var uuid = require('uuid/v4')
var Request = require('superagent')
var crypto = require('crypto')

var userController = {

  sendRecoverPasswordEmail: function (req, res, next) {
    // TODO RATE-LIMIT THIS PER EMAIL

    // sends an email to the matching user with a password reset link
    // this link must be set in the notification

    var emailAddress = req.body.email

    var queue = req.app.get('mail-queue')

    var query = {
      application_id: req.client.application_id,
      email: req.body.email
    }
    req.app.get('mongodb')
      .collection('users')
      .findOne(query, function (err, user) {
        if (err) {
          return next(err)
        }

        if (user === null) {
          return next(new Errors.NotFound('Unable to find user with email address ' + emailAddress))
        }

        var verificationCode = uuid()
        req.app.get('mongodb')
          .collection('users')
          .update(query, {
            '$set': {
              verification_code: verificationCode
            }
          },
          function (err) {
            if (err) {
              return next(err)
            }

            var message = {
              type: 'users.recoverPassword',
              resource_id: user.id,
              application: req.client.application
            }

            queue
              .sendToQueue('marketcloud-mail', message)
              .then(function () {
                console.log('Message (' + message.type + ') enqueued to Mail queue correctly')
                return res.send({
                  status: true
                })
              })
              .catch(function (err) {
                console.log('Message was not enqueued to Mail service', err)
                return next(err)
              })
          }
          )
      })
  },

  resetPassword: function (req, res, next) {
    var verificationCode = req.body.verification_code
    var emailAddress = req.body.email
    var newPassword = String(req.body.new_password)

    if (!req.body.new_password) {
      return next(new Errors.BadRequest("Missing required parameter 'new_password'."))
    }

    if (!req.body.email) {
      return next(new Errors.BadRequest("Missing required parameter 'email'."))
    }

    if (!req.body.verification_code) {
      return next(new Errors.BadRequest("Missing required parameter 'verification_code'."))
    }

    req.app.get('mongodb')
      .collection('users')
      .findOne({
        application_id: req.client.application_id,
        email: emailAddress,
        verification_code: verificationCode
      }, function (err, code) {
        if (err) {
          return next(err)
        }

        if (code === null) {
          return next(new Errors.BadRequest('Invalid or expired verification code.'))
        }

        // If we found the code and it is valid, we set the new password

        var newPasswordHash = crypto.createHash('sha1').update(newPassword).digest('base64')

        var query = {
          application_id: req.client.application_id,
          email: emailAddress
        }
        req.app.get('mongodb')
          .collection('users')
          .update(query, {
            $set: {
              password: newPasswordHash
            },
            $unset: {
              verification_code: true
            }
          }, function (err) {
            if (err) {
              return next(err)
            }

            return res.send({
              status: true
            })
          })
      })
  },

  updatePassword: function (req, res, next) {
    if (!req.body.old_password) {
      return next(new Errors.BadRequest("Missing required parameter 'old_password'."))
    }

    if (!req.body.new_password) {
      return next(new Errors.BadRequest("Missing required parameter 'new_password'."))
    }

    var oldPassword = String(req.body.old_password)
    var newPassword = String(req.body.new_password)

    var userId = Number(req.params.userId)

    var oldPasswordHash = crypto.createHash('sha1').update(oldPassword).digest('base64')

    var mongodb = req.app.get('mongodb')

    var query = {
      application_id: req.client.application_id,
      id: userId,
      password: oldPasswordHash
    }

    mongodb
      .collection('users')
      .findOne(query, function (err, user) {
        if (err) {
          return next(err)
        }

        if (user === null) {
          return next(new Errors.NotFound('Wrong credentials'))
        }

        var newPasswordHash = crypto.createHash('sha1').update(newPassword).digest('base64')

        mongodb.collection('users')
          .update(query, {
            $set: {
              password: newPasswordHash
            }
          }, function (err) {
            if (err) {
              return next(err)
            }

            return res.send({
              status: true,
              data: Utils.subsetInverse(user, ['password', '_id', 'verification_code'])
            })
          })
      })
  },

  loginWithFacebook: function (req, res, next) {
    // TODO add validation

    var facebookUrl = 'https://graph.facebook.com/'
    facebookUrl += req.body.user_id + '?'
    facebookUrl += 'access_token=' + req.body.access_token
    facebookUrl += '&fields=email,name,picture'

    Request('GET', facebookUrl)
      .accept('application/json')
      .end(function (err, response) {
        if (err) {
          return next(err)
        }

        var data = response.body

        if (!data.hasOwnProperty('email')) {
          // We require that the facebook login is configured
          // to provide the email through the token
          var e = new Errors.BadRequest('In order to authenticate a user with Facebook and Marketcloud, you need to require the user\'s email from facebook.')
          return next(e)
        }
        data.registered_with = 'facebook'
        data.created_at = new Date()
        // Ora, se l'utente esiste, me lo loggo tutto, altrimenti, me lo registro tutto
        var mongodb = req.app.get('mongodb')

        mongodb.collection('users')
          .findOne({
            application_id: req.client.application_id,
            email: data.email
          }, function (err, user) {
            if (err) {
              return next(err)
            } else if (user === null) {
              var sequelize = req.app.get('sequelize')
              sequelize
                .query(Utils.Queries.getNewUID, {
                  type: sequelize.QueryTypes.SELECT
                })
                .then(function (id) {
                  id = id[1]['0']['LAST_INSERT_ID()']

                  mongodb.collection('users')
                    .insert(Utils.augment(data, {
                      application_id: req.client.application_id,
                      id: id,
                      image_url: data.picture.data.url
                    }), function (err) {
                      if (err) {
                        return next(err)
                      }

                      // Passo la palla al middleware che crea il token
                      req.user = data
                      next()
                    })
                })
                .catch(Utils.getSequelizeErrorHandler(req, res, next))
            } else {
              req.user = user
              delete req.user.application_id
              delete req.user._id

              // This is then processed by the next middleware
              next()
            }
          })
      })
  },
  list: function (req, res, next) {
    if (req.client.access !== 'admin' && req.client.access !== 'public') {
      // Then its a user

      var userId = Number(req.client.user_id)
      req.app.get('mongodb')
        .collection('users')
        .findOne({
          application_id: Number(req.client.application_id),
          id: userId
        }, function (err, document) {
          if (err) {
            return next(err)
          }

          if (document === null) {
            return next(new Errors.NotFound('Unable to find given user.'))
          }
          delete document['password']
          delete document['_id']
          res.send({
            status: true,
            data: document
          })
        })

      return
    }

    // Parsing the query object to "revive" integers from strings
    // This object contains filtering options as well as pagination etc.

    // This object will be used to build the SEQUELIZE query
    var query = {
      projection: {},
      where: {}
    }

    // If the field array has bad values we send 400
    var fields = []
    if (req.query.hasOwnProperty('fields')) {
      if (typeof req.query.fields !== 'string') {
        return res.status(400).send({
          status: false,
          errors: [new Errors.BadRequest('Invalid "fields" parameter format.')]
        })
      }

      fields = Utils.getFieldsList(String(req.query.fields))
      // Setto gli attributi
      fields.forEach(function (a) {
        query.projection[a] = 1
      })
    } else {
      query.projection = {
        _id: -1,
        application_id: -1
      }
    }

    query.where = Utils.subsetInverse(req.query, Utils.OutputOperatorsList)
    query.where.application_id = req.client.application_id

    // Default skip and limit values
    query.skip = 0
    query.limit = 20

    // per_page query param tells how many result
    if (req.query.hasOwnProperty('per_page')) {
      if (!Utils.isInteger(req.query.per_page)) {
        return res.status(400).send({
          status: false,
          errors: [new Errors.BadRequest('per_page parameter must be an integer number.')]
        })
      }

      query.limit = Number(req.query.per_page)
    }

    // page query param tells which interval of produccts should be showed
    if (req.query.hasOwnProperty('page')) {
      if (!Utils.isInteger(req.query.page)) {
        return res.status(400).send({
          status: false,
          errors: [new Errors.BadRequest('page parameter must be an integer number.')]
        })
      }
      query.skip = (Number(req.query.page) - 1) * query.limit
    }

    query.sort = Utils.getMongoSorting(req)

    // Handling comparison operators
    for (var k in query.where) {
      var attributeName

      if (k.indexOf('_gt') > 0 && k.charAt(0) === '$') {
        attributeName = k.substring(1, k.lastIndexOf('_gt'))

        if (!query.where[attributeName]) { query.where[attributeName] = {} }

        query.where[attributeName]['$gt'] = query.where[k]

        delete query.where[k]
        delete req.query[k]
      }

      if (k.indexOf('_lt') > 0 && k.charAt(0) === '$') {
        attributeName = k.substring(1, k.lastIndexOf('_lt'))

        if (!query.where[attributeName]) {
          query.where[attributeName] = {}
        }

        query.where[attributeName]['$lt'] = query.where[k]

        delete query.where[k]
        delete req.query[k]
      }
    }

    var mongodb = req.app.get('mongodb')

    mongodb.collection('users')
      .find(query.where)
      .count(function (err, count) {
        if (err) {
          return next(err)
        }

        mongodb
          .collection('users')
          .find(query.where)
          .skip(query.skip)
          .limit(query.limit)
          .sort(query.sort)
          .toArray(function (err, data) {
            if (err) {
              return next(err)
            }

            var pagination = Utils.getPagination({
              count: count,
              limit: query.limit,
              skip: query.skip,
              req_query: req.query,
              resource: 'users'
            })

            // Cleaning the response
            data = data.map(function (user) {
              return Utils.subsetInverse(user, ['_id', 'verification_code', 'password'])
            })

            var response = Utils.augment({
              status: true,
              data: data
            }, pagination)

            res.send(response)
          })
      })
  },
  getCart: function (req, res, next) {
    if (req.client.access !== 'user') {
      return res.status(404).send({
        status: false,
        errors: [new Errors.NotFound()]
      })
    }

    var db = req.app.get('mongodb')
    var where = {
      application_id: req.client.application_id,
      user_id: req.client.user_id
    }
    db
      .collection('carts')
      .find(where, {
        _id: 0,
        application_id: 0
      })
      .sort([
        ['_id', -1]
      ])
      .limit(1)
      .toArray(function (err, data) {
        if (err) {
          next(err)
        } else if (data.length === 0) {
          res.status(404).send({
            status: false,
            errors: [new Errors.NotFound('The user has no carts.')]
          })
        } else {
          var cart = data[0]
          var productIds = cart.items.map(function (i) {
            return i.product_id
          })
          req.app.get('mongodb').collection('products').find({
            application_id: req.client.application_id,
            id: {
              $in: productIds
            }
          }, {
            _id: 0,
            application_id: 0
          })
            .toArray(function (err, products) {
              if (err) {
                next(err)
              } else {
                cart.items.forEach(function (i) {
                  products.forEach(function (p) {
                    if (i.product_id === p.id) {
                      p.quantity = i.quantity
                    }
                  })
                })
                cart.items = products
                res.send({
                  status: true,
                  data: cart
                })
              }
            })
        }
      })
  },
  // Return the user owner of the current token
  getCurrent: function (req, res, next) {
    if (req.client.access !== 'user') {
      return res.status(404).send({
        status: false,
        errors: [new Errors.NotFound('The current authorization does not belong to a user.')]
      })
    }

    var query = {
      'id': req.client.user_id,
      'application_id': req.client.application_id
    }

    req.app.get('mongodb')
      .collection('users')
      .findOne(query, {
        _id: 0,
        application_id: 0
      }, function (err, userDocument) {
        if (err) {
          return next(err)
        }

        if (userDocument === null) {
          return res.status(404).send({
            status: false,
            errors: [new Errors.NotFound()]
          })
        }

        res.send({
          status: true,
          data: Utils.subsetInverse(userDocument, ['password', '_id', 'verification_code'])
        })
      })
  },
  getById: function (req, res, next) {
    var query = {}
    var fields = []

    if (req.query.hasOwnProperty('fields')) {
      fields = Utils.getFieldsList(String(req.query.fields))
    }

    query.where = {
      id: Number(req.params.userId),
      application_id: req.client.application_id
    }
    // Checking if the auth level is user
    if (req.client.access === 'user') {
      // Then he can see only his data
      if (req.client.user_id !== Number(req.params.userId)) {
        // This user cannot read other user's data
        return res.status(404).send({
          status: false,
          errors: [new Errors.NotFound()]
        })
      }

      query.where = {
        'id': req.client.user_id,
        'application_id': req.client.application_id
      }
    }

    query.projection = {}

    if (fields.length > 0) {
      fields.forEach(function (f) {
        query.projection[f] = 1
      })
    }

    req.app.get('mongodb')
      .collection('users')
      .findOne(query.where, query.projection, function (err, userDocument) {
        if (err) {
          return next(err)
        }

        if (userDocument === null) {
          return next(new Errors.NotFound())
        }

        userDocument = Utils.subsetInverse(userDocument, ['_id', 'password', 'verification_code'])
        res.send({
          status: true,
          data: userDocument
        })
      })
  },

  create: function (req, res, next) {
    var newUser = req.body

    var validation = Types.User.validate(newUser)

    if (validation.valid === false) {
      var error = new Errors.BadRequest()
      Utils.augment(error, validation)
      res.status(400).send({
        status: false,
        errors: [error]
      })
      return
    }

    newUser.application_id = req.client.application_id
    newUser.created_at = new Date()

    if (newUser.hasOwnProperty('role') && req.client.access !== 'admin') {
      return res.status(401).send({
        status: false,
        errors: [new Errors.Unauthorized('Creating a user with a custom role requires admin authentication.')]
      })
    }

    if (newUser.hasOwnProperty('password')) {
      newUser.password = String(newUser.password)
      newUser.password = crypto.createHash('sha1').update(newUser.password).digest('base64')
    }

    req.app.get('mongodb')
      .collection('users')
      .findOne({
        application_id: req.client.application_id,
        email: req.body.email
      }, function (err, data) {
        if (err) {
          return next(err)
        }
        if (data !== null) {
          var er = new Errors.BadRequest('The email address ' + req.body.email + ' is already taken.')
          er.type = 'EmailAddressExists'
          return next(er)
        }

        var sequelize = req.app.get('sequelize')
        sequelize
          .query(Utils.Queries.getNewUID, {
            type: sequelize.QueryTypes.SELECT
          })
          .then(function (id) {
            newUser.id = id[1]['0']['LAST_INSERT_ID()']

            newUser.registered_with = 'marketcloud'

            req.app.get('mongodb')
              .collection('users')
              .insert(newUser, function (err, result) {
                if (err) {
                  return next(err)
                }
                newUser = Utils.subsetInverse(newUser, ['_id', 'password', 'verification_code'])

                var queue = req.app.get('mail-queue')

                var message = {
                  type: 'users.create',
                  resource_id: newUser.id,
                  application: req.client.application
                }

                queue
                  .sendToQueue('marketcloud-mail', message)
                  .then(function () {
                    return console.log('Message (' + message.type + ') enqueued to Mail queue correctly')
                  }).catch(function (err) {
                    return console.log('Message was not enqueued to Mail service', err)
                  })

                res.send({
                  status: true,
                  data: newUser
                })
              })
          })
          .catch(Utils.getSequelizeErrorHandler(req, res, next))
      })
  },

  // TODO revoca tokens utente quando si deleta l'account
  // Fallo anche quando cambia email?
  delete: function (req, res, next) {
    if (!Utils.stringIsInteger(req.params.userId)) {
      res.send(400, {
        status: false,
        errors: [new Errors.BadRequest('id must be integer')]
      })
      return
    }

    var query = {
      'id': parseInt(req.params.userId, 10),
      'application_id': req.client.application_id
    }

    // Checking if the auth level is user
    if (req.client.access === 'user') {
      // Then he can see only his data
      query['id'] = req.client.user_id
    }

    req.app.get('mongodb').collection('users')
      .remove(query, function (err) {
        if (err) {
          return next(err)
        } else {
          res.send({
            status: true
          })
        }
      })
  },

  update: function (req, res, next) {
    if (!Utils.stringIsInteger(req.params.userId)) {
      res.send(400, {
        status: false,
        errors: [new Errors.BadRequest('id must be integer')]
      })
      return
    }

    if (req.body.hasOwnProperty('role') && req.client.access !== 'admin') {
      return res.status(401).send({
        status: false,
        errors: [new Errors.Unauthorized('Changing a user role requires admin authentication.')]
      })
    }

    for (var k in req.body) {
      var validation = Types.User.validateProperty(k, req.body[k])
      if (validation.valid === false) {
        var error = new Errors.BadRequest()
        Utils.augment(error, validation)
        return next(error)
      }
    }

    var query = {
      id: Number(req.params.userId),
      application_id: req.client.application_id
    }

    // If the auth scope is user
    // Then the user can only apply changes to his/her profile
    // So the query must match this specific user
    if (req.client.access === 'user') {
      query = {
        application_id: req.client.application_id,
        id: Number(req.client.user_id)
      }
    }

    var userUpdate = req.body

    userUpdate.id = Number(req.params.userId)
    userUpdate.application_id = req.client.application_id

    if (req.body.hasOwnProperty('password')) {
      var pwd = String(req.body.password)
      userUpdate.password = crypto.createHash('sha1')
        .update(pwd)
        .digest('base64')
    }

    req.app.get('mongodb')
      .collection('users')
      .findAndModify(
        query, [], {
          '$set': userUpdate
        }, {
          'new': true
        },
        function (err, doc) {
          if (err) {
            return next(err)
          }

          if (doc.value === null) {
            return res.status(404).send({
              status: false,
              errors: [new Errors.NotFound()]
            })
          }

          var data = doc.value

          // Sanitizing document
          delete data['password']
          delete data['_id']

          res.send({
            status: true,
            data: data
          })
        })
  },
  patch: function (req, res, next) {
    if (!Utils.stringIsInteger(req.params.userId)) {
      res.send(400, {
        status: false,
        errors: [new Errors.BadRequest('id must be integer')]
      })
      return
    }

    if (req.body.hasOwnProperty('role') && req.client.access !== 'admin') {
      return res.status(401).send({
        status: false,
        errors: [new Errors.Unauthorized('Changing a user role requires admin authentication.')]
      })
    }

    var query = {
      id: req.params.userId,
      application_id: req.client.application_id
    }

    if (req.client.access === 'user') {
      query = {
        application_id: req.client.application_id,
        id: req.client.user_id
      }
    }

    req.app.get('mongodb').collection('users')
      .update(query, {
        $set: req.body
      }, function (err, data) {
        if (err) {
          return next(err)
        }
        res.send({
          status: true,
          data: data
        })
      })
  },
  createTokenAndReturn: function (req, res, next) {
    var user = req.user
    if (!user) {
      throw new Error('createTokenAndReturn requires a middleware that sets user inside request')
    }

    var redis = req.app.get('redis')
    var token = crypto
      .createHash('sha256') // Meglio createHash o ->createHmac<- ?
      .update(uuid() + String(Date.now()))
      .digest('base64')

    var authenticationData = {
      'access': 'user',
      'application_id': req.client.application_id,
      'email': user.email,
      'role': user.role || 'user',
      'application': JSON.stringify(req.client.application),
      'user_id': Number(user.id)
    }

    var authenticationKey = 'auth_' + req.client.publicKey + ':' + token

    // Writing to reds
    redis.hmset(authenticationKey, authenticationData, function (err) {
      if (err) {
        next(err)
      } else {
        res.status(200).send({
          status: true,
          data: {
            token: token,
            user: user,
            access: 'user',
            role: user.role || 'user'
          }
        })
      }
    })
  },
  authenticate: function (req, res, next) {
    var email = req.body.email
    var password = String(req.body.password)

    if (!req.body.hasOwnProperty('email')) {
      return res.status(400).send({
        status: false,
        errors: [new Errors.BadRequest('Missing required POST parameter email')]
      })
    }

    if (!req.body.hasOwnProperty('password')) {
      return res.status(400).send({
        status: false,
        errors: [new Errors.BadRequest('Missing required POST parameter password')]
      })
    }

    var redis = req.app.get('redis')

    var mongodb = req.app.get('mongodb')
    mongodb.collection('users').findOne({
      application_id: req.client.application_id,
      email: email,
      password: crypto.createHash('sha1')
        .update(password)
        .digest('base64')
    }, {
      _id: 0,
      application_id: 0
    }, function (err, userToAuthenticate) {
      if (err) {
        return next(err)
      }

      if (userToAuthenticate === null) {
        return next(new Errors.NotFound('Email and password don\'t match.'))
      } else {
        var token = crypto
          .createHash('sha256') // Meglio createHash o ->createHmac<- ?
          .update(uuid() + String(Date.now()))
          .digest('base64')

        var authenticationData = {
          'access': 'user',
          'application_id': req.client.application_id,
          'email': email,
          'role': userToAuthenticate.role || 'user',
          'application': JSON.stringify(req.client.application),
          'user_id': Number(userToAuthenticate.id)
        }

        var authenticationKey = 'auth_' + req.client.publicKey + ':' + token

        redis.hmset(authenticationKey, authenticationData, function (err) {
          if (err) {
            return next(err)
          }

          res.status(200).send({
            status: true,
            data: {
              token: token,
              user: Utils.subsetInverse(userToAuthenticate, ['password', 'verification_code']),
              access: 'user',
              role: userToAuthenticate.role || 'user'
            }
          })
        })
      }
    })
  }

}

Router.param('userId', function (req, res, next, id) {
  if (req.params.userId === 'me') {
    if (req.client.access !== 'user') {
      return next(new Errors.BadRequest("The /me reference requires a user-level authorization. Please make this request using an authenticated user's token."))
    }

    req.params.userId = req.client.user_id
  }

  return next()
})

// Mounting the routes
Router.get('/', Middlewares.verifyClientAuthorization('users', 'list'), userController.list)
Router.post('/authenticate/facebook', Middlewares.verifyClientAuthorization('users', 'create'), userController.loginWithFacebook, userController.createTokenAndReturn)
Router.post('/', Middlewares.verifyClientAuthorization('users', 'create'), userController.create)
Router.post('/authenticate', Middlewares.verifyClientAuthorization('users', 'authenticate'), userController.authenticate)
Router.get('/current', Middlewares.verifyClientAuthorization('users', 'getById'), userController.getCurrent)
Router.get('/me', Middlewares.verifyClientAuthorization('users', 'getById'), userController.getCurrent)
Router.get('/cart', Middlewares.verifyClientAuthorization('users', 'getById'), userController.getCart)
Router.get('/:userId', Middlewares.verifyClientAuthorization('users', 'getById'), userController.getById)
Router.delete('/:userId', Middlewares.verifyClientAuthorization('users', 'delete'), userController.delete)
Router.put('/:userId/updatePassword', Middlewares.verifyClientAuthorization('users', 'getById'), userController.updatePassword)
Router.post('/recoverPassword', Middlewares.verifyClientAuthorization('users', 'authenticate'), userController.sendRecoverPasswordEmail)
Router.post('/resetPassword', Middlewares.verifyClientAuthorization('users', 'authenticate'), userController.resetPassword)
Router.put('/:userId', Middlewares.verifyClientAuthorization('users', 'update'), userController.update)
Router.patch('/:userId', Middlewares.verifyClientAuthorization('users', 'update'), userController.patch)

module.exports = Router
