var frisby = require('./bootstrap')


function randomString() {
          var _ = 'qwertyuiopasdfghjklzxcvbnm1234567890_.'.split('');
          var r= ''
          for (var i =0; i<6;i++)
            r+=_[Math.floor(Math.random()*_.length)];
          return r;

        }
var teh_mail = randomString()+"@bigjon.com";

var testUser = {
    name: "Jon Snow",
    email: teh_mail, //UUID is used to avoid unique clashes
    password : "IKNOWNOTHING",
    image_url: 'http://static.marketcloud.com/EaEaaaIQcZ4Z2aZQacWfaQ1921'
}

var testStore = {
    name: "My Test Store",
    owner_email: teh_mail,
    description: "This is the description of a test store"
}

var updatedTestStore = {
    name: "My Updated Test Store",
    description: "This is the updated description of a test store"
}

var InvalidStore = {
    name: "bad rate"
}

var TestDelete = function(json) {
    frisby.create('Delete the store')
        .delete(process.env.url+'/v0/stores/' + json.data.id)
        .expectStatus(200)
        .expectJSON({
            status: true
        })
        .afterJSON(function(){
          frisby.create('Ensure that the deleted store no longer exists')
          .get(process.env.url+'/v0/stores/' + json.data.id)
          .expectStatus(404)
          .toss()
        })
        .afterJSON(TestUpdateNonExistingResource)
        .toss()
}

var TestUpdateNonExistingResource = function(json) {
    frisby.create('Updates NON-EXISTING store')
        .put(
            process.env.url+'/v0/stores/' + 0, updatedTestStore, {
                json: true
            })
        .expectStatus(404)
        .expectJSON({
            status: false,
            errors: [{code : 404, type : 'NotFound'}]
        })
        .afterJSON(TestRemoveUser)
        .toss()
}

function TestGet(json) {

    frisby.create('Retrieve the store')
        .get(process.env.url+'/v0/stores/' + json.data.id)
        .expectStatus(200)
        .expectJSON({
            data: testStore
        })
        .afterJSON(TestUpdate)
        .toss();
}

function TestGetSomeFields(json) {
    frisby.create('Retrieve only some fields from the stores')
        .get(process.env.url+'/v0/stores/' + json.data.id+'?fields=name,description,id')
        .expectStatus(200)
        .expectJSON({
            data: {
                id : json.data.id,
                name: "My Test Store",
                description: "This is the description of a test store"
            }
        })
        .expectJSONTypes('data',{
            rate : function(value) {expect(value).toBeUndefined()}
        })
        .toss();
}



//Updates a store and returns it, ensuring the returned item is updated
function TestUpdate(json) {
    frisby.create('Update a store')
        .put(process.env.url+'/v0/stores/' + json.data.id, updatedTestStore, {
            json: true
        })
        .expectStatus(200)
        .expectJSON({
            status: true,
            data: updatedTestStore
        })
        .afterJSON(function(json) {
            frisby.create('Retrieve the updated store')
                .get(process.env.url+'/v0/stores/' + json.data.id)
                .expectStatus(200)
                .expectJSON({
                    data: updatedTestStore
                })
                .afterJSON(TestDelete)
                .toss();
        })
        .toss();
}


function TestCreateUser(){
  frisby.create('Create valid user')
    .post(process.env.url+'/v0/users',testUser,{json:true})
    .expectStatus(200)
    .expectJSON({
      status :true
    })
    .afterJSON(function(json){
        testUser.id = json.data.id;
        TestCreateStore()
    })
  .toss();
}
function TestRemoveUser(json){
  frisby.create('Delete the user')
    .delete(process.env.url+'/v0/users/'+testUser.id)
    .expectStatus(200)
    .expectJSON({status:true})
    .afterJSON(function(){
          frisby.create('Ensure that the deleted user no longer exists')
          .get(process.env.url+'/v0/users/' + testUser.id)
          .expectStatus(404)
          .toss()
        })
    
    .toss()
}

function TestCreateStore(user){
frisby.create('Create valid store')
    .post(process.env.url+'/v0/stores',testStore, {
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
}



TestCreateUser()

frisby.create('Create not-valid store should return error')
    .post(process.env.url+'/v0/stores',InvalidStore, {
        json: true
    })
    .expectStatus(400)
    .expectJSON({
        status: false
    })
    .toss();

frisby.create('Get a list of stores')
    .get(process.env.url+'/v0/stores')
    .expectStatus(200)
    .expectJSONTypes('data.*',{
        name : function(v) {expect(v).not.toBeUndefined(); expect(v).toBeTypeOrNull(String)},
        id : function(v) {expect(v).not.toBeUndefined(); expect(v).toBeTypeOrNull(Number)},
        description : function(v) {expect(v).toBeTypeOrNull(String)},
        image_url : function(v) {expect(v).toBeTypeOrNull(String)},
        url : function(v) {expect(v).toBeTypeOrNull(String)}
    })
    .toss()



    frisby.create('Get a list of stores but only some fields')
    .get(process.env.url+'/v0/stores?fields=name')
    .expectStatus(200)
    .expectJSONTypes('data.*',{
        name : function(v) {expect(v).not.toBeUndefined(); expect(v).toBeTypeOrNull(String)},
        id : function(v) {expect(v).toBeUndefined()},
        description : function(v) {expect(v).toBeUndefined()},
        image_url : function(v) {expect(v).toBeUndefined()},
        url : function(v) {expect(v).toBeUndefined()}
    })
    .toss()