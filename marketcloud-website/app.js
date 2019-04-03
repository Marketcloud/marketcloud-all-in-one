'use strict'




const fs = require('fs')
const os = require('os')
const path = require('path')
const configuration = require('./configuration/default.js')
const compression = require('compression')
const express = require('express')
const favicon = require('serve-favicon')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const logger = require('morgan')
const routes = require('./routes/index')
const uuid = require('node-uuid')
const Errors = require('./libs/errors.js')
const url = require('url')
const request = require('superagent')
const ENV = process.env.NODE_ENV

var app = express()



app.set('configuration', configuration)
app.locals.configuration = configuration

// Setting the env into app.locals
// In this way, we know wether we are in dev/stag/prod
// also in the view
app.locals.env = process.env.NODE_ENV
app.locals.pageTitle = ''

/*
    Letsencrypt azure extension configuration path
*/
app.use('/.well-known', express.static('.well-known'))
app.get('/.well-known/acme-challenge/:fileid', function (req, res) {
  res.send('Requesting ' + req.params.fileid)
})


/*  **********************************
            REDIS CONFIG
 ************************************* */

var redisClient = require('./services/redis.js')(app)



/*  **********************************
        sendgrid CONFIG
 ************************************* */
var sendgrid = require('sendgrid')(configuration.sendgrid.key)
app.set('sendgrid', sendgrid)


// view engine setup

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')


app.use(favicon(__dirname + '/public/img/favicon.ico'))
app.use(logger('dev'))


/**********************************
        SESSION CONFIG
***********************************/

var session = require('./services/session.js')(app)



/*******************************************
 *        PROXY configuration               *
 ********************************************/

var proxy = require('./services/proxy.js')(app)
app.use('/api', proxy)



app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: true
}))
app.use(cookieParser())
app.use(compression())

//Rewrite for cache-busting
app.use(function (req, res, next) {
  if (req.url.indexOf('-v') < 0) {
          return next()
        }
        // To simplify the naming convention
        // Files subject to versioning follow this naming convention:
        // namefile-v125214516.(html|js|css|png)
        // is translated to namefile.(html|js|css|png)
        // console.log("[CACHE-BUSTING] Original req.url: "+req.url);
  var static_file_regex = /\/([^\/]+)-v[0-9]+\.(css|html|png)$/

        var bundled_file_regex = /\/([^\/]+)-v[0-9]+\.bundle\.(css|js)$/

       if (req.url.indexOf('.bundle.') > -1) {
         req.url = req.url.replace(bundled_file_regex, '/$1.bundle.$2')
            return next()
       }
  if (req.url.match(static_file_regex)) {
          req.url = req.url.replace(static_file_regex, '/$1.$2')
            return next()
        }

  next()
})


app.use('/scripts', express.static(path.join(__dirname, 'node_modules')))
app.use('/libs', express.static(path.join(__dirname, 'node_modules')))
app.use(express.static(path.join(__dirname, 'public')))


/*  **********************************
            MONGODB CONFIG
 ************************************* */
var mongodb = require('./services/mongodb.js')
app.set('mongodb', mongodb.getDatabaseInstance())

/********************************
        MYSQL CONFIG
**********************************/
var mysql = require('./services/mysql.js')

app.set('mysql', mysql.getDatabaseInstance())




/***************************************
 *       MIDDLEWARES
 ****************************************/


//Cookie disclaimer
app.use(function (req, res, next) {
    // If there's no cookie, we must include a cookie disclaimer
  if (!Object.prototype.hasOwnProperty.call(req.cookies, '_mc_accepts_cookies')) {
        // console.log("Devo mostrare il disclaimer perch� non � settato il cookie _mc_accepts_cookies")
      res.locals.includeCookiesDisclaimer = true
    }

  next()
})

// This is a helper middleware that checks for authentication
function requireAuthentication (req, res, next) {
  if (req.session.user && req.session.user.isAuthenticated)
      {next()}
  else
        {res.redirect('/account/login')}
}

/*
    Middleware
    Loading default meta tags for views

    the value app.locals.meta_tags is overwritable by doing
    meta.defaults["og:type"] = "my new tag"
    meta.toString(); //outputs html
 */
app.set('meta_tags', require('./libs/meta_tags.js'))

app.use(function (req, res, next) {
  app.locals.meta_tags = req.app.get('meta_tags').toString()
    next()
})


app.use(function (req, res, next) {
  if (req.app.locals.removeAddthis)
      {delete req.app.locals.removeAddthis}
  next()
})
/**********************************
    PASSPORT
**********************************/
var passport = require('passport')

passport.serializeUser(function (user, done) {
  // console.log("Serialize",user)
  done(null, user)
})

passport.deserializeUser(function (user, done) {
    // console.log("Deserialize",user)
  done(null, user)
})

 app.use(passport.initialize())
 app.use(passport.session())



app.use(function (req, res, next) {
  if (req.user) {
    res.locals.user = req.user
  }


  next()
})

// GITHUB PASSPORT ROUTES
app.get('/oauth/github', passport.authenticate('github'))

app.get('/oauth/github/callback',
  passport.authenticate('github', { failureRedirect: '/account/login' }),
  function (req, res) {
    // Successful authentication, redirect home.
    req.session.user = req.user
    req.session.user.isAuthenticated = true
    req.session.user.email = req.user.email
    req.session.user.id = req.user.id
    req.session.user.full_name = req.user.full_name
    req.session.user.image_url = req.user.image_url
    res.redirect('/')
})

/***********************************
                ROUTES
************************************/

app.use(function (req, res, next) {
  res.locals.path = req.path
    next()
})

app.use('/', routes)
app.use('/documentation', function (req, res, next) {
  req.app.locals.removeAddthis = true
  next()
})
app.use('/accounts', function (req, res, next) {
  req.app.locals.removeAddthis = true
  next()
})
app.use('/applications', function (req, res, next) {
  req.app.locals.removeAddthis = true
  next()
})
app.use('/documentation', require('./routes/documentation.route.js'))
app.use('/account', require('./routes/account.route.js'))
app.use('/applications', requireAuthentication, require('./routes/application.route.js'))


app.post('/logs', requireAuthentication, function (req, res, next) {
  var log = req.body

    log.time = new Date()
    log.user = req.session.user || {}


    req.app.get('mongodb')
        .collection('frontend-logs').insert(log, function (err, data) {
          if (err)
              {return next(err);}

          else
                {res.send({});}
        })
})

/// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found')
    console.log('[404] ' + req.url)

    // Let's make sure Google understand that this is not 200 (OK)
    res.status(404)

    res.render('404', {
      pageTitle: 'Not found'
    })
})

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    var the_error = {
      time: new Date(),
      error: err,
      message: err.stack || err.message || 'Unknown error'
    }


  console.log(err)
    console.log(err.stack)



  var log = {}
    log.time = new Date()
    log.type = 'error'
    log.source = 'website'
    log.error = the_error
    log.path = req.path
    log.ip = req.ip

    if (req.session && req.session.user)
      {log.user = req.session.user;}

  var mongodb = req.app.get('mongodb')

    mongodb.collection('website-errors').insert(log, function (mongo_error) {
      res.status(err.status || 500)
        res.render('error', {
          message: err.message,
          error: {},
          title: 'error',
          pageTitle: 'Error'
        })
    })


    
})


app.set('port', process.env.PORT || 8000)
var server = app.listen(app.get('port'), function () {
 
    console.log('Express server listening on port ' + server.address().port)
})
