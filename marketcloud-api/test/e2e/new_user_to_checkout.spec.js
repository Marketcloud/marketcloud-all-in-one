var frisby = require('frisby')
var fixtures = require('./fixtures')

var randomString = fixtures.randomString
var _url = fixtures.url

var ACCESS_TOKEN = null
var PUBLIC_KEY = process.env.MARKETCLOUD_PUBLIC_KEY
var CART_ID = null
var SHIPPING_ID = null
var PAYMENT_METHOD_ID = null;

var user = {
  email: randomString() + '@example.com',
  password: randomString()
}

var ADDRESS = {
  full_name: 'John Doe',
  'country': 'Fakeland',
  'city': 'Gotham',
  'state': 'FakeState',
  'postal_code': '1234',
  'address1': 'Fake Street 123',
  'email': user.email
}

function authenticateUserTest (response) {
  frisby.create('Authenticates the previously created user')
    .addHeader('Authorization', PUBLIC_KEY)
    .post(
      _url('/users/authenticate'),
      user, {
        json: true
      }
    )
    .expectStatus(200)
    .afterJSON(response => {
      ACCESS_TOKEN = response.data.token
      createAddressTest(response)
    })
    .toss()
}



function createCartTest (response) {
  frisby.create('Creates a cart for the current user')
    .addHeader('Authorization', PUBLIC_KEY + ':' + ACCESS_TOKEN)
    .post(
      _url('/carts'), {}, {
        json: true
      }
    )
    .expectStatus(200)
    .afterJSON(response => {
      CART_ID = response.data.id
      addAproductToCartTest(response)
    })
    .toss()
}

function createAddressTest (response) {
  frisby.create('Creates an address for the current user')
    .addHeader('Authorization', PUBLIC_KEY + ':' + ACCESS_TOKEN)
    .post(
      _url('/addresses'),
      ADDRESS, {
        json: true
      }
    )
    .expectStatus(200)
    .afterJSON(response => {
      ADDRESS = response.data
      createCartTest(response)
    })
    .toss()
}

function addAproductToCartTest (response) {
  frisby.create('Adds a product to the current user\'s cart')
    .addHeader('Authorization', PUBLIC_KEY + ':' + ACCESS_TOKEN)
    .get(_url('/products?per_page=1'))
    .expectStatus(200)
    .afterJSON(response => {
      let PRODUCT = response.data[0]

      var payload = {
        product_id: PRODUCT.id,
        quantity: 1
      }

      if (PRODUCT.type === 'product_with_variants') {
        payload.variant_id = PRODUCT.variants[0].id
      }

      frisby.create('Adds the product to the cart')
        .addHeader('Authorization', PUBLIC_KEY + ':' + ACCESS_TOKEN)
        .patch(
          _url('/carts/' + CART_ID), {
            op: 'add',
            items: [payload]
          }, {
            json: true
          }
        )
        .expectStatus(200)
        .afterJSON(fetchShippings)
        .toss()
    })
    .toss()
}

function fetchShippings () {
  frisby.create('Get compatible shippings rules')
  .get(_url('/shippings/cart/' + CART_ID))
  .addHeader('Authorization', PUBLIC_KEY + ':' + ACCESS_TOKEN)
  .expectStatus(200)
  .afterJSON(response => {
    SHIPPING_ID = response.data[0].id
    fetchPaymentMethod();
  })
  .toss()
}

function fetchPaymentMethod () {
  frisby.create('Get a payment method')
  .get(_url('/paymentMethods'))
  .addHeader('Authorization', PUBLIC_KEY + ':' + ACCESS_TOKEN)
  .expectStatus(200)
  .afterJSON(response => {
    PAYMENT_METHOD_ID = response.data[0].id
    checkoutTest()
  })
  .toss()
}

function checkoutTest () {
  frisby.create('Creates an order')
    .addHeader('Authorization', PUBLIC_KEY + ':' + ACCESS_TOKEN)
    .post(
      _url('/orders'), {
        shipping_address_id: ADDRESS.id,
        billing_address_id: ADDRESS.id,
        shipping_id: SHIPPING_ID,
        payment_method_id : PAYMENT_METHOD_ID,
        cart_id: CART_ID
      },
      {json: true}
    )
    .expectStatus(200)
    .expectJSONTypes('data', {
      total: function (v) {
        expect(typeof v).toBe('number')
      },
      items_total: function (v) {
        expect(typeof v).toBe('number')
      },
      taxes_total: function (v) {
        expect(typeof v).toBe('number')
      },
      payment_method : function(v) {
        expect(v).not.toBeUndefined();
      }
    })
    .toss()
}

frisby
  .create('Creates a new user')
  .addHeader('Authorization', PUBLIC_KEY)
  .post(
    _url('/users'),
    user, {
      json: true
    }
  )
  .expectStatus(200)
  .afterJSON(response => {
    authenticateUserTest(response)
  })
  .toss()
