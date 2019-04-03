var frisby = require('./bootstrap')


var testCategory = {
  name : "My Test Category",
  description : "This is the description of a test category",
  url : "http://www.mysite.com/category/my_test_category",
  image_url : 'http://static.marketcloud.com/EaEaaaIQcZ4Z2aZQacWfaQ1921'
}

var updatedTestCategory = {
  name : "My Updated Test Category",
  description : "This is the updated description of a test category",
  url : "http://www.mysite.com/category/my_updated_test_category",
  image_url : 'http://static.marketcloud.com/EaEaaaIQcZ4Z2aZQacWfaQ1921_update'
}

var InvalidCategory = {
  name : 12,
  description : "ABALBAABLABLABA"
}

TestCreate(TestGet)

function TestCreate(next){
  frisby.create('Create valid category')
    .post(process.env.url+'/v0/categories',testCategory,{json:true})
    .expectStatus(200)
    .expectJSON({
      status :true
    })
    .afterJSON(function(json){
      testCategory.id = json.data.id;
      testCategory.path = json.data.path;
      TestGet(json)
      TestGetSomeFields(json)
      TestCreateSubCategory()
    })
  .toss();
}



function TestCreateSubCategory(){
  var subcategory = {name : "Subcategory", parent_id : testCategory.id}
  frisby.create('Create valid subcategory')
    .post(process.env.url+'/v0/categories',subcategory,{json:true})
    .expectStatus(200)
    .expectJSON({
      status :true
    })
    .expectJSONTypes('data',{
      path :  function(value) { 
        expect(value).toBe(testCategory.path+'/'+subcategory.name)
      }
    })
    .afterJSON(TestGetSubcategories)
  .toss();
}

function TestGet(next){
    frisby.create('Retrieve the category')
    .get(process.env.url+'/v0/categories/'+json.data.id)
    .expectStatus(200)
    .expectJSON({status:true,data:testCategory})
    .afterJSON(TestUpdate)
    .toss();
}

function TestGetSubcategories(json) {
  frisby.create('Fetches also subcategories for given category')
  .get(process.env.url+'/v0/categories/'+json.data.id+'?fetch_subcategories=true')
  .expectStatus(200)
  .expectJSONTypes('data',{
    subcategories : Array
  })
  .afterJSON(TestListGetSubcategories)
  .toss()
}
function TestListGetSubcategories() {
  frisby.create('Fetches also subcategories for a list of categories')
  .get(process.env.url+'/v0/categories/?fetch_subcategories=true')
  .expectStatus(200)
  .expectJSONTypes('data.*',{
    subcategories : Array
  })
  .toss()
}


function TestUpdate(json) {
  frisby.create('Update a category')
  .put(process.env.url+'/v0/categories/'+json.data.id,updatedTestCategory,{json:true})
  .expectStatus(200)
  .expectJSON({
    status :true,
    data : updatedTestCategory
  })
  .afterJSON(function(json){
    frisby.create('Retrieve the updated category')
    .get(process.env.url+'/v0/categories/'+json.data.id)
    .expectStatus(200)
    .expectJSON({data:updatedTestCategory})
    .afterJSON(TestDelete)
    .toss();
  })
  .toss();
}

var TestDelete = function(json) {
  frisby.create('Delete the category')
    .delete(process.env.url+'/v0/categories/'+json.data.id)
    .expectStatus(200)
    .expectJSON({status:true})
    .afterJSON(function(){
          frisby.create('Ensure that the deleted category no longer exists')
          .get(process.env.url+'/v0/categories/' + json.data.id)
          .expectStatus(404)
          .toss()
        })
    .afterJSON(TestUpdateNonExistingResource)
    .toss()
}

var TestUpdateNonExistingResource = function(json) {
    frisby.create('Updates NON-EXISTING category')
        .put(
            process.env.url+'/v0/categories/' + 0, updatedTestCategory, {
                json: true
            })
        .expectStatus(404)
        .expectJSON({
            status: false,
            errors: [{code : 404, type : 'NotFound'}]
        })
        .toss()
}

frisby.create('Get a list of categories')
    .get(process.env.url+'/v0/categories')
    .expectStatus(200)
    .expectJSONTypes('data.*',{
        id : function(v) {expect(v).not.toBeUndefined(); expect(v).toBeTypeOrNull(Number)},
        name : function(v) {expect(v).not.toBeUndefined(); expect(v).toBeTypeOrNull(String)},
        description : function(v) {expect(v).toBeTypeOrNull(String)},
        image_url : function(v) {expect(v).toBeTypeOrNull(String)},
        url : function(v) {expect(v).toBeTypeOrNull(String)},
        parent_id : function(v) {expect(v).toBeTypeOrNull(Number)},
    })
    .toss()

frisby.create('Create not-valid category should return error')
  .post(process.env.url+'/v0/categories',InvalidCategory,{json:true})
  .expectStatus(400)
  .expectJSON({
    status :false
  })
.toss();

function TestGetSomeFields(json) {
    frisby.create('Retrieve only some fields from the Category')
        .get(process.env.url+'/v0/categories/' + json.data.id+'?fields=name,description,id')
        .expectStatus(200)
        .expectJSON({
            data: {
                id : json.data.id,
                name: "My Test Category",
                description: "This is the description of a test category"
            }
        })
        .expectJSONTypes('data',{
            rate : function(value) {expect(value).toBeUndefined()}
        })
        .afterJSON(function(json){
            
        })
        .toss();
}


frisby.create('Get a list of categories but only some fields')
    .get(process.env.url+'/v0/categories?fields=name')
    .expectStatus(200)
    .expectJSONTypes('data.*',{
        name : function(v) {expect(v).not.toBeUndefined(); expect(v).toBeTypeOrNull(String)},
        id : function(v) {expect(v).toBeUndefined()},
        description : function(v) {expect(v).toBeUndefined()},
        image_url : function(v) {expect(v).toBeUndefined()},
        url : function(v) {expect(v).toBeUndefined()}
    })
    .toss()

