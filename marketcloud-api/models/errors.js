'use strict'

let Errors = {}

/**
 * Base class for HTTP Errors, codes types and message taken from https://en.wikipedia.org/wiki/List_of_HTTP_status_codes#4xx_Client_errors
 *
 * @param {Number} data.code The HTTP status code (>= 400)
 * @param {String} data.type The HTTP status name (e.g. NotFound or BadRequest)
 * @param {String} data.message The HTTP error explaination.
 */
function HTTPError (data) {
  for (let k in data) { this[k] = data[k] }

  /**
     * This is a useful flag that allows fast checking in error handlers
     * e.g. if (error.isHTTPError === true) {...}
     * @type {Boolean}
     */
  this.isHTTPError = true
}

// This type information will be useful in middlewares to tell
// custom HTTP errors from internal errors like database errors
// and network errors.
Errors.HTTPError = HTTPError

Errors.BadRequest = function (message) {
  let e = {
    'code': 400,
    'type': 'BadRequest',
    'message': 'Bad request'
  }
  if (typeof message !== 'undefined') { e.message = message }

  return new HTTPError(e)
}

/*
*   This "inherits" a BadRequest and a Validation output
*/
Errors.ValidationError = function (validation) {
  let e = {
    'code': 400,
    'type': 'BadRequest'
  }

  for (let k in validation) { e[k] = validation[k] }

  // Reading error message from validation or defaulting
  e.message = e.message || 'ValidationError: your request contains invalid data.'

  return new HTTPError(e)
}

Errors.Unauthorized = function (message) {
  let e = {
    'code': 401,
    'type': 'Unauthorized',
    'message': 'Not authorized'
  }
  if (typeof message !== 'undefined') { e.message = message }

  return new HTTPError(e)
}

Errors.PaymentRequired = function (message) {
  let e = {
    'code': 402,
    'type': 'PaymentRequired',
    'message': 'Payment required'
  }
  if (typeof message !== 'undefined') { e.message = message }

  return new HTTPError(e)
}
Errors.Forbidden = function (message) {
  let e = {
    'code': 403,
    'type': 'Forbidden',
    'message': 'Client has valid credentials, but doesn\'t have access to this action.'
  }
  if (typeof message !== 'undefined') { e.message = message }

  return new HTTPError(e)
}

Errors.NotFound = function (message) {
  let e = {
    'code': 404,
    'message': 'Not found',
    'type': 'NotFound'
  }
  if (typeof message !== 'undefined') { e.message = message }

  return new HTTPError(e)
}

Errors.MethodNotAllowed = function (message) {
  let e = {
    'code': 405,
    'type': 'MethodNotAllowed',
    'message': 'Method not allowed'
  }
  if (typeof message !== 'undefined') { e.message = message }

  return new HTTPError(e)
}
Errors.NotAcceptable = function (message) {
  let e = {
    'code': 406,
    'type': 'NotAcceptable',
    'message': 'The request\'s format is not acceptable. Check Content-Type header for a list of acceptable formats.'
  }
  if (typeof message !== 'undefined') { e.message = message }

  return new HTTPError(e)
}

Errors.RequestTimeout = function (message) {
  let e = {
    'code': 408,
    'type': 'RequestTimeout',
    'message': 'The server timed out waiting for the request.'
  }
  if (typeof message !== 'undefined') { e.message = message }

  return new HTTPError(e)
}

Errors.Conflict = function (message) {
  let e = {
    'code': 409,
    'type': 'Conflict',
    'message': 'The request could not be completed due to a conflict with the current state of the resource.'
  }
  if (typeof message !== 'undefined') { e.message = message }

  return new HTTPError(e)
}
Errors.LengthRequired = function (message) {
  let e = {
    'code': 411,
    'type': 'LengthRequired',
    'message': 'The request did not specify the length of its content, which is required by the requested resource.'
  }
  if (typeof message !== 'undefined') { e.message = message }

  return new HTTPError(e)
}

Errors.PreconditionFailed = function (message) {
  let e = {
    'code': 412,
    'type': 'PreconditionFailed',
    'message': 'The server does not meet one of the preconditions that the requester put on the request.'
  }
  if (typeof message !== 'undefined') { e.message = message }

  return new HTTPError(e)
}

Errors.EntityTooLarge = function (message) {
  let e = {
    'code': 413,
    'type': 'EntityTooLarge',
    'message': 'The request entity is too large to be processed. Please review the documentation at www.marketcloud.it for more information.'
  }
  if (typeof message !== 'undefined') { e.message = message }

  return new HTTPError(e)
}
Errors.PayloadTooLarge = function (message) {
  let e = {
    'code': 413,
    'type': 'PayloadTooLarge',
    'message': 'The request entity is too large to be processed.'
  }
  if (typeof message !== 'undefined') { e.message = message }

  return new HTTPError(e)
}

Errors.URITooLong = function (message) {
  let e = {
    'code': 414,
    'type': 'URITooLong',
    'message': 'The URI provided was too long for the server to process.'
  }
  if (typeof message !== 'undefined') { e.message = message }

  return new HTTPError(e)
}

Errors.UnsupportedMediaType = function (message) {
  let e = {
    'code': 415,
    'type': 'UnsupportedMediaType',
    'message': 'The request entity has a media type which the server or resource does not support.'
  }
  if (typeof message !== 'undefined') { e.message = message }

  return new HTTPError(e)
}

Errors.UnprocessableEntity = function (message) {
  let e = {
    'code': 422,
    'type': 'UnprocessableEntity',
    'message': 'The syntax of the request is correct but some values could be invalid (e.g. wrong type).'
  }
  if (typeof message !== 'undefined') { e.message = message }

  return new HTTPError(e)
}
Errors.TooManyRequests = function (message) {
  let e = {
    'code': 429,
    'type': 'TooManyRequests',
    'message': 'The user has sent too many requests in a given amount of time. more info at GET /v0/rate'
  }
  if (typeof message !== 'undefined') { e.message = message }

  return new HTTPError(e)
}

Errors.RequestHeaderFieldsTooLarge = function (message) {
  let e = {
    'code': 432,
    'type': 'RequestHeaderFieldsTooLarge',
    'message': 'The server is unwilling to process the request because its header fields are too large.'
  }
  if (typeof message !== 'undefined') { e.message = message }

  return new HTTPError(e)
}

Errors.InternalServerError = function (message) {
  let e = {
    'code': 500,
    'type': 'InternalServerError',
    'message': 'Internal server error'
  }
  if (typeof message !== 'undefined') { e.message = message }

  return new HTTPError(e)
}

Errors.NotImplemented = function (message) {
  let e = {
    'code': 501,
    'type': 'NotImplemented',
    'message': 'This endpoint has not been implemented'
  }
  if (typeof message !== 'undefined') { e.message = message }

  return new HTTPError(e)
}

Errors.BadGateway = function (message) {
  let e = {
    'code': 502,
    'type': 'BadGateway',
    'message': 'This service received an invalid response from an upstream service.'
  }
  if (typeof message !== 'undefined') { e.message = message }

  return new HTTPError(e)
}

Errors.ServiceUnavailable = function (message) {
  let e = {
    'code': 503,
    'type': 'ServiceUnavailable',
    'message': 'The server is currently unable to handle the request due to a temporary overloading or maintenance of the server. '
  }
  if (typeof message !== 'undefined') { e.message = message }

  return new HTTPError(e)
}

module.exports = Errors
