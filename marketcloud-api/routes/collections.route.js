var express = require('express')
var Router = express.Router()

var Errors = require('../models/errors.js'),
  Middlewares = require('../middlewares.js'),
  Types = require('../models/types.js'),
  Utils = require('../libs/util.js'),
  JSONpatch = require('fast-json-patch')

// Shortcut
var requireAuth = Middlewares.verifyClientAuthorization

function prepareQuery (req, res, next) {
  req.data_query = {
    where_statement: {}
  }
  next()
}

function addWhereStatement (req, res, next) {
  var query = req.data_query

  query.where_statement = Utils.subsetInverse(req.query, Utils.OutputOperatorsList)

  query.where_statement['application_id'] = req.client.application_id
  next()
}

function addPaginationParams (req, res, next) {
  var query = req.data_query
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

  next()
}

function addSorting (req, res, next) {
  var query = req.data_query
  // TODO add sorting
  query.sort = Utils.getMongoSorting(req)
  next()
}

function addProjection (req, res, next) {
  var query = req.data_query

  query.projection = {
    _id: 0,
    application_id: 0
  }
  next()
}

// Resource_name is the collection name
function countResource () {
  // Only supporting mongodb right now
  // we will check for the storage engine and then switch function
  // to return.
  return function (req, res, next) {
    var query = req.data_query,
      db = req.app.get('mongodb')

    db.collection('collections')
      .find(query.where_statement)
      .count(function (err, count) {
        if (err) {
          return next(err)
        }

        req.pagination = Utils.getPagination({
          count: count,
          limit: query.limit,
          skip: query.skip,
          req_query: req.query,
          resource: 'collections'
        })

        next()
      })
  }
}

Router.get('/',
  requireAuth('collections', 'list'),
  prepareQuery,
  addWhereStatement,
  addPaginationParams,
  addSorting,
  addProjection,
  countResource('collections', 'Mongodb'),
  function (req, res, next) {
    var query = req.data_query,
      db = req.app.get('mongodb')

    db.collection('collections')
      .find(query.where_statement, query.projection)
      .skip(query.skip)
      .limit(query.limit)
      .sort(query.sort)
      .toArray(function (err, data) {
        if (err) {
          return next(err)
        }

        var response = Utils.augment({
          status: true,
          data: data
        }, req.pagination)

        res.send(response)
      })
  })

function populateCollectionItems (req, res, next) {
  var collection = req.collection

  var db = req.app.get('mongodb')

  db.collection('products')
    .find({
      application_id: req.client.application_id,
      id: {
        $in: collection.items.map(p => p.product_id)
      }
    })
    .toArray(function (err, products) {
      if (err) {
        return next(err)
      }

      var numberOfProductsFound = products.length
      var numberOfProductsInCollection = collection.items.length

      // Since we want to preserve the ordering inside collection.items
      // we dont simply assign products fetched from the db to items
      var productsMapById = {}
      products.forEach((product) => {
        productsMapById[product.id] = product
      })

      var availableIds = products.map(p => p.id)

      var deleted_items = collection.items
        .map(p => p.product_id)
        .filter(id => {
          return availableIds.indexOf(id) < 0
        })

      collection.items = collection.items
        .filter((item) => {
        // Required check since we are taking care of no longer existing products
        // ONLY in the next step, not now
          return productsMapById.hasOwnProperty(item.product_id)
        })
        .map((item) => {
          var p = productsMapById[item.product_id]
          p.product_id = item.product_id
          delete p._id
          return p
        })

      /*
         * Showing the requested currency
         */
      var requestedCurrency = Utils.getRequestedCurrency(req)
      if (requestedCurrency) {
        var currencyRate = Utils.getCurrencyRate(requestedCurrency, req.client.application)

        if (currencyRate === null) { return next(new Errors.BadRequest('Cannot use currency ' + requestedCurrency + '. Add it first as supported currency in your store\'s admin panel.')) }

        collection = Utils.convertCollectionPrices(collection, requestedCurrency, currencyRate)
      }

      if (numberOfProductsFound < numberOfProductsInCollection) {
        // Then some product in the collection is no longer in the app
        // because it was DELETED (not about avaliability)

        console.log('There re some deleted items,', deleted_items)

        // Removing unavailable stuff from the collection
        collection.items = collection.items.filter((item) => availableIds.indexOf(item.product_id) > -1)

        req.app.get('mongodb')
          .collection('collections')
          .update({
            id: req.collection.id,
            application_id: req.client.application_id
          }, {
            $pull: {
              items: {
                product_id: {
                  $in: deleted_items
                }
              }
            }
          },
          function (err) {
            if (err) { return next(err) }
            console.log('[NOTICE] Some items were no longer available in the app, so i removed them from the collection.')
            res.send({
              status: true,
              data: collection
            })
          })
      } else {
        res.send({
          status: true,
          data: collection
        })
      }
    })
}

Router.get('/:id', requireAuth('collections', 'getById'),
  function (req, res, next) {
    var db = req.app.get('mongodb')

    db.collection('collections').findOne({
      application_id: req.client.application_id,
      id: Number(req.params.id)
    }, function (err, collection) {
      if (err) {
        return next(err)
      }
      if (collection === null) {
        return next(new Errors.NotFound('Unable to find collections with id ' + req.params.id))
      }

      delete collection._id

      req.collection = collection
      next()
    })
  }, populateCollectionItems)
Router.post('/', requireAuth('collections', 'create'), function (req, res, next) {
  var db = req.app.get('mongodb'),
    sequelize = req.app.get('sequelize')

  var validation = Types.Collection.validate(req.body)
  if (validation.valid === false) {
    var err = new Errors.BadRequest()
    Utils.augment(err, validation)
    return next(err)
  }
  var newCollection = req.body

  // Must validate items in products array
  // [{product_id : 111}, {product_id : 11,variant_id:12}]
  // Checking if products exists

  db.collection('products')
    .find({
      application_id: req.client.application_id,
      id: {
        $in: req.body.items.map(item => item.product_id)
      }
    })
    .toArray(function (err, foundProducts) {
      if (err) {
        return next(err)
      }

      if (foundProducts.length < req.body.items.length) {
        // products
        var notFoundItems = req.body.items
          .map(item => item.product_id)
          .filter(id => {
            return foundProducts.map(p => p.id).indexOf(id) === -1
          })

        return next(new Errors.BadRequest('Unable to find product(s) with id ' +
          notFoundItems.toString()))
      }

      var sequelize = req.app.get('sequelize')
      sequelize.query(Utils.Queries.getNewUID, {
        type: sequelize.QueryTypes.SELECT
      })
        .then(function (newId) {
          newId = newId[1]['0']['LAST_INSERT_ID()']
          newCollection.id = newId
          newCollection.application_id = req.client.application_id

          db.collection('collections').insert(newCollection, function (err) {
            if (err) {
              return next(err)
            }

            res.send({
              status: true,
              data: newCollection
            })
          })
        })
        .catch(Utils.getSequelizeErrorHandler(req, res, next))
    })
})
Router.put('/:id', requireAuth('collections', 'update'), function (req, res, next) {
  var update = req.body

  /* var validation = Types.Collection.validate(update);

  if (false === validation.valid)
    return next(Utils.augment(new Errors.BadRequest(), validation));
*/

  delete req.body['_id']
  delete req.body['application_id']

  var query = {id: Number(req.params.id), application_id: req.client.application_id}

  req.app.get('mongodb')
    .collection('collections')
    .findOne(query, function (err, collection) {
      if (err) { return next(err) }

      if (collection === null) { return next(new Errors.NotFound('Unable to find collection with id ' + req.params.id)) }

      for (var k in req.body) {
        if (req.body[k] === null) { delete collection[k] } else { collection[k] = req.body[k] }
      }

      req.app.get('mongodb')
        .collection('collections')
        .update(query, collection, function (err) {
          if (err) { return next(err) }

          return res.send({
            status: true,
            data: collection
          })
        })
    })
})

Router.patch('/:id', requireAuth('collections', 'update'), function (req, res, next) {
  var patches = req.body

  var db = req.app.get('mongodb')

  db.collection('collections').findOne({
    application_id: req.client.application_id,
    id: Number(req.params.id)
  }, function (err, collection) {
    if (err) {
      return next(err)
    }
    if (collection === null) {
      return next(new Errors.NotFound('Unable to find collection with given id'))
    }

    JSONpatch.apply(collection, patches)

    var validation = Types.Collection.validate(collection)

    if (validation.valid === false) {
      console.log('La collection non è valida', collection)
      var err = Utils.augment(new Errors.BadRequest(), validation)
      return next(err)
    }

    db.collection('products')
      .find({
        application_id: req.client.application_id,
        id: {
          $in: collection.items.map(item => item.product_id)
        }
      })
      .toArray(function (err, foundProducts) {
        if (err) {
          return next(err)
        }

        if (foundProducts.length < collection.items.length) {
          // products
          var notFoundItems = collection.items
            .map(item => item.product_id)
            .filter(id => {
              return foundProducts.map(p => p.id).indexOf(id) === -1
            })
          return next(new Errors.BadRequest('Unable to find product(s) with id ' +
            notFoundItems.toString()))
        }
        console.log('TUTTI PRODOTTI SONO GIUSTI')

        // If all products are found, i can write to db
        db.collection('collections')
          .update({
            id: Number(req.params.id),
            application_id: req.client.application_id
          },
          collection,
          function (err) {
            if (err) {
              return next(err)
            }

            res.send({
              status: true,
              data: collection
            })
          })
      })
  })
})

Router.delete('/:id', requireAuth('collections', 'delete'), function (req, res, next) {
  req.app.get('mongodb').collection('collections').remove({
    id: Number(req.params.id),
    application_id: req.client.application_id
  }, function (err) {
    if (err) {
      return next(err)
    }

    res.send({
      status: true
    })
  })
})

module.exports = Router
