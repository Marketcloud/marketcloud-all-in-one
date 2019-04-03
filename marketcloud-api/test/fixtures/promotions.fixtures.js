var testPromotion = {
  name : "10% discount above 70$",
  conditions : [
    { type : "MIN_CART_VALUE", value:70 }
  ],
  effects : [
    {type : "CART_ITEMS_PERCENTAGE_REDUCTION", value: 10}
  ]
}

var updatedTestPromotion = {
  name : "Free shipping above 50$",
  conditions : [
    { type : "MIN_CART_VALUE", value : 50}
  ]
}

var InvalidPromotion = {
    name: 12
}


module.exports = {
  create: testPromotion,
  update: updatedTestPromotion,
  invalid: InvalidPromotion
}