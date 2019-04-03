var frisby = require('./bootstrap')


var testTax = {
  name: "My Test Tax",
  description: "This is the description of a test tax",
  rates : [
    {country : "Italy", state : "*", "postcode" : "*", "city" : "*", rate : 10}
  ]
}

var updatedTestTax = {
  name: "My Updated Test Tax",
  description: "This is the updated description of a test tax",
  rate: 25.00
}

var InvalidTax = {
  name: "bad rate",
  description: "ABALBAABLABLABA",
  rates : [
  {country : "Italy", state : "*", "postcode" : "*", "city" : "*", rate : "10"}
  ]
}

var TestDelete = function(json) {
  frisby.create('Delete the tax')
    .delete(process.env.url + '/v0/taxes/' + json.data.id)
    .expectStatus(200)
    .expectJSON({
      status: true
    })
    .afterJSON(function() {
      frisby.create('Ensure that the deleted tax no longer exists')
        .get(process.env.url + '/v0/taxes/' + json.data.id)
        .expectStatus(404)
        .toss()
    })
    .afterJSON(TestUpdateNonExistingResource)
    .toss()
}

var TestUpdateNonExistingResource = function(json) {
  frisby.create('Updates NON-EXISTING tax')
    .put(
      process.env.url + '/v0/taxes/' + 0, updatedTestTax, {
        json: true
      })
    .expectStatus(404)
    .expectJSON({
      status: false,
      errors: [{
        code: 404,
        type: 'NotFound'
      }]
    })
    .toss()
}

function TestGet(json) {

  frisby.create('Retrieve the tax')
    .get(process.env.url + '/v0/taxes/' + json.data.id)
    .expectStatus(200)
    .expectJSON({
      data: testTax
    })
    .afterJSON(TestUpdate)
    .toss();
}

function TestGetSomeFields(json) {
  frisby.create('Retrieve only some fields from the taxes')
    .get(process.env.url + '/v0/taxes/' + json.data.id + '?fields=name,description,id')
    .expectStatus(200)
    .expectJSON({
      data: {
        id: json.data.id,
        name: "My Test Tax",
        description: "This is the description of a test tax"
      }
    })
    .expectJSONTypes('data', {
      rate: function(value) {
        expect(value).toBeUndefined()
      }
    })
    .toss();
}





//Updates a tax and returns it, ensuring the returned item is updated
function TestUpdate(json) {
  frisby.create('Update a tax')
    .put(process.env.url + '/v0/taxes/' + json.data.id, updatedTestTax, {
      json: true
    })
    .expectStatus(200)
    .expectJSON({
      status: true,
      data: updatedTestTax
    })
    .afterJSON(function(json) {
      frisby.create('Retrieve the updated tax')
        .get(process.env.url + '/v0/taxes/' + json.data.id)
        .expectStatus(200)
        .expectJSON({
          data: updatedTestTax
        })
        .afterJSON(TestDelete)
        .toss();
    })
    .toss();
}




frisby.create('Create valid tax')
  .post(process.env.url + '/v0/taxes', testTax, {
    json: true
  })
  .expectStatus(200)
  .expectJSON({
    status: true
  })
  .afterJSON(function(json) {
    TestGet(json)
    TestGetSomeFields(json)
  })
  .toss();


frisby.create('Create not-valid tax should return error')
  .post(process.env.url + '/v0/taxes', InvalidTax, {
    json: true
  })
  .expectStatus(400)
  .expectJSON({
    status: false
  })
  .toss();

frisby.create('Get a list of taxes')
  .get(process.env.url + '/v0/taxes')
  .expectStatus(200)
  .expectJSONTypes('data.*', {
    name: function(v) {
      expect(v).not.toBeUndefined();
      expect(v).toBeTypeOrNull(String)
    },
    id: function(v) {
      expect(v).not.toBeUndefined();
      expect(v).toBeTypeOrNull(Number)
    },
    description: function(v) {
      expect(v).toBeTypeOrNull(String)
    },
    image_url: function(v) {
      expect(v).toBeTypeOrNull(String)
    },
    url: function(v) {
      expect(v).toBeTypeOrNull(String)
    }
  })
  .toss()



frisby.create('Get a list of taxes but only some fields')
  .get(process.env.url + '/v0/taxes?fields=name')
  .expectStatus(200)
  .expectJSONTypes('data.*', {
    name: function(v) {
      expect(v).not.toBeUndefined();
      expect(v).toBeTypeOrNull(String)
    },
    id: function(v) {
      expect(v).toBeUndefined()
    },
    description: function(v) {
      expect(v).toBeUndefined()
    },
    image_url: function(v) {
      expect(v).toBeUndefined()
    },
    url: function(v) {
      expect(v).toBeUndefined()
    }
  })
  .toss()



