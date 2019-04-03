'use strict'

const Express = require('express')
const Router = Express.Router()
const Types = require('../models/types.js')
const Errors = require('../models/errors.js')
const Utils = require('../libs/util.js')
const Middlewares = require('../middlewares.js')
const sanitize = require('sanitize-filename')
const fs = require('fs')
const multer = require('multer')
const azure = require('azure-storage')
const mimeTypes = require('mime-types')
const config = require('../config/default.js')

/* ******************************
    MULTER
******************************* */

// The filepath where files are uploaded
const MULTER_DESTINATION = './file_uploads/'

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, MULTER_DESTINATION)
  },
  filename: function (req, file, cb) {
    cb(null, req.client.application_id + '-' + Date.now() + '-' + file.originalname)
  }
})

var upload = multer({
  dest: MULTER_DESTINATION,
  storage: storage
})

// This is a reference to the multer callback funnction
var uploadFunction = upload.single('file')

// The isntance of Blob Storage Service
var blobService = azure.createBlobService(config.storage.azureStorageAccountName, config.storage.azureStorageAccountAccessKey)

// The name of the container inside the azure storage account we are using
const azureContainerName = 'files'

/*

 */
Router.get('/', Middlewares.verifyClientAuthorization('media', 'list'), function (req, res, next) {
  var mongodb = req.app.get('mongodb')
  var query = {
    where: {}
  }

  query.where = Utils.subsetInverse(req.query, Utils.OutputOperatorsList)

  query.where.application_id = req.client.application_id

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

  query.projection = {
    _id: 0
  }
  if (req.query.hasOwnProperty('fields')) {
    var fields = Utils.getFieldsList(String(req.query.fields))

    if (fields.length > 0) {
      query.projection = {}
      fields.forEach(function (fieldName) {
        query.projection[fieldName] = 1
      })
    }
  }

  // Default sorting
  // TODO extend sorting capabilities
  query.sort = Utils.getMongoSorting(req)

  mongodb.collection('media')
    .find(query.where)
    .count(function (err, count) {
      if (err) {
        return next(err)
      }

      mongodb.collection('media')
        .find(query.where)
        .skip(query.skip)
        .limit(query.limit)
        .project(query.projection)
        .sort(query.sort)
        .toArray(function (err, data) {
          if (err) {
            return next(err)
          }

          data = data.map(function (item) {
            delete item._id
            return item
          })

          var pagination = Utils.getPagination({
            count: count,
            limit: query.limit,
            skip: query.skip,
            req_query: req.query,
            resource: 'media'
          })

          var response = Utils.augment({
            status: true,
            data: data
          }, pagination)

          res.send(response)
        })
    }) // count()
})

Router.get('/:id', function (req, res, next) {
  var mongodb = req.app.get('mongodb')

  var fileId = Number(req.params.id)

  var query = {
    application_id: req.client.application_id,
    id: Number(fileId)
  }

  // Now we must apply ACL rules, so if the client
  // has public access rights, we require that the resource
  // has no "user_id" on it
  // This is because we don't want to show restricted files to anyone
  if (req.client.access === 'public') {
    query.user_id = {
      '$exists': false
    }
  }
  if (req.client.access === 'user') {
    // Then this is a logged user with some role
    query.user_id = req.client.user_id
  }

  var projection = {
    _id: 0
  }
  if (req.query.hasOwnProperty('fields')) {
    var fields = Utils.getFieldsList(String(req.query.fields))

    if (fields.length > 0) {
      projection = {}
      fields.forEach(function (fieldName) {
        projection[fieldName] = 1
      })
    }
  }

  var options = {
    fields: projection
  }

  mongodb.collection('media')
    .findOne(query, options, function (err, media) {
      if (err) {
        return next(err)
      }

      if (media === null) {
        return next(new Errors.NotFound())
      }

      delete media._id

      res.send({
        status: true,
        data: media
      })
    })
})

Router.put('/:id', function (req, res, next) {
  // Deleting some read only properties that cannot be updated;
  delete req.body['_id']
  delete req.body['id']
  delete req.body['application_id']

  var _findOneQuery = {
    application_id: req.client.application_id,
    id: Number(req.params.id)
  }

  req.app.get('mongodb').collection('media')
    .findOne(_findOneQuery,
      function (err, document) {
        if (err) {
          return next(err)
        }

        if (document === null) {
          return next(new Errors.NotFound('Unable to find file with id ' + req.params.id))
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

        var validation = Types.FileUpdate.validate(document)

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

        req.app.get('mongodb').collection('media')
          .update({
            application_id: req.client.application_id,
            id: Number(req.params.id)
          },
          updateObject,
          function (err) {
            if (err) {
              return next(err)
            }

            return res.send({
              status: true,
              data: document
            })
          })
      })
})

Router.delete('/:id', function (req, res, next) {
  var mongodb = req.app.get('mongodb')

  var fileId = req.params.id

  mongodb.collection('media').remove({
    application_id: req.client.application_id,
    id: Number(fileId)
  }, function (err) {
    if (err) {
      return next(err)
    }

    res.send({
      status: true
    })
  })
})

var uploadBase64FileToAzure = function (req, res, next) {
  var validation = Types.File.validate(req.body)

  if (validation.valid === false) {
    var error = new Errors.BadRequest()
    error = Utils.augment(error, validation)
    return next(error)
  }

  // buf = new Buffer(req.body.file.replace(/^data:image\/\w+;base64,/, ""),'base64')
  // var fileBuffer = new Buffer(req.body.file,'base64');
  var fileBuffer = new Buffer(req.body.file.replace(/^data:image\/\w+;base64,/, ''), 'base64')

  // If the MIME Type is not provided with the payload
  // we take the content type from the base64 encoded string
  // if not provided and cannot be inferred from the string
  // We default to
  var contentType = 'text/plain'

  if (req.body.hasOwnProperty('mime_type')) {
    contentType = req.body.mime_type
  } else {
    contentType = mimeTypes.lookup(req.body.filename)

    if (contentType === false) {
      contentType = 'text/plain'
    }
  }

  var originalFileName = req.body.filename
  var filename = req.client.application_id + '_' + (new Date()).getTime() + '_' + originalFileName

  var sequelize = req.app.get('sequelize')
  var mongodb = req.app.get('mongodb')

  // Upload options
  var options = {
    contentSettings: {
      contentType: contentType,
      contentEncoding: 'base64'
    }
  }
  blobService.createBlockBlobFromText(azureContainerName, filename, fileBuffer, options, function (error, result, response) {
    if (error) {
      return next(error)
    }

    var fileData = Utils.subsetInverse(req.body, ['file'])

    if (!fileData.access) {
      fileData.access = 'public'
    }

    Utils.augment(fileData, {
      mime_type: contentType,
      application_id: req.client.application_id,
      original_filename: originalFileName,
      filename: result.name,
      name: req.body.name,
      url: config.storage.azureStorageCDNBaseUrl + '/files/' + result.name,
      size: Buffer.byteLength(req.body.file, 'utf8'),
      created_at: new Date()
    })

    if (req.client.user_id) {
      fileData.user_id = req.client.user_id
    }

    sequelize
      .query(Utils.Queries.getNewUID, {
        type: sequelize.QueryTypes.SELECT
      })
      .then(function (id) {
        fileData.id = id[1]['0']['LAST_INSERT_ID()']

        mongodb.collection('media')
          .insert(fileData, function (err, doc) {
            if (err) {
              return next(err)
            }

            res.send({
              status: true,
              data: fileData
            })
          })
      })
      .catch(Utils.getSequelizeErrorHandler(req, res, next))
  })
}

Router.post('/', Middlewares.verifyClientAuthorization('media', 'create'),
  function (req, res, next) {
    // If the app is uploading a base64 encoded file as a string we use
    // the uploadBase64File handler
    if (req.body && req.body.hasOwnProperty('file')) {
      return uploadBase64FileToAzure(req, res, next)
    }

    // Otherwise we use Multer's middleware to upload files.
    return uploadFunction(req, res, function (err) {
      if (err) {
        // An error occurred when uploading
        var multerErrors = {
          'LIMIT_PART_COUNT': 'Too many parts',
          'LIMIT_FILE_SIZE': 'The file is too large. Try to compress it.',
          'LIMIT_FILE_COUNT': 'Too many files',
          'LIMIT_FIELD_KEY': 'Field name too long',
          'LIMIT_FIELD_VALUE': 'Field value too long',
          'LIMIT_FIELD_COUNT': 'Too many fields',
          'LIMIT_UNEXPECTED_FILE': 'Unexpected field ' + err.field + ' The file field must be named "file".'
        }

        // IF this is a known multer error code, we attach a nice explaination to it
        if (multerErrors.hasOwnProperty(err.code)) {
          return next(new Errors.BadRequest(multerErrors[err.code]))
        } else {
          // Otherwise it is a generic error
          return next(new Errors.BadRequest('Something is wrong with the file you are trying to upload. If you think this is a bug, please contact us at info@marketcloud.it'))
        }
      }

      // Everything went fine

      if (!req.file) {
        return next(new Errors.BadRequest('Missing required parameter "file"'))
      }

      // Get File upload information
      var originalFilename = sanitize(req.file.originalname) // actual filename of file

      var sequelize = req.app.get('sequelize')
      var mongodb = req.app.get('mongodb')

      var filename = originalFilename
        .split(' ')
        .map(s => s.replace(/\W/g, ''))
        .join('_')

      // We prefix the filename with the application id
      filename = req.client.application_id + '_' + filename

      // In order to make new uploads of the same file return the new file, we must append some sort of timestamp
      filename += '-' + String(Date.now())

      blobService.createBlockBlobFromLocalFile(azureContainerName,
        filename,
        req.file.path,
        function (error, result, response) {
          if (error) {
            console.log('An error has occurred while uploading file to Blob Storage')
            fs.unlink(req.file.path, function (err) {
              if (err) {
                console.log('Unable to unlink file after upload error occurred')
              }
            })
            return next(error)
          }

          console.log('Upload to Azure successful,', result)

          var fileData = {
            mime_type: req.file.mimetype,
            application_id: req.client.application_id,
            original_filename: originalFilename,
            name: result.name,
            url: config.storage.azureStorageCDNBaseUrl + '/files/' + result.name,
            size: req.file.size,
            created_at: new Date()
          }

          sequelize
            .query(Utils.Queries.getNewUID, {
              type: sequelize.QueryTypes.SELECT
            })
            .then(function (id) {
              fileData.id = id[1]['0']['LAST_INSERT_ID()']

              mongodb.collection('media').insert(fileData, function (err, doc) {
                if (err) {
                  return next(err)
                }

                // Now we remove the file
                fs.unlink(req.file.path, function (err) {
                  if (err) {
                    return next(err)
                  }

                  res.send({
                    status: true,
                    data: fileData
                  })
                })
              })
            })
            .catch(Utils.getSequelizeErrorHandler(req, res, next))
        })
    })
  })

module.exports = Router
