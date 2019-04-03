var Utils = require('../../libs/util.js')

var expect = require('chai').expect

var Fixtures = require('../fixtures')

var coupon = Fixtures.coupons.create

var testProducts = [{
  id: coupon.target_ids[0],
  category_id: 10,
  price: 10,
  price_discount: 5,
  quantity: 3
}, {
  id: coupon.target_ids[1],
  price: 20,
  type: 'product_with_variants',
  category_id: 11,
  price_discount: 10,
  variant: {
    price: 11,
    price_discount: 6
  },
  quantity: 2
},
{
  id: coupon.target_ids[2],
  category_id: 10,
  price: 20,
  price_discount: 15,
  quantity: 2
}
]

function getTotalPrice (arr) {
  return arr.map(Utils.getLineItemPrice)
    .reduce((a, b) => {
      return a + b
    }, 0)
}

describe('Test coupon value calculation functions', function () {
  describe('Test getCouponDiscountForLineItem()', () => {
    it('Should calculate correctly net discount value', () => {
      var tCoupon = JSON.parse(JSON.stringify(coupon))

      tCoupon.discount_type = 'NET_REDUCTION'
      tCoupon.discount_value = 1

      var expectedDiscount = tCoupon.discount_value * testProducts[0].quantity

      expect(Utils.getCouponDiscountForLineItem(tCoupon, testProducts[0])).to.equal(expectedDiscount)
    })

    it('Should calculate correctly percentage reduction discount value', () => {
      var tCoupon = JSON.parse(JSON.stringify(coupon))

      tCoupon.discount_type = 'PERCENTAGE_REDUCTION'
      tCoupon.discount_value = 10

      var expectedDiscount = (testProducts[0].price_discount * testProducts[0].quantity * tCoupon.discount_value) / 100

      expect(Utils.getCouponDiscountForLineItem(tCoupon, testProducts[0])).to.equal(expectedDiscount)
    })

    it('Should calculate correctly net discount value for variant', () => {
      var tCoupon = JSON.parse(JSON.stringify(coupon))

      tCoupon.discount_type = 'NET_REDUCTION'
      tCoupon.discount_value = 1

      var expectedDiscount = tCoupon.discount_value * testProducts[1].quantity

      expect(Utils.getCouponDiscountForLineItem(tCoupon, testProducts[1])).to.equal(expectedDiscount)
    })

    it('Should calculate correctly percentage reduction discount value for variant', () => {
      var tCoupon = JSON.parse(JSON.stringify(coupon))

      tCoupon.discount_type = 'PERCENTAGE_REDUCTION'
      tCoupon.discount_value = 10

      var expectedDiscount = (testProducts[1].variant.price_discount * testProducts[1].quantity * tCoupon.discount_value) / 100

      expect(Utils.getCouponDiscountForLineItem(tCoupon, testProducts[1])).to.equal(expectedDiscount)
    })
  })

  describe('Tests on CART_COUPON ', function () {
    it('Should calculate correctly net discount value', () => {
      var tCoupon = JSON.parse(JSON.stringify(coupon))

      tCoupon.target_type = 'CART_COUPON'
      tCoupon.discount_type = 'NET_REDUCTION'
      tCoupon.discount_value = 1

      var expectedDiscount = tCoupon.discount_value

      expect(Utils.getTotalCouponDiscount(tCoupon, testProducts)).to.equal(expectedDiscount)
    })

    it('Should calculate correctly percentage discount value', () => {
      var tCoupon = JSON.parse(JSON.stringify(coupon))

      tCoupon.target_type = 'CART_COUPON'
      tCoupon.discount_type = 'PERCENTAGE_REDUCTION'
      tCoupon.discount_value = 10

      var expectedDiscount = (getTotalPrice(testProducts) * tCoupon.discount_value) / 100

      expect(Utils.getTotalCouponDiscount(tCoupon, testProducts)).to.equal(expectedDiscount)
    })
  })

  describe('Tests on PRODUCT_COUPON ', function () {
    it('Should calculate correctly net discount value', () => {
      var tCoupon = JSON.parse(JSON.stringify(coupon))

      tCoupon.target_type = 'PRODUCT_COUPON'
      tCoupon.discount_type = 'NET_REDUCTION'
      tCoupon.target_id = coupon.target_ids[0]
      tCoupon.discount_value = 1

      var expectedDiscount = tCoupon.discount_value * testProducts[0].quantity

      expect(Utils.getTotalCouponDiscount(tCoupon, testProducts)).to.equal(expectedDiscount)
    })

    it('Should calculate correctly percentage discount value', () => {
      var tCoupon = JSON.parse(JSON.stringify(coupon))

      tCoupon.target_type = 'PRODUCT_COUPON'
      tCoupon.discount_type = 'PERCENTAGE_REDUCTION'
      tCoupon.target_id = testProducts[0].id
      tCoupon.discount_value = 10

      var testProductPrice = testProducts[0].price_discount * testProducts[0].quantity
      var expectedDiscount = (testProductPrice * tCoupon.discount_value) / 100

      expect(Utils.getTotalCouponDiscount(tCoupon, testProducts)).to.equal(expectedDiscount)
    })
  })

  describe('Tests on PRODUCTS_COUPON ', function () {
    it('Should calculate correctly net discount value', () => {
      var tCoupon = JSON.parse(JSON.stringify(coupon))

      tCoupon.target_type = 'PRODUCTS_COUPON'
      tCoupon.discount_type = 'NET_REDUCTION'
      tCoupon.target_ids = [coupon.target_ids[0]]
      tCoupon.discount_value = 1

      var expectedDiscount = tCoupon.discount_value * testProducts[0].quantity

      expect(Utils.getTotalCouponDiscount(tCoupon, testProducts)).to.equal(expectedDiscount)
    })

    it('Should calculate correctly percentage discount value', () => {
      var tCoupon = JSON.parse(JSON.stringify(coupon))

      tCoupon.target_type = 'PRODUCTS_COUPON'
      tCoupon.discount_type = 'PERCENTAGE_REDUCTION'
      tCoupon.target_ids = [testProducts[0].id]
      tCoupon.discount_value = 10

      var testProductPrice = testProducts[0].price_discount * testProducts[0].quantity
      var expectedDiscount = (testProductPrice * tCoupon.discount_value) / 100

      expect(Utils.getTotalCouponDiscount(tCoupon, testProducts)).to.equal(expectedDiscount)
    })
  })

  describe('Tests on CATEGORY_COUPON ', function () {
    it('Should calculate correctly net discount value', () => {
      var tCoupon = JSON.parse(JSON.stringify(coupon))

      tCoupon.target_type = 'CATEGORY_COUPON'
      tCoupon.discount_type = 'NET_REDUCTION'
      tCoupon.target_id = testProducts[0].category_id
      tCoupon.discount_value = 1

      var expectedDiscount = tCoupon.discount_value * testProducts[0].quantity

      expect(Utils.getTotalCouponDiscount(tCoupon, [testProducts[0]])).to.equal(expectedDiscount)
    })

    it('Should calculate correctly percentage discount value', () => {
      var tCoupon = JSON.parse(JSON.stringify(coupon))

      tCoupon.target_type = 'CATEGORY_COUPON'
      tCoupon.discount_type = 'PERCENTAGE_REDUCTION'
      tCoupon.target_id = testProducts[0].category_id
      tCoupon.discount_value = 10

      var testProductPrice = testProducts[0].price_discount * testProducts[0].quantity
      var expectedDiscount = (testProductPrice * tCoupon.discount_value) / 100

      expect(Utils.getTotalCouponDiscount(tCoupon, [testProducts[0]])).to.equal(expectedDiscount)
    })
  })
})
