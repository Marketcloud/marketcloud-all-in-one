var mongodb = require('../services/mongodb.service.js');
var mysql = require('../services/mysql.service.js');
var Types = require('../models/types.js');
var sequelize = require('sequelize');
function Payment(data){

	this.__data = {};

	for (var k in data)
		this.__data[k] = data[k];
}

Payment.prototype.save = function(data,callback){

	var newPayment = data;
	mysql.getDatabaseInstance()
	.query(Utils.Queries.getNewUID, {
		type: sequelize.QueryTypes.SELECT
		})
		.then(function(new_id) {
			new_id = new_id[1]["0"]["LAST_INSERT_ID()"];
			newPayment.id = new_id;

			//Now let's insert it into mongodb
			
				mongodb
				.getDatabaseInstance()
				.collection('payments')
				.insert(newPayment,(err) =>{
					if (err)
						return callback(err);
					
					return callback(null,newPayment);
				});
			
		}).catch(function(error){
			return callback(error,null);
		})
	
}

Payment.prototype.validate = function(data) {
	var validation = Types.Payment.validate(data);
	return validation;
}

module.exports = Payment;