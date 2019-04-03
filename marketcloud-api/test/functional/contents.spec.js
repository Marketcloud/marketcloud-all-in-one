var frisby = require('./bootstrap')


var testContent = {
  title : "MyTestContent",
  text : "This is a beautiful content.......",
  author : {
    name : "John Doe",
    image_url : "http://placehold.it/200x200"
  }
}
var InvalidContent = {
  title : 12,
  text : "This is a beautiful content.......",
  author : {
    name : "John Doe",
    image_url : "http://placehold.it/200x200"
  }
}
var updatedTestContent = {
  title : "My Updated Test Content",
  text : "This is a more beautiful content.......",
  author : {
    name : "John Doe",
    image_url : "http://placehold.it/200x200"
  }
}



var TestDelete = function(json) {
  frisby.create('Delete the content')
    .delete(process.env.url+'/v0/contents/'+json.data.id)
    .expectStatus(200)
    .expectJSON({status:true})
    .afterJSON(function(){
          frisby.create('Ensure that the deleted contentno longer exists')
          .get(process.env.url+'/v0/contents/' + json.data.id)
          .expectStatus(404)
          .toss()
        })
    .afterJSON(TestUpdateNonExistingResource)
    .toss()
}

var TestUpdateNonExistingResource = function(json) {
    frisby.create('Updates NON-EXISTING contents')
        .put(
            process.env.url+'/v0/contents/' + 0, updatedTestContent, {
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

    frisby.create('Retrieve the content')
    .get(process.env.url+'/v0/contents/'+json.data.id)
    .expectStatus(200)
    .expectJSON({
      data:testContent
    })
    .afterJSON(TestUpdate)
    .toss();
  }

function TestUpdate(json) {
  frisby.create('Update a content')
  .put(process.env.url+'/v0/contents/'+json.data.id,updatedTestContent,{json:true})
  .expectStatus(200)
  .expectJSON({
    status :true,
    data : updatedTestContent
  })
  .afterJSON(function(json){
    frisby.create('Retrieve the updated content')
    .get(process.env.url+'/v0/contents/'+json.data.id)
    .expectStatus(200)
    .expectJSON({
      data:updatedTestContent
    })
    .afterJSON(TestDelete)
    .toss();
  })
.toss();
}




function TestGetSomeFields(json) {
    frisby.create('Retrieve only some fields from the content')
        .get(process.env.url+'/v0/contents/' + json.data.id+'?fields=id,title')
        .expectStatus(200)
        .expectJSON({
            data: {
                id : json.data.id,
                title: "MyTestContent",
            }
        })
        .expectJSONTypes('data',{
            description : function(value) {expect(value).toBeUndefined()},
            url : function(value) {expect(value).toBeUndefined()}
        })
        .toss();
}




function TestListContents() {
  frisby
    .create('Retrieve a list of contents')
    .get(process.env.url+'/v0/contents/')
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

function TestListContents() {
  frisby
    .create('Retrieve a list of contents')
    .get(process.env.url+'/v0/contents/')
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

function TestListContentsWithFieldsParameter() {

    frisby.create('Get a list of contents but only some fields')
    .get(process.env.url+'/v0/contents?fields=title')
    .expectStatus(200)
    .expectJSONTypes('data.*',{
        title : function(v) {expect(v).not.toBeUndefined(); expect(v).toBeTypeOrNull(String)},
        
        id : function(v) {expect(v).toBeUndefined()},
       
    })
    .toss()
}





frisby.create('Create valid content')
  .post(process.env.url+'/v0/contents',testContent,{json:true})
  .expectStatus(200)
  .expectJSON({
    status :true
  })
  .afterJSON(function(json){
        TestGet(json)
        TestGetSomeFields(json)
    })
.toss();



frisby.create('Create not-valid content should return error')
  .post(process.env.url+'/v0/contents',InvalidContent,{json:true})
  .expectStatus(400)
  .expectJSON({
    status :false
  })
.toss();

TestListContents()
TestListContentsWithFieldsParameter()


function TestGetAListOfNResources(next){
  frisby.create('Get a list of 25 content rules ')
      .get(process.env.url+'/v0/contents?limit=25')
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

