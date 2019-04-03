var Utils = require('../../libs/util.js')

var expect = require('chai').expect


describe('Test price calculations functions', function() {

  it("Should calculate correctly the total value", function() {
    var line_items = [{
      price: 12,
      price_discount: 1,
      quantity: 1
    }, {
      price: 12,
      price_discount: 0,
      quantity: 2
    }, {
      price: 1,
      price_discount: 0,
      variant: {
        price: 1,
        price_discount: 0.5
      },
      quantity: 3
    }]

    expect(Utils.getTotalItemsValue(line_items)).to.equal(1 + 0 + 1.5);
  })



  it("Should correctly calculate paymentMethod total for a no_cost payment_method",function(){
    var o = {
      payment_method : {
        cost_type : 'no_cost'
      }
    }

    expect(Utils.getPaymentMethodTotal(o)).to.equal(0)
  })


    it("Should correctly calculate paymentMethod total for a fixes_fee payment_method",function(){
    var o = {
      payment_method : {
        cost_type : 'fixed_fee',
        fixed_fee : 10
      }
    }

    expect(Utils.getPaymentMethodTotal(o)).to.equal(10)
  })


  it("Should correctly calculate paymentMethod total for a percentage_fee payment_method",function(){
    var o = {
      total : 200,
      payment_method : {
        cost_type : 'percentage_fee',
        percentage_fee : 25
      }
    }

    expect(Utils.getPaymentMethodTotal(o)).to.equal(50)
  })


  it("Should correctly calculate paymentMethod total for a fixed_plus_percentage payment_method",function(){
    var o = {
      total : 200,
      payment_method : {
        cost_type : 'fixed_plus_percentage',
        percentage_fee : 25,
        fixed_fee: 10
      }
    }

    expect(Utils.getPaymentMethodTotal(o)).to.equal(60)
  })




})