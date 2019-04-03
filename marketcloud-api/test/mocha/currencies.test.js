var request = require('supertest')("http://localhost:5000/v0");
var expect = require('chai').expect;

var Utils = require('../../libs/util.js');

var authFixture = require('../fixtures/auth.fixtures');
var productsFixtures = require('../fixtures/products.fixtures');
var couponsFixtures = require('../fixtures/coupons.fixtures');
var collectionsFixtures = require('../fixtures/collections.fixtures');
var cartsFixtures = require('../fixtures/carts.fixtures');
var promotionsFixtures = require('../fixtures/promotions.fixtures');

var currencies = JSON.parse(authFixture.application.currencies);

var rate = currencies[0].rate;
var code = currencies[0].code;



describe("Test currencies options on products", function() {

  let ID = null;

  let convertedProduct = Utils.convertProductPrices(JSON.parse(JSON.stringify(productsFixtures.create)), rate, code);

  this.timeout(10000);

  it("Should create a product", function(done) {
    request
      .post('/products')
      .send(productsFixtures.create)
      .expect(200)
      .end(function(err, res) {
        ID = res.body.data.id;
        if (err) throw err;
        done();
      });
  })



  it("Should retrieve the product by id and display the formatted currency", (done) => {
    request
      .get('/products/' + ID + '?currency=USD')
      .expect(200)
      .end((err, res) => {
        if (err) throw err;
        expect(res.body.data.price).to.equal(convertedProduct.price)

        done()
      })
  })



  it("Should retrieve a list of  products and display the formatted currency", (done) => {
    request
      .get('/products?id=' + ID + '&currency=USD')
      .expect(200)
      .end((err, res) => {
        if (err) throw err;
        expect(res.body.data[0].price).to.equal(convertedProduct.price)
        done()
      })
  })

  it("Should delete the test product", function(done) {
    request
      .delete('/products/' + ID)
      .expect(200, done)
  })


});



describe("Test currencies options on coupons", function() {

  let ID = null;

  let convertedCoupon = Utils.convertCouponPrices(JSON.parse(JSON.stringify(couponsFixtures.create)), rate, code);

  this.timeout(10000);

  it("Should create a coupon", function(done) {
    request
      .post('/coupons')
      .send(couponsFixtures.create)
      .expect(200)
      .end(function(err, res) {
        ID = res.body.data.id;
        if (err) throw err;
        done();
      });
  })



  it("Should retrieve the coupon by id and display the formatted currency", (done) => {
    request
      .get('/coupons/' + ID + '?currency=USD')
      .expect(200)
      .end((err, res) => {
        if (err) throw err;
        expect(res.body.data.discount_value).to.equal(convertedCoupon.discount_value)

        done()
      })
  })



  it("Should retrieve a list of  coupons and display the formatted currency", (done) => {
    request
      .get('/coupons?id=' + ID + '&currency=USD')
      .expect(200)
      .end((err, res) => {
        if (err) throw err;
        expect(res.body.data[0].discount_value).to.equal(convertedCoupon.discount_value)
        done()
      })
  })

  it("Should delete the test coupon", function(done) {
    request
      .delete('/coupons/' + ID)
      .expect(200, done)
  })


});



describe("Test currencies options on promotions", function() {

  let ID = null;

  let convertedPromotion = Utils.convertPromotionPrices(JSON.parse(JSON.stringify(promotionsFixtures.create)), rate, code);

  this.timeout(10000);

  it("Should create a promotion", function(done) {
    request
      .post('/promotions')
      .send(promotionsFixtures.create)
      .expect(200)
      .end(function(err, res) {
        ID = res.body.data.id;
        if (err) throw err;
        done();
      });
  })



  it("Should retrieve the promotion by id and display the formatted currency", (done) => {
    request
      .get('/promotions/' + ID + '?currency=USD')
      .expect(200)
      .end((err, res) => {
        if (err) throw err;
        expect(res.body.data.discount_value).to.equal(convertedPromotion.discount_value)

        done()
      })
  })



  it("Should retrieve a list of  promotions and display the formatted currency", (done) => {
    request
      .get('/promotions?id=' + ID + '&currency=USD')
      .expect(200)
      .end((err, res) => {
        if (err) throw err;
        expect(res.body.data[0].discount_value).to.equal(convertedPromotion.discount_value)
        done()
      })
  })

  it("Should delete the test promotion", function(done) {
    request
      .delete('/promotions/' + ID)
      .expect(200, done)
  })


});


describe("Test currencies options on collections", function() {

  let ID = null;
  let PRODUCT = null;


  let convertedCollection = Utils.convertCollectionPrices(JSON.parse(JSON.stringify(collectionsFixtures.create)), rate, code);

  this.timeout(10000);


  before(function(done) {
    // Lets' grab a product for our tests
    request
      .get('/products/')
      .expect(200)
      .end((err, res) => {
        if (err) throw err;
        PRODUCT = res.body.data[0];
        PRODUCT = Utils.convertProductPrices(PRODUCT, rate, code);
        collectionsFixtures.create.items.push({
          product_id: PRODUCT.id
        })

        done()
      })
  })

  it("Should create a collection", function(done) {
    request
      .post('/collections')
      .send(collectionsFixtures.create)
      .expect(200)
      .end(function(err, res) {
        ID = res.body.data.id;
        if (err) throw err;
        done();
      });
  })



  it("Should retrieve the collection by id and display the formatted currency", (done) => {
    request
      .get('/collections/' + ID + '?currency=USD')
      .expect(200)
      .end((err, res) => {
        if (err) throw err;
        expect(res.body.data.items[0].price).to.equal(PRODUCT.price)

        done()
      })
  })


  // Not testing listing because products are not expanded

  it("Should delete the test collection", function(done) {
    request
      .delete('/collections/' + ID)
      .expect(200, done)
  })


});



describe("Test currencies options on carts", function() {

  let ID = null;
  let PRODUCT = null;


  let convertedCart = Utils.convertCartPrices(JSON.parse(JSON.stringify(cartsFixtures.create)), rate, code);

  this.timeout(10000);


  before(function(done) {
    // Lets' grab a product for our tests
    request
      .get('/products/')
      .expect(200)
      .end((err, res) => {
        if (err) throw err;
        PRODUCT = res.body.data[0];
        PRODUCT = Utils.convertProductPrices(PRODUCT, rate, code);
        cartsFixtures.create.items.push({
          product_id: PRODUCT.id,
          quantity: 1
        })

        done()
      })
  })

  it("Should create a cart", function(done) {
    request
      .post('/carts')
      .send(cartsFixtures.create)
      .expect(200)
      .end(function(err, res) {
        ID = res.body.data.id;
        if (err) throw err;
        done();
      });
  })



  it("Should retrieve the cart by id and display the formatted currency", (done) => {
    request
      .get('/carts/' + ID + '?currency=USD')
      .expect(200)
      .end((err, res) => {
        if (err) throw err;
        expect(res.body.data.items[0].price).to.equal(PRODUCT.price)

        done()
      })
  })

  it("Should retrieve a list of carts cart by id and display the formatted currency", (done) => {
    request
      .get('/carts?id=' + ID + '&currency=USD')
      .expect(200)
      .end((err, res) => {
        if (err) throw err;
        expect(res.body.data[0].items[0].price).to.equal(PRODUCT.price)

        done()
      })
  })


  // Not testing listing because products are not expanded

  it("Should delete the test cart", function(done) {
    request
      .delete('/carts/' + ID)
      .expect(200, done)
  })


});