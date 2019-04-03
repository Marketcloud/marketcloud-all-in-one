var frisby = require('frisby');
var Test = frisby.create;
var base_url = process.env.url+'/v0/coupons';



function TestList(){

    Test('Coupon')
        .get(base_url)
        .expectStatus(200)
        .afterJSON(function(response){
          TestCreate()
        })
        .toss();

}


function TestCreate(cb){
    var new_coupon = {
          "code" : "WELCOME2017",
          "name" : "welcome_2017",
          "type" : "total",
          "target_type" : "CART_COUPON",
          "discount_type" : "NET_REDUCTION",
          "discount_value" : 10,
          "active" : true,
          "usages_left" : 200
      }
    Test('Coupon')
        .post(
          base_url,
          new_coupon,
          {json : true}
        )
        .expectStatus(200)
        .afterJSON(function(json){
          coupon_id = json.data.id;
          TestGetById(coupon_id)
        })
        .toss();

}

function TestCreateInvalidCoupon(){
    var new_coupon = {
          "code" : "WELCOME2017",
          "name" : "welcome_2017",
          "type" : "total",
          "target_type" : "PRODUCT_COUPON",
          "discount_type" : "NET_REDUCTION",
          "discount_value" : 10,
          "active" : true,
          "usages_left" : 200
      }
    Test('Coupon')
        .post(
          base_url,
          new_coupon,
          {json : true}
        )
        .expectStatus(400)
        .toss();
}



function TestGetById(coupon_id){
  Test('Coupon')
        .get(base_url+'/'+coupon_id)
        .expectStatus(200)
        .afterJSON(function(json){
          TestUpdate(json.data.id)
          TestCreateInvalidCoupon();
        })
        .toss();
}

function TestUpdate(coupon_id){
  Test('Coupon')
        .put(base_url+'/'+coupon_id,{name : "Updated name", "usages_left" : null},{json:true})
        .expectStatus(200)
        .expectJSON({
          data : {
            name : "Updated name"
          }
        })
        .expectJSONTypes('data', {
            usages_left: function(value) {
                expect(value).toBeUndefined()
            }
        })
        .afterJSON(function(json){

          TestDelete(json.data.id)
        })
        .toss();
}


function TestDelete(coupon_id){
  Test('Coupon')
        .delete(base_url+'/'+coupon_id)
        .expectStatus(200)
        .toss();
}



TestList();