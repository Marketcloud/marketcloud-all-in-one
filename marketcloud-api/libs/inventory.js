var Promise = require('bluebird'),
	Utils = require('./util.js'),
	Types = require('../models/types.js'),
	Errors = require('../models/errors.js');


function Inventory(config) {

	this.mongodb = config.mongodb;
	this.client = config.client;
	this.sequelize = config.sequelize;
}

Inventory.prototype.update = function(line_items) {

	var _this = this;
	var InventoryModel = _this.sequelize.import(__dirname + '/../models/inventory.model.js');
	var sequelize = _this.sequelize;

	var items_to_query = line_items
	.map(function(i){
		return {
				product_id: i.product_id,
                variant_id : i.variant_id || 0,
                application_id : _this.application_id
            }
	});


	

    InventoryModel.findAll({
            'where': {$or:items_to_query}
    }).then(function(items_in_inventory){
    	
    	products_with_finite_inventory = items_in_inventory.filter(x => x.stock_type === 'track');

    	//So gia che l'ordine è valido, quindi non devo controllare
    	//
    	

    })

	return sequelize.transaction(function(t) {
                // chain all your queries here. make sure you return them.
                //sequelize.query('',{transaction:t, type : sequelize.QueryTypes.UPDATE})
                return sequelize.Promise.map(products_with_finite_inventory, function(p) {
                        console.log("La quantity da rimuovere è " + prod_quantity_in_order_map[p.id])
                        return sequelize.query('UPDATE products SET stock_level = stock_level - :quantity WHERE id = :id AND application_id = :applicationId;', {
                            transaction: t,
                            type: sequelize.QueryTypes.UPDATE,
                            replacements: {
                                quantity: prod_quantity_in_order_map[p.id],
                                applicationId: req.client.application_id,
                                id: p.id
                            }
                        })
                    })
    });
}