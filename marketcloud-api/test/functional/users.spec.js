var frisby = require('./bootstrap')
var uuid = require('uuid/v4')

var randomString = uuid()
var testUser = {
  name: 'John Doe',
  email: randomString + 'alfred@gotham.com', // UUID is used to avoid unique clashes
  password: '3cec8b8b-36af-4d7c-bd3e-0f57c6a0cf46',
  billing_address : {
    "full_name": "John Doe",
    "address1": "Fake Street 123",
    "address2": "Apt. 6",
    "city": "Springfield",
    "country": "United States of America",
    "postal_code": "62701",
    "email": "john.doe@example.com"
}
}

var savedTestUser = {
  name: 'John Doe',
  email: randomString + 'alfred@gotham.com' // UUID is used to avoid unique clashes
}

var updatedTestUser = {
  name: 'Bruce Wayne',
  email: randomString + 'bruce@gotham.com'
}
var savedUpdatedTestUser = {
  name: 'Bruce Wayne',
  email: randomString + 'bruce@gotham.com'
}

var InvalidUser = {
  name: null,
  email: null,
  password: null,
  image_url: null
}

function TestCreate () {
  frisby.create('Create valid user')
    .post(process.env.url + '/v0/users', testUser, {json: true})
    .expectStatus(200)
    .expectJSON({
      status: true
    })
    .afterJSON(function (json) {
      TestGet(json)
      TestGetSomeFields(json)
      TestListCustomersCreatedInDateInterval()
    })
  .toss()
}

function TestGet (json) {
  frisby.create('Retrieve the user')
    .get(process.env.url + '/v0/users/' + json.data.id)
    .expectStatus(200)
    .expectJSON({status: true, data: savedTestUser})
    .afterJSON(function (json) {
      TestAuthenticateWithInvalidCredentials(json)
      TestAuthenticateWithValidCredentials(json)
    })
    .toss()
}

function TestUpdate (json) {
  frisby.create('Update a user')
  .put(process.env.url + '/v0/users/' + json.data.user.id, updatedTestUser, {json: true})
  .expectStatus(200)
  .expectJSON({
    status: true,
    data: savedUpdatedTestUser
  })
  .afterJSON(function (json) {
    frisby.create('Retrieve the updated user')
    .get(process.env.url + '/v0/users/' + json.data.id)
    .expectStatus(200)
    .expectJSON({data: savedUpdatedTestUser})
    .afterJSON(TestDelete)
    .toss()
  })
  .toss()
}

function TestUpdateWithInvalidData (json) {
  frisby.create('Update a user with invalid payload. Expects 400')
  .put(process.env.url + '/v0/users/' + json.data.user.id, {email: 12}, {json: true})
  .expectStatus(400)
  .toss()
}

var TestDelete = function (json) {
  frisby.create('Delete the user')
    .delete(process.env.url + '/v0/users/' + json.data.id)
    .expectStatus(200)
    .expectJSON({status: true})
    .afterJSON(function () {
      frisby.create('Ensure that the deleted user no longer exists')
          .get(process.env.url + '/v0/users/' + json.data.id)
          .expectStatus(404)
          .toss()
    })
    .afterJSON(TestUpdateNonExistingResource)
    .toss()
}

var TestUpdateNonExistingResource = function (json) {
  frisby.create('Updates NON-EXISTING user')
        .put(
            process.env.url + '/v0/users/' + 0, updatedTestUser, {
              json: true
            })
        .expectStatus(404)
        .expectJSON({
          status: false,
          errors: [{code: 404, type: 'NotFound'}]
        })
        .toss()
}

frisby.create('Get a list of users')
    .get(process.env.url + '/v0/users')
    .expectStatus(200)
    .expectJSONTypes('data.0', {
      id: function (v) { expect(v).not.toBeUndefined(); expect(v).toBeTypeOrNull(Number) },
      name: function (v) { expect(v).not.toBeUndefined(); expect(v).toBeTypeOrNull(String) },
      image_url: function (v) { expect(v).toBeTypeOrNull(String) },
      url: function (v) { expect(v).toBeTypeOrNull(String) },
      password: function (v) { expect(v).toBeUndefined() },
      _id: function (v) { expect(v).toBeUndefined() }
    })
    .toss()

frisby.create('Create not-valid user should return error')
  .post(process.env.url + '/v0/users', InvalidUser, {json: true})
  .expectStatus(400)
  .expectJSON({
    status: false
  })
.toss()

function TestGetSomeFields (json) {
  frisby.create('Retrieve only some fields from the User')
        .get(process.env.url + '/v0/users/' + json.data.id + '?fields=name,id')
        .expectStatus(200)
        .expectJSON({
          data: {
            id: json.data.id,
            name: savedTestUser.name
          }
        })
        .afterJSON(function (json) {

        })
        .toss()
}

function TestAuthenticateWithValidCredentials (json) {
  frisby.create('Authenticates a user')
        .post(process.env.url + '/v0/users/authenticate', {
          email: testUser.email,
          password: testUser.password
        }, {json: true})
        .expectStatus(200)
        .expectJSON({status: true})
        .afterJSON(function (json) {
          TestUpdate(json)
          TestUpdateWithInvalidData(json)
        })
        .toss()
}

function TestListCustomersCreatedInDateInterval () {
  var today = new Date()

  var oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  frisby.create('Get list of users created in time range')
  .get(process.env.url + '/v0/users?$created_at_lt=' + today.toISOString() + '&$created_at_gt=' + oneWeekAgo.toISOString())
  .expectStatus(200)
  .toss()
}

function TestAuthenticateWithInvalidCredentials (json) {
  frisby.create('Tries to authenticates a user with invalid pw')
        .post(process.env.url + '/v0/users/authenticate', {
          email: testUser.email,
          password: 'AWRONGPASSWORD'
        }, {json: true})
        .expectStatus(404)
        .expectJSON({status: false})
        .toss()
}

TestCreate()
