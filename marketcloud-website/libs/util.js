var Utils = {};
var Errors = require('../libs/errors.js');
//fvar sequelize = require('sequelize');

Utils.isInteger = function(n) {
    if ("number" === typeof n)
        return (Number(n) === n && n % 1 === 0)
    if ("string" === typeof n) {
        var p = ~~Number(n);
        return String(p) === n && p >= 0;

    }
}

Utils.stringIsInteger = function(n) {
    return /^[0-9]+$/.test(n)
}
Utils.stringIsFloat = function(n) {
    return /^[0-9]+\.+[0-9]{0,2}$/.test(n)
}
Utils.stringIsNumber = function(n) {
    return /^[0-9]+\.*[0-9]*$/.test(n)
}

Utils.removeKeysFromObject = function(obj, keys) {
    for (var k in obj)
        if (keys.indexOf(k) > -1)
            delete obj[k]
}


Utils.removeProperties = function(obj, keys) {

    var remove = function(_obj) {
        for (var k in _obj)
            if (keys.indexOf(k) > -1)
                delete _obj[k]
    }

    if (obj instanceof Array)
        obj.forEach(x => remove(x))
    else
        remove(obj)
    
}




Utils.isDifferent = function(value,arr) {
    if (arr instanceof Array)
        return arr.indexOf(value) > -1
    else
        return value !== arr
}
Utils.projectProductToVariant = function(product,variant_id) {
    if (!(product.variants instanceof Array)){
        throw new Error('The product with id '+product.id+' does not have variants');
    }
    var the_variant = product.variants.filter(v => v.id === variant_id).pop();
    product.variant = the_variant
    return Utils.filterObject(product,['application_id','variants','_id'])
}

//Returns true if the array has at least 1 item
// that match the 2 parameter. which must be object
Utils.arrayHasObject = function(arr,obj) {
    

    return arr.some(function(a){
        var equal = true;
        for (var k in obj) {
            if (a[k] !== obj[k])
                equal = false;
        }
        return equal;
    })
}

/*
    Returns an object with all the properties
    whose name is in the array props
    @param props Array THe array of property names to preserve
*/
Utils.subset = function(obj, props) {
    var buf = {};
    for (var k in obj) {
        if (props.indexOf(k) > -1)
            buf[k] = obj[k]
    }
    return buf
}

// Opposite of subset, keeps all props from object except those whose name is in the
// array
Utils.subsetInverse = function(obj, props) {
    var buf = {};
    for (var k in obj) {
        if (props.indexOf(k) < 0)
            buf[k] = obj[k]
    }
    return buf
}

Utils.filterObject = Utils.subsetInverse;

Utils.augment = function(obj1, obj2, avoidIntersections) {
    if (true !== avoidIntersections || 'undefined' === typeof avoidIntersections)
        avoidIntersections = false;

    for (var k in obj2) {
        if (!(obj1.hasOwnProperty(k) && true === avoidIntersections))
            obj1[k] = obj2[k]
    }
    return obj1
}

Utils.hasAllKeys = function(obj, keys) {
    if (!(keys instanceof Array))
        throw new Error("Utils.hasAllKeys([object],[array<string>] ");
    var n = keys.length;
    for (var i = 0; i < n; i++)
        if (!obj.hasOwnProperty(keys[i]))
            return false
    return true
}

Utils.hasAKey = function(obj, keys) {
    if (!(keys instanceof Array))
        throw new Error("Utils.hasAllKeys([object],[array<string>] ");
    var n = keys.length;
    for (var i = 0; i < n; i++)
        if (obj.hasOwnProperty(keys[i]))
            return true
    return true
}

Utils.packSubdocuments = function(obj, prefix) {
    for (var k in obj) {
        if (k.indexOf(prefix) > -1) {
            if (!obj.hasOwnProperty(prefix))
                obj[prefix] = {}
            obj[prefix][k.replace(prefix + '_', '')] = obj[k];
            delete obj[k];

        }
    }
}

/*
 *   This utility takes the output of a query which is unstructured and
 *   structures connected resources inside it in a JSON API way.
 *
 *   @param {object} Object The object containing the relationships
 *   @param {props} Array<string> The list of names of props if id is null is skipped
 *
 */
Utils.GroupResourceRelationships = function(object, props) {
    var relationships = {}
    props.forEach(function(p) {
        if (object.hasOwnProperty(p + '_id') && object[p + '_id'] !== null) {
            console.log("L oggetto ha la relationship "+p)
            relationships[p] = {}
            for (var k in object) {
                //Se l'oggetto contiene link_propName
                if (k.indexOf(p + '_') > -1) {
                    relationships[p][k.replace(p + '_', '')] = object[k]
                    delete object[k]
                }
            }
        } 
    })
    
    return relationships
}


Utils.RemoveNullRelationships = function(object,props) {
    props.forEach(function(p) {
        if (object.hasOwnProperty(p+'_id') && object[p+'_id'] === null)
            for (var k in object) {
                //Cerco tutte le p_qualcosa
                    if (k.indexOf(p + '_') > -1) {
                        delete object[k]
                    }
                }

        })
}

/*
    
*/
/*
 *   Returns true if every key in object is in array whitelist
 *   @param {test} Object The object to test
 *   @param {whitelist} Array The array to use as whitelist
 */
Utils.whitelistObject = function(test, whitelist) {
    if (!(whitelist instanceof Array))
        throw new Error('whitelist must be array.')
    for (var k in test)
        if (whitelist.indexOf(k) < 0)
            return k
    return true
}

/*
 *   Returns true if test contains only items contained in whitelist
 *   @param {test} Array The array to test
 *   @param {whitelist} Array The array to use as whitelist
 */
Utils.whitelistArray = function(test, whitelist) {
    if (!(whitelist instanceof Array))
        throw new Error('whitelist must be array.')
    var r = true;
    test.forEach(function(item) {
        if (whitelist.indexOf(item) < 0)
            r = item
    })
    return r
}

Utils.parseIntegersInObject = function(object) {
    var t = {}
    for (var k in object)
        if (Utils.stringIsInteger(object[k]))
            t[k] = parseInt(object[k], 10)
        else
            t[k] = object[k]
    return t;
}

Utils.concat = function() {
    var t = []
    var args = Array.prototype.slice.call(arguments);
    args.forEach(function(a) {
        t = t.concat(a)
    })
    return t
}

Utils.parseFloatsInObject = function(object) {
    var t = {}
    for (var k in object)
        if (Utils.stringIsFloat(object[k]))
            t[k] = parseFloat(object[k], 10)
        else
            t[k] = object[k]
    return t;
}





/*Utils.getSequelizeErrorHandler = function(request,response,next) {
    return function(error) {
        console.log(error)
        if (error instanceof sequelize.ValidationError) {
            response.send(400, {
                status: false,
                errors: [new Errors.BadRequest()]
            })
        } else if (error instanceof sequelize.UniqueConstraintError) {
		response.send(400, {
                status: false,
                errors: [new Errors.BadRequest('The query violated a "unique" constraint.')]
            })
	}
	else if (error instanceof sequelize.ForeignKeyConstraintError) {
		response.send(400, {
                status: false,
                errors: [new Errors.BadRequest('A non-existing resource was referenced.')]
            })
	}
	else {
            next(error)
        }
    }
}*/

Utils.SendResponse = function(response,config) {
    response.send(config.status,config.data)
}


Utils.isUndefined = function(a) {
    return 'undefined' === typeof a
}
Utils.isNull = function(a) {
    return null === a
}


Utils.hasValue = function(a) {
    return (!Utils.isUndefined(a) && !Utils.isNull(a))
}

Utils.isSet = Utils.hasValue;

/*
*   @param  objects, Array of objects from which properties must be extracted
*   @param  properties, Array of strings which are the names of the properties to extract
* 
*   Example
*   var objects = [
        { "name" : "Mario", "email" : "mario@mail.com"},
        { "name" : "Martteo", "email" : "matteo@mail.com"},
        { "name" : "Marco", "email" : "marco@mail.com"}
    ]
    }
    Utils.extract(objects,["email"])
    -> [{"email" : "mario@mail.com"},
        {"email" : "matteo@mail.com"},
        {"email" : "marco@mail.com"}]
*/
Utils.extract = function(objects, properties) {
    if (!Utils.hasValue(objects) || !Utils.hasValue(properties))
        throw new Error('Cant apply Utils.extract to null or undefined')
    var accumulator = [];
    objects.forEach(function(o) {
        accumulator.push(Utils.subset(o, properties))
    })
    return accumulator

    /* questo può essere fatto in maniera piu elegante
    objects.map(function(o){return Utils.subset(o,properties)})*/
}

Utils.filterObjects = Utils.extract;

/*
*   @param  objects, Array of objects from which properties must be extracted
*   @param  properties, Array of strings which are the names of the properties to extract
* 
*   Example
*   var objects = [
        { "name" : "Mario", "email" : "mario@mail.com"},
        { "name" : "Martteo", "email" : "matteo@mail.com"},
        { "name" : "Marco", "email" : "marco@mail.com"}
    ]
    }
    Utils.extract(objects,["email"])
    -> ["mario@mail.com","matteo@mail.com","marco@mail.com"]
*/
Utils.extractOne = function(objects, property) {
    if (!Utils.hasValue(objects) || !Utils.hasValue(property))
        throw new Error('Cant apply Utils.extractOne to null or undefined')
    var accumulator = [];
    objects.forEach(function(o) {
        accumulator.push(o[property])
    })
    return accumulator
}

Utils.renameProperties = function(obj, remapping) {
    var b = {}
    for (var k in remapping) {
        b[remapping[k]] = obj[k];
    }
    return b
}

Utils.getFieldsList = function(fields_string) {
    if ('string' !== typeof fields_string)
        throw new Error("Utils.getFieldsList(fields_string :<String>) wrong argument's type, got ",fields_string);

    if ('fields_string'.length === 0)
        return [];

    if (fields_string.slice(-1) == ',')
        fields_string = fields_string.slice(0, -1)
    if (fields_string === '')
        return []
    return fields_string.split(',')
}

Utils.Queries = {};

Utils.Queries.getNewUID = "REPLACE INTO id_store (stub) VALUES ('a'); SELECT LAST_INSERT_ID(); ";


Utils.OutputOperatorsList = ['fields', "sort_by","page","per_page"]



Utils.objectToQueryString = function(obj) {
    var qs = '?';
    for (var k in obj) {
        qs += k+'='+obj[k]+'&';
    }
    return qs
}
/*
 *   Returns an object suitable to be passed to SequelizeModel.findAll
 *
 *   @param {req_query} object The http request query object
 *   @param {filter_attributes}  The array that states which params are recognized filters
 */
Utils.BuildQueryForListMethods = function(req_query, filter_attributes) {
    var query = {},
        where = {},
        fields = []

    if (req_query.hasOwnProperty('fields'))
        fields = Utils.getFieldsList(req_query.fields)

    for (var k in req_query) {
        if (filter_attributes.indexOf(k) > -1) {
            //Then its a resource attribute
            //We must use it to narrow the query result
            where[k] = req_query[k]
        }
    }
    query.where = where;
    if (fields.length > 0)
        query.fields = fields
}


/*
 *   Returns an object suitable to be passed to SequelizeModel.findAll
 *
 *   @param {req_query} object The http request query object
 *   @param {filter_attributes}  The array that states which params are recognized filters
 */
Utils.BuildQueryForGetByIdMethods = function(req_query) {
    var query = {},
        fields = []

    if (req_query.hasOwnProperty('fields'))
        fields = Utils.getFieldsList(req_query.fields)
    if (fields.length > 0)
        query.fields = fields
}

/**
 * [getPagination description]
 * @param  {[type]} config [description]
 * @return {[type]}        [description]
 */
Utils.getPagination = function(config) {

    var limit = config.limit;
    var skip = config.skip;
    var count = config.count;
    var pages = parseInt(count / limit,10);
    var current_page = parseInt(skip / limit,10) +1;



    // Fixing pages
    // If the collection contiains e.g. 42 items
    // and the limit is 20
    // then the number of pages must be 3
    if (count > limit && count % limit !== 0)
        pages++;

    // if the collection contains 19 elements
    // but the limit is 20
    // then the previous fractions would give us 0 pages
    // which is not correct
    if (pages === 0) {
        pages++;
    }
    
    // Fixing current_page
    if (skip === 0){
        console.log("Non skippi un cazzo quindi current_page è 1")
        current_page = 1;
    }

    // Hypermedia links object
    var links = {
        curr: 'http://api.marketcloud.it/v0/'+config.resource + Utils.objectToQueryString(config.req_query)
    };


    // TODO if the query has filters, they must be re-used here

    if (skip !== 0) {
        var q = config.req_query;

        q['page'] = Number(q['page']) - 1;
        links.prev = 'http://api.marketcloud.it/v0/'+config.resource + Utils.objectToQueryString(q);
    }
    if (skip + limit < count) {
        var q = config.req_query;
        if (!q['page'])
            q['page'] = 1

        q['page'] = Number(q['page']) + 1;
        links.next = 'http://api.marketcloud.it/v0/'+config.resource + Utils.objectToQueryString(q);
    }
    return {
        _links : links,
        count : count,
        page : current_page,
        pages : pages
    }
}





module.exports = Utils;
