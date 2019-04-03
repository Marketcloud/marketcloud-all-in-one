

module.exports = function(app) {

	var Schematic = require('../../../../js/schematic.js');

	app.factory('Models',function(){

    var ApplicationSchema = new Schematic.Schema('Application',{
      name : {
        type : "string",
        required : true,
        min : 3,
        max : 140
      },
      url : {
        type : "string",
        min : 6,
        max : 140
      },
      ecommerce_category : {
        type : "string"
      },
      reason : {
        type : "string",
        whitelist : ['myself','client']
      }
    })
    return {
      Application : ApplicationSchema
    }
  })


}