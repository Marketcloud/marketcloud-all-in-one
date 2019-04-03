var frisby = require('./bootstrap')
var testAddress = {
    "full_name": "John Doe",
    "address1": "Fake Street 123",
    "address2": "Apt. 6",
    "city": "Springfield",
    "country": "United States of America",
    "postal_code": "62701",
    "email": "john.doe@example.com"
}

var testAddressUpdate = {
    "address1": "Real Street 456"
}

var InvalidAddress = {
    full_name: "John Doe",
    postal_code: 60125
}




var TestUpdateNonExistingResource = function(json) {
    frisby.create('Updates NON-EXISTING address')
        .put(
            process.env.url + '/v0/addresses/' + 0, testAddressUpdate, {
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


function TestGetSomeFields(json) {
    frisby.create('Retrieve only some fields from the address')
        .get(process.env.url + '/v0/addresses/' + json.data.id + '?fields=full_name,address1,city')
        .expectStatus(200)
        .expectJSON({
            data: {
                full_name: testAddress.full_name
            }
        })
        .expectJSONTypes('data', {
            description: function(value) {
                expect(value).toBeUndefined()
            },
            url: function(value) {
                expect(value).toBeUndefined()
            }
        })
        .toss();
}







frisby.create('Create not-valid address should return error')
    .post(process.env.url + '/v0/addresses', InvalidAddress, {
        json: true
    })
    .expectStatus(400)
    .expectJSON({
        status: false
    })
    .toss();


frisby.create('Get a list of addresses')
    .get(process.env.url + '/v0/addresses')
    .expectStatus(200)
    .expectJSONTypes('data.*', {
        full_name: function(v) {
            expect(v).not.toBeUndefined();
            expect(v).toBeTypeOrNull(String)
        },
        address1: function(v) {
            expect(v).not.toBeUndefined();
            expect(v).toBeTypeOrNull(String)
        },
        city: function(v) {
            expect(v).not.toBeUndefined();
            expect(v).toBeTypeOrNull(String)
        },
        id: function(v) {
            expect(v).not.toBeUndefined();
            expect(v).toBeTypeOrNull(Number)
        },

    })
    .toss()



frisby.create('Get a list of addresses but only some fields')
    .get(process.env.url + '/v0/addresses?fields=full_name')
    .expectStatus(200)
    .expectJSONTypes('data.*', {
        full_name: function(v) {
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





var TestDelete = function(json) {
    frisby.create('Delete the address')
        .delete(process.env.url + '/v0/addresses/' + json.data.id)
        .expectStatus(200)
        .expectJSON({
            status: true
        })
        .afterJSON(function() {
            frisby.create('Ensure that the deleted address no longer exists')
                .get(process.env.url + '/v0/addresses/' + json.data.id)
                .expectStatus(404)
                .toss()
        })
        .afterJSON(TestUpdateNonExistingResource)
        .toss()
}

//Updates a address and returns it, ensuring the returned item is updated
function TestUpdate(json) {
    frisby.create('Update a address')
        .put(process.env.url + '/v0/addresses/' + json.data.id, testAddressUpdate, {
            json: true
        })
        .expectStatus(200)
        .expectJSON({
            status: true,
            data: testAddressUpdate
        })
        .afterJSON(function(json) {
            frisby.create('Retrieve the updated address')
                .get(process.env.url + '/v0/addresses/' + json.data.id)
                .expectStatus(200)
                .expectJSON({
                    data: testAddressUpdate
                })
                .afterJSON(TestDelete)
                .toss();
        })
        .toss();
}


function TestGet(json) {

    frisby.create('Retrieve the address')
        .get(process.env.url + '/v0/addresses/' + json.data.id)
        .expectStatus(200)
        .expectJSON({
            data: testAddress
        })
        .afterJSON(TestUpdate)
        .toss();
}


frisby.create('Create valid address')
    .post(process.env.url + '/v0/addresses', testAddress, {
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