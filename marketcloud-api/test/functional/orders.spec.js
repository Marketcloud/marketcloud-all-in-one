var frisby = require('./bootstrap')



function makeid() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 6; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}
var the_email = makeid() + "@example.com";


var testAddress = {
  "full_name": "Mattia Alfieri",
  "address1": "Via Tiziano 79",
  "address2": "Interno 6",
  "city": "Ancona",
  "country": "Italy",
  "state": "Marche",
  "postal_code": "60125",
  "phone_number": "+39 3477256829",
  "email": the_email
}


var testUser = {
  name: "My Test User",
  email: the_email,
  password: "3cec8b8b-36af-4d7c-bd3e-0f57c6a0cf46",
  image_url: 'http://static.marketcloud.com/EaEaaaIQcZ4Z2aZQacWfaQ1921'
}



var orderPayload = {}
var userData = null;
var products = null;



frisby.create('Retrieve some products')
  .get(process.env.url + '/v0/products?per_page=2')
  .expectStatus(200)
  .afterJSON(function(jsonproducts) {
    products = jsonproducts
    frisby.create('Create a new user')
      .post(process.env.url + '/v0/users', testUser, {
        json: true
      })
      .expectStatus(200)
      .afterJSON(TestAuthenticateTheNewUser)
      .toss()
  })
  .toss()



function TestAuthenticateTheNewUser(json) {
  userData = json;
  frisby.create('Authenticating the new user')
    .post(process.env.url + '/v0/users/authenticate', {
      email: testUser.email,
      password: testUser.password
    }, {
      json: true
    })
    .expectStatus(200)
    .afterJSON(TestCreateAnAddress)
    .toss()
}

function TestCreateAnAddress(json_auth) {
  //Creo un indirizzo
  frisby.create('Create an address for the user')
    .addHeader('Authorization', process.env.key + ':' + json_auth.data.token)
    .post(process.env.url + '/v0/addresses', testAddress, {
      json: true
    })
    .expectStatus(200)
    .afterJSON(json =>{
      TestCreateOrderWithInvalidQuantities(json)
      TestCreateOrder(json)
    })
    .toss()
}

function TestListOrdersAfterCreation(json) {
  frisby.create('List orders from the user')
    .get(process.env.url + '/v0/orders')
    .expectStatus(200)

  .afterJSON(function(orders) {
      TestGetCreatedOrderById(orders.data[0])
      TestGetCreatedOrderByIdWithAnotherCurrency(orders.data[0])
    })
    .toss()
}


function TestCreateOrder(json_address) {

  //Ora creo un ordine
  var orderPayload = {
    currency: 'USD',
    user_id: userData.data.id,
    shipping_address_id: json_address.data.id,
    billing_address_id: json_address.data.id,
    custom_attribute_1: false,
    custom_attribute_2: true,
    shipping_fee: 5,
    //coupon_code:null, this will make it fail
    promotion_id: null,
    items: [{
      product_id: products.data[0].id,
      quantity: 1
    }, {
      product_id: products.data[1].id,
      quantity: 1
    }]
  }

  frisby.create('Create the order for the user')
    .post(process.env.url + '/v0/orders', orderPayload, {
      json: true
    })
    .expectStatus(200)
    .expectJSON('data', {
      total: function(v) {
        expect(v).not.toBeUndefined();
        expect(v).toBeType(Number)
      },
      total: function(v) {
        expect(v).not.toBeUndefined();
        expect(v).toBeType(Number)
      },
      shipping_total: (value) => {
        expect(value).toEqual(orderPayload.shipping_fee)
      }
    })
    .afterJSON(TestCreateRefundForOrder)
    .toss()
}

function TestCreateRefundForOrder(response){
  var order_id = response.data.id;
  var refund = {
    total : 1,
    reason : "Some reason for the refund",
    line_items : [{
      product_id : products.data[1].id,
      quantity : 1
    }],
    restock_refunded_items : false
  }

  frisby.create("Create a refund for the just created order")
  .post(process.env.url + '/v0/orders/' + order_id + '/refunds', refund, {json:true})
  .expectStatus(200)
  .afterJSON(TestListOrdersAfterCreation)
  .toss()

}

function TestCreateOrderWithInvalidQuantities(json_address) {

  //Ora creo un ordine
  var orderPayload = {
    currency: 'USD',
    user_id: userData.data.id,
    shipping_address_id: json_address.data.id,
    billing_address_id: json_address.data.id,
    custom_attribute_1: false,
    custom_attribute_2: true,
    shipping_fee: 5,
    //coupon_code:null, this will make it fail
    promotion_id: null,
    items: [{
      product_id: products.data[1].id,
      quantity: 0 // Quantities must be >= 0
    }]
  }

  frisby.create('Create the order for the user')
    .post(process.env.url + '/v0/orders', orderPayload, {
      json: true
    })
    .expectStatus(400)
    .toss()
}

function TestGetCreatedOrderById(orderToRetrive) {
  frisby.create('Retrieve an order by id')
    .get(process.env.url + '/v0/orders/' + orderToRetrive.id)
    .expectStatus(200)
    .expectJSON({
      data: orderToRetrive
    })
    .expectJSONTypes('data',{
      display_total : function(v){expect(v).not.toBeUndefined()},
      display_items_total : function(v){expect(v).not.toBeUndefined()}
    })
    .afterJSON(TestDeleteOrder)
    .toss()
}

function TestGetCreatedOrderByIdWithAnotherCurrency(orderToRetrive) {
  frisby.create('Retrieve an order by id with another currency')
    .get(process.env.url + '/v0/orders/' + orderToRetrive.id+"?currency=USD")
    .expectStatus(200)
    .expectJSONTypes('data',{
      display_total : function(v){
        expect(v).not.toBeUndefined(),
        expect(v.indexOf('USD') > -1).toBe(true);
      },
      display_items_total : function(v){expect(v).not.toBeUndefined()}
    })
    .toss()
}


function TestDeleteOrder(json) {
  return;
  frisby.create('Delete the order by id')
    .delete(process.env.url + '/v0/orders/' + json.data.id)
    .expectStatus(200)
    .expectJSON({
      status: true
    })
    .toss()
}