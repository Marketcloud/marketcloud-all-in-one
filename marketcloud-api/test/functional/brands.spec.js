var frisby = require('./bootstrap')

var testBrand = {
    name: "My Test Brand",
    description: "This is the description of a test brand",
    url: "http://www.mysite.com/brand/my_test_brand",
    image_url: 'http://static.marketcloud.com/EaEaaaIQcZ4Z2aZQacWfaQ1921'
}

var updatedTestBrand = {
    name: "My Updated Test Brand",
    description: "This is the updated description of a test brand",
}

var InvalidBrand = {
    name: 12,
    description: "ABALBAABLABLABA"
}

var TestDelete = function(json) {
    frisby.create('Delete the brand')
        .delete(process.env.url+'/v0/brands/' + json.data.id)
        .expectStatus(200)
        .expectJSON({
            status: true
        })
        .afterJSON(function(){
          frisby.create('Ensure that the deleted brand no longer exists')
          .get(process.env.url+'/v0/brands/' + json.data.id)
          .expectStatus(404)
          .toss()
        })
        .afterJSON(TestUpdateNonExistingResource)
        .toss()
}

var TestUpdateNonExistingResource = function(json) {
    frisby.create('Updates NON-EXISTING brand')
        .put(
            process.env.url+'/v0/brands/' + 0, updatedTestBrand, {
                json: true
            })
        .expectStatus(404)
        .expectJSON({
            status: false,
            errors: [{code : 404, type : 'NotFound'}]
        })
        .toss()
}

function TestGet(json) {

    frisby.create('Retrieve the brand')
        .get(process.env.url+'/v0/brands/' + json.data.id)
        .expectStatus(200)
        .expectJSON({
            data: testBrand
        })
        .afterJSON(TestUpdate)
        .toss();
}

function TestGetSomeFields(json) {
    frisby.create('Retrieve only some fields from the brand')
        .get(process.env.url+'/v0/brands/' + json.data.id+'?fields=name')
        .expectStatus(200)
        .expectJSON({
            data: {
                name: "My Test Brand"
            }
        })
        .expectJSONTypes('data',{
            id : function(value) {expect(value).toBeUndefined()}
        })
        .toss();
}

function TestGetANonExistingField(json) {
    frisby.create('Retrieve a non existing field from the brand')
        .get(process.env.url+'/v0/brands/' + json.data.id+'?fields=name,culo')
        .expectStatus(400)
        .expectJSON({
            status:false
        })
        .toss();
}

function TestGetBadFormedFieldsParameter(json) {
    frisby.create('Retrieve a bad formed field from the brand')
        .get(process.env.url+'/v0/brands/' + json.data.id+'?fields=')
        .expectStatus(400)
        .expectJSON({
            status:false
        })
        .toss();
}


//Updates a brand and returns it, ensuring the returned item is updated
function TestUpdate(json) {
    frisby.create('Update a brand')
        .put(process.env.url+'/v0/brands/' + json.data.id, updatedTestBrand, {
            json: true
        })
        .expectStatus(200)
        .expectJSON({
            status: true,
            data: updatedTestBrand
        })
        .afterJSON(function(json) {
            frisby.create('Retrieve the updated brand')
                .get(process.env.url+'/v0/brands/' + json.data.id)
                .expectStatus(200)
                .expectJSON({
                    data: updatedTestBrand
                })
                .afterJSON(TestDelete)
                .toss();
        })
        .toss();
}



frisby.create('Create valid brand')
    .post(process.env.url+'/v0/brands',testBrand, {
        json: true
    })
    .expectStatus(200)
    .expectJSON({
        status: true
    })
    .afterJSON(function(json){
        TestGet(json)
        TestGetSomeFields(json)
    })
    .toss();


frisby.create('Create not-valid brand should return error')
    .post(process.env.url+'/v0/brands',InvalidBrand, {
        json: true
    })
    .expectStatus(400)
    .expectJSON({
        status: false
    })
    .toss();


frisby.create('Get a list of brands')
    .get(process.env.url+'/v0/brands')
    .expectStatus(200)
    .expectJSONTypes({
        page:   Number,
        count:  Number,
        _links: Object,
        pages:  Number,
        status: Boolean
    })
    .expectJSONTypes('data.*',{
        name : function(v) {expect(v).not.toBeUndefined(); expect(v).toBeTypeOrNull(String)},
        id : function(v) {expect(v).not.toBeUndefined(); expect(v).toBeTypeOrNull(Number)},
        description : function(v) {expect(v).toBeTypeOrNull(String)},
        image_url : function(v) {expect(v).toBeTypeOrNull(String)},
        url : function(v) {expect(v).toBeTypeOrNull(String)}
    })
    .toss()



    frisby.create('Get a list of brands but only some fields')
    .get(process.env.url+'/v0/brands?fields=name')
    .expectStatus(200)
    .expectJSONTypes('data.*',{
        name : function(v) {expect(v).not.toBeUndefined(); expect(v).toBeTypeOrNull(String)},
        id : function(v) {expect(v).toBeUndefined()},
        description : function(v) {expect(v).toBeUndefined()},
        image_url : function(v) {expect(v).toBeUndefined()},
        url : function(v) {expect(v).toBeUndefined()}
    })
    .toss()
