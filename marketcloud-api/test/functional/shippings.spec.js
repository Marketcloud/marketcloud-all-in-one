var frisby = require('./bootstrap')


var testShipping = {
    "name" : "Free shipping",
    "base_cost" : 0,
    "per_item_cost" : 0,
    "zones" : [ 
        {
            "name" : "Europe",
            "code" : "EUROPE"
        }
    ],
    "min_value" : 30,
}
var InvalidShipping = {
    "name" : "Free shipping",
    "base_cost" : "0",
    "per_item_cost" : "0",
    "zones" : [ 
        {
            "name" : "Europe",
            "code" : "EUROPE"
        }
    ],
    "min_value" : "30",
}
var updatedTestShipping = {
  name : "MyUpdatedTestShipping",
}



var TestDelete = function(json) {
  frisby.create('Delete the shipping')
    .delete(process.env.url+'/v0/shippings/'+json.data.id)
    .expectStatus(200)
    .expectJSON({status:true})
    .afterJSON(function(){
          frisby.create('Ensure that the deleted shippingno longer exists')
          .get(process.env.url+'/v0/shippings/' + json.data.id)
          .expectStatus(404)
          .toss()
        })
    .afterJSON(TestUpdateNonExistingResource)
    .toss()
}

var TestUpdateNonExistingResource = function(json) {
    frisby.create('Updates NON-EXISTING shippings')
        .put(
            process.env.url+'/v0/shippings/' + 0, updatedTestShipping, {
                json: true
            })
        .expectStatus(404)
        .expectJSON({
            status: false,
            errors: [{code : 404, type : 'NotFound'}]
        })
        .toss()
}
function TestGet(json){

    frisby.create('Retrieve the shipping')
    .get(process.env.url+'/v0/shippings/'+json.data.id)
    .expectStatus(200)
    .expectJSON({
      data:testShipping
    })
    .afterJSON(function(j){
      TestUpdate(j)
      TestGetByZone();
    })
    .toss();
  }


function TestGetByZone(){

    frisby.create('Retrieve the shipping')
    .get(process.env.url+'/v0/shippings?zone='+testShipping.zones[0].name)
    .expectStatus(200)
    .expectJSONTypes({
      data:function(v) {
        expect(v.length > 0).toBe(true);
      }
    })
    .toss();
  }

function TestUpdate(json) {
  frisby.create('Update a shipping')
  .put(process.env.url+'/v0/shippings/'+json.data.id,updatedTestShipping,{json:true})
  .expectStatus(200)
  .expectJSON({
    status :true,
    data : updatedTestShipping
  })
  .afterJSON(function(json){
    frisby.create('Retrieve the updated shipping')
    .get(process.env.url+'/v0/shippings/'+json.data.id)
    .expectStatus(200)
    .expectJSON({
      data:updatedTestShipping
    })
    .afterJSON(TestDelete)
    .toss();
  })
.toss();
}




function TestGetSomeFields(json) {
    frisby.create('Retrieve only some fields from the shipping')
        .get(process.env.url+'/v0/shippings/' + json.data.id+'?fields=id,name')
        .expectStatus(200)
        .expectJSON({
            data: {
                id : json.data.id,
                name: testShipping.name,
            }
        })
        .toss();
}



function TestListShippings() {
  frisby
    .create('Retrieve a list of brands')
    .get(process.env.url+'/v0/shippings/')
    .expectStatus(200)
    .expectJSON({
      status:true
    })
    .expectJSONTypes({
      status:Boolean,
      data:Array
    })
    .toss()
}

function TestListShippings() {
  frisby
    .create('Retrieve a list of shippings')
    .get(process.env.url+'/v0/shippings/')
    .expectStatus(200)
    .expectJSON({
      status:true
    })
    .expectJSONTypes({
      status:Boolean,
      data:Array
    })
    .toss()
}

function TestListShippingsWithFieldsParameter() {

    frisby.create('Get a list of shippings but only some fields')
    .get(process.env.url+'/v0/shippings?fields=name,base_cost')
    .expectStatus(200)
    .expectJSONTypes('data.0',{
        name : function(v) {expect(v).not.toBeUndefined(); expect(v).toBeTypeOrNull(String)},
        base_cost : function(v) {expect(v).not.toBeUndefined(); expect(v).toBeTypeOrNull(String)},
        id : function(v) {expect(v).toBeUndefined()},
       
    })
    .toss()
}


function TestGetByCart(){
  frisby.create('Fetch a list of carts')
  .get(process.env.url+'/v0/carts')
  .expectStatus(200)
  .afterJSON( response => {
    var cart = response.data[0];
    frisby.create('Get shippings by cart')
    .get(process.env.url + '/v0/shippings/cart/' + cart.id)
    .expectStatus(200)
    .toss()
  })
  .toss()
}






frisby.create('Create valid shipping')
  .post(process.env.url+'/v0/shippings',testShipping,{json:true})
  .expectStatus(200)
  .expectJSON({
    status :true
  })
  .afterJSON(function(json){
        TestGet(json)
        TestGetSomeFields(json)
        TestGetByCart()
    })
.toss();



frisby.create('Create not-valid shipping should return error')
  .post(process.env.url+'/v0/shippings',InvalidShipping,{json:true})
  .expectStatus(400)
  .expectJSON({
    status :false
  })
.toss();

TestListShippings()


function TestGetAListOfNResources(next){
  frisby.create('Get a list of 25 shipping rules ')
      .get(process.env.url+'/v0/shippings?limit=25')
      .expectStatus(200)
      .expectJSONTypes('',{
          data : function(v) {expect(v.length).toBe(25);}
      })
      .afterJSON(function(json){
        if (next)
          next(json);
      })
      .toss()
}

// TestGetAListOfNResources()
