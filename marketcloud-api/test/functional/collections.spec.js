var frisby = require('./bootstrap')

var fixtures = require('../fixtures/collections.fixtures');

frisby.create('Create an empty collection')
  .post(
    process.env.url + '/v0/collections',
    fixtures.create,
    { json : true }
  )
  .expectStatus(200)
  .afterJSON(TestUpdateCollection)
  .toss()


function TestUpdateCollection(response) {
  var collection = response.data;

  frisby.create('Updates a collection')
  .put(
    process.env.url + '/v0/collections/' + collection.id,
    { customProperty : null },
    { json : true }
  )
  .expectStatus(200)
  .expectJSONTypes("data",{
    customProperty : (value) => { expect(value).toBeUnefined() }
  })
  .afterJSON(TestDeleteCollection)
  .toss()
}



function TestDeleteCollection(response) {
  var collection = response.data;
  
  return frisby.create('Deletes a collection')
  .delete(process.env.url + '/v0/collections/' + collection.id)
  .expectStatus(200)
  .toss()
}