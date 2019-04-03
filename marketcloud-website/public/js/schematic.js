var Schematic = {};

Schematic.Validators = {};


//Shord-hand validation aginst schema
//Using this method is possible to validate an object without pre-instancing an instance

Schematic.validate = function(schema,object) {
	var s = new Schematic.Schema("temp",schema);
	return s.validate(object);
}

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
			throw new Error("Schematic error, Schematic.Validators.type encountered a not supported type ("+typeof toTest+").");
		break;
	}
	

}
//{type:array, elements : {}}
Schematic.Validators.elements = function(elements,schema) {
	if (!(elements instanceof Array))
		throw new Error('Schematic error, Schematic.Validators.elements can be applied only for Array types');

	if ('object' !== typeof schema)
		throw new Error('Schematic error, Schematic.Validators.elements(<Array>,<SchemaObject>)');
	var t = null;
	var result = true;
	elements.forEach(function(e){
		t = validateAgainstSchema(e,schema);
		if (false === t.valid)
			result = false;
	})
	return result
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



var SchemaStack = [];
var PropertyStack = [];
function getSchemaStack() {
	return SchemaStack.join('.');
}

function validateAgainstSchema(value,schema) {
		if (schema.hasOwnProperty('required')){

			if (schema.required === true && ('undefined' === typeof value || null === value) )
				return {valid:false, failedValidator:"required"}
			

			if (schema.required !== true  && ('undefined' === typeof value || null === value))
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
		 	console.log("Lo schema",schema,"Ha un type del cazzo")
			throw new Error('Schematic error, type constraint accepts only strings and Schematic.Schema values.')
		}
}
/*
Schematic.Schema.prototype.validate = function(object) {
	if ('undefined' === typeof object || null === object)
		throw new Error('Schematic error, null or undefined cannot be validated')

	SchemaStack = [];
	PropertyStack = [];

	SchemaStack.push(this.name);

	var r = {valid : true}
	for (var property in object) {
		PropertyStack.push(property)
		if (!this.schema.hasOwnProperty(property) && schema.hasOwnProperty('strictMode'))
			return {valid : false, failedValidator:'propertyNotInSchema', invalidPropertyName:property}


		if (!this.schema.hasOwnProperty(property) && !schema.hasOwnProperty('strictMode'))
			return {valid:true}

		r = validateAgainstSchema(object[property],this.schema[property]);
		//console.log("Validating property "+property+" of schema "+this.name+"against property schema ",this.schema[property])
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
*/
Schematic.Schema.prototype.validate = function(object) {
	if ('undefined' === typeof object || null === object)
		throw new Error('Schematic error, null or undefined cannot be validated')

	if (object instanceof Array)
		return {valid: false, failedValidator:'type', invalidPropertyName:'Object'}


	SchemaStack = [];
	PropertyStack = [];

	SchemaStack.push(this.name);

	var r = {valid : true}
	for (var property in this.schema) {
		PropertyStack.push(property)

		

		if (!object.hasOwnProperty(property) && this.schema[property].required === true)
			r = {valid : false, failedValidator:'missingRequiredProperty', invalidPropertyName:property}
		
		if (object.hasOwnProperty(property)){

			r = validateAgainstSchema(object[property],this.schema[property]);
		}
		


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
	window.Schematic = Schematic;

if ('undefined' !== typeof module)
	module.exports = Schematic;

