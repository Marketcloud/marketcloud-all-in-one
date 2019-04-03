var frisby = require('./bootstrap')



var testProduct = {
    name: "A song of fire and ice: A feast for crows",
    // category_id: 3,
    sku: "300AAnc",
    price: 7.79,
    stock_type: "track",
    stock_level: 30,
    description: "A Feast for Crows is ..",
    published: true,
    "tags": ["fantasy", "GoT"],
    "isbn-10": "055358202X",
    "isbn-13": "978-0553582024",
    "pages": 1060,
    "editor": "Bantam Books",
    "author": "George R. R. Martin",
    "genre": "Fantasy",
    "cover": "Paperback",
    "publication_year": "2001"


}



/*********************************************************
 *
 *
 *
 *
 *
 **********************************************************/
function TestCreateValidEmptyCart() {
    frisby.create('POST create a new empty cart')
        .post(process.env.url + '/v0/carts/')
        .expectStatus(200)
        .expectJSON({
            status: true
        })
        .afterJSON(addProductToEmptyCart)
        .toss()
}


function TestGetListOfCarts(){
    
    frisby.create("Retrieves a list of carts")
    .get(process.env.url + '/v0/carts?per_page=2')
    .afterJSON(function(json){
        var carts = json.data;

        carts.forEach(function(cart){
            expect(cart.items_total).not.toBeUndefined();
            expect(cart.total_weight).not.toBeUndefined();
            expect(cart.total).not.toBeUndefined();
        })
    })
}


function addProductToEmptyCart(json) {



    frisby.create('Adding fetched line items to empty cart')
        .get(process.env.url + '/v0/products?type=product_with_variants&per_page=2')
        .expectStatus(200)
        .afterJSON(function(response) {

            var products = response.data;
            

            var lineItems = products.map((item) => {
                return {
                    product_id: item.id,
                    quantity: 1,
                    variant_id: item.variants[0].id
                }
            })





            frisby.create('Adding fetched line items to empty cart')
                .patch(process.env.url + '/v0/carts/' + json.data.id, {
                    op: "add",
                    items: lineItems
                }, {
                    json: true
                })
                .expectStatus(200)
                .expectJSON('data',{
                    total : function(total) {
                        if (lineItems.length > 0)
                            expect(total).toBeGreaterThan(0);
                    }
                })
                .afterJSON(function(json){
                    updateProductQuantityInCart(json)
                })
                .toss()
        })
        .toss()



}

function updateProductQuantityInCart(json) {
    frisby.create('Add prod to empty cart')
        .patch(process.env.url + '/v0/carts/' + json.data.id, {
            op: "update",
            items: [{
                product_id: product_ids[0],
                quantity: 3
            }]
        }, {
            json: true
        })
        .expectStatus(200)
        .expectJSON({
            status: true,
        })
        .afterJSON(function(json) {
            var util = require('util');
            frisby.create('DELETE removes a cart')
                .delete(process.env.url + '/v0/carts/' + json.data.id)
                .expectStatus(200)
                .expectJSON({
                    status: true
                })
                .toss()
        })
        .toss()
}



/*********************************************************
 *
 *
 *
 *
 *
 **********************************************************/

function TestCreateCartWithInvalidId() {
    frisby.create('POST create a cart with invalid product ids')
        .post(process.env.url + '/v0/carts/', {
            items: [{
                'product_id': 0,
                'quantity': 1
            }, {
                'product_id': 1,
                'quantity': 1
            }]
        }, {
            json: true
        })
        .expectStatus(400)
        .expectJSON({
            status: false
        })
        .toss()
}



/*********************************************************
 *
 *
 *
 *
 *
 **********************************************************/
function TestCreateCartWithInvalidQuantity() {
    frisby.create('POST create a cart with invalid (one too high) product quantities')
        .post(process.env.url + '/v0/carts/', {
            items: [{
                'product_id': product_ids[0],
                'quantity': 1
            }, {
                'product_id': product_ids[1],
                'quantity': 19999
            }, {
                'product_id': product_ids[2],
                'quantity': 1
            }]
        }, {
            json: true
        })
        .expectStatus(400)
        .expectJSON({
            status: false
        })
        .toss()
}



/*********************************************************
 *
 *
 *
 *
 *
 **********************************************************/
function TestCreateCartWithNegativeQuantity() {
    frisby.create('POST create a cart with invalid (negative) product quantities')
        .post(process.env.url + '/v0/carts', {
            items: [{
                'product_id': product_ids[0],
                'quantity': -1
            }]
        }, {
            json: true
        })

    .expectStatus(400)
        .expectJSON({
            status: false
        })
        .toss()
}


/*********************************************************
 *
 *
 *
 *
 *
 **********************************************************/
function TestCreateCartWithInvalidParameterNames() {
    frisby.create('POST create a cart with invalid (mispelled quantity property name) product quantities')
        .post(process.env.url + '/v0/carts/', {
            items: [{
                'product_id': product_ids[0],
                'q': 19999
            }, {
                'product_id': product_ids[1],
                'inventory': 1
            }]
        }, {
            json: true
        })
        .expectStatus(400)
        .expectJSON({
            status: false
        })
        .toss()
}

/*********************************************************
 *
 *
 *
 *
 *
 **********************************************************/
function TestCreateCartWithInvalidParameterNames2() {
    frisby.create('POST create a cart with invalid product quantities')
        .post(process.env.url + '/v0/carts/', {
            items: [{
                'product_id': product_ids[0],
                'quantity': 1,
                'azxjf': 12
            }, {
                'product_id': product_ids[1],
                'quantoty': 1
            }]
        }, {
            json: true
        })
        .expectStatus(400)
        .expectJSON({
            status: false
        })
        .toss()
}


var TestGetCartWithDifferentCurrency = function(json){
    // We ensure that non matching categor paths are handled properly
    // This Test is addressing a bug discovered in 0.17.29 and to be fixed in 0.17.30
    frisby.create('Retrieve a cart with a specific currency ')
        .get(process.env.url + '/v0/carts/'+json.data.id+'?currency=USD')
        .expectStatus(200)
        .expectJSON('data.items.*',{
            display_price : function(v){
                expect(v.indexOf("USD") > 0).toBe(true)
            }
        })
        .toss();
}
var TestGetCartsWithDifferentCurrency = function(json){
    // We ensure that non matching categor paths are handled properly
    // This Test is addressing a bug discovered in 0.17.29 and to be fixed in 0.17.30
    frisby.create('Retrieve a cart with a specific currency ')
        .get(process.env.url + '/v0/carts?currency=USD&per_page=1')
        .expectStatus(200)
        .expectJSON('data.*',{
            items : function(items){
                items.forEach(function(lineItem){
                    expect(lineItem.display_price.indexOf("USD") > 0).toBe(true)
                })
                
            }
        })
        .toss();
}


/*********************************************************
 *
 *
 *
 *
 *
 **********************************************************/
function TestCreateCartWithValidProducts(next) {
    frisby.create('POST create a cart with valid product quantities')
        .post(process.env.url + '/v0/carts/', {
            items: [{
                'product_id': product_ids[0],
                'quantity': 1
            }, {
                'product_id': product_ids[1],
                'quantity': 1
            }, {
                'product_id': product_ids[2],
                'quantity': 1
            }]
        }, {
            json: true
        })
        .expectStatus(200)
        .expectJSON({
            status: true
        })
        .afterJSON(function(json) {

            TestListCartsCreatedInDateInterval();

            TestGetCartWithDifferentCurrency(json)
            TestGetCartsWithDifferentCurrency(json)

            frisby.create('GET ensure that the cart count is correct')
                .get(process.env.url + '/v0/carts/' + json.data.id + '/count')
                .expectStatus(200)
                .expectJSON({
                    data: 3
                })
            frisby.create('GET ensure that the created cart has the right content')
                .get(process.env.url + '/v0/carts/' + json.data.id)
                .expectStatus(200)
                .expectJSON({
                    data: {
                        items: [{
                            'product_id': product_ids[0],
                            'quantity': 1
                        }, {
                            'product_id': product_ids[1],
                            'quantity': 1
                        }, {
                            'product_id': product_ids[2],
                            'quantity': 1
                        }]
                    }
                })
                .afterJSON(TestAddAValidProductToExistingCart)
                .toss()
        })
        .toss()
}

/*********************************************************
 *
 *
 *
 *
 *
 **********************************************************/
function TestAddAValidProductToExistingCart(json) {
    frisby.create('PATCH add a new valid product to an existing cart')
        .patch(process.env.url + '/v0/carts/' + json.data.id, {
            op: 'add',
            items: [{
                'product_id': product_ids[0],
                'quantity': 2
            }, {
                'product_id': product_ids[1],
                'quantity': 2
            }, {
                'product_id': product_ids[2],
                'quantity': 2
            }]
        }, {
            json: true
        })
        .expectStatus(200)
        .expectJSON({
            status: true
        })
        .afterJSON(function(json) {
            frisby.create('GET ensure that the patched cart has the right content')
                .get(process.env.url + '/v0/carts/' + json.data.id)
                .expectStatus(200)
                .expectJSON({
                    data: {
                        items: [{
                            'product_id': product_ids[0],
                            'quantity': 3
                        }, {
                            'product_id': product_ids[1],
                            'quantity': 3
                        }, {
                            'product_id': product_ids[2],
                            'quantity': 3
                        }]
                    }
                })
                .afterJSON(TestUpdateProductsInExistingCart)
                .toss()
        })
        .toss()
}



/*********************************************************
 *
 *
 *
 *
 *
 **********************************************************/
function TestUpdateProductsInExistingCart(json) {
    frisby.create('PATCH updates a valid product to an existing cart')
        .patch(process.env.url + '/v0/carts/' + json.data.id, {
            op: 'update',
            items: [{
                'product_id': product_ids[0],
                'quantity': 11
            }, {
                'product_id': product_ids[1],
                'quantity': 11
            }, {
                'product_id': product_ids[2],
                'quantity': 11
            }]
        }, {
            json: true
        })
        .expectStatus(200)
        .expectJSON({
            status: true
        })
        .afterJSON(function(json) {


            frisby.create('GET ensure that the patched cart has the right content')
                .get(process.env.url + '/v0/carts/' + json.data.id)
                .expectStatus(200)
                .expectJSON({
                    data: {
                        items: [{
                            'product_id': product_ids[0],
                            'quantity': 11
                        }, {
                            'product_id': product_ids[1],
                            'quantity': 11
                        }, {
                            'product_id': product_ids[2],
                            'quantity': 11
                        }]
                    }
                })
                .afterJSON(function(json) {
                    TestRemoveProductsFromExistingCart(json)
                    TestUpdateProductsInExistingCartWithNegativeNumbers(json)
                    TestUpdateProductsInExistingCartSettingZeroQuantity(json)
                    TestUpdateProductWithZeroQuantityShouldRemoveIt(json)
                })


            .toss()
        })
        .toss()
}


/*********************************************************
 *
 *
 *
 *
 *
 **********************************************************/
function TestRemoveProductsFromExistingCart(json) {
    frisby.create('PATCH removes all items from a cart')
        .patch(process.env.url + '/v0/carts/' + json.data.id, {
            op: 'remove',
            items: [{
                'product_id': product_ids[0]
            }, {
                'product_id': product_ids[1]
            }, {
                'product_id': product_ids[2]
            }]
        }, {
            json: true
        })
        .expectStatus(200)
        .expectJSON({
            status: true
        })
        .afterJSON(function(json) {
            frisby.create('GET ensure that the patched cart has the right content')
                .get(process.env.url + '/v0/carts/' + json.data.id)
                .expectStatus(200)
                .expectJSON({
                    data: {
                        items: []
                    }
                })
                .afterJSON(TestDeleteCart)
                .toss()
        })
        .toss()
}



/*********************************************************
 *
 *
 *
 *
 *
 **********************************************************/
function TestUpdateProductsInExistingCartWithNegativeNumbers(json) {
    frisby.create('PATCH updates a product in cart with negative quantity ')
        .patch(process.env.url + '/v0/carts/' + json.data.id, {
            op: 'update',
            items: [{
                'product_id': product_ids[0],
                'quantity': -1
            }, {
                'product_id': product_ids[1],
                'quantity': -1
            }, {
                'product_id': product_ids[2],
                'quantity': -1
            }]
        }, {
            json: true
        })
        .expectStatus(400)
        .expectJSON({
            status: false
        })
        .toss()
}




/*********************************************************
 *
 *
 *
 *
 *
 **********************************************************/
function TestUpdateProductWithZeroQuantityShouldRemoveIt(json) {
    frisby.create('PATCH updates a product in cart with zero quantity should remove it from cart')
        .patch(process.env.url + '/v0/carts/' + json.data.id, {
            op: 'update',
            items: [{
                'product_id': product_ids[0],
                'quantity': 0
            }]
        }, {
            json: true
        })
        .expectStatus(200)
        .afterJSON(function(json){
            // We ensure that the item is not in cart
            var matchingItems = json.data.items.filter(item => {
                return item.product_id === product_ids[0];
            })
            expect(matchingItems.length).toBe(0);
        })
        .toss()
}

/*************************************************************
 *
 ***************************************************************/
function TestUpdateProductsInExistingCartSettingZeroQuantity(json) {
    frisby.create('PATCH updates a product in cart setting its quantity to 0')
        .patch(process.env.url + '/v0/carts/' + json.data.id, {
            op: 'update',
            items: [{
                product_id: product_ids[0],
                quantity: 0
            }, ]
        }, {
            json: true
        })
        .expectStatus(200)
        .expectJSON({
            status: true
        })
        .toss()
}


/*********************************************************
 *
 *
 *
 *
 *
 **********************************************************/
function TestDeleteCart(json) {
    frisby.create('DELETE removes a cart')
        .delete(process.env.url + '/v0/carts/' + json.data.id)
        .expectStatus(200)
        .expectJSON({
            status: true
        })
        .afterJSON(function() {
            frisby.create('GET ensure that the deleted cart no longer exists')
                .get(process.env.url + '/v0/carts/' + json.data.id)
                .expectStatus(404)
                .toss()
        })
        .toss()
}

function TestListCartsCreatedInDateInterval () {
  var today = new Date()

  var oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  frisby.create('Get list of carts created in time range')
  .get(process.env.url + '/v0/carts?$created_at_lt=' + today.toISOString() + '&$created_at_gt=' + oneWeekAgo.toISOString())
  .expectStatus(200)
  .toss()
}




//SEEDING THE TEST
var seeded_products = 0
var product_ids = []

function P(json, callback) {
    frisby
        .create('Create valid product')
        .post(process.env.url + '/v0/products', testProduct, {
            json: true
        })
        .expectStatus(200)
        .expectJSON({
            status: true
        })
        .afterJSON(function(json) {

            seeded_products++
            product_ids.push(json.data.id)
            if (seeded_products >= 3) {
                TestCreateValidEmptyCart()
                TestCreateCartWithValidProducts()
                TestCreateCartWithInvalidId()
                TestCreateCartWithNegativeQuantity()
                TestCreateCartWithInvalidParameterNames()
                TestCreateCartWithInvalidParameterNames2()
                TestCreateCartWithInvalidQuantity()
                TestGetListOfCarts()
                    //TODO deleta i prodtti usati per i test
            } else {
                P(json)
            }
        })
        .toss();
}

P()