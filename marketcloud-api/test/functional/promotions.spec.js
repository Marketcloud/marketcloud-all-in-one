var frisby = require('./bootstrap')


var testPromotion = {
  name : "10% discount above 70$",
  conditions : [
    { type : "MIN_CART_VALUE", value:70 }
  ],
  effects : [
    {type : "CART_ITEMS_PERCENTAGE_REDUCTION", value: 10}
  ]
}

var updatedTestPromotion = {
  name : "Free shipping above 50$",
  conditions : [
    { type : "MIN_CART_VALUE", value : 50}
  ]
}

var InvalidPromotion = {
    name: 12
}

var TestDelete = function(json) {
    frisby.create('Delete the promotion')
        .delete(process.env.url+'/v0/promotions/' + json.data.id)
        .expectStatus(200)
        .expectJSON({
            status: true
        })
        .afterJSON(function(){
          frisby.create('Ensure that the deleted promotion no longer exists')
          .get(process.env.url+'/v0/promotions/' + json.data.id)
          .expectStatus(404)
          .toss()
        })
        .afterJSON(TestUpdateNonExistingResource)
        .toss()
}

var TestUpdateNonExistingResource = function(json) {
    frisby.create('Updates NON-EXISTING promotion')
        .put(
            process.env.url+'/v0/promotions/' + 0, updatedTestPromotion, {
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

    frisby.create('Retrieve the promotion')
        .get(process.env.url+'/v0/promotions/' + json.data.id)
        .expectStatus(200)
        .expectJSON({
            data: testPromotion
        })
        .afterJSON(TestUpdate)
        .toss();
}

function TestGetSomeFields(json) {
    frisby.create('Retrieve only some fields from the promotion')
        .get(process.env.url+'/v0/promotions/' + json.data.id+'?fields=name')
        .expectStatus(200)
        .expectJSON({
            data: {
                name: testPromotion.name
            }
        })
        .expectJSONTypes('data',{
            id : function(value) {expect(value).toBeUndefined()}
        })
        .toss();
}

function TestGetANonExistingField(json) {
    frisby.create('Retrieve a non existing field from the promotion')
        .get(process.env.url+'/v0/promotions/' + json.data.id+'?fields=name,culo')
        .expectStatus(400)
        .expectJSON({
            status:false
        })
        .toss();
}

function TestGetBadFormedFieldsParameter(json) {
    frisby.create('Retrieve a bad formed field from the promotion')
        .get(process.env.url+'/v0/promotions/' + json.data.id+'?fields=')
        .expectStatus(400)
        .expectJSON({
            status:false
        })
        .toss();
}


//Updates a promotion and returns it, ensuring the returned item is updated
function TestUpdate(json) {
    frisby.create('Update a promotion')
        .put(process.env.url+'/v0/promotions/' + json.data.id, updatedTestPromotion, {
            json: true
        })
        .expectStatus(200)
        .expectJSON({
            status: true,
            data: updatedTestPromotion
        })
        .afterJSON(function(json) {
            frisby.create('Retrieve the updated promotion')
                .get(process.env.url+'/v0/promotions/' + json.data.id)
                .expectStatus(200)
                .expectJSON({
                    data: updatedTestPromotion
                })
                .afterJSON(TestDelete)
                .toss();
        })
        .toss();
}



frisby.create('Create valid promotion')
    .post(process.env.url+'/v0/promotions',testPromotion, {
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


frisby.create('Create not-valid promotion should return error')
    .post(process.env.url+'/v0/promotions',InvalidPromotion, {
        json: true
    })
    .expectStatus(400)
    .expectJSON({
        status: false
    })
    .toss();


frisby.create('Get a list of promotions')
    .get(process.env.url+'/v0/promotions')
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



    frisby.create('Get a list of promotions but only some fields')
    .get(process.env.url+'/v0/promotions?fields=name')
    .expectStatus(200)
    .expectJSONTypes('data.*',{
        name : function(v) {expect(v).not.toBeUndefined(); expect(v).toBeTypeOrNull(String)},
        id : function(v) {expect(v).toBeUndefined()},
        description : function(v) {expect(v).toBeUndefined()},
        image_url : function(v) {expect(v).toBeUndefined()},
        url : function(v) {expect(v).toBeUndefined()}
    })
    .toss()



frisby.create('Create a cart and fetches compatible promotions')
.post(process.env.url + '/v0/carts',{},{json : true})
.afterJSON(function(response){
    // Cart created
    var cart_id = response.data.id;
    frisby.create('List the compatible promotions')
    .get(process.env.url+'/v0/promotions/cart/'+cart_id)
    .expectStatus(200)
    .toss()
})  
.toss()