var Types = require('../models/types.js')

var Cart = function(data) {

	for (var k in data)
		this[k] = data[k];


	if (!this.hasOwnProperty("items"))
		this.items = []
		// Normalizing variant ids
	this.items.forEach(function(i) {
		i.variant_id = i.variant_id || 0;
	})
}



function ObjectsAreEqual(a, b) {
	// NO DEEP TESTS
	var result = true;
	for (var k in a)
		if (a[k] !== b[k])
			result = false;
	return result;
}

// return true if the cart has an item like this
Cart.prototype.hasItem = function(product_id, variant_id) {
	return this.items.some(function(p) {
		return (p.product_id === product_id && p.variant_id === variant_id)
	})
}



Cart.prototype.getItemIndex = function(item) {
	if (!this.hasItem(item.product_id, item.variant_id))
		return -1;
	var index = null;
	for (var k = 0; k < this.items.length; k++) {
		if (this.items[k]['product_id'] === item.product_id && this.items[k]['variant_id'] === item.variant_id)
			index = k
	}
	return index;
}


Cart.prototype.add = function(items) {
	var cart = this;
	items
		.map(function(i) {
			i.variant_id = i.variant_id || 0
			return i
		})
		.forEach(function(i) {
			if (cart.hasItem(i.product_id, i.variant_id)) {
				cart.items[cart.getItemIndex(i)]['quantity'] += i.quantity;

				if (cart.items[cart.getItemIndex(i)]['quantity'] <= 0) {
					// Se la quantità del prodtto rimasta nel carrello diventa ngativa o nulla,
					// lo rimuovo dal carrello
					cart.items.splice(cart.getItemIndex(i), 1)
				}
			} else {
				cart.items.push(i)
			}
		})
};


Cart.prototype.update = function(items) {
	var cart = this;
	items
		.map(function(i) {
			i.variant_id = i.variant_id || 0
			return i
		})
		.forEach(function(i) {
			if (cart.hasItem(i.product_id, i.variant_id)) {
				cart.items[cart.getItemIndex(i)]['quantity'] = i.quantity
				if (i.quantity === 0){
					// Then we have to remove the item from the cart
					cart.items.splice(cart.getItemIndex(i),1);
				}
			} else {
				cart.items.push(i)
			}
		})

};



Cart.prototype.remove = function(items) {
	var cart = this;
	items
		.map(function(i) {
			i.variant_id = i.variant_id || 0
			return i;
		})
		.forEach(function(i) {
			if (cart.hasItem(i.product_id, i.variant_id)) {
				cart.items.splice(cart.getItemIndex(i), 1)
			}
		})


};


// Wraps patch operations
Cart.prototype.patch = function(patch) {

	var func_name = patch.op;
		//func name è uno tra add remove e update
	this[func_name](patch.items);
}

function itemIsInInventory(item, inventory) {
	var found = false;
	inventory.forEach(function(inv) {
		if (inv.product_id === item.product_id && inv.variant_id === item.variant_id)
			found = true
	})
	return found;
}

Cart.prototype.validateAgainstInventory = function(inventory) {
	var cart = this;
	var error = null;
	var valid = this.items.every(function(item) {
		var valid = true,
			found = false;

		if (item.quantity < 0) {
			valid = false
			error = 'Invalid quantity ' + item.quantity
			return false;
		}

		inventory.forEach(function(entry) {

			if (entry.product_id === item.product_id && entry.variant_id === item.variant_id) {
				found = true;

				if (entry.stock_type === 'track' && entry.stock_level < item.quantity) {
					valid = false;
					error = 'The requested quantity for product with id ' + entry.product_id + ' is not available'
					return false
				}

				if (entry.stock_type === 'status' && entry.stock_status !== 'in_stock') {
					valid = false;
					error = 'The product with id ' + entry.product_id + ' is not available'
					return false
				}

			}
		})
		if (false === found)
			error = "Item not found in inventory (" + JSON.stringify(item) + ")" + "\n" + JSON.stringify(inventory)

		return valid && found;
	})


	if (valid)
		return {
			valid: true
		}
	else
		return {
			valid: false,
			error: error
		}
}




Cart.prototype.getData = function() {
	var _this = this;
	return {
		items: _this.items || null,
		id: _this.id || null,
		user_id: _this.user_id || null
	}
}



module.exports = Cart;