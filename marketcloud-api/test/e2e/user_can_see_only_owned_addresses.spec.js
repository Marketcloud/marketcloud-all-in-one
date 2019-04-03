var frisby = require('frisby')
var fixtures = require('./fixtures')

var ACCESS_TOKEN = null
var PUBLIC_KEY = process.env.MARKETCLOUD_PUBLIC_KEY
var CART_ID = null
var USER_ID = null

var randomString = fixtures.randomString
var _url = fixtures.url

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
      USER_ID = response.data.user.id
      createAddressTest(response)
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
      listAddressesTest(response)
    })
    .toss()
}

function listAddressesTest (response) {
  frisby.create('Get a list of owned addresses')
    .addHeader('Authorization', PUBLIC_KEY + ':' + ACCESS_TOKEN)
    .get(process.env.url + '/v0/addresses/')
    .expectStatus(200)
    .expectJSONTypes('data.*', {
      user_id: function (v) {
        expect(v).not.toBeUndefined()
        expect(v).toBe(USER_ID)
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

