var express = require('express');
var router = express.Router();
var crypto = require('crypto');
var Errors = require('../models/errors.js');
var Middlewares = require('../middlewares.js');
var Types = require('../models/types.js');

var package = require('../package.json');
/* GET home page. */
router.get('/', function(req, res, next) {
  res.send({
    "name": "Marketcloud Storefront API v0",
    "version": package.version,
    "documentation": "https://www.marketcloud.it/documentation",
    "resources": {
      "addresses": {
        url: "https://api.marketcloud.it/v0/addresses",
        documentation: "https://www.marketcloud.it/documentation/rest-api/addresses",
      },
      "application": {
        url: "https://api.marketcloud.it/v0/application",
        documentation: "https://www.marketcloud.it/documentation/rest-api/application"
      },
      "brands": {
        url: "https://api.marketcloud.it/v0/brands",
        documentation: "https://www.marketcloud.it/documentation/rest-api/brands"
      },
      "carts": {
        url: "https://api.marketcloud.it/v0/carts",
        documentation: "https://www.marketcloud.it/documentation/rest-api/carts"
      },
      "categories": {
        url: "https://api.marketcloud.it/v0/categories",
        documentation: "https://www.marketcloud.it/documentation/rest-api/categories"
      },
      "collections": {
        url: "https://api.marketcloud.it/v0/collections",
        documentation: "https://www.marketcloud.it/documentation/rest-api/collections"
      },
      "contents": {
        url: "https://api.marketcloud.it/v0/contents",
        documentation: "https://www.marketcloud.it/documentation/rest-api/contents"
      },
      "coupons": {
        url: "https://api.marketcloud.it/v0/coupons",
        documentation: "https://www.marketcloud.it/documentation/rest-api/coupons"
      },
      "invoices": {
        url: "https://api.marketcloud.it/v0/invoices",
        documentation: "https://www.marketcloud.it/documentation/rest-api/invoices"
      },
      "files": {
        url: "https://api.marketcloud.it/v0/files",
        documentation: "https://www.marketcloud.it/documentation/rest-api/files"
      },
      "orders": {
        url: "https://api.marketcloud.it/v0/orders",
        documentation: "https://www.marketcloud.it/documentation/rest-api/orders"
      },
      "paymentMethods": {
        url: "https://api.marketcloud.it/v0/paymentMethods",
        documentation: "https://www.marketcloud.it/documentation/rest-api/paymentMethods"
      },
      "products": {
        url: "https://api.marketcloud.it/v0/products",
        documentation: "https://www.marketcloud.it/documentation/rest-api/products"
      },
      "promotions": {
        url: "https://api.marketcloud.it/v0/promotions",
        documentation: "https://www.marketcloud.it/documentation/rest-api/promotions"
      },
      "shippings": {
        url: "https://api.marketcloud.it/v0/shippings",
        documentation: "https://www.marketcloud.it/documentation/rest-api/shippings"
      },
      "stores": {
        url: "https://api.marketcloud.it/v0/stores",
        documentation: "https://www.marketcloud.it/documentation/rest-api/stores"
      },
      "taxes": {
        url: "https://api.marketcloud.it/v0/taxes",
        documentation: "https://www.marketcloud.it/documentation/rest-api/taxes"
      },
      "tokens": {
        url: "https://api.marketcloud.it/v0/tokens",
        documentation: "https://www.marketcloud.it/documentation/rest-api/tokens"
      },
      "users": {
        url: "https://api.marketcloud.it/v0/users",
        documentation: "https://www.marketcloud.it/documentation/rest-api/users"
      },
      "variables": {
        url: "https://api.marketcloud.it/v0/variables",
        documentation: "https://www.marketcloud.it/documentation/rest-api/variables"
      },
    }
  });
});
router.get('/favicon.ico', function(req, res, next) {
  res.status(404).send();
})


router.get('/schema', function(req, res, next) {
  res.json(Types);
})

router.get('/schema/:model', function(req, res, next) {

  if (Types.hasOwnProperty(req.params.model))
    res.json(Types[req.params.model]);
  else
    return next(new Errors.NotFound('Unable to find schema named ' + req.params.model));
})


router.get('/rate', Middlewares.verifyClientAuthorization('read'), function(req, res, next) {
  var app_id = req.query.application_id;
  //todo solo i proprietari dell'app devono poter vedere questa cosa :/
  //questo endpoint deve essere autenticato ma NON contato nel rate limit
  var redis = req.app.get('redis');
  redis.hgetall('rate_' + req.query.application_id, function(err, rates) {
    if (err) {
      next(err)
    } else if (null === rates) {
      //This publicKey has not a rate entry in redis
      res.status(404).send({
        status: false,
        errors: [new Errors.NotFound()]
      })
    } else {
      rates.limit = Number(rates.limit);
      rates.remaining = Number(rates.remaining);
      res.send({
        'status': true,
        'rates': {
          'core': rates
        }
      })
    }
  })
})



var countries = require('../libs/countries.js');

router.get('/countries', function(req, res, next) {


  var per_page = req.query.per_page || 20;
  var page = req.query.page || 1;

  var start = (page - 1) * per_page;
  var end = start + per_page
  var output = countries.slice(start, end)

  res.send({
    status: true,
    data: output
  })

})


var currencies = require('../libs/currencies.js');
var temp = [];
for (var k in currencies) {
  temp.push(currencies[k]);
}
currencies = temp;
router.get('/currencies', function(req, res, next) {



  var per_page = req.query.per_page || 20;
  var page = req.query.page || 1;

  var start = (page - 1) * per_page;
  var end = start + per_page
  var output = currencies.slice(start, end)

  res.send({
    status: true,
    data: output
  })

})

module.exports = router;