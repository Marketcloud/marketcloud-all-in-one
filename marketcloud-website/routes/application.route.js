'use strict'
/* jshint
    node:true,
    asi:true
*/
var express = require('express')
var router = express.Router()
var fs = require('fs')
var Errors = require('../libs/errors.js')
var superagent = require('superagent')
var Schematic = require('../libs/schematic.js')
var uuid = require('node-uuid')
var crypto = require('crypto')
var qs = require('querystring')
var Utils = require('../libs/util.js')
var Cipher = require('../libs/cipher.js')
const configuration = require('../configuration/default.js')

const ENV = process.env.NODE_ENV

// Production stripe client id
const STRIPE_CLIENT_ID = configuration.stripe.clientId

  // Production stripe secret key
const STRIPE_SECRET_KEY = configuration.stripe.secretKey

// Testing stripe client id
// The idea here is to allow developers to use the stripe integration in testing mode.
// THIS MUST BE 2nd ACCOUNT, DEV MODE STRIPE CONNECT CLIENT ID
const TESTING_STRIPE_CLIENT_ID = configuration.stripe.testingClientId // Marketcloud 2nd acc

// THIS MUST BE 1st ACCOUNT, LIVE MODE STRIPE SECRET KEY
const TESTING_STRIPE_SECRET_KEY = configuration.stripe.testingSecretKey // Marketcloud Testing

// This does not need to load testing keys, this client instance is only used to
// handle Marketcloud subscriptions, not to handle Stripe Connect callbacks.
if ("development" === ENV)
  var stripe = require('stripe')(TESTING_STRIPE_SECRET_KEY)
else
  var stripe = require('stripe')(STRIPE_SECRET_KEY)

var CollaboratorSchema = new Schematic.Schema('Collaborator', {
  email: {
    type: 'string',
    required: true
  },
  role: {
    type: 'string',
    whitelist: ['editor', 'admin']
  },
  application_id: {
    type: 'number',
    required: true
  }
})

var KeySchema = new Schematic.Schema('Key', {
  publicKey: {
    type: 'string',
    required: true
  },
  secretKey: {
    type: 'string',
    required: true
  },
  issued_by: {
    type: 'string',
    required: true
  },
  application_id: {
    type: 'number',
    required: true
  },
  name: {
    type: 'string',
    required: false
  },
  access: {
    type: 'string',
    required: true
  },
  is_master: {
    type: 'number',
    required: false
  }
})

const sendgrid = require('sendgrid')(configuration.sendgrid.key)

const ejs = require('ejs')

function validateEmail(email) {
  var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i
  return re.test(email)
}

/*
  @param config.to {String} The  recipient's address
  @param config.template_path {String} the path to the EJS template
  @param config.context {Object} Object to be used in template compilation
  @param config.callback {Function} Callback
 */
function sendMail(config) {
  fs.readFile(config.template_path, 'utf8', function(err, template) {
    if (err) {
      return config.callbackcallback(err)
    }

    var compiled_template = ejs.render(template, config.context)
    var email_config = {
      to: config.to,
      from: 'info@marketcloud.it',
      fromname: 'Marketcloud',
      subject: config.subject || 'Your Marketcloud Account',
      text: compiled_template,
      html: compiled_template
    }
    sendgrid.send(email_config, config.callback)
  })
}

var newCollaboratorEmail = function(address, application, callback) {
  return sendMail({
    to: address,
    template_path: './views/emails/new_collaborator_email.ejs',
    context: {
      email: address,
      application: application
    },
    subject: 'You joined ' + application.name + ' on Marketcloud!',
    callback: callback
  })
}

var fetchApplicationIntegrations = function(req, res, next) {
  var applicationId = Number(req.params.applicationId)

  var mongodb = req.app.get('mongodb')

  mongodb.collection('applications_integrations')
    .findOne({
      application_id: applicationId
    }, function(err, document) {
      if (err) {
        return next(err)
      }

      if (document !== null) {
        req.integrationsData = document
        return next()
      }

      // If document is null, then we have to create it first.
      var newDocument = {
        application_id: applicationId
      }
      mongodb.collection('applications_integrations')
        .insert(newDocument, function(err) {
          if (err) {
            return next(err)
          }

          req.integrationsData = newDocument
          return next()
        })
    })
}

router.put('/:applicationId/integrations/stripe', fetchApplicationIntegrations, function(req, res, next) {
  var mongo = req.app.get('mongodb')

  if (typeof req.body.isActive !== 'boolean') {
    return res.status(400).send({
      status: false,
      error: new Errors.BadRequest('isActive mut be a boolean value')
    })
  }

  mongo
    .collection('applications_integrations')
    .findOne({
      'application_id': Number(req.params.applicationId)
    }, function(err, document) {
      if (err) {
        return next(err)
      }

      if (document === null) {
        return next(new Errors.NotFound('Unable to find integration metadata for application with id ' + Number(req.params.applicationId)))
      }

      if (!document.hasOwnProperty('stripe')) {
        document.stripe = {}
      }

      for (var k in req.body) {
        document.stripe[k] = req.body[k]
      }

      mongo
        .collection('applications_integrations')
        .update({
            application_id: Number(req.params.applicationId)
          }, {
            $set: {
              stripe: document.stripe
            }
          },
          function(err) {
            if (err) {
              return next(err)
            }

            return res.send({
              status: true,
              data: document
            })
          })
    })
})

// From the dashboard, the user is redirected to this endpoint and then to stripe, then back to the dashboard
router.get('/:applicationId/oauth/stripe/authorize', function(req, res, next) {
  var params = {
    response_type: 'code',
    scope: 'read_write',
    state: Number(req.params.applicationId)
  }

  if (req.query.environment === 'development') {
    params.client_id = TESTING_STRIPE_CLIENT_ID
  } else {
    params.client_id = STRIPE_CLIENT_ID
  }

  res.redirect('https://connect.stripe.com/oauth/authorize?' + qs.stringify(params))
})

router.get('/oauth/stripe/callback', function(req, res, next) {
  var application_id = Number(req.query.state)
  var token = req.query.code

  var stripe_client_secret = STRIPE_SECRET_KEY

  var stripe_client_id = STRIPE_CLIENT_ID

  var payload = {
    grant_type: 'authorization_code',
    client_secret: stripe_client_secret,
    client_id: stripe_client_id,
    state: application_id,
    code: token
  }
  console.log('Sending the payload to stripe.com/oauth/token', payload)
  superagent('POST', 'https://connect.stripe.com/oauth/token')
    .send(payload)
    .end(function(err, response) {
      if (err) {
        console.log('OAUTH ERROR', err.response.body)
        var message = 'An error has occured while getting authorization from your Stripe account'

        if (err.response.body.error_description) {
          message = err.response.body.error_description
        }

        return res.redirect('/applications/' + application_id + '/dashboard/?message=' + message + '#/integrations/stripe')
      }

      var accessToken = response.body.access_token
      var mongo = req.app.get('mongodb')

      mongo.collection('applications_integrations')
        .findOne({
          application_id: application_id
        }, function(err, result) {
          // Se non c'è, devo crearlo
          if (err) {
            return next(err)
          }

          if (result === null) {
            // The Cipher instance
            var cipher = new Cipher()
            mongo.collection('applications_integrations')
              .insert({
                application_id: application_id,
                stripe: {
                  name: 'stripe',
                  secret_key: cipher.encrypt(accessToken),
                  isActive: true,
                  environment: 'production'
                }
              }, function(err, result) {
                if (err) {
                  return next(err)
                } else {
                  // Everything is fine, now we send the user back to the integration page
                  res.redirect('/applications/' + application_id + '/dashboard/#/integrations/stripe')
                }
              })
          } else {
            // The Cipher instance
            var cipher = new Cipher()
            mongo.collection('applications_integrations').update({
              application_id: application_id
            }, {
              $set: {
                stripe: {
                  secret_key: cipher.encrypt(accessToken),
                  isActive: true,
                  environment: 'production'
                }
              }
            }, function(err, result) {
              if (err) {
                return next(err)
              } else {
                // Everything is fine, now we send the user back to the integration page
                res.redirect('/applications/' + application_id + '/dashboard/#/integrations/stripe')
              }
            })
          }
        })
    })
})

router.get('/oauth/stripeDevelopment/callback', function(req, res, next) {
  var application_id = Number(req.query.state)
  var token = req.query.code

  // Our app's client secret
  var stripe_client_secret = TESTING_STRIPE_SECRET_KEY

  var stripe_client_id = TESTING_STRIPE_CLIENT_ID

  var payload = {
    grant_type: 'authorization_code',
    client_secret: stripe_client_secret,
    client_id: stripe_client_id,
    state: application_id,
    code: token
  }
  console.log('Sending the payload to stripe.com/oauth/token', payload)
  superagent('POST', 'https://connect.stripe.com/oauth/token')
    .send(payload)
    .end(function(err, response) {
      if (err) {
        console.log('OAUTH ERROR', err.response.body)
        return res.redirect('/applications/' + application_id + '/dashboard/?message=' + JSON.stringify(err.response.body) + '#/integrations/stripe')
      }

      var accessToken = response.body.access_token
      var mongo = req.app.get('mongodb')

      mongo.collection('applications_integrations')
        .findOne({
          application_id: application_id
        }, function(err, result) {
          // Se non c'è, devo crearlo
          if (err) {
            return next(err)
          }

          if (result === null) {
            // The Cipher instance
            var cipher = new Cipher()
            mongo.collection('applications_integrations')
              .insert({
                application_id: application_id,
                stripe: {
                  name: 'stripe',
                  secret_key: cipher.encrypt(accessToken),
                  isActive: true,
                  environment: 'development'
                }
              }, function(err, result) {
                if (err) {
                  return next(err)
                } else {
                  // Everything is fine, now we send the user back to the integration page
                  res.redirect('/applications/' + application_id + '/dashboard/#/integrations/stripe')
                }
              })
          } else {
            // The Cipher instance
            var cipher = new Cipher()
            mongo.collection('applications_integrations').update({
              application_id: application_id
            }, {
              $set: {
                stripe: {
                  secret_key: cipher.encrypt(accessToken),
                  isActive: true,
                  environment: 'development'
                }
              }
            }, function(err, result) {
              if (err) {
                return next(err)
              } else {
                // Everything is fine, now we send the user back to the integration page
                res.redirect('/applications/' + application_id + '/dashboard/#/integrations/stripe')
              }
            })
          }
        })
    })
})

/*
    Updating credentials
 */
router.put('/:applicationId/integrations/braintree', fetchApplicationIntegrations, function(req, res, next) {
  // TODO add some kind of validation

  var cipher = new Cipher()

  var hasAllCredentials = function(o) {
    return (o.hasOwnProperty('merchantId') &&
      o.hasOwnProperty('publicKey') &&
      o.hasOwnProperty('privateKey'))
  }

  if (!req.body.hasOwnProperty('isActive')) {
    return next(new Errors.BadRequest('Missing required parameter isActive'))
  }

  var update = {
    isActive: req.body.isActive
  }

  // If the update has all the credentials, we also update the credentials
  // otherwise only the is
  if (hasAllCredentials(req.body)) {
    update.merchantId = cipher.encrypt(req.body.merchantId)
    update.publicKey = cipher.encrypt(req.body.publicKey)
    update.privateKey = cipher.encrypt(req.body.privateKey)
  }

  if (req.body.hasOwnProperty('environment')) {
    if (req.body.environment !== 'Sandbox' && req.body.environment !== 'Production') {
      return next(new Errors.BadRequest('Invalid environment name ' + req.body.environment + '. Available environments are Sandbox and Production'))
    }
    update.environment = req.body.environment
  }

  if (req.body.hasOwnProperty('paymentMethodFee')) {
    if ("number" !== typeof req.body.paymentMethodFee)
      return next(new Errors.BadRequest('Parameter "paymentMethodFee" must be a number, got ' + typeof req.body.paymentMethodFee))

    update.paymentMethodFee = req.body.paymentMethodFee;
  }

  var mongo = req.app.get('mongodb')

  mongo
    .collection('applications_integrations')
    .findOne({
      'application_id': Number(req.params.applicationId)
    }, function(err, document) {
      if (err) {
        return next(err)
      }

      if (document === null) {
        return next(new Errors.NotFound('Unable to find integration metadata for application with id ' + Number(req.params.applicationId)))
      }

      if (!document.hasOwnProperty('braintree')) {
        document.braintree = {}
      }

      for (var k in update) {
        document.braintree[k] = update[k]
      }

      mongo
        .collection('applications_integrations')
        .update({
            application_id: Number(req.params.applicationId)
          }, {
            $set: {
              braintree: document.braintree
            }
          },
          function(err) {
            if (err) {
              return next(err)
            }

            return res.send({
              status: true,
              data: document
            })
          })
    })
})

/*
    Get integrations by app (not filtered)
 */
router.get('/:applicationId/integrations', function(req, res, next) {
  var mongo = req.app.get('mongodb')
  var application_id = Number(req.params.applicationId)

  mongo.collection('applications_integrations').findOne({
    application_id: application_id
  }, function(err, result) {
    // Se non c'è, devo crearlo
    if (err) {
      return next(err)
    }

    if (result === null) {
      // Devo fare l'insert
      mongo.collection('applications_integrations').insert({
        application_id: application_id
      }, function(err, data) {
        res.send({
          status: true,
          data: []
        })
      })
    } else {
      var integrations = []
      for (var k in result) {
        if (k !== 'application_id') {
          integrations.push(result[k])
        }
      }

      res.send({
        status: true,
        data: integrations
      })
    }
  })
})

/*
    Get integration by app andd by name
 */
router.get('/:applicationId/integrations/:integrationName', function(req, res, next) {
  var mongo = req.app.get('mongodb')
  var application_id = Number(req.params.applicationId)

  mongo.collection('applications_integrations').findOne({
    application_id: application_id
  }, function(err, result) {
    // Se non c'è, devo crearlo
    if (err) {
      return next(err)
    }

    if (result === null) {
      // Devo fare l'insert

      mongo.collection('applications_integrations').insert({
        application_id: application_id
      }, function(err, data) {
        res.status(404).send({
          status: false,
          errors: [new Errors.NotFound('The application does not have the requested integration')]
        })
      })
    } else {
      var requested_integration = null
      for (var k in result) {
        if (k === req.params.integrationName) {
          requested_integration = result[k]
        }
      }
      if (requested_integration === null) {
        return res.status(404).send({
          status: false,
          errors: [new Errors.NotFound('The application does not have the requested integration')]
        })
      } else {
        res.send({
          status: true,
          data: requested_integration
        })
      }
      // We have found something
    }
  })
})

router.delete('/:applicationId', function(req, res, next) {
  var id = Number(req.params.applicationId),
    mysql = req.app.get('mysql')

  mysql.getConnection(function(err, connection) {
    if (err) {
      console.log(err)
      res.status(500).send({
        status: false,
        errors: [new Errors.InternalServerError()]
      })
      return
    } else {
      connection.query('UPDATE applications SET status = \'inactive\' WHERE id = ? AND owner = ?;', [id, req.session.user.email], function(err, result) {
        connection.release()
        if (err) {
          console.log(err)
          res.status(500).send({
            status: false,
            errors: [new Errors.InternalServerError()]
          })
          return
        } else {
          res.send({
            status: true
          })
        }
      })
    }
  })
})

router.put('/:applicationId/regenerateKeys', function(req, res, next) {
  // TODO throw 400 if applicationId is not an integer number.

  var new_public = uuid.v4(),
    new_secret = crypto.createHash('sha256')
    .update(uuid.v4() + Date.now())
    .digest('base64'),
    applicationId = Number(req.params.applicationId)

  var mysql = req.app.get('mysql')
  mysql.getConnection(function(err, connection) {
    connection.query('UPDATE applications SET public_key = ?, secret_key = ? WHERE id = ? AND owner = ? ; SELECT public_key, secret_key FROM applications WHERE id = ?;', [new_public, new_secret, applicationId, req.session.user.email, applicationId],
      function(err, data) {
        connection.release()
        if (err) {
          next(err)
        } else {
          res.send({
            status: true,
            data: data[1][0]
          })
        }
      })
  })
})

router.get('/:applicationId/activity', function(req, res, next) {
  var application_id = Number(req.params.applicationId)

  var mongodb = req.app.get('mongodb')

  mongodb.collection('logs')
    .find({
      'request.application_id': application_id
    })
    .sort([
      ['_id', -1]
    ])
    .limit(10)
    .toArray(function(err, data) {
      if (err) {
        return next(err)
      }

      data = data.map(x => {
        var source = null

        if (x.request.headers.hasOwnProperty('mc-dashboard-request')) {
          source = 'dashboard'
        } else {
          source = x.request.access
        }

        return {
          method: x.request.method,
          path: x.request.path,
          status: x.response.status,
          time: x.time,
          source: source
        }
      })

      res.send({
        status: true,
        data: data
      })
    })
})

router.get('/:applicationId/dashboard', function(req, res, next) {

  var mysql = req.app.get('mysql')
  var url = `${configuration.marketcloud.apiBaseUrl}/v0/tokens`

  mysql.getConnection(function(err, connection) {
    if (err) {
      return next(err)
    }

    var sql = ''
    
    sql = 'SELECT * FROM applications as app WHERE app.owner = ? AND (app.status = \'active\' OR app.status = \'exceeded_quota\'); SELECT * FROM applications as app JOIN collaborators AS coll ON coll.application_id = app.id WHERE coll.email = ?;'
    
    connection.query(sql, [req.session.user.email, req.session.user.email],
      function(err, data) {
        connection.release()

        var owned_apps = data[0]

        owned_apps.forEach(function(app) {
          app.role = 'owner'
        })
        var collaborating_apps = data[1]

        var all_apps = owned_apps.concat(collaborating_apps)

        var app_data = null,
          applicationId = Number(req.params.applicationId)
          // Looking fot the requested app

        all_apps.forEach(function(app) {
          if (app.id === applicationId) {
            app_data = app
          }
        })

        if (app_data === null) {
          return res.render('404')
            // return next(new Errors.NotFound('No application found with given id'));
        }

        if (!req.session.hasOwnProperty('tokens')) {
          req.session.tokens = {}
        }

        // mIf we don't have a token for the current application
        // We must authenticate to the api and get a token
        console.log('Authenticating to get a new Token')
        var current_time = Date.now();
        var pub = app_data.public_key;
        var sec = app_data.secret_key;


        var hsh = crypto.createHash('sha256')
          .update(sec + current_time)
          .digest('base64')
        superagent
          .post(url)
          .send({
            'publicKey': pub,
            'secretKey': hsh,
            'timestamp': current_time
          })
          .set('Accept', 'application/json')
          .end(function(err, response) {
            if (err) {
              console.log(err)
            } else {
              req.session.tokens[Number(req.params.applicationId)] = response.body.token

              // The 1.x.x branch dashboard name
              //var template_name = "data_dashboard";
              var template_name = "storm";

              // The 2.x.x branch dashboard name
              if (app_data.storm_version[0] === "2")
                template_name = "storm"
              

              res.render('data_dashboard/'+template_name, {
                token: response.body.token,
                public: pub,
                current_application: app_data,
                owned_applications: owned_apps,
                collaborating_applications: collaborating_apps
              })
            }
          })
      })
  })
})

router.get('/:applicationId/preview_dashboard', function(req, res, next) {
  var mysql = req.app.get('mysql')
  var url = `${configuration.marketcloud.apiBaseUrl}/v0/tokens`

  mysql.getConnection(function(err, connection) {
    if (err) {
      return next(err)
    }

    var sql = ''
    if (process.env.SONO_FAT === 'sisonofat') {
      sql = 'SELECT * FROM applications as app;SELECT * FROM applications as app JOIN collaborators AS coll ON coll.application_id = app.id WHERE coll.email = ?;'
    } else {
      sql = 'SELECT * FROM applications as app WHERE app.owner = ? AND (app.status = \'active\' OR app.status = \'exceeded_quota\'); SELECT * FROM applications as app JOIN collaborators AS coll ON coll.application_id = app.id WHERE coll.email = ?;'
    }
    connection.query(sql, [req.session.user.email, req.session.user.email],
      function(err, data) {
        connection.release()

        var owned_apps = data[0]

        owned_apps.forEach(function(app) {
          app.role = 'owner'
        })
        var collaborating_apps = data[1]

        var all_apps = owned_apps.concat(collaborating_apps)

        var app_data = null,
          applicationId = Number(req.params.applicationId)
          // Looking fot the requested app

        all_apps.forEach(function(app) {
          if (app.id === applicationId) {
            app_data = app
          }
        })

        if (app_data === null) {
          return res.render('404')
            // return next(new Errors.NotFound('No application found with given id'));
        }

        if (!req.session.hasOwnProperty('tokens')) {
          req.session.tokens = {}
        }

        // mIf we don't have a token for the current application
        // We must authenticate to the api and get a token
        console.log('Authenticating to get a new Token')
        var current_time = Date.now();
        var pub = app_data.public_key;
        var sec = app_data.secret_key;


        var hsh = crypto.createHash('sha256')
          .update(sec + current_time)
          .digest('base64')
        superagent
          .post(url)
          .send({
            'publicKey': pub,
            'secretKey': hsh,
            'timestamp': current_time
          })
          .set('Accept', 'application/json')
          .end(function(err, response) {
            if (err) {
              console.log(err)
            } else {
              req.session.tokens[Number(req.params.applicationId)] = response.body.token
              res.render('data_dashboard/storm', {
                token: response.body.token,
                public: pub,
                current_application: app_data,
                owned_applications: owned_apps,
                collaborating_applications: collaborating_apps
              })
            }
          })
      })
  })
})

router.delete('/:applicationId/collaborators/:email', function(req, res, next) {
  var applicationId = Number(req.params.applicationId),
    email = req.params.email

  req.app.get('mysql').getConnection(function(err, connection) {
    if (err) {
      console.log(err)
      res.status(500).send({
        status: false,
        errors: [new Errors.InternalServerError()]
      })
      return
    }
    connection.query('DELETE FROM collaborators WHERE email = ? AND application_id =? AND application_id IN (SELECT a.id FROM applications a WHERE a.owner = ?) ;', [email, applicationId, req.session.user.email],
      function(err, result) {
        if (err) {
          console.log(err)

          res.status(500).send({
            status: false,
            errors: [new Errors.InternalServerError()]
          })
          return
        } else {
          // PRobabilmente devo revocargli il token :D
          res.send({
            status: true
          })
        }
      }
    )
  })
})

var fetchApplications = function(req, res, next) {
  var query = req.query
  req.app.get('mysql').getConnection(function(err, connection) {
      // Use the connection
      if (err) {
        connection.release()
        return next(err)
      }
      var query = 'SELECT app.* FROM applications as app JOIN accounts as acc ON app.owner = acc.email WHERE acc.email = ? AND (app.status = \'active\' OR app.status = \'exceeded_quota\');'
      connection.query(query, [req.session.user.email], function(err, rows) {
          // And done with the connection.

          if (err) {
            connection.release()
            return next(err)
          }

          // Ora devo prendere le app di cui l'utente loggato è collaboratore
          var collaboratorsQuery = 'SELECT * FROM applications as app JOIN collaborators as coll ON app.id = coll.application_id WHERE coll.email = ?;'
          connection.query(collaboratorsQuery, [req.session.user.email], function(err, collaboratorsRows) {
            connection.release()

            if (err) {
              return res.send(500, err)
            }

            req.applications = rows
            req.collaborator_applications = collaboratorsRows
            next()
          })

          // Don't use the connection here, it has been returned to the pool.
        }) // .query
    }) // .getCOnnection
}

router.get('/list', function(req, res, next) {
    var query = req.query
    req.app.get('mysql').getConnection(function(err, connection) {
        // Use the connection
        if (err) {
          return next(err)
        }
        var query = 'SELECT app.* FROM applications as app JOIN accounts as acc ON app.owner = acc.email WHERE acc.email = ? AND (app.status = \'active\' OR app.status = \'exceeded_quota\');'
        connection.query(query, [req.session.user.email], function(err, rows) {
            // And done with the connection.

            if (err) {
              return res.send(500, err)
            }

            rows = rows.map( (row) => {
              return Object.assign({}, row, { "role" : "owner"});
            })



            // Ora devo prendere le app di cui l'utente loggato è collaboratore
            var collaboratorsQuery = 'SELECT * FROM applications as app JOIN collaborators as coll ON app.id = coll.application_id WHERE coll.email = ?;'
            connection.query(collaboratorsQuery, [req.session.user.email], function(err, collaboratorsRows) {
                connection.release()

                if (err) {
                  return res.send(500, err)
                }

                res.send({
                  status: true,
                  data: rows.concat(collaboratorsRows)
                })
              })
              // Don't use the connection here, it has been returned to the pool.
          }) // .query
      }) // .getCOnnection
  }) // .get

router.get('/list/:application_id', function(req, res, next) {
    req.app.get('mysql').getConnection(function(err, connection) {
        // Use the connection
        if (err) {
          connection.release()
          return next(err)
        }

        var query = 'SELECT *, app.created_at as app_created_at FROM applications as app LEFT JOIN collaborators as coll ON app.id = coll.application_id WHERE (app.id = ?) AND (app.owner = ? OR coll.email = ?)'

        connection.query(query, [Number(req.params.application_id), req.session.user.email, req.session.user.email], function(err, rows) {
            // And done with the connection.

            if (err) {
              connection.release()
              return res.send(500, err)
            }

            res.send({
                status: true,
                data: rows[0]
              })
              // Don't use the connection here, it has been returned to the pool.
          }) // .query
      }) // .getCOnnection
  }) // .get

router.get('/', function(req, res, next) {
  var query = {

  }
  req.app.get('mysql').getConnection(function(err, connection) {
      // Use the connection
      if (err) {
        return next(err)
      }
      var query = 'SELECT app.* FROM applications as app JOIN accounts as acc ON app.owner = acc.email WHERE acc.email = ? AND (app.status = \'active\' OR app.status = \'exceeded_quota\') ORDER BY id DESC;'
      connection.query(query, [req.session.user.email], function(err, rows) {
          // And done with the connection.

          if (err) {
            connection.release()
            return next(err)
          }


          rows = rows.map( (row) => {
            return Object.assign({}, row, { "role" : "owner"});
          })



          // Ora devo prendere le app di cui l'utente loggato è collaboratore
          var collaboratorsQuery = 'SELECT * FROM applications as app JOIN collaborators as coll ON app.id = coll.application_id WHERE coll.email = ?;'
          connection.query(collaboratorsQuery, [req.session.user.email], function(err, collaboratorsRows) {
            connection.release()

            if (err) {
              return next(err)
            }

            res.render('admin_dashboard/admin_dashboard', {
              pageTitle: 'Account dashboard | List applications',
              applications: rows,
              collaborator_applications: collaboratorsRows
            })
          })

          // Don't use the connection here, it has been returned to the pool.
        }) // .query
    }) // .getCOnnection
})
router.put('/:applicationId/collaborators/:email', function(req, res, next) {
  var update = req.body
  var validation = CollaboratorSchema.validate(update)
  if (validation.valid === false) {
    var error = new Errors.BadRequest()
    Utils.augment(error, validation)
    return res.status(400).send({
      status: false,
      errors: [error]
    })
  }

  req.app.get('mysql')
    .getConnection(function(err, connection) {
      if (err) {
        return next(err)
      }
      connection.query('UPDATE collaborators SET ? WHERE application_id = ? AND email = ?', [update, Number(req.params.applicationId), req.params.email], function(err, result) {
        connection.release()
        if (err) {
          return next(err)
        }

        // connection.query('SELECT * FROM applications WHERE application_id = ?')
        // Ora devo mandare la mail
        else {
          return res.send({
            status: true
          })
        }
      })
    })
})
router.post('/:applicationId/collaborators', function(req, res, next) {
  var collaborator = {
    email: req.body.email,
    application_id: Number(req.params.applicationId),
    role: req.body.role || 'editor'
  }

  var validation = CollaboratorSchema.validate(collaborator)
  if (validation.valid === false) {
    var error = new Errors.BadRequest('The collaborator data is invalid')
    Utils.augment(error, validation)
    res.send(400, {
      status: false,
      errors: [error]
    })
    return
  }

  req.app.get('mysql')
    .getConnection(function(err, connection) {
      if (err) {
        console.log(err)
        res.status(500).send({
          status: false,
          errors: [new Errors.InternalServerError()]
        })
        return
      }

      connection.query('SELECT email FROM accounts WHERE email = ?;', [req.body.email], function(err, result) {
        if (err) {
          console.log(err)
          connection.release()
          return next(err)
        }

        if (result.length === 0) {
          connection.release()
          return res.status(400).send({
            status: false,
            errors: [new Errors.NotFound('Cannot find account with email ' + req.body.email)]
          })
        }

        connection.query('SELECT * FROM applications where id = ?', [Number(req.params.applicationId)], function(err, result) {
          if (err) {
            console.log('SELECT * FROM APP', err)
            connection.release()
            return next(err)
          }
          if (result.length === 0) {
            connection.release()
            return res.status(400).send({
              status: false,
              errors: [new Errors.NotFound('Cannot find account with email ' + req.body.email)]
            })
          }
          var application_data = result[0]

          connection.query(
            'INSERT INTO collaborators SET ?',
            collaborator,
            function(err, result) {
              connection.release()

              if (err) {
                console.log(err)
                return res.status(500).send({
                  status: false,
                  errors: [new Errors.InternalServerError()]
                })
              }

              newCollaboratorEmail(req.body.email, application_data, function() {
                res.status(201).send({
                  status: true,
                  data: collaborator
                })
              })
            })
        })
      })
    })
})

router.post('/:applicationId/roles', function(req, res, next) {
  var new_role = req.body

  new_role.application_id = Number(req.params.applicationId)

  var mongodb = req.app.get('mongodb'),
    mysql = req.app.get('mysql')

  mysql.query('REPLACE INTO id_store (stub) VALUES (\'a\');',
    function(err, result) {
      if (err) {
        return next(err)
      }

      new_role.id = result.insertId

      mongodb.collection('roles')
        .insert(new_role, function(err, result) {
          if (err) {
            return next(err)
          }

          res.send({
            status: true,
            new_role
          })
        })
    })
})

router.get('/:applicationId/roles', function(req, res, next) {
  var query = {}
  query.application_id = Number(req.params.applicationId)

  var mongodb = req.app.get('mongodb')

  mongodb
    .collection('roles')
    .find(query)
    .toArray(function(err, roles) {
      if (err) {
        return next(err)
      }

      res.send({
        status: true,
        data: roles
      })
    })
})

router.get('/:applicationId/roles/:roleId', function(req, res, next) {
  var query = {}
  query.application_id = Number(req.params.applicationId)
  query.id = Number(req.params.roleId)

  var mongodb = req.app.get('mongodb')
  mongodb
    .collection('roles')
    .findOne(query, function(err, role) {
      if (err) {
        return next(err)
      }
      if (role === null) {
        return res.status(404).send({
          status: false,
          errors: [new Errors.NotFound()]
        })
      }

      res.send({
        status: true,
        data: role
      })
    })
})

router.delete('/:applicationId/roles/:roleId', function(req, res, next) {
  var query = {}
  query.application_id = Number(req.params.applicationId)
  query.id = Number(req.params.roleId)

  var mongodb = req.app.get('mongodb')

  mongodb.collection('roles')
  .remove(query, function(err){
    if (err)
      return next(err);

    return res.send({status : true});
  })
})

router.put('/:applicationId/roles/:roleId', function(req, res, next) {
  var role = req.body

  delete role['application_id']
  delete role['_id']
  delete role['id']

  var mongodb = req.app.get('mongodb')
  var query = {
    application_id: Number(req.params.applicationId),
    id: Number(req.params.roleId)
  }

  mongodb
    .collection('roles')
    .update(query, {
      $set: role
    }, function(err) {
      if (err) {
        console.log(err)
        return res.status(500).send({
          status: false,
          errors: [new Errors.InternalServerError()]
        })
      }
      res.send({
        status: true
      })
    })
})

router.get('/:applicationId/collaborators', function(req, res, next) {
  var application_id = Number(req.params.applicationId)
  req.app.get('mysql').getConnection(function(err, connection) {
    connection.query('SELECT * FROM collaborators WHERE application_id = ?;', [application_id], function(err, result) {
      connection.release()
      if (err) {
        console.log(err)
        res.status(500).send({
          status: false,
          errors: [new Errors.InternalServerError()]
        })
        return
      } else {
        console.log(err)
        res.send({
          status: true,
          data: result
        })
      }
    })
  })
})

router.get('/:applicationId/webhooks', function(req, res, next) {
  var mongodb = req.app.get('mongodb')

  var query = {
    application_id: Number(req.params.applicationId)
  }
  mongodb.collection('webhooks')
    .find(query)
    .toArray(function(err, result) {
      if (err) {
        return next(err)
      }
      result = result.map(x => Utils.filterObject(x, ['_id', 'application_id']))
      res.send({
        status: true,
        data: result
      })
    })
})

router.post('/:applicationId/webhooks', function(req, res, next) {
  var Params = new Schematic.Schema('ApplicationSettingsParams', {
    'event': {
      type: 'string',
      required: true
    },
    'method': {
      type: 'string',
      required: true
    },
    'url': {
      type: 'string',
      required: true
    }

  })
  var validation = Params.validate(req.body)
  if (validation.valid === false) {
    var error = new Errors.BadRequest()
    Utils.augment(error, validation)
    res.send(400, {
      status: false,
      errors: [error]
    })
    return
  }

  var new_webhook = req.body

  new_webhook.application_id = Number(req.params.applicationId)

  new_webhook.created_at = (new Date()).getTime()

  var mongodb = req.app.get('mongodb')
  var mysql = req.app.get('mysql')
    // getting the id
  mysql.query('REPLACE INTO id_store (stub) VALUES (\'a\');',
    function(err, result) {
      if (err) {
        return next(err)
      }

      new_webhook.id = result.insertId

      mongodb.collection('webhooks')
        .insert(new_webhook, function(err, result) {
          if (err) {
            return next(err)
          }

          res.send({
            status: true,
            new_webhook
          })
        })
    })
})

router.put('/:applicationId/webhooks/:id', function(req, res, next) {
  var Params = new Schematic.Schema('ApplicationSettingsParams', {
    'event': {
      type: 'string',
      required: true
    },
    'method': {
      type: 'string',
      required: true
    },
    'url': {
      type: 'string',
      required: true
    }

  })
  var validation = Params.validate(req.body)
  if (validation.valid === false) {
    var error = new Errors.BadRequest()
    Utils.augment(error, validation)
    res.send(400, {
      status: false,
      errors: [error]
    })
    return
  }

  var update = req.body
  var query = {
    application_id: Number(req.params.applicationId),
    id: Number(req.params.id)
  }

  update.updated_at = (new Date()).getTime()

  var mongodb = req.app.get('mongodb')

  mongodb.collection('webhooks')
    .update(query, {
      $set: update
    }, function(err, result) {
      if (err) {
        return next(err)
      }

      res.send({
        status: true
      })
    })
})

router.delete('/:applicationId/webhooks/:id', function(req, res, next) {
  var query = {
    application_id: Number(req.params.applicationId),
    id: Number(req.params.id)
  }

  var mongodb = req.app.get('mongodb')

  mongodb.collection('webhooks')
    .findAndRemove(query, function(err) {
      if (err) {
        return next(err)
      }

      res.send({
        status: true
      })
    })
})

router.put('/:applicationId', function(req, res, next) {
  var Params = new Schematic.Schema('CreateApplicationParams', {
    'name': {
      type: 'string',
      required: false
    },
    'url': {
      type: 'string',
      required: false
    },
    'currency_code': {
      type: 'string',
      required: false
    },
    'timezone': {
      type: 'string',
      required: false
    },
    'tax_type': {
      type: 'string',
      whitelist: ['nothing', 'all', 'products_only', 'shipping_only'],
      required: false
    },
    'apply_discounts_before_taxes': {
      type: 'boolean',
      required: false
    },
    'tax_rate': {
      type: 'number',
      required: false
    },
    'email_address': {
      type: 'string',
      required: false
    },
    'locales': {
      type: 'string',
      max: 500
    },
    'currencies': {
      type: 'string'
    },
    company_name: {
      type: 'string',
      max: 254
    },
    company_taxid: {
      type: 'string',
      max: 254
    },
    company_country: {
      type: 'string',
      max: 254
    },
    company_state: {
      type: 'string',
      max: 254
    },
    company_city: {
      type: 'string',
      max: 254
    },
    company_address: {
      type: 'string',
      max: 254
    },
    company_postalcode: {
      type: 'string',
      max: 254
    }
  })
  var mysql = req.app.get('mysql')

  var validation = Params.validate(req.body)
  if (validation.valid === false) {
    var error = new Errors.BadRequest()
    Utils.augment(error, validation)
    res.send(400, {
      status: false,
      errors: [error]
    })
    return
  }

  mysql.getConnection(function(err, connection) {
    if (err) {
      next(err)
      return
    } else {
      var applicationId = Number(req.params.applicationId),
        app_update = req.body

      delete app_update['id']

      connection.query('UPDATE applications SET ? WHERE id = ?', [app_update, applicationId],
        function(err, result) {
          if (err) {
            if (err.code.indexOf('_REFERENCED') > -1) {
              res.send(400, {
                status: false,
                errors: [new Errors.BadRequest('Ensure that the provided owner email exists')]
              })
            } else {
              next(err)
            }
            return
          } else {
            connection.release()
            res.send({
              status: true,
              data: app_update
            })
          }
        })
    }
  })
})

router.post('/', function(req, res, next) {
  // Creates an application
  var Params = new Schematic.Schema('CreateApplicationParams', {
    'name': {
      type: 'string',
      required: true
    },
    'url': {
      type: 'string',
      required: false
    },
    'ecommerce_category': {
      type: 'string',
      required: false
    },
    'reason': {
      type: 'string',
      required: false
    }
  })
  var mysql = req.app.get('mysql')
  var validation = Params.validate(req.body)
  if (validation.valid === false) {
    var error = new Errors.BadRequest()
    Utils.augment(error, validation)
    console.log(error, req.body)
    res.send(400, {
      status: false,
      errors: [error]
    })
    return
  }

  // Salvoo su mongodb per prepararmi alla transizione

  mysql.getConnection(function(err, connection) {
    if (err) {
      return next(err)
    }

    // getting the id
    connection.query('REPLACE INTO id_store (stub) VALUES (\'a\');',
      function(err, result) {
        if (err) {
          connection.release()
          return next(err)
        }

        var renew = new Date()
        renew.setMonth(renew.getMonth() + 1)

        var plans = {
          'free': {
            api_calls_quota_left: 5000,
            api_calls_quota_max: 5000
          },
          'startup': {
            api_calls_quota_left: 50000,
            api_calls_quota_max: 50000
          },
          'cumulus': {
            api_calls_quota_left: 100000,
            api_calls_quota_max: 100000
          },
          'stratus': {
            api_calls_quota_left: 450000,
            api_calls_quota_max: 450000
          },
          'nimbo_stratus': {
            api_calls_quota_left: 1500000,
            api_calls_quota_max: 1500000
          },
          'cirro_stratus': {
            api_calls_quota_left: 3500000,
            api_calls_quota_max: 3500000
          }
        }

        var selected_plan_name = req.body.selected_plan_name || 'free'
          // TODO check for payment informations

        // Returns a 44 chars long string
        // We alo strip some unsafe base64 encoding stuff
        // to make the secret key URL safe
        function generateSecretKey() {
          return crypto
            .createHash('sha256')
            .update(uuid.v4())
            .digest('base64')
            .replace(/\//g, '-')
            .replace(/\+/g, '-')
            .replace(/\=/g, '-')
        }

        var app = {
          id: result.insertId,
          name: req.body.name,
          owner: req.session.user.email,

          api_calls_quota_left: 5000,
          api_calls_quota_max: 5000,
          renew_date: renew,

          public_key: uuid.v4(),
          secret_key: generateSecretKey()
        }

        // Rates data
        var today = new Date()
        var next_month = new Date()
        next_month.setDate(today.getDate() + 30)

        var rates_data = {
          limit: 5000,
          remaining: 5000,
          reset: next_month.getTime()
        }

        connection.query('INSERT INTO applications SET ?',
          app,
          function(err, result) {
            connection.release()

            if (err) {
              if (err.code.indexOf('_REFERENCED') > -1) {
                res.send(400, {
                  status: false,
                  errors: [new Errors.BadRequest('Invalid owner email ' + app.owner)]
                })
              } else {
                next(err)
              }
              return
            } else {
              req.app.get('mongodb')
                .collection('applications_integrations')
                .insert({
                  application_id: app.id
                }, function(err) {
                  if (err) {
                    return next(err)
                  }
                  res.send({
                    status: true,
                    data: app
                  })
                })
            }
          })
      })
  })
})

const BILLING_PLANS = {
  'free': {
    name: 'free',
    id: 'free',
    price_monthly: 0,
    price_yearly: 0,
    api_calls_quota_max: '5000',
    storage: 0.5
  },
  'startup_plan_10_monthly': {
    name: 'startup',
    id: 'startup_plan_10_monthly',
    price_monthly: 10,
    price_yearly: 120,
    api_calls_quota_max: '50000',
    storage: 1
  },
  'month-19': {
    name: 'cumulus',
    id: 'month-19',
    price_monthly: 19,
    price_yearly: 190,
    api_calls_quota_max: '100000',
    storage: 1
  },
  'month-49': {
    name: 'stratus',
    id: 'month-49',
    price_monthly: 49,
    price_yearly: 490,
    api_calls_quota_max: '450000',
    storage: 2
  },
  'month-99': {
    name: 'nimbo stratus',
    id: 'month-99',
    price_monthly: 99,
    price_yearly: 990,
    api_calls_quota_max: '1500000',
    storage: 5
  }
}

const canUseStartupPlans = [
  'cikkense@gmail.com',
  'infoo@stranomaverde.it'
]

function GigaBytesToKiloBytes(gb) {
  if (typeof gb !== 'number') {
    throw new Error('GigaBytesToKiloBytes(p) expects p to be a number')
  }

  return (gb * 1024) * 1024
}

/*
applications.stripe_subscription_id
account.stripe_customer_id
*/
/* Updates the billing for application with given id */
router.put('/:applicationId/billing', function(req, res, next) {
  var mysql = req.app.get('mysql')
  var applicationId = Number(req.params.applicationId)

  if (!BILLING_PLANS.hasOwnProperty(req.body.plan_id)) {
    return res.status(400).send({
      status: false,
      errors: [new Errors.BadRequest('Subscription plan with id ' + req.body.plan_id + ' does not exist.')]
    })
  }

  if (req.body.plan_id.indexOf('startup') > -1) {
    // We have to check if the user is eligible for startup plan

    if (canUseStartupPlans.indexOf(req.session.user.email) === -1) {
      return res.status(401).send({
        status : false,
        errors : [new Errors.BadRequest('Not eligible for plan '+req.body.plan_id)]
      })
    }
  }

  var selected_plan = BILLING_PLANS[req.body.plan_id]

  mysql.getConnection((err, connection) => {
    if (err) {
      return next(err)
    }

    connection.query('SELECT * FROM applications where id = ? ', [applicationId], (err, rows) => {

      if (err) {
        return next(err)
      }


      if (!rows || rows.length === 0) {
        connection.release()
        return res.status(400).send({
          status: false,
          errors: [new Errors.NotFound('Unable to find application with given id ' + applicationId)]
        })
      }

      // The application's data
      var app_data = rows[0]

      if (app_data.plan_name === selected_plan.plan_name) {
        // This app already has this plan.
        // No need to update
        connection.release()
        return res.status(400).send({
          status: false,
          errors: [new Errors.BadRequest('The application already have this subscription plan, no need to do an update')]
        })
      }

      // If the app already has a stripe sub id
      // then we don't have to create a new subscription but just update it or delete it
      // (delete in case we downgraded to free.)
      if (app_data.stripe_subscription_id) {
        // This application already has a subscription_id so we don't need to create a new subscription but rather update the old onw

        if (selected_plan.id === 'free') {
          // Then we have to delete the subscription
          stripe.subscriptions.del(app_data.stripe_subscription_id, {
              at_period_end: true
            },
            function(err, confirmation) {
              if (err) {
                connection.release()
                return next(err)
              }
              var qry = 'UPDATE applications \
                            SET plan_name = ?, \
                            storage_max = ?,\
                            storage_left = ?,\
                            api_calls_quota_max = ?,\
                            api_calls_quota_left = ? \
                            WHERE id = ?;'
              connection.query(qry, [
                  selected_plan.name,
                  GigaBytesToKiloBytes(selected_plan.storage),
                  GigaBytesToKiloBytes(selected_plan.storage),
                  selected_plan.api_calls_quota_max,
                  selected_plan.api_calls_quota_max,
                  applicationId
                ],
                function(err) {
                  connection.release()
                  if (err) {
                    return next(err)
                  }

                  // Subscription updated in stripe
                  return res.send({
                    status: true,
                    message: 'Subscription canceled, will be terminated at the end of the billing cycle.'
                  })
                })
            })
        } else {
          // The new plan is not free
          // then we have to update the subscription
          // not delete it.

          stripe.subscriptions.update(
            app_data.stripe_subscription_id, {
              plan: selected_plan.id,
              metadata: {
                plan_name: selected_plan.name
              }
            },
            function(err, subscription) {
              if (err) {
                return next(err)
              }
              var qry = 'UPDATE applications \
                            SET plan_name = ?, \
                            storage_max = ?,\
                            storage_left = ?,\
                            api_calls_quota_max = ?,\
                            api_calls_quota_left = ? \
                            WHERE id = ?;'

              connection.query(qry, [
                  selected_plan.name,
                  GigaBytesToKiloBytes(selected_plan.storage),
                  GigaBytesToKiloBytes(selected_plan.storage),
                  selected_plan.api_calls_quota_max,
                  selected_plan.api_calls_quota_max,
                  applicationId
                ],
                function(err) {
                  connection.release()
                  if (err) {
                    return next(err)
                  }

                  // Subscription updated in stripe
                  res.send({
                    status: true
                  })
                })
            }
          )
        }
      } else {
        // Else, the application does not have a subscription
        // we create one, first we need to check that the user has a stripe_customer_id
        connection.query(
          'SELECT * from accounts WHERE email = ?', [req.session.user.email],
          function(err, rows) {
            var user_data = rows[0]

            if (!user_data.stripe_customer_id) {
              return res.status(400).send({
                status: false,
                errors: [new Errors.BadRequest('The user must add a credit card before creating a subscription.')]
              })
            }

            // If we have a customer id, we can create a stripe subscription
            stripe.subscriptions.create({
              customer: user_data.stripe_customer_id,
              plan: selected_plan.id,
              metadata: {
                application_id: applicationId,
                application_name: app_data.name,
                plan_name: selected_plan.name,
                user_email: req.session.user.email
              }
            }, function(err, subscription) {
              if (err) {
                console.log('Error while creating the subscription')
                return res.status(402).send({
                  status: false,
                  errors: [err]
                })
              }

              // We add the subscription id to the application in mysql
              connection.query('UPDATE applications SET stripe_subscription_id = ?, plan_name = ?, api_calls_quota_max = ?,api_calls_quota_left = ? WHERE id = ?;', [subscription.id, selected_plan.name, selected_plan.api_calls_quota_max, selected_plan.api_calls_quota_max, applicationId],
                function(err, data) {
                  connection.release()
                  if (err) {
                    console.log('Error while updating the application.')
                    next(err)
                  } else {
                    res.send({
                      status: true
                    })
                  }
                })
            })
          })
      }
    })
  })
})

module.exports = router