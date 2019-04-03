var Utils = require('../../libs/util.js')

var expect = require('chai').expect

describe('Test getPromotionTotal() function', function () {
  it('Should correctly evaluate FREE_SHIPPING promotion', function () {
    let order = {
      products: [{
        id: 1,
        price: 12,
        type: 'simple_product'
      }],
      shipping_total: 10
    }

    let promotion = {
      conditions: [],
      effects: [{
        type: 'FREE_SHIPPING',
        value: 'FREE_SHIPPING'
      }]
    }

    order.promotion = promotion

    var promotionTotal = Utils.getPromotionTotal(order)

    expect(promotionTotal).to.equal(order.shipping_total)
  })

  it('Should correctly evaluate CART_VALUE_PERCENTAGE_REDUCTION promotion', function () {
    let order = {
      products: [{
        id: 1,
        price: 15,
        type: 'simple_product',
        quantity: 3
      }, {
        id: 2,
        price: 20,
        type: 'simple_product',
        quantity: 2
      }, {
        id: 3,
        price: 30,
        type: 'simple_product',
        quantity: 1
      } ]

    }

    let promotion = {
      conditions: [],
      effects: [{
        type: 'CART_VALUE_PERCENTAGE_REDUCTION',
        value: 10
      }]
    }

    order.promotion = promotion

    order.items_total = order.products.map(item => item.price * item.quantity).reduce((a, b) => a + b, 0)

    var expectedTotal = order.products.map(item => item.price * item.quantity).reduce((a, b) => a + b, 0) / 10

    var promotionTotal = Utils.getPromotionTotal(order)

    expect(promotionTotal).to.equal(expectedTotal)
  })

  it('Should correctly evaluate CART_VALUE_NET_REDUCTION promotion', function () {
    let order = {
      products: [{
        id: 1,
        price: 15,
        type: 'simple_product',
        quantity: 3
      }, {
        id: 2,
        price: 20,
        type: 'simple_product',
        quantity: 2
      }, {
        id: 3,
        price: 30,
        type: 'simple_product',
        quantity: 1
      } ]

    }

    let promotion = {
      conditions: [],
      effects: [{
        type: 'CART_VALUE_NET_REDUCTION',
        value: 10
      }]
    }

    order.promotion = promotion

    order.items_total = order.products.map(item => item.price * item.quantity).reduce((a, b) => a + b, 0)

    var expectedTotal = 10

    var promotionTotal = Utils.getPromotionTotal(order)

    expect(promotionTotal).to.equal(expectedTotal)
  })

  it('Should correctly evaluate CART_ITEMS_NET_REDUCTION promotion', function () {
    let order = {
      products: [{
        id: 1,
        price: 15,
        type: 'simple_product',
        quantity: 3
      }, {
        id: 2,
        price: 20,
        type: 'simple_product',
        quantity: 2
      }, {
        id: 3,
        price: 30,
        type: 'simple_product',
        quantity: 1
      } ]

    }

    let promotion = {
      conditions: [],
      effects: [{
        type: 'CART_ITEMS_NET_REDUCTION',
        value: 1
      }]
    }

    order.promotion = promotion

    order.items_total = order.products.map(item => item.price * item.quantity).reduce((a, b) => a + b, 0)

    var expectedTotal = 6

    var promotionTotal = Utils.getPromotionTotal(order)

    expect(promotionTotal).to.equal(expectedTotal)
  })

  it('Should correctly evaluate CART_ITEMS_PERCENTAGE_REDUCTION promotion', function () {
    let order = {
      products: [{
        id: 1,
        price: 15,
        type: 'simple_product',
        quantity: 3
      }, {
        id: 2,
        price: 20,
        type: 'simple_product',
        quantity: 2
      }, {
        id: 3,
        price: 30,
        type: 'simple_product',
        quantity: 1
      } ]

    }

    let promotion = {
      conditions: [],
      effects: [{
        type: 'CART_ITEMS_PERCENTAGE_REDUCTION',
        value: 10
      }]
    }

    order.promotion = promotion

    order.items_total = order.products.map(item => item.price * item.quantity).reduce((a, b) => a + b, 0)

    var expectedTotal = 11.5

    var promotionTotal = Utils.getPromotionTotal(order)

    expect(promotionTotal).to.equal(expectedTotal)
  })
})

describe('Test getPromotionTotalForLineItem() function', function () {
  let products = [{
    id: 1,
    price: 15,
    type: 'simple_product',
    quantity: 3
  }, {
    id: 2,
    price: 20,
    type: 'simple_product',
    quantity: 2
  }, {
    id: 3,
    price: 30,
    type: 'simple_product',
    quantity: 1
  }]

  it('Should correctly evaluate CART_VALUE_NET_REDUCTION', function () {
    let promotion = {
      conditions: [],
      effects: [{
        type: 'CART_VALUE_NET_REDUCTION',
        value: 10
      }]
    }

    let numberOfItems = products.map(item => item.quantity).reduce((a, b) => a + b, 0)

    var expectedTotal = Number((10 / numberOfItems).toFixed(2))

    var promotionTotal = Utils.getPromotionTotalForLineItem(products[0], promotion, products)

    expect(promotionTotal).to.equal(expectedTotal)
  })

  it('Should correctly evaluate CART_VALUE_PERCENTAGE_REDUCTION promotion', function () {
    let promotion = {
      conditions: [],
      effects: [{
        type: 'CART_VALUE_PERCENTAGE_REDUCTION',
        value: 10
      }]
    }

    // Since the test disount is 10% we divide by 10
    var expectedTotal = (products[0].price * products[0].quantity) / 10
    // WE fix the radix
    expectedTotal = Number(expectedTotal.toFixed(2))

    var promotionTotal = Utils.getPromotionTotalForLineItem(products[0], promotion, products)

    expect(promotionTotal).to.equal(expectedTotal)
  })

  it('Should correctly evaluate CART_ITEMS_NET_REDUCTION promotion', function () {
    let promotion = {
      conditions: [],
      effects: [{
        type: 'CART_ITEMS_NET_REDUCTION',
        value: 1
      }]
    }

    var expectedTotal = 3

    var promotionTotal = Utils.getPromotionTotalForLineItem(products[0], promotion, products)

    expect(promotionTotal).to.equal(expectedTotal)
  })

  it('Should correctly evaluate CART_ITEMS_PERCENTAGE_REDUCTION promotion', function () {
    let promotion = {
      conditions: [],
      effects: [{
        type: 'CART_ITEMS_PERCENTAGE_REDUCTION',
        value: 10
      }]
    }

    var expectedTotal = (products[0].price * products[0].quantity) / 10

    var promotionTotal = Utils.getPromotionTotalForLineItem(products[0], promotion, products)

    expect(promotionTotal).to.equal(expectedTotal)
  })
})
