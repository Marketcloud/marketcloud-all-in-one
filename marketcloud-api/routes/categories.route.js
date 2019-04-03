'use strict'

var Errors = require('../models/errors.js')
var Types = require('../models/types.js')
var Resource = require('../libs/resource.js')
var mongodb = require('../services/mongodb.service.js')

var resource = Resource({
  singularResourceName: 'category',
  pluralResourceName: 'categories',
  validator: Types.Category,
  hooks: {
    beforeCreate: initializeCategoryPath,
    afterList: fetchSubcategories,
    afterGetById: fetchSubcategories
  }
})

/* Does an additional trasform of the resource instance */
function initializeCategoryPath (req, res, next) {
  if (!req.body.parent_id) {
    req.body.path = '/' + req.body.name
    return next()
  }

  mongodb.getDatabaseInstance()
    .collection('categories')
    .findOne({
      application_id: req.client.application_id,
      id: req.body.parent_id
    }, function (err, document) {
      if (err) {
        return next(err)
      }

      if (document === null) {
        return next(new Errors.NotFound('Unable to find parent category with id ' + req.body.parent_id))
      }

      req.body.path = document.path + '/' + req.body.name

      return next()
    })
}

/*
*   Looks for fetch_subcategories query parameter and if it is truthy
    fetches subcategories
*/
function fetchSubcategories (req, res, next) {
  if (!req.query.fetch_subcategories) {
    return next()
  }

  var payload = req.toSend

  var categoryIds = []

  if (Array.isArray(payload)) {
    categoryIds = payload.map(category => category.id)
  } else {
    categoryIds = [payload.id]
  }

  var mongodb = req.app.get('mongodb')

  mongodb.collection('categories').find({
    application_id: req.client.application_id,
    parent_id: {
      $in: categoryIds
    }
  })
    .toArray((err, subcategories) => {
      if (err) {
        return next(err)
      }

      if (Array.isArray(payload)) {
        payload.forEach((category) => {
          category.subcategories = subcategories.filter(subcategory => subcategory.parent_id === category.id)
        })
      } else {
        payload.subcategories = subcategories.filter(subcategory => subcategory.parent_id === payload.id)
      }

      return res.ok(payload)
    })
}

module.exports = resource.router
