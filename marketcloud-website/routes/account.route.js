'use strict'

var express = require('express')
var router = express.Router()
var MailchimpApi = require('mailchimp-api')
var fs = require('fs')
var Errors = require('../libs/errors.js')
var Schematic = require('../libs/schematic.js')
var superagent = require('superagent')
var Utils = require('../libs/util.js')

const ENV = process.env.NODE_ENV
var configuration = require('../configuration/default.js')

var http = require('http'),
  crypto = require('crypto'),
  async = require('async'),
  uuid = require('node-uuid')

var sendgrid = require('sendgrid')(configuration.sendgrid.key)

var ejs = require('ejs')
  // var activate_email_template = fs.readFileSync('./views/emails/activate_account_email.ejs','utf8');

function validateEmail (email) {
  var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i
  return re.test(email)
}

/*
  @param config.to {String} The  recipient's address
  @param config.template_path {String} the path to the EJS template
  @param config.context {Object} Object to be used in template compilation
  @param config.callback {Function} Callback
 */
function sendMail (config) {
  fs.readFile(config.template_path, 'utf8', function (err, template) {
    if (err)      { return config.callback(err) }

    var compiled_template = ejs.render(template, config.context)
    var email_config = {
      to: config.to,
      from: configuration.organization.email,
      fromname: configuration.organization.name,
      subject: config.subject || 'Your Account',
      text: compiled_template,
      html: compiled_template
    }
    sendgrid.send(email_config, config.callback)
  })
}

var sendActivationEmail = function (address, code, callback) {
  return sendMail({
    to: address,
    template_path: './views/emails/activate_account_email.ejs',
    context: {
      email: address,
      activation_code: code
    },
    subject: 'Marketcloud account activation',
    callback: callback
  })
}

var sendPasswordRecoveryEmail = function (address, code, callback) {
  return sendMail({
    to: address,
    template_path: './views/emails/recover_password_email.ejs',
    context: {
      email: address,
      reset_code: code
    },
    subject: 'Marketcloud account password recovery',
    callback: callback
  })
}

/*****************************
 *
 *   Renders the signup page
 *
 *****************************/
router.get('/signup', function (req, res, next) {
  if (req.session.user.isAuthenticated === true) { 
    res.redirect('/')
  } else {
    res.render('account/signup', {
     pageTitle: 'Create a new account'
    })
  }
    
})

/*****************************
 *
 *   Renders the login page
 *
 ******************************/
router.get('/login', function (req, res, next) {
  if (req.session.user.isAuthenticated === true)    { res.redirect('/')}  else
    { 
res.render('account/login', {
      pageTitle: 'Login',
      message: req.query.message || null
    })
 }
})

function requireAuthentication (req, res, next) {
  console.log('REQUIRE', req.path, req.url)
  if (req.session.user.isAuthenticated)    { next() }  else    { res.redirect('/account/login') }
}

router.post('/login', function (req, res, next) {
  if (!req.body.hasOwnProperty('email') || !req.body.hasOwnProperty('password'))    { return res.status(401).send({
      status: false,
      errors: [new Errors.Unauthorized('INVALID_CREDENTIALS')]
    }) 
}
  req.app.get('mysql').query(
    'SELECT * FROM accounts WHERE email= ? AND password = ?', [req.body.email, crypto.createHash('sha256').update(req.body.password).digest('base64')],
    function (err, rows) {
      // connection.release();
      if (err) {
        console.log(err)
        res.status(500).send({
          status: false,
          errors: [new Errors.InternalServerError()]
        })
      } else if (rows.length === 0)
        { 
res.status(401).send({
          status: false,
          errors: [new Errors.Unauthorized('INVALID_CREDENTIALS')]
        })
 }
      else {
        req.session.user.isAuthenticated = true
        req.session.user.email = rows[0].email
        req.session.user.id = rows[0].id
        req.session.user.full_name = rows[0].full_name
        req.session.user.image_url = rows[0].image_url
        res.send({
          status: true,
          data: {
            email: rows[0].email
          }
        })
      }
    })
})

/*****************************
 *
 *   Handles the logout request
 *
 ******************************/
router.get('/logout', function (req, res, next) {
  req.session.user.isAuthenticated = false
  req.session.destroy(function (err) {
    res.redirect('/')
  })
})

/*****************************
 *
 *   Renders the account page
 *
 ******************************/

router.get('/', requireAuthentication, function (req, res, next) {
  req.app.get('mysql').getConnection(function (err, connection) {
    // Use the connection
    connection.query(
      'SELECT * FROM accounts WHERE email= ?', [req.session.user.email],
      function (err, rows) {
        connection.release()
        if (err) {
          console.log(err)
          next(err)
        } else if (rows.length === 0)
          { 
res.render('404', {
            pageTitle: 'Not found'
          })
 }
        else {
          var user_data = rows[0]
          delete user_data['password']
            return res.render('account/account_page', {
              pageTitle: 'Account',
              userData: JSON.stringify(rows[0])
            })

          
        }
      })
  })
})

router.get('/get', requireAuthentication, function (req, res, next) {
  req.app.get('mysql')
    .getConnection(function (err, connection) {
      if (err)        { return next(err)}
      // Use the connection
      connection.query(
        'SELECT * FROM accounts WHERE email= ?', [req.session.user.email],
        function (err, rows) {
          connection.release()
          if (err) {
            console.log(err)
            next(err)
          } else if (rows.length === 0) {
            console.log('404')
            res.status(404).send({
              status: false,
              errors: [new Errors.NotFound('Unable to find account')]
            })
            return next()
          } else {
            var user_data = rows[0]
            return res.send({
                status: true,
                data: user_data
              })

          }
        })
    })
})

/*****************************
 *
 *   Handles the delete account request
 *
 ******************************/
router.delete('/', requireAuthentication, function (req, res, next) {
  var mysql = req.app.get('mysql')
  mysql.getConnection(function (err, connection) {
    if (err) {
      console.log(err)
      res.status(500).send({
        status: false,
        errors: [new Errors.InternalServerError()]
      })
    } else {
      connection.query('DELETE FROM accounts WHERE email=?', [req.session.user.email], function (err, result) {
        if (err) {
          console.log(err)
          if (err.code.indexOf('_REFERENCED') > -1)
            {res.send(400, {
              status: false,
              errors: [new Errors.BadRequest('ACCOUNT_HAS_APPLICATIONS')]
            })}
          else
            {res.status(500).send({
              status: false,
              errors: [new Errors.InternalServerError()]
            })}
        } else {
          res.send({
            status: true
          })
          req.session.destroy()

        }
      })
    }
  })
})

// Step 1 of password recovery
router.get('/recover', function (req, res, next) {
  // TODO pagina che ti fa inserire l'indirizzo email dell'account da recuperare
  res.render('account/recover_password', {
    pageTitle: 'Recover password'
  })
})

// Step 2 of password recovery
// Se l'indirizzo mail richiesto esiste, invia una mail a quell'indirizzo
// con un link per recuperare la password
// QUando li link viene visitato, porta ad una pagina che fa modificare la password
router.post('/recover', function (req, res, next) {
  var email = req.body.email

  // Genero un altro activation code casuale
  // Lo invio per email come quando attiva l''account per la prima volta
  // Quando visita /account/reset controllo la query
  // se ha email e activation code corretti
  // gli faccio vedere un form in cui può inserire una nuova password
  // Recover

  var mysql = req.app.get('mysql')

  mysql.getConnection(function (err, connection) {
    if (err)      { return next(err) }
    var new_code = uuid.v4()
    connection.query('SELECT email FROM accounts WHERE email = "' + email + '";', function (err, rows) {
      // Se non esiste la mail mando tutti affanculo
      if (rows.length === 0) {
        return res.status(400).send({
          status: false,
          errors: [new Errors.NotFound('Unable to find an account with this email.')]
        })
      }

      connection.query('UPDATE accounts SET activation_code = ? WHERE email = ?;', [new_code, email], function (err, data) {
        connection.release()

        if (err)          { return next(err)}
        console.log('Setto un nuovo reset_code e invio la mail a ' + email)
          // Ora devo mandare una email con il nuovo codice di attivazione
          // e che punti a /accounts/resetPassword
        sendPasswordRecoveryEmail(email, new_code, function (err) {
          if (err) {
            console.log('sendPPasRecoveryErr', err)
            return next(err)
          }

          res.send({
            status: true
          })
        })
      })
    })
  })
})

// Step 3 of password recovery
router.get('/reset', function (req, res, next) {
  var email = req.query.email,
    code = req.query.reset_code

  // Se email e reset code matchano, allora gli mostro il form per resettare la password

  res.render('account/reset_password', {
    email: email,
    reset_code: code,
    pageTitle: 'Reset password'
  })
})

// Step 4 of password recovery
router.post('/reset', function (req, res, next) {
  // Mi deve mandare la coppia di pw
  // La email
  // e il codice di attivazione
  var props = ['email', 'password', 'confirm_password', 'reset_code']
  var missSomething = x => {
    return !req.body.hasOwnProperty(x)
  }
  if (props.some(missSomething)) {
    console.log('Manca qualcosa nel body')
    return res.status(400).send({
      status: false,
      errors: [new Errors.BadRequest('Missing required parameter')]
    })
  }

  var email = req.body.email,
    code = req.body.reset_code,
    password = req.body.password,
    confirm = req.body.confirm_password

  if (password !== confirm)
    {
 return res.status(400).send({
      status: true
    })
 }

  var hashed_password = crypto.createHash('sha256').update(password).digest('base64')

  console.log('TUTTO OK, ora vado a fare la query')
  req.app.get('mysql').getConnection(function (err, connection) {
    if (err)      { return next(err)}
    var query = 'UPDATE accounts SET password = "' + hashed_password + '" WHERE email = "' + email + '" AND activation_code= "' + code + '";'
    console.log('LA QUERY', query)
    connection.query(query, function (err, data) {
      connection.release()

      if (err)        { return next(err)}

      res.send({
        status: true
      })
    })
  })
})



/*******************************
 *
 *
 * Handles the create account request
 *
 *
 ********************************/
router.post('/', function (req, res, next) {
  // Creates an account
  var Params = new Schematic.Schema('CreateAccountParams', {
    'email': {
      type: 'string',
      required: true
    },
    'password': {
      type: 'string',
      required: true
    },
    'confirm_password': {
      type: 'string',
      required: true
    },
    'subscribe_newsletter': {
      type: 'boolean'
    },
    'primary_language': {
      type: 'string'
    }
  })

  if (req.body.password !== req.body.confirm_password) {
    res.status(400).send({
      status: false,
      errors: [new Errors.BadRequest('INVALID_CONFIRMATION_PASSWORD')]
    })
    return
  }

  if (!validateEmail(req.body.email)) {
    res.status(400).send({
      status: false,
      errors: [new Errors.BadRequest('INVALID_PASSWORD')]
    })
    return
  }

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
  var activation_code = uuid.v4()
  var hashed_password = crypto.createHash('sha256').update(req.body.password).digest('base64')
  mysql.getConnection(function (err, connection) {
    if (err) {
      console.log(err)
      res.status(500).send({
        status: false,
        errors: [new Errors.InternalServerError()]
      })
    } else {
      // getting the id
      connection.query("REPLACE INTO id_store (stub) VALUES ('a');",
        function(err, result) {
          if (err) {
            console.log(err)
            res.status(500).send({
              status: false,
              errors: [new Errors.InternalServerError()]
            })
            
          } else {
            console.log(result)
            var account = {}

            account.email = req.body.email;
            account.password = hashed_password;
            account.activation_code = activation_code;
            account.active = false;
            var metadata = {
              primary_language: req.body.primary_language
            }
            account.metadata = JSON.stringify(metadata);

            account.image_url = 'http://www.gravatar.com/avatar/' + crypto.createHash('md5').update(account.email).digest("hex");
            connection.query('INSERT INTO accounts SET ?',
              account,
              function(err, result) {
                connection.release()
                if (err) {
                  console.log(err)
                  if (err.code == "ER_DUP_ENTRY")
                    res.status(400).send({
                      status: false,
                      errors: [new Errors.BadRequest('EMAIL_EXISTS')]
                    })
                  else
                    res.status(500).send({
                      status: false,
                      errors: [new Errors.InternalServerError()]
                    })
                  return
                } else {
                  res.send({
                      status: true,
                      data: account
                  })



                }
              })

          }
        })
    }
  })
})

/*************************
  Activate an account
*************************/
router.get('/activate', function (req, res, next) {
  // The query string must include
  // activation_code
  // email_address
  //

  var email = req.query.email,
    activation_code = req.query.activation_code,
    mysql = req.app.get('mysql')

  console.log(req.query)
  mysql.getConnection(function (err, connection) {
    if (err)      { return next(err)}

    var query = 'UPDATE accounts SET active = true WHERE email = ? AND activation_code = ?;'
    var the_query = connection.query(query, [email, activation_code], function (err, result) {
      console.log(the_query.sql)
      connection.release()

      if (err)        { return next(err)}

      res.redirect('/account/login?message=Your account has been activated')
    })
  })
})

/**********************************
 *
 *   Handles the update account request
 *
 ***********************************/
router.put('/', requireAuthentication, function (req, res, next) {
  var patch = req.body,
    query = 'UPDATE accounts SET ',
    mysql = req.app.get('mysql')

  if (patch.hasOwnProperty('password')) {
    if (patch.password !== patch.confirm_password) {
      res.status(400).send({
        status: false,
        errors: [new Errors.BadRequest('INVALID_CONFIRMATION_PASSWORD')]
      })
      return
    } else {
      patch.password = crypto.createHash('sha256').update(patch.password).digest('base64')
      delete patch.confirm_password
    }
  }
  var query_replacements = []
  for (var key in patch) {
    query += key + ' = ? , '
    query_replacements.push(patch[key])
  }

  query += ' WHERE email = "' + req.session.user.email + '";'
  query = query.replace(/,([^,]*)$/, '$1') // a,b,c -> a,bc
  mysql.getConnection(function (err, connection) {
    if (err) {
      console.log(err)
      res.status(500).send({
        status: false,
        errors: [new Errors.InternalServerError()]
      })
    } else {
      connection.query(query, query_replacements, function (err, result) {
        connection.release()
        if (err) {
          console.log(err)
          res.status(500).send({
            status: false,
            errors: [new Errors.InternalServerError()]
          })
        } else {
          // If the user changed its email address, we need to refresh the session!
          if (req.body.hasOwnProperty('email'))
            {req.session.user.email = req.body.email;}

          res.send({
            status: true,
            data: result
          })
        }
      })
    }
  })
})

router.get('/lookup/:email', function (req, res, next) {
  req.app.get('mysql')
    .getConnection(function (err, connection) {
      connection.query('SELECT email FROM accounts WHERE email = ?;', [req.params.email], function (err, result) {
        connection.release()
        if (err) {
          console.log(err)
          res.status(500).send({
            status: false,
            errors: [new Errors.InternalServerError()]
          })
        } else {
          res.send({
            status: true,
            data: result[0]
          })
        }
      })
    })
})

module.exports = router
