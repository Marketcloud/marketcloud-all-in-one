var express = require('express')
var Router = express.Router()

var Errors = require('../models/errors.js'),
  Middlewares = require('../middlewares.js'),
  Types = require('../models/types.js'),
  Utils = require('../libs/util.js')

// Shortcut
var requireAuth = Middlewares.verifyClientAuthorization

function prepareQuery (req, res, next) {
  req.data_query = {
    where_statement: {

    }
  }
  next()
}

function addWhereStatement (req, res, next) {
  var query = req.data_query

  query.where_statement = Utils.subsetInverse(req.query, Utils.OutputOperatorsList)
  query.where_statement['request.application_id'] = req.client.application_id
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

// Resource_name is the event name
function countResource (resource_name, storage_engine) {
  storage_engine = storage_engine || 'MongoDB'

  // Only supporting mongodb right now
  // we will check for the storage engine and then switch function
  // to return.
  return function (req, res, next) {
    var query = req.data_query,
      db = req.app.get('mongodb')

    db.collection('logs')
      .find(query.where_statement)
      .count(function (err, count) {
        if (err) { return next(err) }

        req.pagination = Utils.getPagination({
          count: count,
          limit: query.limit,
          skip: query.skip,
          req_query: req.query,
          resource: resource_name
        })

        next()
      })
  }
}

Router.get('/',
  requireAuth('events', 'list'),
  prepareQuery,
  addWhereStatement,
  addPaginationParams,
  addSorting,
  addProjection,
  countResource('events', 'Mongodb'),
  function (req, res, next) {
    var query = req.data_query,
      db = req.app.get('mongodb')

    db.collection('logs')
      .find(query.where_statement, query.projection)
      .skip(query.skip)
      .limit(query.limit)
      .sort(query.sort)
      .toArray(function (err, data) {
        if (err) { return next(err) }

        var response = Utils.augment({
          status: true,
          data: data
        }, req.pagination)

        res.send(response)
      })
  })

Router.get('/:id', requireAuth('events', 'getById'),
  function (req, res, next) {
    function isNormalInteger (str) {
      var n = ~~Number(str)
      return String(n) === str && n >= 0
    }

    var db = req.app.get('mongodb')

    var query = {
      application_id: req.client.application_id
    }

    if (isNormalInteger(req.params.id)) { query.id = Number(req.params.id) } else { query.name = req.params.id }

    db.collection('logs').findOne(query, function (err, event) {
      if (err) { return next(err) }
      if (event === null) { return next(new Errors.NotFound('Unable to find event ' + req.params.id)) }

      res.ok(event)
    })
  })

Router.post('/', requireAuth('events', 'create'), function (req, res, next) {
  var db = req.app.get('mongodb'),
    sequelize = req.app.get('sequelize')

  var validation = Types.Event.validate(req.body)
  if (validation.valid === false) {
    var err = new Errors.BadRequest()
    Utils.augment(err, validation)
    return next(err)
  }
  var newEvent = req.body

  // Must validate items in products array
  // [{product_id : 111}, {product_id : 11,variant_id:12}]
  // Checking if products exists

  var sequelize = req.app.get('sequelize')
  sequelize.query(Utils.Queries.getNewUID, {
    type: sequelize.QueryTypes.SELECT
  })
    .then(function (new_id) {
      new_id = new_id[1]['0']['LAST_INSERT_ID()']
      newEvent.id = new_id
      newEvent.application_id = req.client.application_id

      db.collection('logs')
        .insert(newEvent, function (err) {
          if (err) { return next(err) }

          res.send({
            status: true,
            data: newEvent
          })
        })
    })
    .catch(Utils.getSequelizeErrorHandler(req, res, next))
})
Router.put('/:id', requireAuth('events', 'update'), function (req, res, next) {
  var update = req.body

  var validation = Types.Event.validate(update)

  delete req.body['_id']
  delete req.body['application_id']

  if (validation.valid === false) { return next(Utils.augment(new Errors.BadRequest(), validation)) }

  req.app.get('mongodb').collection('logs')
    .findAndModify({
      application_id: req.client.application_id,
      id: Number(req.params.id)
    }, [], {
      $set: req.body
    }, {
      'new': true
    },
    function (err, doc) {
      doc = doc.value

      if (err) { return next(err) }

      if (doc === null) {
        return res.status(404).send({
          status: false,
          errors: [new Errors.NotFound()]
        })
      }

      res.send({
        status: true,
        data: doc
      })
    })
})

Router.delete('/:id', requireAuth('events', 'delete'), function (req, res, next) {
  req.app.get('mongodb')
    .collection('logs').remove({
      id: Number(req.params.id),
      application_id: req.client.application_id
    }, function (err) {
      if (err) { return next(err) }

      res.send({
        status: true
      })
    })
})

module.exports = Router
