var frisby = require('frisby')
var fixtures = require('./fixtures')

var randomString = fixtures.randomString
var _url = fixtures.url

var ACCESS_TOKEN = null
var PUBLIC_KEY = process.env.MARKETCLOUD_PUBLIC_KEY

var user = {
  email: randomString() + '@example.com',
  password: randomString()
}

function authenticateUserTest (response) {
  frisby.create('Authenticates the previously created user')
    .addHeader('Authorization', PUBLIC_KEY)
    .post(
      _url('/users/authenticate'),
      user,
      { json: true }
    )
    .expectStatus(200)
    .afterJSON(response => {
      ACCESS_TOKEN = response.data.token
      updatePasswordTest(response)
    })
    .toss()
}

function updatePasswordTest (json) {
  var updatePasswordPayload = {
    old_password: user.password,
    new_password: 'updatedPassword'
  }
  frisby.create('Updates the user ' + json.data.user.id + ' password')
  .addHeader('Authorization', PUBLIC_KEY + ':' + ACCESS_TOKEN)
  .put(process.env.url + '/v0/users/' + json.data.user.id + '/updatePassword', updatePasswordPayload, {json: true})
  .expectStatus(200)
  .afterJSON((response) => {
    user.password = updatePasswordPayload.new_password

    // Now we re-authenticate with new credentials
    frisby.create('Authenticates the previously created user')
    .addHeader('Authorization', PUBLIC_KEY)
    .post(
      _url('/users/authenticate'),
      user, {
        json: true
      }
    )
    .expectStatus(200)
    .toss()
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
