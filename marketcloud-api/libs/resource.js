/*
 *   Builds a regular CRUD endpoint
 */
module.exports = function (endpointConfiguration) {
  'use strict'

  var express = require('express')
  var Router = express.Router()

  var Errors = require('../models/errors.js')
  var Middlewares = require('../middlewares.js')
  var Utils = require('../libs/util.js')
  var HOOKS = endpointConfiguration.hooks || {}

  if (!endpointConfiguration.validator) {
    throw new Error('Missing required configuration parameter "validator" on Resource constructor')
  }

  if (typeof endpointConfiguration.validator !== 'object') {
    throw new Error('Configuration parameter "validator" must be an object')
  }

  if (!endpointConfiguration.singularResourceName) {
    throw new Error('Missing required configuration parameter "singularResourceName" on Resource constructor')
  }

  if (typeof endpointConfiguration.singularResourceName !== 'string') {
    throw new Error('Configuration parameter "singularResourceName" must be a string')
  }

  if (!endpointConfiguration.pluralResourceName) {
    throw new Error('Missing required configuration parameter "pluralResourceName" on Resource constructor')
  }

  if (typeof endpointConfiguration.pluralResourceName !== 'string') {
    throw new Error('Configuration parameter "pluralResourceName" must be a string')
  }

  // Shorthands

  // Used for mostly messages
  var SINGULAR_NAME = endpointConfiguration.singularResourceName
    // Used for endpoint name and collection names
  var PLURAL_NAME = endpointConfiguration.pluralResourceName
    // Schema
  var VALIDATOR = endpointConfiguration.validator

  // Container object to export
  var Resource = {
    singularName: SINGULAR_NAME,
    pluralName: PLURAL_NAME,
    validator: VALIDATOR,
    router: Router,
    hooks: HOOKS
  }

  function runHooks (stage) {
    if (!(stage in HOOKS)) {
      // If the resource does not have hooks at this stage, we skip to the next phase
      return function (req, res, next) {
        next()
      }
    }

    // If the resource has hooks, then we execute them
    return HOOKS[stage]
  }
  Resource.runHooks = runHooks

  // Shortcut
  var requireAuth = Middlewares.verifyClientAuthorization

  function prepareQuery (req, res, next) {
    req.data_query = {
      where_statement: {}
    }
    next()
  }
  Resource.prepareQuery = prepareQuery

  /*
   *     Looks for GET parameters like $param_gt and $param_lt
   */
  function handleComparisonOperators (req, res, next) {
    var query = req.data_query
    var attributeName

    // Checking for comparisons $<attributeName>_gt and $<attributeName>_lt
    for (var k in query.where_statement) {
      if (k.indexOf('_gt') > 0 && k.charAt(0) === '$') {
        attributeName = k.substring(1, k.lastIndexOf('_gt'))
        query.where_statement[attributeName] = {
          $gt: query.where_statement[k]
        }
        delete query.where_statement[k]
      }

      if (k.indexOf('_lt') > 0 && k.charAt(0) === '$') {
        attributeName = k.substring(1, k.lastIndexOf('_lt'))
        query.where_statement[attributeName] = {
          $lt: query.where_statement[k]
        }
        delete query.where_statement[k]
      }
    }
    return next()
  }
  Resource.handleComparisonOperators = handleComparisonOperators

  /*
   * Looks for GET parameters in the following form
   * <NAME>=<V1>,<V2>,<V3>...
   * and maps it into an array
   */
  function handleOrOperations (req, res, next) {
    var OR_CLAUSES = {}
    for (var k in req.query) {
      if (typeof req.query[k] !== 'string') {
        continue
      }

      if (req.query[k].indexOf && req.query[k].indexOf('|') === -1) {
        continue
      }
      var values = req.query[k].split('|')
      OR_CLAUSES[k] = []

      values = values.map(Utils.reviveValue)

      values.forEach(function (value) {
        var o = {}
        o[k] = value
        OR_CLAUSES[k].push(o)
      })

      delete req.data_query.where_statement[k]
    }

    // Mongodb will compain about empty $or $and operator
    // in that case we dont set it into the query
    if (Object.keys(OR_CLAUSES).length === 0) {
      return next()
    }

    var _AND = []
    for (var clauseKey in OR_CLAUSES) {
      _AND.push({
        '$or': OR_CLAUSES[clauseKey]
      })
    }

    if (req.data_query.where_statement.hasOwnProperty('$and')) {
      req.data_query.where_statement.$and = req.data_query.where_statement.$and.concat(_AND)
    } else {
      req.data_query.where_statement.$and = _AND
    }

    return next()
  }
  Resource.handleOrOperations = handleOrOperations

  function addWhereStatement (req, res, next) {
    var query = req.data_query

    query.where_statement = Utils.subsetInverse(req.query, Utils.OutputOperatorsList)

    // Now managing active/inactive resources as well as published unpublished
    if (req.client.access !== 'admin') {
      query.where_statement.$and = query.where_statement.$and || []

      // If the access level is not admin, then we display only active/published resources
      query.where_statement.$and.push({
        $or: [{
          active: true
        }, {
          active: {
            $exists: false
          }
        }]
      })

      query.where_statement.$and.push({
        $or: [{
          published: true
        }, {
          published: {
            $exists: false
          }
        }]
      })
    }

    // Making sure that, if the resource has an ownership ACL rule
    // the current user is authorized to work on the current resource
    if (req.client.access === 'user' && req.acl === '$owner') {
      query.where_statement.user_id = req.client.user_id
    }

    query.where_statement['application_id'] = req.client.application_id
    next()
  }
  Resource.addWhereStatement = addWhereStatement

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

      if(Number(req.query.per_page) <= 0)
        return next(new Errors.BadRequest("'per_page' parameter must be greater than 0." ))

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

      if(Number(req.query.page) <= 0)
        return next(new Errors.BadRequest("'page' parameter must be greater than 0." ))

      query.skip = (Number(req.query.page) - 1) * query.limit
    }

    next()
  }
  Resource.addPaginationParams = addPaginationParams

  function addSorting (req, res, next) {
    var query = req.data_query
      // TODO add sorting
    query.sort = Utils.getMongoSorting(req)
    next()
  }
  Resource.addSorting = addSorting

  /*
   *
   */
  function addProjection (req, res, next) {
    var query = req.data_query

    // The default projection
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
  }
  Resource.addProjection = addProjection

  /*
   *   Queries the database for pagination data
   */
  function countResource (resourceName) {
    return function (req, res, next) {
      var query = req.data_query
      var db = req.app.get('mongodb')
      db.collection(resourceName)
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
            resource: resourceName
          })

          next()
        })
    }
  }

  Resource.countResource = function () { return countResource(PLURAL_NAME) }

  /**
   * @api {get} /resource/ Get a list of Resources
   * @apiName ListResources
   * @apiGroup Resource
   * @apiPermission public
   *
   * @apiDescription Retrieves a sorted, filtered, projected and paginated list of resources.
   * Read more about sorting, filtering and pagination.
   *
   * {{apiParamSection}}
   *
   * {{apiSuccessSection}}
   *
   */
  Router.get('/',
    requireAuth(PLURAL_NAME, 'list'),
    prepareQuery,
    addWhereStatement,
    runHooks('beforeList'),
    handleOrOperations,
    handleComparisonOperators,
    addPaginationParams,
    addSorting,
    addProjection,
    countResource(PLURAL_NAME, 'Mongodb'),
    function (req, res, next) {
      var query = req.data_query
      var db = req.app.get('mongodb')

      db.collection(PLURAL_NAME)
        .find(query.where_statement)
        .skip(query.skip)
        .limit(query.limit)
        .project(query.projection)
        .sort(query.sort)
        .toArray(function (err, data) {
          if (err) {
            return next(err)
          }

          // Removing _id since its purely internal to mongodb;
          data.forEach(function (item) {
            delete item._id
          })

          // Passing data to the middleware chain
          req.toSend = data

          next()
        })
    },
    runHooks('afterList'),
    function (req, res, next) {
      var response = Utils.augment({
        status: true,
        data: req.toSend
      }, req.pagination)

      res.send(response)
    }
  )

  /**
   * @api {get} /resource/:id Read data of a {{resource}}
   * @apiName Get{{Resource}}
   * @apiGroup {{Resource}}
   * @apiPermission public
   *
   * @apiDescription Retrieves a sorted, filtered, projected and paginated list of resources.
   * Read more about sorting, filtering and pagination.
   *
   * @apiParam {Number} id {{Resource}} unique ID.
   *
   * {{apiSuccessSection}}
   *
   *
   */
  Router.get('/:id',
    prepareQuery,
    addProjection,
    requireAuth(PLURAL_NAME, 'getById'),
    runHooks('beforeGetById'),
    function (req, res, next) {
      var db = req.app.get('mongodb')

      var options = {
        fields: req.data_query.projection || {
          _id: 0
        }
      }

      var query = {
        application_id: req.client.application_id,
        id: Number(req.params.id)
      }

      // Making sure that, if the resource has an ownership ACL rule
      // the current user is authorized to work on the current resource
      if (req.client.access === 'user' && req.acl === '$owner') {
        query.user_id = req.client.user_id
      }

      db.collection(PLURAL_NAME)
        .findOne(query, options, function (err, document) {
          if (err) {
            return next(err)
          }
          if (document === null) {
            return next(new Errors.NotFound('Unable to find ' + SINGULAR_NAME + ' with id ' + req.params.id))
          }

          delete document['_id']

          req.toSend = document
          next()
        })
    },
    runHooks('afterGetById'),
    function (req, res, next) {
      return res.ok(req.toSend)
    })

  /**
   * @api {post} /resource Create a new {{resource}}
   * @apiName Create{{Resource}}
   * @apiGroup {{Resource}}
   * @apiPermission admin
   *
   * @apiDescription Retrieves a sorted, filtered, projected and paginated list of resources.
   * Read more about sorting, filtering and pagination.
   *
   * @apiParam {Number} id {{Resource}} unique ID.
   *
   * {{apiSuccessSection}}
   *
   *
   */
  Router.post('/',
    requireAuth(PLURAL_NAME, 'create'),
    runHooks('beforeCreate'),
    function (req, res, next) {
      var db = req.app.get('mongodb')
      var sequelize = req.app.get('sequelize')

      var validation = VALIDATOR.validate(req.body)
      if (validation.valid === false) {
        var err = new Errors.BadRequest()
        Utils.augment(err, validation)
        return next(err)
      }
      var newInstance = req.body

      newInstance.application_id = req.client.application_id

      sequelize.query(Utils.Queries.getNewUID, {
        type: sequelize.QueryTypes.SELECT
      })
        .then(function (newId) {
          // Adding the new unique id
          newId = newId[1]['0']['LAST_INSERT_ID()']
          newInstance.id = newId

          // adding a created_at and updated at
          // with ISO 8601 standard
          var createdUpdatedAt = (new Date()).toISOString()
          newInstance.updated_at = createdUpdatedAt
          newInstance.created_at = createdUpdatedAt

          // Making sure that, if the resource has an ownership ACL rule
          // the current user is authorized to work on the current resource
          if (req.client.access === 'user' && req.acl === '$owner') {
            newInstance.user_id = req.client.user_id
          }

          db.collection(PLURAL_NAME)
            .insert(newInstance, function (err) {
              if (err) {
                return next(err)
              }

              delete newInstance['_id']

              req.toSend = newInstance
              next()
            })
        })
        .catch(Utils.getSequelizeErrorHandler(req, res, next))

      // Must validate items in products array
      // [{product_id : 111}, {product_id : 11,variant_id:12}]
      // Checking if products exists
    },
    runHooks('afterCreate'),
    function (req, res, next) {
      res.ok(req.toSend)
    }
  )

  /**
   * @api {put} /resource Updates a {{resource}}
   * @apiName Update{{Resource}}
   * @apiGroup {{Resource}}
   * @apiPermission admin
   *
   * @apiDescription Updates a {{resource}}
   *
   * @apiParam {Number} id {{Resource}} unique ID.
   *
   * {{apiSuccessSection}}
   *
   *
   */
  Router.put('/:id',
    requireAuth(PLURAL_NAME, 'update'),
    runHooks('beforeUpdate'),
    function (req, res, next) {
      // Deleting some read only properties that cannot be updated;
      delete req.body['_id']
      delete req.body['id']
      delete req.body['application_id']

      var _findOneQuery = {
        application_id: req.client.application_id,
        id: Number(req.params.id)
      }

      // Making sure that, if the resource has an ownership ACL rule
      // the current user is authorized to work on the current resource
      if (req.client.access === 'user' && req.acl === '$owner') {
        _findOneQuery.user_id = req.client.user_id
      }

      req.app.get('mongodb').collection(PLURAL_NAME)
        .findOne(_findOneQuery,
          function (err, document) {
            if (err) {
              return next(err)
            }

            if (document === null) {
              return next(new Errors.NotFound('Unable to find ' + SINGULAR_NAME + ' with id ' + req.params.id))
            }

            // We use this object to track which properties must be un-set
            var unsets = {}

            // Should do a deep patch. This also takes care of removing properties
            for (var k in req.body) {
              if (req.body[k] === null) {
                delete document[k]
                unsets[k] = ''
              } else {
                document[k] = req.body[k]
              }
            }

            // update_at ISO 8601
            document.updated_at = (new Date()).toISOString()

            var validation = VALIDATOR.validate(document)

            if (validation.valid === false) {
              return next(Utils.augment(new Errors.BadRequest(), validation))
            }

            var updateObject = {}

            updateObject['$set'] = document

            // We also unset
            if (Object.keys(unsets).length > 0) {
              updateObject['$unset'] = unsets
            }

            // We don't want to update the object id
            // plus we don't want to send it to the client
            // it makes no sense.
            delete document['_id']

            req.app.get('mongodb').collection(PLURAL_NAME)
              .update({
                application_id: req.client.application_id,
                id: Number(req.params.id)
              },
                updateObject,
                function (err) {
                  if (err) {
                    return next(err)
                  }

                  // return res.send({status : true, data : document});
                  req.toSend = document
                  return next()
                })
          })
    },
    runHooks('afterUpdate'),
    function (req, res, next) {
      return res.ok(req.toSend)
    })

  Router.delete('/:id',
    requireAuth(PLURAL_NAME, 'delete'),
    runHooks('beforeDelete'),
    function (req, res, next) {
      var _deleteQuery = {
        id: Number(req.params.id),
        application_id: req.client.application_id
      }

      // Making sure that, if the resource has an ownership ACL rule
      // the current user is authorized to work on the current resource
      if (req.client.access === 'user' && req.acl === '$owner') {
        _deleteQuery.user_id = req.client.user_id
      }

      req.app.get('mongodb').collection(PLURAL_NAME).remove(_deleteQuery, function (err) {
        if (err) {
          return next(err)
        }

        next()
      })
    },
    runHooks('afterDelete'),
    function (req, res, next) {
      return res.ok()
    }
  )

  // module.exports = Router;

  // return Router

  return Resource
}
