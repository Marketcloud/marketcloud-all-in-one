'use strict'
/* global require:true */

var express = require('express')
var morgan = require('morgan')
var bodyParser = require('body-parser')
var Middlewares = require('./middlewares.js')
var Rewrites = require('./rewrites.js')
var Raven = require('raven');
var configuration = require('./config/default')
var amqp = require('amqp-connection-manager')
var redis = require('redis')
var app = express()
var Errors = require('./models/errors.js')
var WinstonLogger = require('./libs/console_logger.js');
var responseTime = require('response-time')
var os = require('os');

// In strict mode we cannot use package as variable name
var packageJson = require('./package.json');

app.use(Middlewares.attachRequestId)

/* *****************************************************
* Sentry config
* Must configure Raven before doing anything else with it
* Only for production
********************************************************/
if (process.env.NODE_ENV === 'production') {

  Raven.config('https://88ca414dcb194bf09f39940df760cd8e:a366a0e48fdd4829ac89b0852403fbb0@sentry.io/162400',{
    autoBreadcrumbs: true,
    release : packageJson.version
  }).install();

  // The request handler must be the first middleware on the app
  // Sends data to sentry.io
  app.use(Raven.requestHandler());
}

/*
    Letsencrypt azure extension configuration path
*/
app.use('/.well-known', express.static('.well-known'));
app.get('/.well-known/acme-challenge/:fileid', function(req, res){
  res.send('Requesting '+req.params.fileid);
})

// Redirect requests to root path to most recent api version
app.get('/',function(req,res,next){
  req.url = '/v0';
  next();
})







app.use(function(req,res,next){
  res.set("Server","Marketcloud Storefront API");
  return next();
})

// We want to output pretty printed json
// will cost a bit more bandwidth but
// increase Dev Experiennce a lot
app.set('json spaces', 2)

// Setting the request timeout
var timeout = require('connect-timeout')
app.use(timeout(60000))

function haltOnTimedout (req, res, next) {
  if (!req.timedout) {
    next()
  } else {
    req.app.get('logger')({
      type: 'error',
      subtype: 'timeout',
      request: req,
      time: new Date(),
      source: 'api',
      hostname: os.hostname(),
      request : {
        body : req.body || {},
        query : req.query || {},
        headers : req.headers || {}
      }
    })
    next()
  }
}

/***********************************
 *
 *          Redis Configuration
 *
 ************************************/
var redisClient = require('./services/redis.service.js');
app.set('redis', redisClient)

/***********************************
 *
 *      RabbitMQ Configuration
 *
 ************************************/

// Create a new connection manager
var connection = amqp.connect([configuration.rabbitmq.connectionString], {json: true})

// Ask the connection manager for a ChannelWrapper.
// Specify a setup function to run every time we reconnect
// to the broker.
var mailChannelWrapper = connection.createChannel({
  json: true,
  setup: function (channel) {
    return channel.assertQueue('marketcloud-mail', {durable: false})
  }
})
// WebHooks channel wrapper
var webhookChannelWrapper = connection.createChannel({
  json: true,
  setup: function (channel) {
    return channel.assertQueue('marketcloud-webhooks', {durable: false})
  }
})
// SearchIndex channel wrapper
var searchIndexChannelWrapper = connection.createChannel({
  json: true,
  setup: function (channel) {
    return channel.assertQueue('marketcloud-search-index', {durable: false})
  }
})
// Dependency injection
app.set('mail-queue', mailChannelWrapper)
app.set('webhook-queue', webhookChannelWrapper)
app.set('search-queue', searchIndexChannelWrapper)

var mongoservice = require('./services/mongodb.service.js')

app.set('mongodb', mongoservice.getDatabaseInstance())

/*  **********************************
            CUSTOM LOGGER CONFIG
 ************************************* */
var customLogger = require('./libs/logger.js')(mongoservice.getDatabaseInstance())
app.set('logger', customLogger)

/*  **********************************
            MYSQL-SEQUELIZE CONFIG
 ************************************* */

var mysqlService = require('./services/mysql.service.js')

app.set('sequelize', mysqlService.getDatabaseInstance())

/*  **********************************
        sendgrid CONFIG
 ************************************* */
var sendgrid = require('sendgrid')(configuration.sendgrid.key)
app.set('sendgrid', sendgrid)




app.use(function (req, res, next) {

  // Shorthand
  res.ok = function (data) {
    if ("undefined" === typeof data)
      res.send({status : true});
    else
      res.send({
        status: true,
        data: data
      })
  }

  res.notOk = function (err) {

    if (err instanceof Errors.HTTPError)
      return res.status(err.code).send({status: false, errors: [err]})
  
    return next(err)
  }
  next()
})

app.use(Middlewares.checkDoubleParameters)
app.use(responseTime(function (req, res, time) {
  res._responseTime = time
}))

/**********************************
*         CACHE
************************************/
const ApiCache = require('./libs/cache.js');
app.set('apicache',new ApiCache());

/***********************************
*               JOBS
************************************/
var updateApiRequestQuotasJob = require('./jobs/updateApiRequestQuotas.job.js')(app);
updateApiRequestQuotasJob.start();


/***********************************
*               Routes
************************************/
var routes = {}

routes.index = require('./routes/index.route.js')

routes.addresses = require('./routes/addresses.route.js')
routes.application = require('./routes/application.route.js')
routes.brands = require('./routes/brands.route.js')
routes.carts = require('./routes/carts.route.js')
routes.categories = require('./routes/categories.route.js')
routes.collections = require('./routes/collections.route.js')
routes.contents = require('./routes/contents.route.js')
routes.coupons = require('./routes/coupons.route.js')
routes.events = require('./routes/events.route.js')
routes.invoices = require('./routes/invoices.route.js')
routes.media = require('./routes/media.route.js')
routes.notifications = require('./routes/notifications.route.js')
routes.orders = require('./routes/orders.route.js')
routes.paymentMethods = require('./routes/paymentMethods.route.js')
routes.products = require('./routes/products.route.js')
routes.promotions = require('./routes/promotions.route.js')
routes.shippings = require('./routes/shippings.route.js')
routes.stores = require('./routes/stores.route.js')
routes.taxes = require('./routes/taxes.route.js')
routes.tokens = require('./routes/tokens.route.js')
routes.users = require('./routes/users.route.js')
routes.variables = require('./routes/variables.route.js')

// Integrations
routes.stripe = require('./routes/stripe.integration.js')
routes.braintree = require('./routes/braintree.integration.js')

/* MORGAN LOGGER */

// This morgan token will ad the application id to our logs
morgan.token('app_id', function (req, res) {
  return req.client.application_id
})


if ("production" === process.env.NODE_ENV)
  app.use(morgan(':date  [:app_id] :method :url -> :status    :response-time ms - :res[content-length]', { 'stream': WinstonLogger.stream }))
else
  app.use(morgan(':date  [:app_id] :method :url -> :status    :response-time ms - :res[content-length]'))

// Uses JSON body parser
app.use(bodyParser.json({limit: '5mb'}))


// This catches malformed json Exceptions
app.use(function (err, req, res, next) {
  if (err instanceof SyntaxError) {
    console.log('SyntaxError occurred', err, req.body, req.query)
    res.status(400).send({status: false, errors: [new Errors.BadRequest('Invalid JSON')]})
  } else {
    next(err)
  }
})


app.use(bodyParser.urlencoded({
  extended: true
}))

// Sets headers to allow cross domain requests
app.use(Middlewares.allowCrossDomain)

// Makes sure that the Accepts header allows JSON
app.use(Middlewares.checkAcceptHeader)

// Sets the Content-Type header
app.use(Middlewares.setContentType)

// Attaches a body property to the response for better logging and observability
app.use(Middlewares.interceptResponseBody)

// Stores a request to the db
app.use(Middlewares.logFinishedRequests)

// Prevent hanging of clients
app.use(haltOnTimedout)

/*
    INJECTING ROUTERS
 */
app.use('/v0/', routes.index)
app.use('/v0/tokens', routes.tokens)

app.use(Middlewares.reviveJSONQuery)


// Verify that the API Token sent is valid
app.use(Middlewares.verifyToken)

// Cache lookup for current application
app.use(Middlewares.loadCachedApplicationData)

// If cache lookup failed, load app data from db
app.use(Middlewares.loadApplicationData)

// Updates quotas for the application
// Moving this in a seprate process will save A LOT of queries from here
// Plus doing batched controls would reduce the total number of queries per hour
app.use(Middlewares.checkAndUpdateQuota)

/*
    Rewrites
    Middleware functions that check conditions and
    if any match is found apply rewrites to current URL
*/
app.post('/v0/payments', Rewrites.payments)

// Routes for api endpoints
app.use('/v0/application', routes.application)
app.use('/v0/brands', routes.brands)
app.use('/v0/carts', routes.carts)
app.use('/v0/coupons', routes.coupons)
app.use('/v0/categories', routes.categories)
app.use('/v0/collections', routes.collections)
app.use('/v0/events', routes.events)
app.use('/v0/invoices', routes.invoices)
app.use('/v0/orders', routes.orders)
app.use('/v0/addresses', routes.addresses)
app.use('/v0/media', routes.media) // TODO deprecate this. Switch to /files
app.use('/v0/files', routes.media)
app.use('/v0/notifications', routes.notifications)
app.use('/v0/paymentMethods', routes.paymentMethods)
app.use('/v0/products', routes.products)
app.use('/v0/promotions', routes.promotions)
app.use('/v0/shippings', routes.shippings)
app.use('/v0/shippingMethods', routes.shippings)
app.use('/v0/stores', routes.stores)
app.use('/v0/taxes', routes.taxes)
app.use('/v0/users', routes.users)
app.use('/v0/contents', routes.contents)
app.use('/v0/variables', routes.variables)

/*
Integrations
 */
app.use('/v0/integrations/stripe', routes.stripe)
app.use('/v0/integrations/braintree', routes.braintree)





// Let's make sure the request does not hang indefinetly
app.use(haltOnTimedout)



// This middleware check wether the response contains an error
// if its a HTTPError, it skips logging it, since it will be logged as a
// response. Here we want to log errors on our side, 500, network errors, db errors
// etc..
app.use(Middlewares.logErrors)

// / catch 404
app.use(function (req, res, next) {
  var err = new Errors.NotFound('The requested path (' + req.path + ') does not exist. You can check the documentation at https://www.marketcloud.it')

  res.status(404).send({
    status: false,
    errors: [err]
  })
})


// production error handler
app.use(function (err, req, res, next) {

  
  if (process.env.NODE_ENV !== 'production') {
    console.log('ERROR HANDLER AT ' + req.path, err, err.stack)
  }


    // Thanks to Errors.HTTPError we just need to check for types
  if (err instanceof Errors.HTTPError) {
    return res.status(err.code).send({status: false, errors: [err]})
  }

  if (err.type === 'entity.too.large') {
    return res.status(err.code).send({status: false, errors: [new Errors.EntityTooLarge()]})
  }

  // We send non-http errors to sentry, but first let's add context to it
  if (process.env.NODE_ENV === 'production')
    Raven.setContext({
      tags : {
        application_id : req.client.application_id,
        access : req.client.access
      }
    })

  return next(err);
})



// Sends the error to Sentry
// Only in production or staging
if (process.env.NODE_ENV === 'production')
  app.use(Raven.errorHandler());

// After sending data to Sentry, we output an error message to the user.
app.use(function(err,req,res,next){
  console.log("InternalServerError Ouputted to the user and logged.")
  console.log(err)
  res.status(500).send({
    'status': false,
    errors: [new Errors.InternalServerError()]
  })
})

/* exporting the app */
module.exports = app
