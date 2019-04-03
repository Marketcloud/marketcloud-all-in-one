'use strict'

var Express = require('express'),
  Router = Express.Router(),
  Types = require('../models/types.js'),
  Errors = require('../models/errors.js'),
  Utils = require('../libs/util.js'),
  Middlewares = require('../middlewares.js')

Router.get('/', function (req, res, next) {
  var app_id = req.client.application_id

  var query = 'SELECT name, tax_rate,tax_type, currency_code, logo, timezone FROM applications WHERE id = ' + app_id + ';'

  if (req.client.access === 'admin') {
    query = 'SELECT company_name,company_address,company_postalcode,company_city,company_state,company_country,company_taxid,api_calls_quota_left,api_calls_quota_max,created_at,currency_code,email_address,id,logo,name,owner,renew_date,storage_left,storage_max,tax_rate,tax_type,timezone,url,invoices_prefix FROM applications WHERE id = ' + app_id + ';'
  }

  var sequelize = req.app.get('sequelize')

  return sequelize
    .query(query, {
      type: sequelize.QueryTypes.SELECT
    })
    .then(function (app_data) {
      res.send({
        status: true,
        data: app_data
      })
    })
    .catch(Utils.getSequelizeErrorHandler(req, res, next))
})

/*
 * Updates an application, requires admin privileges
 */
Router.put('/', function (req, res, next) {
  // Admin auth level only
  if (req.client.access !== 'admin') {
    return next(new Errors.Unauthorized())
  }

  var sequelize = req.app.get('sequelize')

  var updatableProperties = [
    'name',
    'url',
    'logo',
    'tax_rate',
    'show_prices_plus_taxes',
    'apply_discounts_before_taxes',
    'tax_type',
    'currency_code',
    'timezone',
    'email_address',
    'company_address',
    'company_postalcode',
    'company_city',
    'company_state',
    'company_country',
    'company_taxid',
    'invoices_prefix'
  ]

  var readableProperties = updatableProperties.concat([
    'api_calls_quota_max',
    'api_calls_quota_left',
    'storage_max',
    'storage_left',
    'created_at'
  ])

  var applicationUpdateData = Utils.subset(req.body, updatableProperties)
  // Some properties are read only, we ensure that they are not edited
  var ApiCache = req.app.get('apicache')

  var Application = sequelize.import(__dirname + '/../models/applications.model.js')

  Application.update(applicationUpdateData, {
    where: {
      id: req.client.application_id
    }
  })
    .then(function (updatedApplication) {
      return Application.findById(req.client.application_id, {
        plain: true
      })
    })
    .then(function (updatedApplication) {
      updatedApplication = updatedApplication.toJSON()
      updatedApplication = Utils.subset(updatedApplication, readableProperties)

      // We fire and forget a cache clear on this application
      ApiCache.del(req.client.application_id, 'application')

      return res.send({
        status: true,
        data: updatedApplication
      })
    })
    .catch(Utils.getSequelizeErrorHandler(req, res, next))
})

Router.get('/currencies', function (req, res, next) {
  var app_id = req.client.application_id

  var query = 'SELECT currencies FROM applications WHERE id = ' + app_id + ';'

  var sequelize = req.app.get('sequelize')

  return sequelize
    .query(query, {
      type: sequelize.QueryTypes.SELECT
    })
    .then(function (app_data) {
      var currencies = JSON.parse(app_data[0].currencies)

      res.send({
        status: true,
        data: currencies
      })
    })
    .catch(Utils.getSequelizeErrorHandler(req, res, next))
})

module.exports = Router
