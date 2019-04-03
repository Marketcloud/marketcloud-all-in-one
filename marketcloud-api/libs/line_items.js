var Promise = require('bluebird'),
	Utils = require('./util.js'),
	Types = require('../models/types.js'),
	Errors = require('../models/errors.js');




    function validateLineItemsInventory(cart_items,inventory_items) {
        // console.log("\n\n\nVALIDATE_LINE_ITEMS\n\n\n",inventory_items,"\n\n")
    	if (!(cart_items instanceof Array) || !(inventory_items instanceof Array))
    		throw new Error("validateLineItemsInventory accepts only arrays, got other shit")
        
        var index = {};
        inventory_items.forEach(function(i){
            var key =i.product_id+'_'+(i.variant_id || '0')
            index[key] = i;
        });

        for (var k = 0; k< cart_items.length; k++){
            item = cart_items[k];
            
            // Se non è nell'inventario, do errore
            if (!Utils.arrayHasObject(inventory_items,Utils.subset(item,['product_id','variant_id']))){
                return "The requested product with id "+item.product_id+" and variant_id "+item.variant_id+"  was not found in the inventory.";
            } 
           
            
            var inventory_entry = index[item.product_id+'_'+(item.variant_id || '0')];

            // Se non ho abbastanza in inventario do errore
            if (inventory_entry.stock_type === 'track' && inventory_entry.stock_level < item.quantity)
                return "The requested quantity for product with id "+item.product_id+" is not available";

            // Se non è in stock do errore
            if (inventory_entry.stock_type === 'status' && inventory_entry.stock_status !== 'in_stock')
                return "The product with id "+item.product_id+" is not available (Out of stock).";

        }

        return true;

    }

function LineItems(items,config) {
	this.items = items;

	


	this.application_id = config.application_id;
	this.sequelize = config.sequelize;
}


LineItems.prototype.validate = function() {
	var _this = this;
	return new Promise(function(resolve,reject){
		var Inventory = _this.sequelize.import(__dirname + '/../models/inventory.model.js');
		

	
		var items_to_query = _this.items.map(function(i){
			return {
					product_id: i.product_id,
                    variant_id : i.variant_id || 0,
                    application_id : _this.application_id
                }
		})


		
        // console.log("Chiedo all inventario",items_to_query)
        Inventory.findAll({
            'where': {$or:items_to_query}
        }).then(function(response){


        	var items_in_inventory = response.map(function(e){
                return e.toJSON();
            })
            // console.log("Linventario mi ha dato",items_in_inventory)
            // console.log("io ho",_this.items)

            //_this.items =items_in_inventory

            var line_items_validation = validateLineItemsInventory(_this.items,items_in_inventory);
            if (true !== line_items_validation){
                var err = new Errors.BadRequest(line_items_validation);
                reject(err);
            } else {
            	resolve(true);
            }

        })
        .catch(function(response){
        	reject(response)
        })
		
	})
}




module.exports = LineItems