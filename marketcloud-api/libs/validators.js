var Schematic = {
  _schemas: {}
}

Schematic.Model = function(schema) {
  var the_model = function(data) {
    this.__schema = schema
    for (var k in data) {
      this[k] = data[k]
    }
  }

  the_model.prototype.validate = function() {
    return Schematic.validate(this.__schema, this)
  }

  the_model.prototype.get = function(key) {
    return this[k]
  }

  the_model.prototype.set = function(key, value) {
    this[k] = value
  }

  the_model.prototype.toJson = function() {

  }

  return the_model
}

// var ProductModel = new Schematic.Model(Types.SimpleProduct);
// var myProduct = new ProductModel();

Schematic.Validators = {}

// TODO add strict schema
// if the schema is strict, we iterate object keys
// otherwise we iterate schema keys
// in non-strict mode, properties not in schema are accepted
// in strict mode, properties not in schema are rejected

// Shord-hand validation aginst schema
// Using this method is possible to validate an object without pre-instancing an instance

Schematic.validate = function(schema, object) {

  var s = new Schematic.Schema('temp', schema);

  return s.validate(object)
}

// Suppported types
// Number String Array Object
Schematic.Validators.type = function(toTest, wanted) {
    switch (wanted) {
      case 'array':
        return (Array.isArray(toTest))
          // return (toTest instanceof Array)
        break
      case 'number':
        // return ('number' === typeof toTest)
        return (!Number.isNaN(toTest) && toTest !== null && toTest !== '' && typeof toTest === 'number')
        break
      case 'string':
        return (typeof toTest === 'string')
        break

      case 'object':
        return (typeof toTest === 'object')
        break
      case 'boolean':
        return (typeof toTest === 'boolean')
        break
      default:
        throw new Error('Schematic error, Schematic.Validators.type encountered a not supported type (' + typeof toTest + ').')
        break
    }
  }
  // {type:array, elements : { type : MyCystomSchemaType}}
Schematic.Validators.elements = function(elements, schema) {
  if (!(elements instanceof Array)) {
    throw new Error('Schematic error, Schematic.Validators.elements can be applied only for Array types')
  }

  if (typeof schema !== 'object') {
    throw new Error('Schematic error, Schematic.Validators.elements(<Array>,<SchemaObject>)')
  }
  var to_return = true

  // Evito di validarli tutti
  var elements_length = elements.length
  for (var k = 0; k < elements_length; k++) {

    var context = {
      object: elements[k],
      schema: schema
    }

    PropertyStack.push(k)

    var validation = validateValueAgainstSchema(elements[k], schema);

    if (validation.valid === false) {
      to_return = false
      break
    } else {
      PropertyStack.pop()
    }
  }
  return to_return
}

Schematic.Validators.required = function(value) {
  if (typeof value === 'undefined' || value === null) {
    return false
  } else {
    return true
  }
}

Schematic.Validators.whitelist = function(value, whitelist) {
  if (whitelist.indexOf(value) < 0) {
    return false
  } else {
    return true
  }
}

Schematic.Validators.blacklist = function(value, blacklist) {
  if (blacklist.indexOf(value) < 0) {
    return true
  } else {
    return false
  }
}

Schematic.Validators.min = function(value, min) {
  if (typeof value === 'number') {
    return (value >= min)
  } else if (typeof value === 'string') {
    return (value.length >= min)
  } else if (value instanceof Array) {
    return (value.length >= min)
  } else {
    throw new Error('Schematic.Validators.min works only with numbers, strings and arrays')
  }
}

Schematic.Validators.max = function(value, max) {
  if (typeof value === 'number') {
    return (value <= max)
  } else if (typeof value === 'string') {
    return (value.length <= max)
  } else if (value instanceof Array) {
    return (value.length <= max)
  } else {
    throw new Error('Schematic.Validators.max works onlywith numbers, strings and arrays')
  }
}

Schematic.Schema = function(name, schema) {
  if (typeof name !== 'string') {
    throw new Error('First argument of Schematic.Schema must be string')
  }
  if (typeof schema !== 'object') {
    throw new Error('Second argumentm of Schematic.Schema must be an object')
  }
  this.name = name
  this.schema = schema

  Schematic._schemas[name] = schema
}

Schematic.Schema.prototype.toJson = function() {
  return this.schema
}

var SchemaStack = []
var PropertyStack = []

function getSchemaStack() {
  return SchemaStack.join('.')
}

// Valida una singola proprieta contro lo schema di una singola proprietà
function validateValueAgainstSchema(value, schema, context) {

  if (schema.required === true && (typeof value === 'undefined' || value === null)) {
    return {
      valid: false,
      failedValidator: 'required',
      message: 'Missing required property'
    }
  }


  var isRequired = function(schema) {
    return (schema.required === true || "function" === typeof schema.required)
  }


  // If the value is null or undefined, but not required, we just let it pass
  if (!isRequired(schema) && (typeof value === 'undefined' || value === null)) {
    return {
      valid: true
    }
  }

  if (typeof schema.type === 'object') {
    return schema.type.validateRecursive(value)
      // Test with this
      // return Schematic.validate(schema.type.schema,value);
  } else if (typeof schema.type === 'string') {


    // First of all let's validate the type
    if (Schematic.Validators['type'](value, schema['type']) === false)
      return {
        valid: false,
        failedValidator: "type",
        invalidPropertyValue: value
      }

    for (var rule in schema) {



      // Unkown validator name
      if (!Schematic.Validators.hasOwnProperty(rule) && "function" !== typeof schema[rule])
        throw new Error('Schematic cannot find validator named ' + rule)


      // Custom validator
      if (!Schematic.Validators.hasOwnProperty(rule) && "function" === typeof schema[rule]) {
        var validation = schema[rule](value, schema, context);
        if (validation.valid === false)
          return validation;

      } else {
        if (Schematic.Validators[rule](value, schema[rule]) === false)
          return {
            valid: false,
            failedValidator: rule,
            invalidPropertyValue: value
          }
      }



    }

    return {
      valid: true
    }

  } else if (!schema.hasOwnProperty('type')) {
    for (var rule in schema) {
      if (!Schematic.Validators.hasOwnProperty(rule)) {
        throw new Error('Schematic cannot find validator named ' + rule)
      }
      if (Schematic.Validators[rule](value, schema[rule]) === false)
        return {
          valid: false,
          failedValidator: rule,
          invalidPropertyValue: value
        }
    }
    return {
      valid: true
    }
  } else {
    throw new Error('Schematic error, type constraint accepts only strings and Schematic.Schema values.')
  }
}

Schematic.Schema.prototype.validate = function(object) {


  if (typeof object === 'undefined' || object === null) {
    throw new Error('Schematic error, null or undefined cannot be validated')
  }

  if (object instanceof Array) {
    return {
      valid: false,
      failedValidator: 'type',
      invalidPropertyName: 'Object',
      message: 'Expected Object, got Array'
    }
  }

  SchemaStack = []
  PropertyStack = []
  SchemaStack.push(this.name)

  var r = {
    valid: true
  }
  for (var property in this.schema) {
    PropertyStack.push(property)

    if (!object.hasOwnProperty(property) && this.schema[property].required === true) {
      r = {
        valid: false,
        failedValidator: 'required',
        invalidPropertyName: property,
        message: 'Missing required property ' + property
      }
    }

    if (object.hasOwnProperty(property) || "function" === typeof this.schema[property].required) {

      var context = {
        schema: this.schema,
        object: object
      }
      r = validateValueAgainstSchema(object[property], this.schema[property], context)
    }

    if (r.valid === false) {

      r.invalidPropertyValue = object[property]
      if (typeof r.invalidPropertyName === 'undefined') {
        r.invalidPropertyName = PropertyStack.join('.')
      }
      return r
    } else {
      PropertyStack.pop()
    }
  }
  SchemaStack.pop()
  return r
}

Schematic.Schema.prototype.validateProperty = function(name, value) {
  // If a null or undefined value is provided but the property is required
  // we return an error
  if ((value === null || typeof value === 'undefined') &&
    this.schema.hasOwnProperty(name) &&
    this.schema[name].required === true) {
    return {
      valid: false,
      failedValidator: 'required',
      invalidPropertyName: name,
      message: 'Property ' + name + ' is required'
    }
  }
  var r = {
    valid: true
  }

  if (this.schema.hasOwnProperty(name)) {
    r = validateValueAgainstSchema(value, this.schema[name])
  }
  r.invalidPropertyName = name
  return r
}

Schematic.Schema.prototype.getPropertyNames = function() {
  if (Object.keys) {
    return Object.keys(this.schema)
  }
}

Schematic.Schema.prototype.validateRecursive = function(object) {
  SchemaStack.push(this.name)

  var r = {
    valid: true
  }
  for (var property in object) {
    PropertyStack.push(property)
      // TODO add a strict flag and then check for properties not in schema.
      // Default is allow


    // We validate only if the property is in schema, otherwise we let it be.
    if (this.schema.hasOwnProperty(property)) {
      var context = {
        schema: this.schema,
        object: object
      }
      r = validateValueAgainstSchema(object[property], this.schema[property], context)
    }

    if (r.valid === false) {
      // throw new Error("Schematic validation: property "+PropertyStack.join('.')+" failed for validator "+r.failedValidator+" in schema "+getSchemaStack()+" .")
      if (typeof r.invalidPropertyName === 'undefined') {
        r.invalidPropertyName = PropertyStack.join('.')
      }

      return r
    } else {
      PropertyStack.pop()
    }
  }
  SchemaStack.pop()
  return r
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = Schematic
} else {
  if (typeof define === 'function' && define.amd) {
    define([], function() {
      return Schematic
    })
  } else {
    window.Schematic = Schematic
  }
}