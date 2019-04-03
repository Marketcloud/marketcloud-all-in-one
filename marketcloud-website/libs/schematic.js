var Schematic = {};
Schematic.Validators = {};

//Suppported types
//Number String Array Object
Schematic.Validators.type = function(toTest,wanted) {
	switch(wanted){
		case 'array':
			return (toTest instanceof Array)
		break;
		case 'number':
			return ('number' === typeof toTest)
		break;
		case "string":
			return ("string" === typeof toTest)
		break;

		case 'object':
			return ('object' === typeof toTest)
		break;
		case 'boolean' :
			return ('boolean' === typeof toTest)
		break;
		default :
			return false;
		break;
	}
	

}
//{type:array, elements : {}}
Schematic.Validators.elements = function(elements,schema) {
	if (!(elements instanceof Array))
		throw new Error('Schematic error, Schematic.Validators.elements can be applied only for Array types');
	var t = null;
	elements.forEach(function(e){
		t = validateAgainstSchema(e,schema);
		if (false === t.valid)
			return false
	})
	return true
}

Schematic.Validators.required = function(value){
	if ('undefined' === typeof value || null === value)
		return false
	else
		return true
}

Schematic.Validators.whitelist = function(value,whitelist) {
	if (whitelist.indexOf(value) <0)
		return false
	else
		return true
}

Schematic.Validators.blacklist = function(value,blacklist) {
	if (blacklist.indexOf(value) <0)
		return true
	else
		return false
}

Schematic.Validators.min = function(value,min) {
	if ('number' === typeof value)
		return (value >= min)
	else if ("string" === typeof value)
		return (value.length >= min)
	else if (value instanceof Array)
		return (value.length >= min)
	else
		throw new Error("Schematic.Validators.min works only with numbers, strings and arrays")
}

Schematic.Validators.max = function(value,max) {
	if ('number' === typeof value)
		return (value <= max)
	else if ("string" === typeof value)
		return (value.length <= max)
	else if (value instanceof Array)
		return (value.length <= max)
	else
		throw new Error("Schematic.Validators.max works onlywith numbers, strings and arrays")
}


Schematic.Schema = function(name,schema){
	if ('string' !== typeof name)
		throw new Error("First argument of Schematic.Schema must be string")
	if ('object' !== typeof schema)
		throw new Error("Second argumentm of Schematic.Schema must be an object")
	this.name = name;
	this.schema = schema;
}


Schematic.Schema.prototype.extend = function(name,schema) {

	var new_schema = JSON.parse(JSON.stringify(this.schema));
	for (var k in schema)
		new_schema[k] = schema[k];

	return new Schematic.Schema(name,new_schema);

}



var SchemaStack = [];
var PropertyStack = [];
function getSchemaStack() {
	return SchemaStack.join('.');
}
function validateAgainstSchema(value,schema) {
		if (schema.required === true && 'undefined' === typeof value){
			return {valid:false, failedValidator:"required"}
		}
		if (schema.required !== true  && ('undefined' === typeof value || null === value)) {
			return {valid:true}
		}
		if ('object' === typeof schema.type ) {
			return schema.type.validateRecursive(value)
		}
		else if ("string" === typeof schema.type) {
			for (var rule in schema) {
				if (!Schematic.Validators.hasOwnProperty(rule))
					throw new Error('Schematic cannot find validator named '+rule)
				if (false === Schematic.Validators[rule](value,schema[rule]))
					return {valid : false, failedValidator: rule}
			}
			return {valid : true}
		}
		 else {
			throw new Error('Schematic error, type constraint accepts only strings and Schematic.Schema values.')
		}
}

Schematic.Schema.prototype.validate = function(object) {
	if ('undefined' === typeof object || null === object)
		throw new Error('Schematic error, null or undefined cannot be validated')

	SchemaStack = [];
	PropertyStack = [];

	SchemaStack.push(this.name);

	var r = {valid : true}
	for (var property in object) {
		PropertyStack.push(property)
		if (!this.schema.hasOwnProperty(property))
			return {valid : false, failedValidator:'propertyNotInSchema', invalidPropertyName:property}
		r = validateAgainstSchema(object[property],this.schema[property]);
		if (r.valid === false){

			//throw new Error("Schematic validation: property "+PropertyStack.join('.')+" failed for validator "+r.failedValidator+" in schema "+getSchemaStack()+" .")
			if ('undefined' == typeof r.invalidPropertyName) {

				r.invalidPropertyName = PropertyStack.join('.');
			}
			return r;
			
		} else {
			PropertyStack.pop();
		}
		
	}
	SchemaStack.pop();
	return r;
}
Schematic.Schema.prototype.getPropertyNames = function(){
	if (Object.keys)
		return Object.keys(this.schema);
}
Schematic.Schema.prototype.validateRecursive = function(object) {
	SchemaStack.push(this.name);

	var r = {valid : true}
	for (var property in object) {
		PropertyStack.push(property)
		if (!this.schema.hasOwnProperty(property))
			return {valid : false, failedValidator:'propertyNotInSchema', invalidPropertyName:property}
		r = validateAgainstSchema(object[property],this.schema[property]);
		if (r.valid === false){
			//throw new Error("Schematic validation: property "+PropertyStack.join('.')+" failed for validator "+r.failedValidator+" in schema "+getSchemaStack()+" .")
			if ('undefined' == typeof r.invalidPropertyName) {

				r.invalidPropertyName = PropertyStack.join('.');
			}
			return r;
			
		} else {
			PropertyStack.pop();
		}
		
	}
	SchemaStack.pop();
	return r;
}


if ('undefined' !== typeof window)
	window.Schematic = Schematic

if (module)
	module.exports = Schematic

