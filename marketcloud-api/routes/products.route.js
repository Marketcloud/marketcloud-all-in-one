'use strict'

var Express = require('express')
var Router = Express.Router()
var Types = require('../models/types.js')
var Errors = require('../models/errors.js')
var Utils = require('../libs/util.js')
var Middlewares = require('../middlewares.js')
var async = require('async')
var elasticsearch = require('../services/elasticsearch.service.js')

/**
    - The list of attributes that must be validated and sent to MySQL
    - Whatever attribute shipped with the resource that is not on this list
    - will be accepted as valid.
**/
var InventoryAttributesList = [
  'stock_type',
  'stock_status',
  'stock_level',
  'application_id'
]
var isInventoryAttribute = function (attr) {
  return InventoryAttributesList.indexOf(attr) > -1
}

function searchInInventory (req, res, next) {
  var queryKeys = Object.keys(req.query)

  // We go to the next middleware if no query parameter is related to the inventory
  if (!queryKeys.some(isInventoryAttribute)) {
    return next()
  }

  var inventoryWhereStatement = {
    application_id: req.client.application_id
  }

  queryKeys
    .filter(isInventoryAttribute)
    .forEach(function (key) {
      inventoryWhereStatement[key] = req.query[key]
      delete req.data_query.where_statement[key]
    })

  var sequelize = req.app.get('sequelize')
  // If the query contain some inventory related query, we must do an inventory lookup
  var Inventory = sequelize.import(__dirname + '/../models/inventory.model.js')
  // Let's look for the corresponding data in the Inventory table
  Inventory.findAll({
    where: inventoryWhereStatement
  }).then(function (inventoryEntries) {
    // inventoryEntries contains the entries that satisfy the query
    // TODO, optimize, since we are gathering inventory data here, we don't need to do it in the main middleware
    // Since query filters operates as an AND, in this step we are getting all the required
    // inventory entries
    var productIds = inventoryEntries.map((item) => item.product_id)

    if (
      Utils.ensureObjectHasProperty(req.data_query, 'where_statement.id.$in') &&
        Array.isArray(req.data_query.where_statement.id['$in'])
    ) {
      // Whe have to intersect the two sets of ids
      var intersection = Utils.intersect(productIds, req.data_query.where_statement.id['$in'])
      req.data_query.where_statement.id['$in'] = intersection
    } else {
      req.data_query.where_statement.id = {
        $in: productIds
      }
    }

    return next()
  })
    .catch(Utils.getSequelizeErrorHandler())
}

var productsController = {

  searchInInventory: searchInInventory,
  addProjection: function (req, res, next) {
    var query = req.data_query

    var defaultProjection = {
      _id: 0
    }

    // Looking for wanted fields
    if (req.query.hasOwnProperty('fields')) {
      // The projection object
      query.projection = {}

      // Getting the list of fields from the queyr parameter "field"
      var fields = Utils.getFieldsList(String(req.query.fields))
      // If there are fields, we set the projection, otherwise we set the default projection
      if (fields.length > 0) {
        fields.forEach(function (fieldName) {
          query.projection[fieldName] = 1
        })
      } else {
        query.projection = defaultProjection
      }
    } else {
      // If there's no field query param, we return default projection
      query.projection = defaultProjection
    }

    next()
  },

  prepareListQuery: function (req, res, next) {
    var query = {
      where_statement: {}
    }

    // Tutto ciò che non è un operatore tipo "limit", "sort_by", "skip" e "fields" è una
    // clausola where.
    query.where_statement = Utils.subsetInverse(req.query, Utils.OutputOperatorsList)

    // Handling queries for multiple products
    // the OR features
    // r.g. GET /v0/products/?id=1,2,3,4,5
    for (var k in query.where_statement) {
      if (typeof query.where_statement[k] === 'string' && query.where_statement[k].indexOf(',') > -1) {
        var _in = query.where_statement[k].split(',')
        _in = _in.map(item => {
          if (!isNaN(item)) {
            return Number(item)
          } else {
            return item
          }
        })
        query.where_statement[k] = {
          $in: _in
        }
      }
    }

    query.where_statement.application_id = req.client.application_id

    /* if (req.client.access !== 'admin')
        query.where_statement.published = true; */

    // Default skip and limit values
    query.skip = 0
    query.limit = 20

    // per_page query param tells how many result
    if (req.query.hasOwnProperty('per_page')) {
      if (!Utils.isInteger(req.query.per_page)) {
        return next(new Errors.BadRequest('"per_page" parameter must be an integer number.'))
      }

      query.limit = Number(req.query.per_page)

      if (query.limit <= 0) { return next(new Errors.BadRequest("'per_page' parameter must be greater than 0")) }
    }

    // page query param tells which interval of produccts should be showed
    if (req.query.hasOwnProperty('page')) {
      if (!Utils.isInteger(req.query.page)) {
        return next(new Errors.BadRequest('"page" parameter must be an integer number.'))
      }

      if (Number(req.query.page) <= 0) {
        return next(new Errors.BadRequest("'page' parameter must be greater than 0"))
      }

      query.skip = (Number(req.query.page) - 1) * query.limit
    }

    // Text searches
    if (req.query.hasOwnProperty('q')) {
      delete query.where_statement['q']
      query.where_statement['$text'] = {
        $search: String(req.query.q)
      }
    }

    // Handling on_sale parameters which allows to look for products wiht a price_discount
    if (req.query.hasOwnProperty('on_sale')) {
      delete query.where_statement.on_sale
      query.where_statement.price_discount = {
        $exists: req.query.on_sale
      }
    }

    // Default sorting
    // TODO extend sorting capabilities
    query.sort = Utils.getMongoSorting(req)

    // Looking for comparison queryes, queries ending with _lt and _gt
    // TODO, unify this with a loop, look for pattenrs *_lt and *_gt

    if (req.query.hasOwnProperty('price_lt')) {
      if (!query.where_statement.hasOwnProperty('price') || typeof query.where_statement.price !== 'object') {
        query.where_statement.price = {}
      }

      query.where_statement['price']['$lt'] = query.where_statement.price_lt
      delete query.where_statement.price_lt
    }

    if (query.where_statement.hasOwnProperty('price_gt')) {
      if (!query.where_statement.hasOwnProperty('price') || typeof query.where_statement.price !== 'object') {
        query.where_statement.price = {}
      }

      query.where_statement['price']['$gt'] = query.where_statement.price_gt
      delete query.where_statement.price_gt
    }

    // Checking the read access
    // TODO, the Write access should give access to unpublished/unactive stuff
    if (req.client.access === 'public' || req.client.access === 'user') {
      query.where_statement.published = true
    }

    req.data_query = query

    if (req.query.hasOwnProperty('category')) {
      // We have to query the db and get the category info;
      // req.query.cateogory is a path e.g. /shoes/sport
      // We have to get all categories which have this tree as a father
      // so for example
      // shoes/sport/running shoes/sport/soccer shoes/sport/soccer/peculiar_soccer_shoes
      if (typeof req.query.category !== 'string') {
        return next(new Errors.BadRequest('Query parameter "category" must be a string. Got ' + typeof (req.query.category)))
      }

      // Using this query to look for wanted categories.
      var queryForCategories = {
        application_id: req.client.application_id
      }

      // Since 0.17.31 supporting multiple category pathsf
      if (req.query.category.indexOf(',') > -1) {
        queryForCategories['$or'] = []

        queryForCategories['$or'] = req.query.category.split(',')
          .filter(function (category) {
            return category.length > 0
          })
          .map(function (category) {
            return {
              path: {
                '$regex': category.replace(/\//g, '\\\/') + '($|\/)' // end of string or an enclosing /
              }
            }
          })
      } else {
        // Using this query to look for wanted categories.
        queryForCategories.path = {
          $regex: req.query.category.replace(/\//g, '\\\/') + '($|\/)' // end of string or an enclosing /
        }
      }

      var db = req.app.get('mongodb')
      db.collection('categories')
        .find(queryForCategories)
        .toArray(function (err, results) {
          if (err) {
            return next(err)
          }

          if (results.length > 0) {
            req.data_query.where_statement['$or'] = []
            /* req.data_query.where_statement['$or'] = results.map((i) => {
              return {
                category_id: i.id
              }
            }) */
            results.forEach(category => {
              req.data_query.where_statement['$or'].push({ category_id: category.id})
              req.data_query.where_statement['$or'].push({ 'variants.category_id': category.id})
            })
            delete req.data_query.where_statement['category']
            return next()
          } else {
            var pagination = Utils.getPagination({
              count: 0,
              limit: query.limit,
              skip: query.skip,
              req_query: req.query,
              resource: 'products'
            })

            var response = Utils.augment({
              status: true,
              data: []
            }, pagination)

            req.toSend = response
            return next()
          }

          // If the requested category does not exist, nor do products in that category
        })
    } else {
      return next()
    }
  },

  list: function (req, res, next) {
    var db = req.app.get('mongodb')
    var sequelize = req.app.get('sequelize')
    var Inventory = sequelize.import(__dirname + '/../models/inventory.model.js')

    var query = req.data_query

    // If the query has a id=>$in[] statement
    // then we have to make sure that the "skip" parameter won't hide all results for us.

    if (req.query.hasOwnProperty('q')) {
      // Then the pagination has been done by elasticsearch
      // we have to set the pagination param "skip" to zero
      // This needs revision.
      query.skip = 0
    }

    db.collection('products')
      .find(query.where_statement, query.projection)
      .count(function (err, count) {
        if (err) {
          return next(err)
        }

        db.collection('products')
          .find(query.where_statement, query.projection)
          .sort(query.sort)
          .skip(query.skip)
          .limit(query.limit)
          .toArray(function (err, data) {
            if (err) {
              var error = new Errors.InternalServerError()
              return next(error)
            } else {
              // Let's look for the corresponding data in the Inventory table
              Inventory.findAll({
                where: {
                  application_id: req.client.application_id,
                  product_id: {
                    $in: data.map(x => x.id)
                    // $in: data.filter(x => Utils.hasVariants(x) !== true).map(x => x.id)
                  }
                }
              }).then(function (inventoryEntries) {
                // Faccio l'index
                var inventoryEntriesMap = {}
                inventoryEntries.forEach(function (e) {
                  inventoryEntriesMap[e.product_id] = e.toJSON()
                })

                // Merging mongodb output with mysql output
                data.forEach(function (productInMongodb) {
                  if (Utils.hasVariants(productInMongodb)) {
                    // we have to merge each inventory line
                    productInMongodb.variants.forEach(function (variant) {
                      // Lets iterate in the array of inventory entries
                      inventoryEntries.forEach(function (inventoryLineRaw) {
                        var inventoryLine = inventoryLineRaw.toJSON()

                        if (variant.id === inventoryLine.variant_id) {
                          // Then we found the nventory entry for ths varant
                          variant = Utils.augment(variant, inventoryLine)
                        }
                      })
                    })
                  } else {
                    // we have to merge 1 inventorry line
                    productInMongodb = Utils.augment(productInMongodb, inventoryEntriesMap[productInMongodb.id])
                  }
                })

                // Removing unwanted properties according to Projection
                // We have to do this manually and cannot simply rely on mongodb
                // because we are merging mongodb data with mysql data
                if (req.query.hasOwnProperty('fields')) {
                  var fields = Object.keys(query.projection)
                  data = data.map(function (product) {
                    // Since projection is done only on mongodb data,
                    // we have to eventually manually remove mysql data
                    return Utils.subset(product, fields)
                  })
                }

                var pagination = Utils.getPagination({
                  count: count,
                  limit: query.limit,
                  skip: query.skip,
                  req_query: req.query,
                  resource: 'products'
                })

                data.forEach(p => {
                  if (p.hasOwnProperty('price')) {
                    p.display_price = String(p.price) + ' ' + req.client.application.currency_code
                  }

                  if (p.hasOwnProperty('price_discount')) {
                    p.display_price_discount = String(p.price_discount) + ' ' + req.client.application.currency_code
                  }
                })

                data = data.map(p => {
                  delete p['_id']
                  return p
                })

                // Overriding sort calculation in the case we have a query by collection.
                // In that case we might want to maintain the ordering inside the collection
                if (req.query.hasOwnProperty('collection_id') && req.query.sort_order === 'COLLECTION') {
                  data.sort((a, b) => {
                    var ar = query.where_statement.id.$in
                    return ar.indexOf(a.id) - ar.indexOf(b.id)
                  })
                }

                var response = Utils.augment({
                  status: true,
                  data: data
                }, pagination)

                // res.send(response)

                req.toSend = response
                // GOing to expansion middleware
                return next()
              })
                .catch(Utils.getSequelizeErrorHandler(req, res, next))
            }
          })
      })
  },

  expandSubResources: function (req, res, next) {
    var payload = req.toSend

    // If there are no expansions to do, we just flush the output to the client :)
    if (!req.query.hasOwnProperty('expand')) {
      return res.send(payload)
    }

    var subResourcesToExpand = req.query.expand.split(',')

    var categoryIds = []
    var brandIds = []

    if (Array.isArray(req.toSend.data)) {
      categoryIds = payload.data
        .filter(product => product.hasOwnProperty('category_id'))
        .map(product => product.category_id)

      brandIds = payload.data
        .filter(product => product.hasOwnProperty('brand_id'))
        .map(product => product.brand_id)
    } else {
      if (payload.data.hasOwnProperty('category_id')) {
        categoryIds = [payload.data.category_id]
      }

      if (payload.data.hasOwnProperty('brand_id')) {
        brandIds = [payload.data.brand_id]
      }
    }

    var mongodb = req.app.get('mongodb')

    var expansionFunctions = {}

    if (categoryIds.length > 0 && subResourcesToExpand.indexOf('category') > -1) {
      expansionFunctions.categories = function (cb) {
        mongodb.collection('categories')
          .find({
            application_id: req.client.application_id,
            id: {
              $in: categoryIds
            }
          }, {
            _id: 0
          })
          .toArray(cb)
      }
    }

    if (brandIds.length > 0 && subResourcesToExpand.indexOf('brand') > -1) {
      expansionFunctions.brands = function (cb) {
        mongodb.collection('brands')
          .find({
            application_id: req.client.application_id,
            id: {
              $in: brandIds
            }
          }, {
            _id: 0
          })
          .toArray(cb)
      }
    }

    async.parallel(expansionFunctions, function (err, results) {
      if (err) {
        return next(err)
      }

      payload._embedded = results

      // If there were no ids to fetch for a given expanded resource
      // but it was still requested, we present an empty array
      // to show that the embed request was correctly understood

      if (!results.hasOwnProperty('brands') && subResourcesToExpand.indexOf('brand') > -1) {
        payload._embedded.brands = []
      }

      if (!results.hasOwnProperty('categories') && subResourcesToExpand.indexOf('category') > -1) {
        payload._embedded.categories = []
      }

      return res.send(payload)
    })
  },

  /*
   * Looks for a GET parameter named collection_id, if there's one, performs a collection lookup in the db
   * If a collection is found, then it sets the ids of the collection in the query
   *
   * IMPORTANT
   *
   * This takes care of intersection of values in the $in operator
   * Other filters using the $in operator should do the same.
   *
   */
  filterByCollection: function (req, res, next) {
    // To minimize the impact on other queries, we immediatly skip to the next
    // middleware if there is no relevant query parameter
    if (!req.query.hasOwnProperty('collection_id')) {
      return next()
    }

    var collectionId = Number(req.query.collection_id)

    delete req.data_query.where_statement.collection_id

    req.data_query = req.data_query || {}

    var db = req.app.get('mongodb')

    db.collection('collections')
      .findOne({
        application_id: req.client.application_id,
        id: collectionId
      }, function (err, collection) {
        if (err) {
          return next(err)
        }

        if (collection === null) {
          // The collection does not exist, we make sure no product will match this query
          req.data_query.where_statement.id = {
            $in: [0]
          }
          return next()
        }

        var idsInCollection = collection.items.map((item) => item.product_id)

        if (
          Utils.ensureObjectHasProperty(req.data_query, 'where_statement.id.$in') &&
          Array.isArray(req.data_query.where_statement.id['$in'])
        ) {
          // Whe have to intersect the two sets of ids
          var intersection = Utils.intersect(idsInCollection, req.data_query.where_statement.id['$in'])
          req.data_query.where_statement.id['$in'] = intersection
        } else {
          // The query does not have a $in operator, we create it now
          req.data_query.where_statement.id = {
            $in: idsInCollection
          }
        }

        return next()
      })
  },
  search: function (req, res, next) {
    if (!req.query.hasOwnProperty('q')) {
      return next()
    }

    var db = elasticsearch.getDatabaseInstance()

    var query = req.data_query

    var searchWord = String(req.query.q)
    // Escaping the query
    searchWord = searchWord
      .replace(/[\*\+\-=~><\"\?^\${}\(\)\:\!\/[\]\\\s]/g, '\\$&') // replace single character special characters
      .replace(/\|\|/g, '\\||') // replace ||
      .replace(/\&\&/g, '\\&&') // replace &&
      .replace(/AND/g, '\\A\\N\\D') // replace AND
      .replace(/OR/g, '\\O\\R') // replace OR
      .replace(/NOT/g, '\\N\\O\\T') // replace NOT

    db.search({
      index: 'products',
      from: query.skip,
      size: query.limit,
      _source: false, // we just need productIds // but this way cant filter
      body: {
        'query': {
          'bool': {
            'must': {
              'query_string': {
                'query': '*' + searchWord + '*'
              }
            },
            'filter': {
              'term': {
                'application_id': req.client.application_id
              }
            }
          }
        }

      }

    },
    function (error, response) {
      if (error) {
        return next(error)
      }

      // Ids of products matching the fulltext query
      var matchingDocumentIds = response.hits.hits.map((hit) => Number(hit._id))

      // Remove mongodb full text param
      delete req.data_query.where_statement['$text']

      if (
        Utils.ensureObjectHasProperty(req.data_query, 'where_statement.id.$in') &&
          Array.isArray(req.data_query.where_statement.id['$in'])
      ) {
        // Then, a middleware is already using the $in operator
        // Whe have to intersect the two sets of ids
        var intersection = Utils.intersect(matchingDocumentIds, req.data_query.where_statement.id['$in'])
        req.data_query.where_statement.id['$in'] = intersection
      } else {
        req.data_query.where_statement.id = {
          $in: matchingDocumentIds
        }
      }

      return next()
    })
  },

  getById: function (req, res, next) {
    if (!Utils.stringIsInteger(req.params.productId)) {
      return next(new Errors.BadRequest('id must be integer'))
    }

    var query = {}
    var fields = []

    var mongodb = req.app.get('mongodb')
    var sequelize = req.app.get('sequelize')
    var Inventory = sequelize.import(__dirname + '/../models/inventory.model.js')

    query.where = {
      id: Number(req.params.productId),
      application_id: req.client.application_id
    }

    // If the field array has bad values we send 400
    if (req.query.hasOwnProperty('fields')) {
      if (typeof req.query.fields !== 'string') {
        return next(new Errors.BadRequest('Invalid format for "fields" parameter.'))
      }

      fields = Utils.getFieldsList(String(req.query.fields))

      if (fields.length === 0) {
        return next(new Errors.BadRequest('Fields operator must have at least one attribute name'))
      }
    }

    query.projection = {}

    // Setto gli attributi
    fields.forEach(function (a) {
      query.projection[a] = true
    })

    if (req.client.access === 'public' || req.client.access === 'user') {
      query.where.published = true
    }

    query.projection = {
      _id: 0
    }

    mongodb.collection('products')
      .findOne(query.where, query.projection, function (err, data) {
        if (err) {
          return next(err)
        }

        if (data === null) {
          return next(new Errors.NotFound())
        }

        Inventory.findAll({
          where: {
            application_id: req.client.application_id,
            product_id: Number(req.params.productId)
          }
        })
          .then(function (inventoryEntries) {
            // Turning sequelize data into objects
            inventoryEntries = inventoryEntries.map(x => x.toJSON())

            if (Utils.hasVariants(data)) {
              // If the product has variants, then the inventory query
              // will result in an array of inventory entries
              // each one corresponding to a variant
              // (No entry for the main product since products with variants
              // only gets inventory entris for variants.)
              data.variants.forEach(function (v) {
                inventoryEntries.forEach(function (i) {
                  if (v.id === i.variant_id) {
                    v = Utils.augment(v, i)
                  }
                })
              })
            } else {
              // If the product has no variants, it can be sold alone
              // and it gets an inventory entry!
              //
              data = Utils.augment(data, inventoryEntries[0])

              // Formatting prices
              data.display_price = String(data.price) + ' ' + req.client.application.currency_code
              if (data.hasOwnProperty('price_discount')) {
                data.display_price_discount = String(data.price_discount) + ' ' + req.client.application.currency_code
              }
            }

            // Removing useless and confusing data
            var output = Utils.subsetInverse(data, ['_id'])

            // Projecting is done at output level
            // because i'm lazy and i need more developers :)
            // PS If you are a new guy consider reminding me
            // that we need to project at query level!
            if (fields.length > 0) {
              output = Utils.subset(output, fields)
            }

            req.toSend = {
              status: true,
              data: output
            }
            return next()
          })
          .catch(Utils.getSequelizeErrorHandler(req, res, next))
      })
  },
  populateBundledProducts: function (req, res, next) {
    var toSend = req.toSend.data

    var bundledProducts = []
    var isBundledProduct = (item) => {
      return item.type === 'bundled_product'
    }
    if (Array.isArray(toSend)) {
      bundledProducts = toSend.filter(isBundledProduct)
    } else {
      if (toSend.type === 'bundled_product') {
        bundledProducts.push(toSend)
      }
    }

    // f we don't have bundled products to populate we skip this middleware
    if (bundledProducts.length === 0) {
      return next()
    }

    var ids = []
    bundledProducts.forEach((product) => {
      product.items.forEach((subProduct) => {
        if (ids.indexOf(subProduct.product_id) === -1) { ids.push(subProduct.product_id) }
      })
    })

    var mongodb = req.app.get('mongodb')

    mongodb.collection('products')
      .find({
        application_id: req.client.application_id,
        id: {
          $in: ids
        }
      })
      .toArray(function (error, subproducts) {
        if (error) { return next(error) }

        var index = {}
        subproducts.forEach(subProduct => {
          index[subProduct.id] = subProduct
        })

        // Now we can augment req.toSend
        if (Array.isArray(toSend)) {
          toSend.forEach(productToSend => {
            if (productToSend.type === 'bundled_product') {
              productToSend.items = productToSend.items.map(item => {
                return index[item.product_id]
              })
            }
          })
        } else {
          toSend.items = toSend.items.map(item => {
            return index[item.product_id]
          })
        }

        req.toSend.data = toSend
        return next()
      })
  },
  create: function (req, res, next) {
    var product = req.body

    if (product.type === 'bundled_product') { return productsController.createBundle(req, res, next) } else { return productsController.createSimpleOrVariantsProduct(req, res, next) }
  },
  createSimpleOrVariantsProduct: function (req, res, next) {
    var product = req.body

    product.type = product.type || 'simple_product'

    // Still trying to infer the product type, for backward compatibility
    if (product.has_variants === true) {
      product.type = 'product_with_variants'
    }

    // We set this flag for legacy reasons, will go away with 1.0.0
    if (product.type === 'product_with_variants') {
      product.has_variants = true
    }

    var validation = null

    if (Utils.hasVariants(product)) {
      validation = Types.ProductWithVariants.validate(product)
    } else {
      validation = Types.Product.validate(product)
    }

    // Managing defaults and constraint of bundled products
    if (product.type === 'bundled_product') {
      // Bundles are "fake products" only here to give information to the system
      product.price = 0
      delete product.price_discount
    }
    // Validation based on the product type
    switch (product.type) {
      case 'simple_product':
        validation = Types.Product.validate(product)
        break
      case 'product_with_variants':
        validation = Types.ProductWithVariants.validate(product)
        break
      case 'grouped_product':
        validation = Types.GroupedProduct.validate(product)
        break
      case 'bundled_product':
        validation = Types.BundledProduct.validate(product)
        break
      default:
        return next(new Errors.BadRequest('Missing required property type. '))
    }

    if (product.stock_type === 'track' && !product.hasOwnProperty('stock_level')) {
      var err = new Errors.BadRequest('Property "stock_level" is required for products with inventory_type "track"')
      err.invalidPropertyName = 'stock_level'
      err.failedValidator = 'required'
      return next(err)
    }

    if (product.stock_type === 'status' && !product.hasOwnProperty('stock_status')) {
      var _err = new Errors.BadRequest('Property "stock_status" is required for products with inventory_type "status"')
      _err.invalidPropertyName = 'stock_status'
      _err.failedValidator = 'required'
      return next(_err)
    }

    if (validation.valid === false) {
      var error = new Errors.BadRequest()
      return next(Utils.augment(error, validation))
    }

    var mongodb = req.app.get('mongodb')
    var sequelize = req.app.get('sequelize')

    var Inventory = sequelize.import(__dirname + '/../models/inventory.model.js')

    sequelize
      .query(Utils.Queries.getNewUID, {
        type: sequelize.QueryTypes.SELECT
      })
      .then(function (newId) {
        newId = newId[1]['0']['LAST_INSERT_ID()']

        product.id = newId
        product.application_id = req.client.application_id

        var productWithoutInventoryData = Utils.filterObject(product, InventoryAttributesList)
        productWithoutInventoryData.application_id = req.client.application_id

        mongodb.collection('products')
          .insert(productWithoutInventoryData, function (err) {
            if (err) {
              return next(err)
            }

            // We send the item for indexing,
            // we can do it without waiting for inventory data to be written.
            var queue = req.app.get('search-queue')
            var message = {
              type: 'index-product',
              action: 'create',
              resource: 'product',
              data: product
            }

            queue.sendToQueue('marketcloud-search-index', message)
              .then(function () {
                return true
              }).catch(function (err) {
                return console.log('Message was not enqueued', err)
              })

            // IF the product DOESN'T have variants
            // then it can be ordered as is, and we create an entry
            // into the inventory for it.
            // If it has variants, we create inventory entries for variants only
            // Still supporting has_variants for legacy reasons.
            if (product.has_variants !== true || product.type !== 'product_with_variants') {
              var inventoryData = Utils.subset(product, InventoryAttributesList)
              inventoryData.product_id = product.id
              inventoryData.application_id = product.application_id

              Inventory.create(inventoryData)
                .then(function (result) {
                  res.send({
                    status: true,
                    data: product
                  })
                })
                .catch(Utils.getSequelizeErrorHandler(req, res, next))
            } else {
              // The product has variants, no inventory entry for it

              res.send({
                status: true,
                data: product
              })
            }
          })
      })
      .catch(Utils.getSequelizeErrorHandler(req, res, next))
  },

  createBundle: function (req, res, next) {
    // Creates a bundle product
    //
    var product = req.body

    if (product.type !== 'bundled_product') { throw new Error('Cannot call createBundle on non-bundle products.') }

    // We must force bundles to have price 0 if we don't want to change code in checkout
    product.price = 0
    delete product['price_discount']

    var validation = Types.BundledProduct.validate(product)

    if (validation.valid === false) {
      return next(new Errors.ValidationError(validation))
    }

    // Now we check existance of items in bundle

    var bundledProductsIds = product.items.map(function (item) {
      return item.product_id
    })

    var mongodb = req.app.get('mongodb')

    mongodb
      .collection('products')
      .find({
        application_id: req.client.application_id,
        id: {
          $in: bundledProductsIds
        }
      })
      .toArray(function (error, products) {
        if (error) { return next(error) }

        // Products in bundle cannot be other bundled products
        // only simple and variated products
        var isBundle = function (item) {
          return item.type === 'bundled_product'
        }
        var invalidBundleItems = products.filter(isBundle)
        if (invalidBundleItems.length > 0) {
          return next(new Errors.BadRequest('Only simple products and product with variants can be added to a bundle. Found invalid product with id ' + invalidBundleItems[0].id))
        }

        // We look for bundle items
        for (var i = 0; i < product.items.length; i++) {
          var item = product.items[i]

          // Now we look for this item in the products array got from db
          var found = false
          products.forEach(function (itemInDatabase) {
            if (itemInDatabase.type === 'simple_product') {
              if (item.product_id === itemInDatabase.id) { found = true }
            }

            if (itemInDatabase.type === 'product_with_variants') {
              if (item.product_id === itemInDatabase.id) {
                // Now we look for matching variant.
                var variantIds = itemInDatabase.variants.map(function (v) {
                  return v.variant_id
                })
                if (variantIds.indexOf(item.variant_id) > -1) { found = true }
              }
            }
          })

          if (found === false) {
            return next(new Errors.BadRequest('Cannot create bundle with non existing item ' + JSON.stringify(item)))
          }
        }

        // If we we get past the for loop, all items in bundle exist.
        //
        // Bundles are somewhat virtual products, they can't have inventory
        // since their availability only depends on bundled items availability

        var sequelize = req.app.get('sequelize')

        sequelize
          .query(Utils.Queries.getNewUID, {
            type: sequelize.QueryTypes.SELECT
          })
          .then(function (newId) {
            newId = newId[1]['0']['LAST_INSERT_ID()']

            product.id = newId
            product.application_id = req.client.application_id

            mongodb.collection('products')
              .insert(product, function (err) {
                if (err) { return next(err) }

                var queue = req.app.get('search-queue')
                var message = {
                  type: 'index-product',
                  action: 'create',
                  resource: 'product',
                  data: product
                }
                queue.sendToQueue('marketcloud-search-index', message)
                  .then(function () {
                    return true
                  }).catch(function (err) {
                    return console.log('Message was not enqueued', err)
                  })

                return res.send({
                  status: true,
                  data: product
                })
              })
          })
          .catch()
      })
  },

  updateProductById: function (req, res, next) {
    // Deleting some read only properties that cannot be updated;
    delete req.body['_id']
    delete req.body['id']
    delete req.body['application_id']
    delete req.body['display_price']
    delete req.body['display_price_discount']

    var mongodb = req.app.get('mongodb')
    var sequelize = req.app.get('sequelize')
    var Inventory = sequelize.import(__dirname + '/../models/inventory.model.js')

    /*
     * Helper function to promisify product update
     */
    var applyMongodbUpdatePromise = function (__query, __update) {
      return new Promise((resolve, reject) => {
        mongodb
          .collection('products')
          .update(__query, __update,
            function (err) {
              if (err) {
                return reject(err)
              }

              return resolve(true)
            })
      })
    }

    mongodb
      .collection('products')
      .findOne({
        application_id: req.client.application_id,
        id: Number(req.params.productId)
      },
      function (err, document) {
        if (err) {
          return next(err)
        }

        if (document === null) {
          return next(new Errors.NotFound('Unable to find product with id ' + req.params.productId))
        }

        // Now we should get mysql data
        Inventory.findAll({
          where: {
            application_id: req.client.application_id,
            product_id: Number(req.params.productId)
          }
        })
          .then(function (inventoryEntries) {
            // Turning sequelize data into objects
            inventoryEntries = inventoryEntries.map(x => x.toJSON())

            if (Utils.hasVariants(document)) {
              // If the product has variants, then the inventory query
              // will result in an array of inventory entries
              // each one corresponding to a variant
              // (No entry for the main product since products with variants
              // only gets inventory entris for variants.)
              document.variants.forEach(function (v) {
                inventoryEntries.forEach(function (i) {
                  if (v.id === i.variant_id) {
                    v = Utils.augment(v, i)
                  }
                })
              })
            } else {
              // If the product has no variants, it can be sold alone
              // and it gets an inventory entry!
              //
              document = Utils.augment(document, inventoryEntries[0])
            }

            // Should do a deep patch. This also takes care of removing properties
            // We must validate the whole object, before separating into product and inventory
            for (var k in req.body) {
              if (req.body[k] === null) {
                delete document[k]
              } else {
                document[k] = req.body[k]
              }
            }

            // update_at ISO 8601
            document.updated_at = (new Date()).toISOString()

            // We don't want to update the object id
            // plus we don't want to send it to the client
            // it makes no sense.
            delete document['_id']

            // Adjusting properties for validation
            if (document.stock_level === null) {
              delete document['stock_level']
            }
            if (document.stock_status === null) {
              delete document['stock_status']
            }

            if (document.stock_type === 'track') {
              delete document['stock_status']
            }

            if (document.stock_type === 'status') {
              delete document['stock_level']
            }

            var validation = {}

            if (document.type === 'product_with_variants') {
              validation = Types.ProductWithVariants.validate(document)
            } else {
              validation = Types.Product.validate(document)
            }

            if (validation.valid === false) {
              return next(Utils.augment(new Errors.BadRequest(), validation))
            }

            // A part of the update will affect the catalogue
            // another part the inventory
            // Here we get ONLY the catalogue part of the update.
            var productUpdate = Utils.filterObject(req.body, InventoryAttributesList)

            // Here we ONLY get the inventory part of the update
            var inventoryUpdate = Utils.subset(req.body, InventoryAttributesList)

            // This will hold the async update operations
            var promises = []

            var updateObject = {}

            updateObject['$set'] = {}
            updateObject['$unset'] = {}

            for (var j in productUpdate) {
              if (productUpdate[j] === null) {
                updateObject['$unset'][j] = ''
              } else {
                updateObject['$set'][j] = productUpdate[j]
              }
            }

            if (Object.keys(updateObject['$unset']).length === 0) {
              delete updateObject['$unset']
            }

            if (Object.keys(updateObject['$set']).length === 0) {
              delete updateObject['$set']
            }

            // If both set and unset are empty we must canccel the update to mongodb

            if (updateObject.hasOwnProperty('$set') || updateObject.hasOwnProperty('$unset')) {
              promises.push(applyMongodbUpdatePromise({
                application_id: req.client.application_id,
                id: Number(req.params.productId)
              },
              updateObject
              ))
            } else {
              promises.push(new Promise(function (resolve, reject) {
                return resolve(true)
              }))
            }

            // At this point we know that the document is ok
            if (Object.keys(inventoryUpdate).length > 0) {
              var inventoryPromise = Inventory.update(inventoryUpdate, {
                where: {
                  application_id: req.client.application_id,
                  product_id: req.params.productId,
                  variant_id: 0
                }
              })
              promises.push(inventoryPromise)
            } else {
              promises.push(new Promise(function (resolve, reject) {
                return resolve(true)
              }))
            }

            return Promise.all(promises)
          })
          .then(function (response) {
            if (res.headersSent) {
              // Then validation occurred
              return
            }

            // We prepare the message for the indexing system
            var message = {
              type: 'index-product',
              action: 'update',
              resource: 'product',
              data: document
            }

            // We send the message to the queue to notify the indexing system
            var queue = req.app.get('search-queue')
            queue.sendToQueue('marketcloud-search-index', message)
              .then(function () {
                return true
              })
              .catch(function (err) {
                return console.log('Message was not enqueued', err)
              })

            res.send({
              status: true,
              data: document
            })
          })
          .catch(Utils.getSequelizeErrorHandler(req, res, next))
      })
  },
  convertCurrency: function (req, res, next) {
    var requestedCurrency = Utils.getRequestedCurrency(req)

    if (!requestedCurrency) {
      return next()
    }

    // the requested currency's symbol, like USD or EUR

    var currencyRate = Utils.getCurrencyRate(requestedCurrency, req.client.application)

    if (currencyRate === null) {
      return next(new Errors.BadRequest('Cannot use currency ' + requestedCurrency + '. Add it first as supported currency in your store\'s admin panel.'))
    }

    // The fetched product or products
    var payload = req.toSend.data

    if (Array.isArray(payload)) {
      payload = payload.map((product) => {
        return Utils.convertProductPrices(product, currencyRate, requestedCurrency)
      })
    } else {
      payload = Utils.convertProductPrices(payload, currencyRate, requestedCurrency)
    }

    req.toSend.data = payload
    return next()
  },
  deleteProductById: function (req, res, next) {
    if (!Utils.stringIsInteger(req.params.productId)) {
      res.send(400, {
        status: false,
        errors: [new Errors.BadRequest('id must be integer')]
      })
      return
    }
    var mongodb = req.app.get('mongodb')
    var sequelize = req.app.get('sequelize')
    sequelize.query(
      'DELETE FROM inventory WHERE product_id = :productId', {
        replacements: {
          'productId': Number(req.params.productId)
        },
        type: sequelize.QueryTypes.DELETE
      }
    ).then(function () {
      // rimuovere anche metadati da mongoodb
      mongodb.collection('products').remove({
        id: Number(req.params.productId),
        application_id: req.client.application_id
      }, function (err) {
        if (err) {
          return next(err)
        }

        var queue = req.app.get('search-queue')
        var message = {
          type: 'index-product',
          action: 'delete',
          resource: 'product',
          data: {
            id: Number(req.params.productId)
          }
        }

        queue.sendToQueue('marketcloud-search-index', message)
          .then(function () {
            return true
          }).catch(function (err) {
            return console.log('Message was not enqueued', err)
          })

        res.send({
          status: true
        })
      })
    })
      .catch(Utils.getSequelizeErrorHandler(req, res, next))
  },
  getVariants: function (req, res, next) {
    var mongodb = req.app.get('mongodb')

    var productId = Number(req.params.productId)

    var projection = {
      variants: 1,
      _id: 0,
      application_id: 0
    }

    mongodb
      .collection('products')
      .find({
        application_id: req.client.application_id,
        id: productId
      }, projection)
      .toArray(function (err, data) {
        if (err) {
          return next(err)
        }

        if (data.length === 0) {
          return next(new Errors.NotFound('This product has no variants.'))
        } else {
          res.send({
            status: true,
            data: data
          })
        }
      })
  },
  updateVariant: function (req, res, next) {
    var mongodb = req.app.get('mongodb')
    var sequelize = req.app.get('sequelize')

    var variantId = Number(req.params.variantId)
    var product = req.product

    var variant = product.variants.filter(variant => variant.id === variantId)

    if (variant.length === 0) {
      return next(new Errors.NotFound('Unable to find variant with id ' + variantId + ' in product ' + product.id))
    }

    variant = variant[0]

    var update = req.body

    for (var k in update) {
      if (update[k] === null) {
        delete variant[k]
      } else {
        variant[k] = update[k]
      }
    }

    if (variant.stock_type === 'track') { delete variant['stock_status'] }
    if (variant.stock_type === 'status') { delete variant['stock_level'] }

    var validation = Types.Variant.validate(variant)

    if (validation.valid === false) {
      var err = Utils.augment(new Errors.BadRequest(), validation)
      return next(err)
    }

    var variantInventoryData = Utils.subset(variant, InventoryAttributesList)
    var variantData = Utils.subsetInverse(variant, InventoryAttributesList)

    function updateVariantCatalogueData (callback) {
      // We substitute the variant
      product.variants.forEach(_variant => {
        if (_variant.id === variant.id) {
          _variant = variantData
        }
      })

      mongodb.collection('products')
        .update({
          application_id: req.client.application_id,
          id: product.id
        }, {
          $set: {
            variants: product.variants
          }
        }, function (err) {
          if (err) {
            return callback(err)
          }

          return callback(null)
        })
    }

    function updateVariantInventoryData (callback) {
      var Inventory = sequelize.import(__dirname + '/../models/inventory.model.js')

      Inventory.update(variantInventoryData, {
        where: {
          application_id: req.client.application_id,
          product_id: product.id,
          variant_id: variantId
        },
        returning: true,
        plain: true
      })
        .then(function (updatedInventory) {
          return callback(null)
        })
        .catch(function (error) {
          return callback(error)
        })
    }

    var functions = {}

    if (Object.keys(variantInventoryData).length > 0) {
      functions['inventory'] = updateVariantInventoryData
    }

    if (Object.keys(variantData).length > 0) {
      functions['catalogue'] = updateVariantCatalogueData
    }

    async.parallel(functions, function (error, result) {
      if (error) {
        return next(error)
      }

      return res.send({
        status: true,
        data: product
      })
    })
  },
  getVariantById: function (req, res, next) {
    var mongodb = req.app.get('mongodb')

    var productId = Number(req.params.productId)
    var variantId = Number(req.params.variantId)

    var query = {}
    var fields = []

    if (req.query.hasOwnProperty('fields')) {
      fields = Utils.getFieldsList(String(req.query.fields))

      // TODO Check whitelisting of requested fields

      if (fields.length === 0) {
        return next(new Errors.BadRequest('Fields operator must have at least one attribute name'))
      }
    }
    query.where = {
      application_id: req.client.application_id,
      id: productId
    }

    if (req.client.access !== 'admin') {
      query.where['published'] = true
    }

    query.projection = {
      _id: 0,
      application_id: 0
    }

    mongodb.collection('products')
      .findOne(query.where, query.projection, function (err, data) {
        if (err) {
          return next(err)
        }

        if (data === null) {
          return next(new Errors.NotFound('Product not found'))
        }

        if (!data.hasOwnProperty('variants')) {
          return next(new Errors.NotFound('Product has no variants'))
        }

        var wantedVariant = null
        data.variants.forEach(function (v) {
          if (v.id === variantId) {
            wantedVariant = v
          }
        })

        var output = Utils.subsetInverse(data, ['_id', 'variants'])

        if (fields.length > 0) {
          wantedVariant = Utils.subset(wantedVariant, fields)
        }

        output.variant = wantedVariant

        res.send({
          status: true,
          data: output
        })
      })
  },
  deleteVariantById: function (req, res, next) {
    var mongodb = req.app.get('mongodb')
    var sequelize = req.app.get('sequelize')

    var productId = Number(req.params.productId)
    var variantId = Number(req.params.variantId)

    var query = {}

    query.where = {
      application_id: req.client.application_id,
      id: productId
    }

    mongodb.collection('products')
      .findOne({
        application_id: req.client.application_id,
        id: productId
      }, function (err, masterProduct) {
        if (err) {
          return next(err)
        }

        for (var i = 0; i < masterProduct.variants.length; i++) {
          if (masterProduct.variants[i].variant_id === variantId) {
            // ITs the variant to remove
            masterProduct.variants.splice(i, 1)
          }
        }

        // Let's recalculate variantsDefinition
        var newVariantsDefinition = Utils.updateVariantsDefinition(masterProduct)

        var removeUpdate = {
          $pull: {
            variants: {
              variant_id: variantId
            }
          },
          $set: {
            variantsDefinition: newVariantsDefinition
          }
        }

        mongodb.collection('products')
          .findAndModify(
            query.where, [],
            removeUpdate, {
              'new': true
            },
            function (err, data) {
              if (err) {
                return next(err)
              }

              if (data === null) {
                return next(new Errors.NotFound('Unable to find product with id ' + productId))
              }

              if (!data.value.hasOwnProperty('variants')) {
                return next(new Errors.NotFound('The product has no variants'))
              }

              sequelize.query(
                'DELETE FROM inventory WHERE product_id = :productId AND variant_id = :variantId', {
                  replacements: {
                    'productId': productId,
                    'variantId': variantId
                  },
                  type: sequelize.QueryTypes.DELETE
                }
              )
                .then(function () {
                  res.send({
                    status: true,
                    data: data.value
                  })
                })
                .catch(Utils.getSequelizeErrorHandler(req, res, next))
            })
      })
  },
  fetchProductData: function (req, res, next) {
    var queryFunctions = {}
    var mongodb = req.app.get('mongodb')
    var sequelize = req.app.get('sequelize')

    if (!Utils.isInteger(req.params.productId)) {
      return next(new Errors.BadRequest('Bad URL parameter: productId must be an integer number'))
    }

    var getMongodbData = function (cb) {
      mongodb.collection('products')
        .findOne({
          application_id: req.client.application_id,
          id: Number(req.params.productId)
        }, cb)
    }

    var getMysqlData = function (cb) {
      var Inventory = sequelize.import(__dirname + '/../models/inventory.model.js')
      Inventory.findAll({
        where: {
          product_id: Number(req.params.productId),
          application_id: req.client.application_id
        }
      })
        .then(rows => {
          return cb(null, rows)
        })
        .catch(error => {
          return cb(error, null)
        })
    }

    queryFunctions.mongodb = getMongodbData
    queryFunctions.mysql = getMysqlData

    async.parallel(queryFunctions, function (err, results) {
      if (err) {
        return next(err)
      }

      var product = results.mongodb

      if (results.mongodb === null) {
        return next(new Errors.NotFound('Unable to find product with id ' + req.params.productId))
      }

      if (!product.hasOwnProperty('variants')) {
        product.variants = []
      }

      product.variants.forEach(variant => {
        results.mysql.forEach(inventoryRow => {
          if (inventoryRow.variant_id === variant.id) {
            variant = Utils.augment(variant, inventoryRow.toJSON())
          }
        })
      })

      req.product = product

      return next()
    })
  },
  createVariants: function (req, res, next) {
    var mongodb = req.app.get('mongodb')
    var sequelize = req.app.get('sequelize')
    // An array of variants, or a single variant
    var variants = req.body
    // if its a single variant i turn it into an array.
    if (!(variants instanceof Array)) {
      variants = [variants]
    }

    function variantIsInvalid (v) {
      return false
    }

    if (variants.some(variantIsInvalid)) {
      // una variante è invalida, quindi fermo tutto
    }
    var masterProduct = req.product

    var maxId = 0

    if (!masterProduct.hasOwnProperty('variants')) {
      masterProduct.variants = []
    }

    masterProduct.variants.forEach((variant) => {
      if (variant.variant_id > maxId) {
        maxId = variant.variant_id
      }
    })

    var newVariantId = maxId + 1
    // This will hold mysql rows
    var inventoryData = []
    variants.forEach(function (variant) {
      // Keeping this for compatibility, but going to remove it
      variant.id = newVariantId // That's ++id instead of id++ this way it will start from 1;
      variant.variant_id = newVariantId

      // This will be used later to re-calculate the masterDefinition
      masterProduct.variants.push(variant)

      // Preparing data for mysql inventory
      var variantInventoryData = Utils.subset(variant, InventoryAttributesList)

      variantInventoryData.product_id = Number(req.params.productId)
      variantInventoryData.variant_id = newVariantId
      variantInventoryData.application_id = req.client.application_id

      // Stock related data and price must be infered from the payload but defaults are taken from other variants
      // This is because the master product does not have inventory related data.
      // At product creation the user tells the stock_type and that is kept

      variantInventoryData.stock_type = variant.stock_type || masterProduct.variants[0].stock_type

      if (variantInventoryData.stock_type === 'status') {
        variantInventoryData.stock_status = variant.stock_status || masterProduct.variants[0].stock_status
      }

      if (variantInventoryData.stock_type === 'track') {
        variantInventoryData.stock_status = variant.stock_level || masterProduct.variants[0].stock_level
      }

      // Pushing the new variant tata into the list of new variants to save into mysql
      inventoryData.push(variantInventoryData)

      // Increasing the counter for the next variant (if any)
      newVariantId++
    })

    // Must also re-calculate the variantsDefinition
    var newVariantsDefinition = Utils.updateVariantsDefinition(masterProduct)

    // The mongodb update
    var _update = {
      $push: {
        variants: {
          $each: variants
        }
      },
      $set: {
        variantsDefinition: newVariantsDefinition
      }
    }

    mongodb.collection('products')
      .findAndModify({
        id: Number(req.params.productId),
        application_id: req.client.application_id
      }, [],
      _update, {
        'new': true
      },
      function (err, updatedProduct) {
        if (err) {
          return next(err)
        }

        var Inventory = sequelize.import(__dirname + '/../models/inventory.model.js')

        Inventory.bulkCreate(inventoryData)
          .then(function (response) {
            res.send({
              status: true,
              data: updatedProduct.value
            })
          })
          .catch(Utils.getSequelizeErrorHandler(req, res, next))
      })
  }

}

/**
 * @api {get} /products/ Get a list of Products
 * @apiName products.list
 * @apiGroup Products
 * @apiPermission public
 *
 * @apiDescription Retrieves a sorted, filtered, projected and paginated list of products.
 * Read more about sorting, filtering and pagination.
 *
 * {{apiParamSection}}
 *
 * {{apiSuccessSection}}
 *
 */
Router.get('/',
  Middlewares.verifyClientAuthorization('products', 'list'),
  productsController.prepareListQuery, // Unpacking the request into our form
  productsController.addProjection, // Gathering projection from the Request
  productsController.searchInInventory, // Performs the first query into the inventory
  productsController.search, // Performs a full text query in ElasticSearch
  productsController.filterByCollection, // Looks for a collection and restricts the result to items in that collection
  productsController.list, // Finally performs the query into the catalogue.
  productsController.populateBundledProducts,
  productsController.convertCurrency,
  productsController.expandSubResources // Eventually expanding sub resources
)

/**
 * @api {get} /products/ Get a list of Products
 * @apiName products.list
 * @apiGroup Products
 * @apiPermission public
 *
 * @apiDescription Retrieves a sorted, filtered, projected and paginated list of products.
 * Read more about sorting, filtering and pagination.
 *
 * {{apiParamSection}}
 *
 * {{apiSuccessSection}}
 *
 */
Router.get('/:productId',
  Middlewares.verifyClientAuthorization('products', 'getById'),
  productsController.getById,
  productsController.populateBundledProducts,
  productsController.convertCurrency,
  productsController.expandSubResources) // Eventually expanding sub resources)

/**
 * @api {get} /products/:id Get a product by id
 * @apiName products.getById
 * @apiGroup Products
 * @apiPermission admin
 *
 * @apiDescription Retrieves a product by id
 *
 * @apiParam {Number} id The id of the product to fetch
 *
 * {{apiSuccessSection}}
 *
 */
Router.post('/',
  Middlewares.verifyClientAuthorization('products', 'create'),
  productsController.create)

/**
 * @api {put} /products/:id Update a  product by id
 * @apiName products.list
 * @apiGroup Products
 * @apiPermission public
 *
 * @apiDescription Retrieves a sorted, filtered, projected and paginated list of products.
 * Read more about sorting, filtering and pagination.
 *
 * {{apiParamSection}}
 *
 * {{apiSuccessSection}}
 *
 */
Router.put('/:productId',
  Middlewares.verifyClientAuthorization('products', 'update'),
  productsController.updateProductById)

Router.patch('/:productId',
  Middlewares.verifyClientAuthorization('products', 'update'),
  productsController.updateProductById)

Router.delete('/:productId',
  Middlewares.verifyClientAuthorization('products', 'delete'),
  productsController.deleteProductById)

Router.post('/:productId/variants',
  Middlewares.verifyClientAuthorization('products', 'create'),
  productsController.fetchProductData,
  productsController.createVariants)

/*
 * @api {put} /products/:productId/variants/:variantId Update a  variant by id
 *
 *   Updates a variant given the update body and the variant and product ids
 */
Router.put('/:productId/variants/:variantId',
  Middlewares.verifyClientAuthorization('products', 'create'),
  productsController.fetchProductData,
  productsController.updateVariant)

Router.get('/:productId/variants/:variantId',
  Middlewares.verifyClientAuthorization('products', 'getById'),
  productsController.getVariantById)

Router.delete('/:productId/variants/:variantId', Middlewares.verifyClientAuthorization('products', 'delete'), productsController.deleteVariantById)

module.exports = Router
