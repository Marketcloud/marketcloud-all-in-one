var frisby = require('./bootstrap');


var testInvoice = {
    "order_id": 156176,
    "company": {
        "name": "Mordor Inc",
        "email": "cikkense@gmail.com",
        "invoice": "Mount Doom 123",
        "city": "Barad dur",
        "country": "Eritrea",
        "state": "Al Awsaţ",
        "vat": "191919119"
    },
    "customer": {
        "full_name": "Mattia Alfieri",
        "id": 156175,
        "user_id": null,
        "invoice1": "Via Tiziano 79",
        "invoice2": "Interno 6",
        "city": "Ancona",
        "country": "Italy",
        "postal_code": "60125",
        "company": null,
        "phone_number": "+39 3477256829",
        "alternate_phone_number": null,
        "email": "GioIBl@example.com",
        "vat": "129i19212091920",
        "state": "Basilicata"
    },
    "date_created": "2017-08-14T22:00:00.000Z",
    "date_due": "2017-08-15T22:00:00.000Z",
    "lineItems": [{
        "name": "A song of fire and ice: A feast for crows",
        "description": "A Feast for Crows is ..",
        "quantity": 1,
        "price": 7.79
    }, {
        "name": "A song of fire and ice: A feast for crows",
        "description": "A Feast for Crows is ..",
        "quantity": 1,
        "price": 7.79
    }],
    "number": '1019',
}

var testInvoiceUpdate = {
    "number": '1234'
}

var InvalidInvoice = {
    number: "60125"
}



var TestUpdateNonExistingResource = function(json) {
    frisby.create('Updates NON-EXISTING invoice')
        .put(
            process.env.url + '/v0/invoices/' + 0, testInvoiceUpdate, {
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

var TestUpdateInvoiceWithNonExistingOrder = function(json) {
    frisby.create('Updates invoice with NON-EXISTING order')
        .put(
            process.env.url + '/v0/invoices/' + json.data.id, { order_id: 0 }, {
                json: true
            })
        .expectStatus(400)
        .toss()
}


function TestGetSomeFields(json) {
    frisby.create('Retrieve only some fields from the invoice')
        .get(process.env.url + '/v0/invoices/' + json.data.id + '?fields=number')
        .expectStatus(200)
        .expectJSON({
            data: {
                number: testInvoice.full_name
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






function TestListInvoices() {
    frisby.create('Get a list of invoices')
        .get(process.env.url + '/v0/invoices')
        .expectStatus(200)
        .expectJSONTypes('data.*', {
            number: function(v) {
                expect(v).not.toBeUndefined();
                expect(v).toBeTypeOrNull(String)
            },
            order_id: function(v) {
                expect(v).not.toBeUndefined();
                expect(v).toBeTypeOrNull(Number)
            },
            lineItems: function(v) {
                expect(v).not.toBeUndefined();
            }
        })
        .toss()
}



var TestDelete = function(json) {
    frisby.create('Delete the invoice')
        .delete(process.env.url + '/v0/invoices/' + json.data.id)
        .expectStatus(200)
        .expectJSON({
            status: true
        })
        .afterJSON(function() {

            frisby.create('Ensure that the deleted invoice no longer exists')
                .get(process.env.url + '/v0/invoices/' + json.data.id)
                .expectStatus(404)
                .afterJSON(function(){
                    frisby.create('Ensure that the related order no longer has the invoice_id set to the deleted invoice')
                    .get(process.env.url + '/v0/orders/'+testInvoice.order_id)
                    .expectStatus(200)
                    .expectJSONTypes('data',{
                        invoice_id : function(v){

                            expect(v).toBeUndefined();
                        }
                    })
                    .toss()
                })
                .toss()
        })
        .afterJSON( function(json){
            TestUpdateNonExistingResource(json)
        })
        .toss()
}

//Updates a invoice and returns it, ensuring the returned item is updated
function TestUpdate(json) {
    frisby.create('Update a invoice')
        .put(process.env.url + '/v0/invoices/' + json.data.id, testInvoiceUpdate, {
            json: true
        })
        .expectStatus(200)
        .expectJSON({
            status: true,
            data: testInvoiceUpdate
        })
        .afterJSON(function(json) {
            frisby.create('Retrieve the updated invoice')
                .get(process.env.url + '/v0/invoices/' + json.data.id)
                .expectStatus(200)
                .expectJSON({
                    data: testInvoiceUpdate
                })
                .afterJSON(TestDelete)
                .toss();
        })
        .toss();
}


function TestGet(json) {

    frisby.create('Retrieve the invoice')
        .get(process.env.url + '/v0/invoices/' + json.data.id)
        .expectStatus(200)
        .expectJSON({
            data: testInvoice
        })
        .afterJSON(function(json){
            
            TestUpdate(json);
            TestUpdateInvoiceWithNonExistingOrder
        })
        .toss();
}

function TestCreateInvalidInvoice() {
    frisby.create('Create not-valid invoice should return error')
        .post(process.env.url + '/v0/invoices', InvalidInvoice, {
            json: true
        })
        .expectStatus(400)
        .expectJSON({
            status: false
        })
        .toss();
}

function TestCreateInvoiceWithNonExistingOrder() {

    var payload = JSON.parse(JSON.stringify(testInvoice));

   payload.order_id = 0;

    frisby.create('Create not-valid invoice for NON existing order should return error')
        .post(process.env.url + '/v0/invoices', payload, {
            json: true
        })
        .expectStatus(400)
        .expectJSON({
            status: false
        })
        .toss();
}


function TestCreateValidInvoice() {
    frisby.create('List some orders')
        .get(process.env.url + '/v0/orders')
        .expectStatus(200)
        .afterJSON(function(ordersResponse) {
            var order = ordersResponse.data[0];

            testInvoice.order_id = order.id;

            frisby.create('Create valid invoice')
                .post(process.env.url + '/v0/invoices', testInvoice, {
                    json: true
                })
                .expectStatus(200)
                .expectJSON({
                    status: true
                })
                .afterJSON(function(json) {
                    TestGet(json)
                    TestGetSomeFields(json)
                    TestCreateInvalidInvoice();
                    TestCreateInvoiceWithNonExistingOrder();
                    TestUpdateInvoiceWithNonExistingOrder(json);


                })
                .toss();


        })
        .toss()
}


function run() { 
    TestCreateValidInvoice();
}

run()