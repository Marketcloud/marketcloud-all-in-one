//HTTP Error Codes for Marketcloud API v0

var Errors = {}


Errors.ServiceUnavailable = function(message) {
    var e = {
        'code': 503,
        'type': 'ServiceUnavailable',
        'message': 'The server is currently unavailable.'
    }
    if ('undefined' !== typeof message)
        e.message = message

    return e;

}


Errors.BadGateway = function(message) {
    var e = {
        'code': 502,
        'type': 'BadGateway',
        'message': 'The server was acting as a gateway or proxy and received an invalid response from the upstream server.'
    }
    if ('undefined' !== typeof message)
        e.message = message

    return e

}

Errors.InternalServerError = function(message) {
    var e = {
        'code': 500,
        'type': 'InternalServerError',
        'message': 'Internal server error'
    }
    if ('undefined' !== typeof message)
        e.message = message

    return e

}

Errors.NotFound = function(message) {
    var e = {
        'code': 404,
        'message': 'Not found',
        'type': 'NotFound'
    }
    if ('undefined' !== typeof message)
        e.message = message

    return e

}

Errors.BadRequest = function(message) {
    var e = {
        'code': 400,
        'type': 'BadRequest',
        'message': 'Bad request'
    }
    if ('undefined' !== typeof message)
        e.message = message

    return e

}

Errors.Unauthorized = function(message) {
    var e = {
        'code': 401,
        'type': 'Unauthorized',
        'message': 'Not authorized'
    }
    if ('undefined' !== typeof message)
        e.message = message

    return e

}

Errors.MethodNotAllowed = function(message) {
    var e = {
        'code': 405,
        'type': 'MethodNotAllowed',
        'message': 'Method not allowed'
    }
    if ('undefined' !== typeof message)
        e.message = message

    return e

}
Errors.NotAcceptable = function(message) {
    var e = {
        'code': 406,
        'type': 'NotAcceptable',
        'message': 'The request\'s format is not acceptable. Check Content-Type header for a list of acceptable formats.'
    }
    if ('undefined' !== typeof message)
        e.message = message

    return e

}
Errors.Conflict = function(message) {
    var e = {
        'code': 409,
        'type': 'Conflict',
        'message': 'The request could not be completed due to a conflict with the current state of the resource.'
    }
    if ('undefined' !== typeof message)
        e.message = message

    return e

}
Errors.UnprocessableEntity = function(message) {
    var e = {
        'code': 422,
        'type': 'UnprocessableEntity',
        'message': 'The syntax of the request is correct but some values could be invalid (e.g. wrong type).'
    }
    if ('undefined' !== typeof message)
        e.message = message

    return e

}
Errors.TooManyRequests = function(message) {
    var e = {
        'code': 429,
        'type': 'TooManyRequests',
        'message': 'The user has sent too many requests in a given amount of time. more info at GET /v0/rate'
    }
    if ('undefined' !== typeof message)
        e.message = message

    return e

}



module.exports = Errors;
