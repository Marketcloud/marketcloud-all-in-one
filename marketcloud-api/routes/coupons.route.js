var Resource = require('../libs/resource.js')
var Types = require('../models/types.js')
var Utils = require('../libs/util.js')
var Errors = require('../models/errors.js')

var CustomValidator = {
  validate: function (coupon) {
    var targetTypesThatNeedTargetId = [
      'PRODUCT_COUPON',
      'PRODUCTS_COUPON',
      'CATEGORY_COUPON'
    ]

    if (targetTypesThatNeedTargetId.indexOf(coupon.target_type) > -1) {
      if (!coupon.hasOwnProperty('target_id')) {
        return {
          valid: false,
          invalidPropertyName: 'target_id',
          failedValidator: 'required',
          message: 'For coupons with target_type = "' + coupon.target_type + '", "target_id" is required.'
        }
      }
    }

    // Now regular validation
    return Types.Coupon.validate(coupon)
  }
}

var resource = Resource({
  singularResourceName: 'coupon',
  pluralResourceName: 'coupons',
  validator: CustomValidator,
  hooks: {
    afterList: Utils.convertCouponCurrency,
    afterGetById: Utils.convertCouponCurrency

  }
})

module.exports = resource.router
