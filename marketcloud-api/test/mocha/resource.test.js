
// Let's make sure we are in testing mode
process.env.NODE_ENV = "testing";

var request = require('supertest')("http://localhost:5000/v0");

var expect = require('chai').expect;


var resourceName = process.env.RESOURCE_NAME;

var fixtures = require('../fixtures')[resourceName];

var testData = {};




describe("Look up a specific resource", function () {

  this.timeout(3000);

  it("List resources", function (done) {
    request
      .get('/products/')
      .expect(200)
      .end(function (err, res) {
        expect(res.body.status).to.equal(true);  
        done();    
      });
  })

  it("Should create a new resource", (done) => {

    var customField = String(Date.now());
    // Should also allow custom fields, so we add one
    fixtures.create[customField] = customField;

    request
    .post('/products')
    .send(fixtures.create)
    .expect(200)
    .end( (err,res) => {
      testData.createdResourceId = res.body.data.id;
      // Making sure that the customField is created and readable
      expect(res.body.data[customField]).to.equal(customField);

      //Should also have a created_at timestamp
      //expect(res.body.data.created_at).to.be.a('string');

      done();
    })
  })

  it("Should retreive a resource by its id", function (done) {
    request
      .get('/products/'+testData.createdResourceId)
      .expect(200,done)
  })

  it("Should retreive a resource by its id", function (done) {
    request
      .get('/products/'+testData.createdResourceId)
      .expect(200,done)
  })

  it("Should update the created resource", (done) => {
    request
    .put('/products/' + testData.createdResourceId)
    .send(fixtures.update)
    .expect(200)
    .end( (err,res) => {
      // Let's make sure that the update was 100% effective
      for (var k in fixtures.update){
        expect(res.body.data[k]).to.deep.equal(fixtures.update[k])
      }
      
      done();
    })
  })

  it("Should delete a resource", function (done) {
    request
      .delete('/products/'+testData.createdResourceId)
      .expect(200,done)
  })
  
  
});