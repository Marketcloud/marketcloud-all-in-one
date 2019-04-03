//@flow
var Utils = {}
var Errors = require('../models/errors.js')

var sequelize = require('sequelize')

function hasVariants (item) {
  return (item.has_variants === true || item.type === 'product_with_variants')
}

Utils.hasVariants = hasVariants

Utils.fix2 = function (n) {
  if (typeof n !== 'number') { throw new Error('Cannot call Utils.fix2 on non-numbers') }
  return parseFloat(n.toFixed(2))
}

Utils.isInteger = function (n) {
  if (typeof n === 'number') {
    return (Number(n) === n && n % 1 === 0)
  }
  if (typeof n === 'string') {
    var p = ~~Number(n)
    return String(p) === n && p >= 0
  }
}

Utils.stringIsInteger = function (n) {
  return /^[0-9]+$/.test(n)
}
Utils.stringIsFloat = function (n) {
  return /^[0-9]+\.+[0-9]{0,2}$/.test(n)
}
Utils.stringIsNumber = function (n) {
  return /^[0-9]+\.*[0-9]*$/.test(n)
}

Utils.removeKeysFromObject = function (obj, keys) {
  for (var k in obj) {
    if (keys.indexOf(k) > -1) {
      delete obj[k]
    }
  }
}

Utils.removeProperties = function (obj, keys) {
  var remove = function (_obj) {
    for (var k in _obj) {
      if (keys.indexOf(k) > -1) {
        delete _obj[k]
      }
    }
  }

  if (obj instanceof Array) {
    obj.forEach(x => remove(x))
  } else {
    remove(obj)
  }
}

Utils.isDifferent = function (value, arr) {
  if (arr instanceof Array) {
    return arr.indexOf(value) > -1
  } else {
    return value !== arr
  }
}
Utils.projectProductToVariant = function (product, variant_id) {
  if (!(product.variants instanceof Array)) {
    throw new Error('The product with id ' + product.id + ' does not have variants')
  }
  var wantedVariant = product.variants.filter(v => v.id === variant_id).pop()
  product.variant = wantedVariant
  return Utils.filterObject(product, ['application_id', 'variants', '_id'])
}

Utils.updateVariantsDefinition = function (product) {
  if (!product.variantsDefinition) {
    return {}
  }

  var listOfVariationNames = Object.keys(product.variantsDefinition)

  // ["size","color"]
  var newDefinition = {}

  listOfVariationNames.forEach(function (variant_name) {
    var foundValues = []

    product.variants.forEach(function (variant) {
      if (foundValues.indexOf(variant[variant_name]) === -1) {
        foundValues.push(variant[variant_name])
      }
    })

    newDefinition[variant_name] = foundValues
  })

  return newDefinition
}

// Returns true if the array has at least 1 item
// that match the 2 parameter. which must be object
Utils.arrayHasObject = function (arr, obj) {
  return arr.some(function (a) {
    var equal = true
    for (var k in obj) {
      if (a[k] !== obj[k]) {
        equal = false
      }
    }
    return equal
  })
}

/*
    Returns an object with all the properties
    whose name is in the array props
    @param props Array THe array of property names to preserve
*/
Utils.subset = function (obj, props) {
  var buf = {}
  for (var k in obj) {
    if (props.indexOf(k) > -1) {
      buf[k] = obj[k]
    }
  }
  return buf
}

// Opposite of subset, keeps all props from object except those whose name is in the
// array
Utils.subsetInverse = function (obj, props) {
  var buf = {}
  for (var k in obj) {
    if (props.indexOf(k) < 0) {
      buf[k] = obj[k]
    }
  }
  return buf
}

Utils.filterObject = Utils.subsetInverse

Utils.augment = function (obj1, obj2, avoidIntersections) {
  if (avoidIntersections !== true || typeof avoidIntersections === 'undefined') {
    avoidIntersections = false
  }

  for (var k in obj2) {
    if (!(obj1.hasOwnProperty(k) && avoidIntersections === true)) {
      obj1[k] = obj2[k]
    }
  }
  return obj1
}

Utils.merge = function (o1, o2) {
  var o = {}

  for (var k in o1) {
    o[k] = o1[k]
  }
  for (var j in o2) {
    o[j] = o2[j]
  }
  return o
}

Utils.hasAllKeys = function (obj, keys) {
  if (!(keys instanceof Array)) {
    throw new Error('Utils.hasAllKeys([object],[array<string>] ')
  }
  var n = keys.length
  for (var i = 0; i < n; i++) {
    if (!obj.hasOwnProperty(keys[i])) {
      return false
    }
  }
  return true
}

Utils.hasAKey = function (obj, keys) {
  if (!(keys instanceof Array)) {
    throw new Error('Utils.hasAllKeys([object],[array<string>] ')
  }
  var n = keys.length
  for (var i = 0; i < n; i++) {
    if (obj.hasOwnProperty(keys[i])) {
      return true
    }
  }
  return true
}

Utils.packSubdocuments = function (obj, prefix) {
  for (var k in obj) {
    if (k.indexOf(prefix) > -1) {
      if (!obj.hasOwnProperty(prefix)) {
        obj[prefix] = {}
      }
      obj[prefix][k.replace(prefix + '_', '')] = obj[k]
      delete obj[k]
    }
  }
}

/*
 *   This utility takes the output of a query which is unstructured and
 *   structures connected resources inside it in a JSON API way.
 *
 *   @param {object} Object The object containing the relationships
 *   @param {props} Array<string> The list of names of props if id is null is skipped
 *
 */
Utils.GroupResourceRelationships = function (object, props) {
  var relationships = {}
  if (!Array.isArray(props))
    throw new Error("props must be an array of strings");

  props.forEach(function (p) {
    if (object.hasOwnProperty(p + '_id') && object[p + '_id'] !== null) {
      relationships[p] = {}
      for (var k in object) {
        // Se l'oggetto contiene link_propName
        if (k.indexOf(p + '_') > -1) {
          relationships[p][k.replace(p + '_', '')] = object[k]
          delete object[k]
        }
      }
    }
  })

  return relationships
}

Utils.RemoveNullRelationships = function (object, props) {
  if (!Array.isArray(props))
    throw new Error("props must be an array of strings");
  
  props.forEach(function (p) {
    if (object.hasOwnProperty(p + '_id') && object[p + '_id'] === null) {
      for (var k in object) {
        // Cerco tutte le p_qualcosa
        if (k.indexOf(p + '_') > -1) {
          delete object[k]
        }
      }
    }
  })
}

/*

 */
/*
 *   Returns true if every key in object is in array whitelist
 *   @param {test} Object The object to test
 *   @param {whitelist} Array The array to use as whitelist
 */
Utils.whitelistObject = function (test, whitelist) {
  if (!(whitelist instanceof Array)) {
    throw new Error('whitelist must be array.')
  }
  for (var k in test) {
    if (whitelist.indexOf(k) < 0) {
      return k
    }
  }
  return true
}

/*
 *   Returns true if test contains only items contained in whitelist
 *   @param {test} Array The array to test
 *   @param {whitelist} Array The array to use as whitelist
 */
Utils.whitelistArray = function (test, whitelist) {
  if (!(whitelist instanceof Array)) {
    throw new Error('whitelist must be array.')
  }
  var r = true
  test.forEach(function (item) {
    if (whitelist.indexOf(item) < 0) {
      r = item
    }
  })
  return r
}

Utils.parseIntegersInObject = function (object) {
  var t = {}
  for (var k in object) {
    if (Utils.stringIsInteger(object[k])) {
      t[k] = parseInt(object[k], 10)
    } else {
      t[k] = object[k]
    }
  }
  return t
}

Utils.concat = function () {
  var t = []
  var args = Array.prototype.slice.call(arguments)
  args.forEach(function (a) {
    t = t.concat(a)
  })
  return t
}

Utils.parseFloatsInObject = function (object) {
  var t = {}
  for (var k in object) {
    if (Utils.stringIsFloat(object[k])) {
      t[k] = parseFloat(object[k])
    } else {
      t[k] = object[k]
    }
  }
  return t
}

/*
 *   Takes in account variants, discounts and quantities
 *
 *   @param {Number} expandedLineItem.price  The base price
 *   @param {Number} expandedLineItem.price_discount  The optional discounted price
 *   @param {Number} expandedLineItem.quantity  The quantity
 *   @param {Number} expandedLineItem.variant  The variant object that will override price and price_discount but not quantity
 *
 *   @return {Number} The total price for this line item
 */
function getLineItemPrice (expandedLineItem) {
  return Utils.fix2(getProductPrice(expandedLineItem) * expandedLineItem.quantity)
}

Utils.getLineItemPrice = getLineItemPrice

// Helper function for getTotalCouponDiscount
/*
 * *  Covered in test/unit/couponValue.spec.js
 */
function getCouponDiscountForLineItem (coupon, lineItem) {
  var discount = 0

  // Product is a line item, so we assume it has a quantity property
  // in case it doesnt we default it to 1

  if (coupon.discount_type === 'NET_REDUCTION') {
    discount += coupon.discount_value * lineItem.quantity
  } else if (coupon.discount_type === 'PERCENTAGE_REDUCTION') {
    var percentageAmount = 0

    var price = Utils.getLineItemPrice(lineItem)

    percentageAmount = (price * coupon.discount_value) / 100

    discount += percentageAmount
  }

  return Utils.fix2(discount)
}

Utils.getCouponDiscountForLineItem = getCouponDiscountForLineItem

/*
 *   Returns Number if the discount can be calculated
 *
 *  @param {Array<ExpandedLineItem>} products an array of line item with prices
 *
 *  Covered in test/unit/couponValue.spec.js
 */
Utils.getTotalCouponDiscount = function (coupon, products) {
  var totalCouponDiscount = 0
  if (coupon.target_type === 'CART_COUPON') {
    if (coupon.discount_type === 'NET_REDUCTION') {
      totalCouponDiscount = coupon.discount_value
    }

    if (coupon.discount_type === 'PERCENTAGE_REDUCTION') {
      var lineItemsTotal = products.map(Utils.getLineItemPrice)
        .reduce((a, b) => a + b, 0)
      totalCouponDiscount = Utils.fix2((lineItemsTotal / 100) * coupon.discount_value)
    }
  } else {
    totalCouponDiscount = products.map(product => {
      return Utils.getTotalCouponDiscountForLineItem(coupon, product, products)
    }).reduce((a, b) => {
      return a + b
    }, 0)
  }

  return Utils.fix2(totalCouponDiscount)
}

Utils.getTotalCouponDiscountForLineItem = function (coupon, lineItem, products) {
  var couponValue = 0

  switch (coupon.target_type) {
    case 'CART_COUPON':

      // Not handle on per lineItem basis

      break
    case 'PRODUCT_COUPON':

      if (lineItem.id !== coupon.target_id) {
        couponValue = 0
      } else {
        couponValue = getCouponDiscountForLineItem(coupon, lineItem)
      }

      break
    case 'PRODUCTS_COUPON':

      if (coupon.target_ids.indexOf(lineItem.id) === -1) {
        couponValue = 0
      } else {
        couponValue = getCouponDiscountForLineItem(coupon, lineItem)
      }

      break
    case 'CATEGORY_COUPON':
      if (lineItem.category_id !== coupon.target_id) {
        couponValue = 0
      } else {
        couponValue = getCouponDiscountForLineItem(coupon, lineItem)
      }
      break

  }

  return couponValue
}

Utils.getSequelizeErrorHandler = function (request, response, next) {
  return function (error) {
    console.log('SEQUELIZE ERROR HANDLER', error)

    if (error instanceof sequelize.ConnectionError) {
      // Should restart the connection
      console.log('SEQUELIZE_CONNECTION_ERROR')
    }
    if (error instanceof sequelize.ValidationError) {
      response.send(400, {
        status: false,
        errors: [new Errors.BadRequest()]
      })
    } else if (error instanceof sequelize.UniqueConstraintError) {
      response.send(400, {
        status: false,
        errors: [new Errors.BadRequest('The query violated a "unique" constraint.')]
      })
    } else if (error instanceof sequelize.ForeignKeyConstraintError) {
      response.send(400, {
        status: false,
        errors: [new Errors.BadRequest('A non-existing resource was referenced.')]
      })
    } else {
      console.log('GENERIC_SEQUELIZE_ERROR')
      next(error)
    }
  }
}

Utils.SendResponse = function (response, config) {
  response.send(config.status, config.data)
}

Utils.isUndefined = function (a) {
  return typeof a === 'undefined'
}
Utils.isNull = function (a) {
  return a === null
}

Utils.hasValue = function (a) {
  return (!Utils.isUndefined(a) && !Utils.isNull(a))
}

Utils.isSet = Utils.hasValue

/*
*   @param  objects, Array of objects from which properties must be extracted
*   @param  properties, Array of strings which are the names of the properties to extract
*
*   Example
*   var objects = [
        { "name" : "Mario", "email" : "mario@mail.com"},
        { "name" : "Martteo", "email" : "matteo@mail.com"},
        { "name" : "Marco", "email" : "marco@mail.com"}
    ]
    }
    Utils.extract(objects,["email"])
    -> [{"email" : "mario@mail.com"},
        {"email" : "matteo@mail.com"},
        {"email" : "marco@mail.com"}]
*/
Utils.extract = function (objects, properties) {
  if (!Utils.hasValue(objects) || !Utils.hasValue(properties)) {
    throw new Error('Cant apply Utils.extract to null or undefined')
  }
  var accumulator = []
  objects.forEach(function (o) {
    accumulator.push(Utils.subset(o, properties))
  })
  return accumulator

  /* questo può essere fatto in maniera piu elegante
  objects.map(function(o){return Utils.subset(o,properties)}) */
}

Utils.filterObjects = Utils.extract

/*
*   @param  objects, Array of objects from which properties must be extracted
*   @param  properties, Array of strings which are the names of the properties to extract
*
*   Example
*   var objects = [
        { "name" : "Mario", "email" : "mario@mail.com"},
        { "name" : "Martteo", "email" : "matteo@mail.com"},
        { "name" : "Marco", "email" : "marco@mail.com"}
    ]
    }
    Utils.extract(objects,["email"])
    -> ["mario@mail.com","matteo@mail.com","marco@mail.com"]
*/
Utils.extractOne = function (objects, property) {
  if (!Utils.hasValue(objects) || !Utils.hasValue(property)) {
    throw new Error('Cant apply Utils.extractOne to null or undefined')
  }
  var accumulator = []
  objects.forEach(function (o) {
    accumulator.push(o[property])
  })
  return accumulator
}

Utils.renameProperties = function (obj, remapping) {
  var b = {}
  for (var k in remapping) {
    b[remapping[k]] = obj[k]
  }
  return b
}

Utils.getFieldsList = function (fieldsString) {
  if (typeof fieldsString !== 'string') {
    throw new Error("Utils.getFieldsList(fieldsString :<String>) wrong argument's type, got ", fieldsString)
  }

  if ('fieldsString'.length === 0) {
    return []
  }

  if (fieldsString.slice(-1) === ',') {
    fieldsString = fieldsString.slice(0, -1)
  }
  if (fieldsString === '') {
    return []
  }
  return fieldsString.split(',')
}

Utils.Queries = {}

Utils.Queries.getNewUID = "REPLACE INTO id_store (stub) VALUES ('a'); SELECT LAST_INSERT_ID(); "

Utils.OutputOperatorsList = [
  'fields',
  'sort_by',
  'sort_order',
  'page',
  'per_page',
  'expand',
  'fetch_subcategories',
  'currency'
]

Utils.objectToQueryString = function (obj) {
  var qs = '?'
  for (var k in obj) {
    qs += k + '=' + obj[k] + '&'
  }
  return qs
}
  /*
   *   Returns an object suitable to be passed to SequelizeModel.findAll
   *
   *   @param {req_query} object The http request query object
   *   @param {filter_attributes}  The array that states which params are recognized filters
   */
Utils.BuildQueryForListMethods = function (req_query, filter_attributes) {
  var query = {},
    where = {},
    fields = []

  if (req_query.hasOwnProperty('fields')) {
    fields = Utils.getFieldsList(req_query.fields)
  }

  for (var k in req_query) {
    if (filter_attributes.indexOf(k) > -1) {
      // Then its a resource attribute
      // We must use it to narrow the query result
      where[k] = req_query[k]
    }
  }
  query.where = where
  if (fields.length > 0) {
    query.fields = fields
  }
}

/*
 *   Returns an object suitable to be passed to SequelizeModel.findAll
 *
 *   @param {req_query} object The http request query object
 *   @param {filter_attributes}  The array that states which params are recognized filters
 */
Utils.BuildQueryForGetByIdMethods = function (req_query) {
  var query = {},
    fields = []

  if (req_query.hasOwnProperty('fields')) {
    fields = Utils.getFieldsList(req_query.fields)
  }
  if (fields.length > 0) {
    query.fields = fields
  }
}

function getPromotionTotal (order) {
  var promotionTotal = 0

  order.promotion.effects.forEach(effect => {
    switch (effect.type) {
      case 'CART_VALUE_NET_REDUCTION':
        promotionTotal += effect.value
        break
      case 'CART_VALUE_PERCENTAGE_REDUCTION':
        // The entity of the reduction
        promotionTotal += (order.items_total / 100) * effect.value
        break
      case 'CART_ITEMS_NET_REDUCTION':
        // each item's price is reduced by effect.value
        promotionTotal += order.products.map(p => p.quantity * effect.value).reduce((a, b) => a + b)
        break
      case 'CART_ITEMS_PERCENTAGE_REDUCTION':
        // each item's price is reduced by effect.value
        promotionTotal += order.products.map(p => {
          return (Utils.getLineItemPrice(p) / 100) * effect.value
        }).reduce((a, b) => a + b, 0)
        break
      case 'FREE_SHIPPING':
        if (order.hasOwnProperty("shipping_total")) {
          promotionTotal += order.shipping_total
        }
        break

    }
  })

  return Utils.fix2(promotionTotal)
}

Utils.getPromotionTotal = getPromotionTotal

function getPromotionTotalForLineItem (lineItem, promotion, products) {
  var promotion_total = 0
  // Since this is a line item, we take quantities in account
  var item_total = Utils.getLineItemPrice(lineItem)

  var numberOfItemsInOrder = products.map(item => item.quantity).reduce((a, b) => a + b, 0)

  promotion.effects.forEach(effect => {
    switch (effect.type) {
      case 'CART_VALUE_NET_REDUCTION':
        promotion_total = effect.value / numberOfItemsInOrder
          // TODO check for strange effect values
        break
      case 'CART_VALUE_PERCENTAGE_REDUCTION':
        // The entity of the reduction
        promotion_total = (item_total / 100) * effect.value
        break
      case 'CART_ITEMS_NET_REDUCTION':
        // each item's price is reduced by effect.value
        promotion_total = lineItem.quantity * effect.value
        break
      case 'CART_ITEMS_PERCENTAGE_REDUCTION':
        // each item's price is reduced by effect.value
        promotion_total = (item_total / 100) * effect.value
        break
      case 'FREE_SHIPPING':
        break
      default:
        break
    }
  })
  return Utils.fix2(promotion_total)
}
Utils.getPromotionTotalForLineItem = getPromotionTotalForLineItem

// Works only for orders
Utils.getAppliablePromotion = function (promotions, order) {
  var appliablePromotions = []

  // Trying to figure out which promotion to apply
  // 'MIN_NUMBER_OF_PRODUCTS','MIN_CART_VALUE','CART_HAS_ITEM'
  function testCondition (condition, order) {
    switch (condition.type) {
      case 'MIN_NUMBER_OF_PRODUCTS':
        return order.products.map(x => x.quantity).reduce((a, b) => a + b, 0) >= condition.value
      case 'MIN_CART_VALUE':
        return order.products.map(x => x.quantity * x.price).reduce((a, b) => a + b, 0) >= condition.value
      default:
        throw new Error('Invalid promotion condition type ' + condition.type)
    }
  }

  appliablePromotions = promotions
    .filter(prom => {
      // If it has no conditions, its ok
      if (prom.conditions.length > 0) {
        return prom.conditions
          .every(cond => testCondition(cond, order))
      }

      // Has no conditions, then it is always appliable
      return true
    })

  // Now , we must chose only 1 promotion, with higher priority or higher id

  // Descending order, so that the [0] will be the best
  function comparePromotions (a, b) {
    if (a.priority < b.priority) {
      return 1
    }
    if (a.priority > b.priority) {
      return -1
    }
    if (a.id < b.id) {
      return 1
    }
    if (a.id > b.id) {
      return -1
    }
  }

  return appliablePromotions.sort(comparePromotions)[0]
}
Utils.isPromotionAppliableToOrder = function (promotion, order) {
  return promotion.conditions.every(condition => {
    switch (condition.type) {
      case 'MIN_CART_VALUE':
        var tot_value = order.products.map(p => Utils.getLineItemPrice(p))
          .reduce((a, b) => a + b, 0)
        return tot_value >= condition.value
      case 'MIN_NUMBER_OF_PRODUCTS':
        var tot_number = order.products.map(p => p.quantity).reduce((a, b) => a + b, 0)
        return tot_number >= condition.value
      default:
        return false
    }
  })
}
Utils.getAppliablePromotions = function (promotions, order) {
    // Trying to figure out which promotion to apply
    // 'MIN_NUMBER_OF_PRODUCTS','MIN_CART_VALUE','CART_HAS_ITEM'

  function testCondition (condition, order) {
    switch (condition.type) {
      case 'MIN_NUMBER_OF_PRODUCTS':
        return order.products.map(x => x.quantity).reduce((a, b) => a + b, 0) >= condition.value
      case 'MIN_CART_VALUE':
        return order.products.map(x => x.quantity * x.price).reduce((a, b) => a + b, 0) >= condition.value
      default:
        throw new Error('Invalid promotion condition type ' + condition.type)
    }
  }

  var appliablePromotions = promotions
    .filter(prom => {
      // If it has no conditions, its ok
      if (prom.conditions.length > 0) {
        return prom.conditions
          .every(cond => testCondition(cond, order))
      }

      // Has no conditions, then it is always appliable
      return true
    })

  return appliablePromotions
}

Utils.getMongoSorting = function (request) {
  // The default sorting parameter for mongodb
  var query_sort = []
  if (request.query.hasOwnProperty('sort_by')) {
    var new_sorting = [request.query.sort_by, -1]
      // The default is DESC, but if they specify an ASC sort order, then we set it asc
    if (request.query.hasOwnProperty('sort_order') && request.query.sort_order === 'ASC') {
      new_sorting[1] = 1
    }

    query_sort.push(new_sorting)
  }
  query_sort.push(['_id', -1])
  return query_sort
}
Utils.getSequelizeSorting = function (request) {
    // The default sorting parameter for mongodb
  var sorting = [
      ['id', 'DESC']
  ]
  if (request.query.hasOwnProperty('sort_by')) {
      // request.query.sort_order must be DESC or ASC
    sorting = [
        [request.query.sort_by, request.query.sort_order || 'ASC']
    ]
  }

  return sorting
}
  /**
   * [getPagination description]
   * @param  {[type]} config [description]
   * @return {[type]}        [description]
   */
Utils.getPagination = function (config) {
  var limit = config.limit
  var skip = config.skip
  var count = config.count
  var pages = parseInt(count / limit, 10)
  var current_page = parseInt(skip / limit, 10) + 1

  // Fixing pages
  // If the collection contiains e.g. 42 items
  // and the limit is 20
  // then the number of pages must be 3
  if (count > limit && count % limit !== 0) {
    pages++
  }

  // if the collection contains 19 elements
  // but the limit is 20
  // then the previous fractions would give us 0 pages
  // which is not correct
  if (pages === 0) {
    pages++
  }

  // Fixing current_page
  if (skip === 0) {
    current_page = 1
  }

  // Hypermedia links object
  var links = {
    curr: 'http://api.marketcloud.it/v0/' + config.resource + Utils.objectToQueryString(config.req_query)
  }

  // TODO if the query has filters, they must be re-used here

  if (skip !== 0) {
    var q = config.req_query

    q['page'] = Number(q['page']) - 1
    links.prev = 'http://api.marketcloud.it/v0/' + config.resource + Utils.objectToQueryString(q)
  }
  if (skip + limit < count) {
    q = config.req_query
    if (!q['page']) {
      q['page'] = 1
    }

    q['page'] = Number(q['page']) + 1
    links.next = 'http://api.marketcloud.it/v0/' + config.resource + Utils.objectToQueryString(q)
  }
  return {
    _links: links,
    count: count,
    page: current_page,
    pages: pages
  }
}

var applyPercentage = (value, percentage) => {
  return (percentage / 100) * value
}

// Helper clousure to get code cleaner.
function getProductPrice (product) {
  if (hasVariants(product) && product.variant) {
    if (product.variant.hasOwnProperty('price_discount')) {
      return product.variant.price_discount
    } else {
      return product.variant.price
    }
  }

  // Else it is a simple product
  if (product.hasOwnProperty('price_discount')) {
    return product.price_discount
  } else {
    return product.price
  }
}
Utils.getProductPrice = getProductPrice


/*
 *    @param product          {Product or ExpandedLineItem}     The product to tax
 *    @param application      {Application} The Application object
 *    @param tax              {Tax}         The eventual tax class object
 *
 *    @returns                {Product}     The product with applied prices with taxes
 */
Utils.applyTaxesToProduct = function (product, application,taxes) {

  // To calculate tax from a tax_id we also need to know the billing address
  // otherwise we attach the first rate we 
  var taxRate = application.tax_rate;

  //If the product has a tax_id and we have a tax with that tax_id, then we use that tax rule
  // instead of the global tax_rate
  if (product.hasOwnProperty("tax_id")){

    taxes.forEach(function(tax){
      if (tax.id === product.tax_id) {

        if (tax.rates.length > 0){
          taxRate = tax.rates
          .sort(function (a, b) {return (b.priority || 0) - (a.priority || 0)})[0].rate;
          product.applied_tax = tax;
        }
      }
    })

  }

  product.applied_tax_rate = taxRate;

  var taxAmount = 0;
  if (application.tax_type === "nothing" || application.tax_type === "shipping_only"){
    return product;
  }

  product.price = Utils.fix2( product.price + applyPercentage(product.price, taxRate) );

  if (product.hasOwnProperty("price_discount"))
    product.price_discount = Utils.fix2(product.price_discount+applyPercentage(product.price_discount, taxRate) );

  if (product.hasOwnProperty("variants")){
    product.variants = product.variants.map(function(variant){

      variant.price = Utils.fix2(variant.price + applyPercentage(variant.price, taxRate));

      if (variant.hasOwnProperty("price_discount"))
        variant.price_discount = Utils.fix2(variant.price_discount + applyPercentage(variant.price_discount, taxRate) );

      return variant;
    })
  }

  if (product.hasOwnProperty("variant")){

      var variant = product.variant;

      variant.price = Utils.fix2(variant.price + applyPercentage(variant.price, taxRate));

      if (variant.hasOwnProperty("price_discount"))
        variant.price_discount = Utils.fix2(variant.price_discount + applyPercentage(variant.price_discount, taxRate) );

  }

  return product;
}

/*
    @param products {Array<products>}
    @param taxes    {Array<taxes>}

    Iterates through products and if it finds a tax_id
    it adds that tax rate, otherwise applies the global rate.

*/
function getTotalTaxesForProducts (order, application) {
  var products = order.products
  var taxes = order.taxes
  var applicationTaxRate = application.tax_rate

  if (!Array.isArray(products)) {
    throw new Error('getTotalTaxesForProducts(products,taxes,applicationTaxRate) products must be an array of products.')
  }

  if (!Array.isArray(taxes)) {
    throw new Error('getTotalTaxesForProducts(products,taxes,applicationTaxRate) taxes must be an array of taxes.')
  }

  if (typeof applicationTaxRate !== 'number') {
    throw new Error('getTotalTaxesForProducts(products,taxes,applicationTaxRate) applicationTaxRate must be integer number.')
  }

  // Lets build an index for rapid tax access.
  var taxes_index = {}

  taxes.forEach((tax) => {
    taxes_index[tax.id] = tax
  })

  var total = 0

  products.forEach((product) => {
    var rateToApply
    var discounts
    // Checking for two things:
    // The product having a tax_id and the tax_id existing
    // The second one should be redundant
    if (product.hasOwnProperty('tax_id') && taxes_index.hasOwnProperty(product.tax_id)) {
      // Then we apply tax_rate from a tax resource
      var the_tax = taxes_index[product.tax_id]
        // Now we need to get the correct rate from the list of rates
        // The correct rate is decided on the billing address that the
        // customer specified
      rateToApply = Utils.getRateFromTaxClass(order, the_tax, application)
    } else {
      // Else, we just apply the global tax rate
      rateToApply = applicationTaxRate
    }
    product.applied_tax_rate = rateToApply

    if (Boolean(application.apply_discounts_before_taxes) === true) {
      // Then discounts changes the outcome of taxation
      // This means that the taxation has to take in account coupons or promotions
      var discountForLineItem = 0
      if (order.coupon) {
        discountForLineItem += getCouponDiscountForLineItem(order.coupon, product)
      }
      if (order.promotion) {
        discountForLineItem += getPromotionTotalForLineItem(product, order.promotion, order.products)
      }
    
      total += applyPercentage(getLineItemPrice(product) - discountForLineItem, rateToApply);

    } else {
      total += applyPercentage(getLineItemPrice(product), rateToApply)
    }
  })

  return Utils.fix2(total)
}

Utils.getTotalTaxesForProducts = getTotalTaxesForProducts

Utils.getTaxesForLineItem = function (lineItem, order, application) {

}

/*
 *    @param shippingMethod      {ShippingMethod}    The shipping method
 *    @param TotalShippingCost   {Number}            The total cost of shipping for the current order
 *    @param taxes               {Array<Taxes>}      The array of available taxes
 *    @param applicationTaxRate         {Number}            The global tax rate
 */
function getTotalTaxesForShipping (order, application) {
  var shippingMethod = order.shipping
  var totalShippingCost = order.shipping_total
  var taxes = order.taxes
  var applicationTaxRate = application.tax_rate

  // The index object
  var taxes_index = {}

  // Building the index
  taxes.forEach((tax) => {
    taxes_index[tax.id] = tax
  })

  // Small helpful function
  var applyPercentage = (value, percentage) => {
    return (percentage / 100) * value
  }

  if (shippingMethod.hasOwnProperty('tax_id') && taxes_index.hasOwnProperty(shippingMethod.tax_id)) {
    // We get the tax object from the tax_id
    var the_tax = taxes_index[shippingMethod.tax_id]

    // We get the rate from the tax object and the billing_address
    var rateToApply = Utils.getRateFromTaxClass(order, the_tax, application)

    order.shipping.applied_tax_rate = rateToApply

    return applyPercentage(totalShippingCost, rateToApply)
  } else {
    return applyPercentage(totalShippingCost, applicationTaxRate)
  }
}

Utils.getTotalTaxesForShipping = getTotalTaxesForShipping

/*
 *   Takes the current context of the order and returns the most appropriate rate
 *
 *   @param order        {object} The order object with the checkout data
 *   @param tax          {object} The tax class object, containing rates
 *   @param application  {object} The application object
 *
 *   @return             {Number} The value of the most suitable rate or the global rate
 */
function getRateFromTaxClass (order, tax, application) {
  if (!order.billing_address) {
    throw new Error('Unable to get rate from an order without billing_address')
  }

  var address = order.billing_address

  var compatible_rates = tax.rates
    .filter((rate) => {
      if (rate.country === '*') {
        return true
      }

      return (rate.country.toLowerCase() === address.country.toLowerCase())
    })
    .filter((rate) => {
      if (rate.state === '*') { return true }

      return (rate.state.toLowerCase() === address.state.toLowerCase())
    })
    .filter((rate) => {
      if (rate.postcode.indexOf('*') > -1) {
        // Then is a regex based postcode
        // This might be slow but it works and easy to understand
        var regex = new RegExp(rate.postcode.replace('*', '.*'))

        return regex.test(address.postal_code)
      } else {
        return (rate.postcode === address.postal_code || rate.postcode === '*')
      }
    })
    .filter((rate) => {
      return (rate.city.toLowerCase() === address.city.toLowerCase() || rate.city === '*')
    })
    .sort(function (a, b) {
      // Sorting by priority
      return (b.priority || 0) - (a.priority || 0)
    })

  if (compatible_rates.length === 0) {
    // Non ci sono rates compatibili
    // Usiamo le impostazioni globali
    return application.tax_rate
  } else if (compatible_rates.length >= 1) {
    // Returning the first one, since the first in the array
    // will be the one with highest priority
    return compatible_rates[0].rate
  }
}

Utils.getRateFromTaxClass = getRateFromTaxClass

Utils.getPaymentMethodTotal = function (order) {
  var paymentMethod = order.payment_method

  var paymentFee = 0

  switch (paymentMethod.cost_type) {
    case 'no_cost':
      paymentFee = 0
      break
    case 'fixed_fee':
      paymentFee += paymentMethod.fixed_fee
      break
    case 'percentage_fee':
      paymentFee += (order.total / 100) * paymentMethod.percentage_fee
      break
    case 'fixed_plus_percentage':
      paymentFee += (paymentMethod.fixed_fee + (order.total / 100) * paymentMethod.percentage_fee)
      break
    default:
      paymentFee = 0
      break
  }

  return paymentFee
}

/*
* Middleware that makes sure of a couple things:
  - That the application has an entry in "application_integrations" collection
  - If not, it creates it
*/
var fetchApplicationIntegrations = function (req, res, next) {
  var mongodb = req.app.get('mongodb')

  mongodb.collection('applications_integrations')
    .findOne({
      application_id: req.client.application_id
    }, function (err, document) {
      if (err) {
        return next(err)
      }

      if (document !== null) {
        req.integrationsData = document
        return next()
      }

      // If document is null, then we have to create it first.
      var newDocument = {
        application_id: req.client.application_id
      }
      mongodb.collection('applications_integrations')
        .insert(newDocument, function (err) {
          if (err) {
            return next(err)
          }
          req.integrationsData = newDocument
          return next()
        })
    })
}

Utils.fetchApplicationIntegrations = fetchApplicationIntegrations

/*
*   @param {Object} o The test object
*   @param {String} path The path to test, for example foo.bar.baz
*
*
*   @example
*
var o = {
  foo : {
    bar : {
      baz : 1
    },
    zoo : {
      bear : {
        male : true,
        female : false
      }
    }
  },
  mushroom : 7
}

var tests = [
  'foo',
  'foo.bar',
  'foo.bar.baz',
  'foo.zoo.bear.male',
  'foo.zoo.bear.female'
]

var results = tests.map( (tcase) => {return ensureObjectHasProperty(o,tcase);} );
*
* Output is [true,true,true,true,true]
*
*/
function ensureObjectHasProperty (obj, propertyPath) {
  var tokens = propertyPath.split('.')

  var pointer = JSON.parse(JSON.stringify(obj))

  for (var i = 0; i < tokens.length; i++) {
    if (!pointer.hasOwnProperty(tokens[i])) {
      return false
    }

    pointer = pointer[tokens[i]]
  }

  return true
}

Utils.ensureObjectHasProperty = ensureObjectHasProperty

/*
 *   @param {Array} array1 The first array
 *   @param {Array} array2 The second array
 *   @return {Array} Returns an array of common elements
 */
function intersect (array1, array2) {
  return array1.filter((i1) => {
    return array2.indexOf(i1) > -1
  })
    .filter((elem, pos, targetArray) => {
      return targetArray.indexOf(elem) === pos
    })
}

Utils.intersect = intersect

// Tries to revive value of query parameters by parsing the string for
// booleans, numbers and nulls
function reviveJSONObject (o) {
  // known properties that could contain only numbers and still being strings
  var notToRevive = ['sku']

  // Casting req.query values to boolean or number if possible
  for (var k in o) {
    if (notToRevive.indexOf(k) > -1) {
      continue
    }

    o[k] = reviveValue(o[k])
  }
}

function reviveValue (v) {
  // If the query param is a number we cast it to number
  // since isNaN("") is false, we have to add an exceptional check
  if (!isNaN(v) && v !== '') {
    return Number(v)
  }

  if (v === 'true') {
    return true
  }

  if (v === 'false') {
    return false
  }

  if (v === 'null') {
    return null
  }

  return v
}

Utils.reviveValue = reviveValue

Utils.reviveJSONObject = reviveJSONObject

Utils.getRequestedCurrency = function (request) {
  if (request.query.hasOwnProperty('currency')) { return request.query.currency }

  if (request.headers.hasOwnProperty('currency')) {
    return request.headers['currency']
  }

  return null
}

/*
 * @param product {Object} The product object from which we want to calculate an object of currency calculated prices
 * @param appSettings {Object} The Application object, here we must have a currencies property which is an array of currency/rates pair
 *
 * @return {Object} an object whose keys are currency codes and values are objects {price, price_discount}
 */
function getMultiCurrencyPrices (product, appSettings) {
  // This is the array of currencies set in the
  var currencies = appSettings.currencies

  if (typeof currencies === 'string') {
    currencies = JSON.parse(currencies)
  }

  // This object will hold our returned value
  var _currencies = {}

  // first we set the base currency for completeness

  _currencies[appSettings.currency_code] = {
    price: product.price
  }

  if (product.hasOwnProperty('price_discount')) {
    _currencies[appSettings.currency_code].price_discount = product.price_discount
  }

  // If the app doesnt have currencies, we return just the object with the base currency
  if (currencies === null) { return _currencies }

  // Then we set other supported currencies

  currencies.forEach(function (currency) {
    var code = currency.code
    var rate = currency.rate

    _currencies[code] = {
      price: Utils.fix2(product.price * rate)
    }

    if (product.hasOwnProperty('price_discount')) {
      _currencies[code].price_discount = Utils.fix2(product.price_discount * rate)
    }
  })

  return _currencies
}

Utils.getMultiCurrencyPrices = getMultiCurrencyPrices

function convert (price, rate) {
  return Utils.fix2(price * rate)
}

function getCurrencyRate (wantedCurrencyCode, application) {
  if (wantedCurrencyCode === application.currency_code) {
    return 1
  }

  var availableCurrencies = application.currencies

  if (availableCurrencies === null) {
    return null
  }

  if (typeof availableCurrencies === 'string') {
    availableCurrencies = JSON.parse(availableCurrencies)
  }

  // getting the wanted currency in an efficient way
  var wantedCurrency = availableCurrencies.filter(function (currency) {
    return currency.code === wantedCurrencyCode
  })

  // if the lenght of the result is 0, then we didnt find the currency
  if (wantedCurrency.length === 0) {
    return null
  }

  // The wanted currency
  wantedCurrency = wantedCurrency[0]

  // The rate of the wanted currency
  return wantedCurrency.rate
}

Utils.getCurrencyRate = getCurrencyRate

function convertProductPrices (product, rate, wantedCurrencyCode) {
  if (typeof rate !== 'number') {
    throw new Error('convertProductPrices(product: Object, rate: Number, wantedCurrencyCode: String); rate must be a number')
  }

  if (typeof wantedCurrencyCode !== 'string') {
    throw new Error('convertProductPrices(product: Object, rate: Number, wantedCurrencyCode: String); wantedCurrencyCode must be string')
  }

  product.price = convert(product.price, rate)
  product.display_price = product.price + ' ' + wantedCurrencyCode

  if (product.hasOwnProperty('price_discount')) {
    product.price_discount = convert(product.price_discount, rate)
    product.display_price_discount = product.price_discount + ' ' + wantedCurrencyCode
  }

  // Also testing product.variants because it might be a "order product" with no
  // variants array but just a variant property
  if (product.type === 'product_with_variants' && Array.isArray(product.variants)) {
    product.variants = product.variants.map(variant => {
      variant.price = convert(variant.price, rate)
      variant.display_price = variant.price + ' ' + wantedCurrencyCode

      if (variant.hasOwnProperty('price_discount')) {
        variant.price_discount = convert(variant.price_discount, rate)
        variant.display_price_discount = variant.price_discount + ' ' + wantedCurrencyCode
      }

      return variant
    })
  }

  return product
}

Utils.convertProductPrices = convertProductPrices

function convertProductCurrency (req, res, next) {
  if (!req.query.hasOwnProperty('currency')) { return next() }

  var wantedCurrencyCode = req.query.currency

  var rate = Utils.getCurrencyRate(wantedCurrencyCode, req.client.application)

  if (rate === null) {
    return next(new Errors.BadRequest('Cannot use currency ' + wantedCurrencyCode + '. Add it first as supported currency in your store\'s admin panel.'))
  }

  var payload = req.toSend

  if (Array.isArray(payload.data)) {
    payload.data.forEach(function (product) {
      product = Utils.convertProductPrices(product, rate, wantedCurrencyCode)

      if (product.type === 'product_with_variants') {
        product.variants.forEach(function (variant) {
          variant = Utils.convertProductPrices(variant, rate, wantedCurrencyCode)
        })
      }
    })
  } else {
    payload.data = Utils.convertProductPrices(payload.data, rate, wantedCurrencyCode)
  }

  return next()
}

Utils.convertProductCurrency = convertProductCurrency

function convertShippingRulePrices (shippingRule, rate) {
  var propertiesToConvert = [
    'base_cost',
    'per_item_cost',
    'max_value',
    'min_value'
  ]

  propertiesToConvert.forEach(function (property) {
    if (shippingRule.hasOwnProperty(property)) {
      shippingRule[property] = convert(shippingRule[property], rate)
    }
  })

  return shippingRule
}

Utils.convertShippingRulePrices = convertShippingRulePrices

function convertShippingCurrency (req, res, next) {
  if (!req.query.hasOwnProperty('currency')) {
    return next()
  }

  var wantedCurrencyCode = req.query.currency

  var rate = Utils.getCurrencyRate(wantedCurrencyCode, req.client.application)

  if (rate === null) {
    return next(new Errors.BadRequest('Cannot use currency ' + wantedCurrencyCode + '. Add it first as supported currency in your store\'s admin panel.'))
  }

  var payload = req.toSend

  if (Array.isArray(payload)) {
    payload = payload.map(function (shippingRule) {
      return Utils.convertShippingRulePrices(shippingRule, rate)
    })
  } else {
    payload = Utils.convertShippingRulePrices(payload, rate)
  }

  return next()
}

Utils.convertShippingCurrency = convertShippingCurrency

var convertPromotionPrices = (promotion, rate) => {
  promotion.effects.forEach(function (effect) {
    if (effect.type === 'CART_VALUE_NET_REDUCTION' || effect.type === 'CART_ITEMS_NET_REDUCTION') {
      effect.value = convert(effect.value, rate)
    }
  })

  promotion.conditions.forEach(function (condition) {
    if (condition.type === 'MIN_CART_VALUE') {
      condition.value = convert(condition.value, rate)
    }
  })

  return promotion
}

Utils.convertPromotionPrices = convertPromotionPrices

function convertPromotionCurrency (req, res, next) {
  if (!req.query.hasOwnProperty('currency')) {
    return next()
  }

  var wantedCurrencyCode = req.query.currency

  var rate = Utils.getCurrencyRate(wantedCurrencyCode, req.client.application)

  if (rate === null) {
    return next(new Errors.BadRequest('Cannot use currency ' + wantedCurrencyCode + '. Add it first as supported currency in your store\'s admin panel.'))
  }

  var payload = req.toSend

  if (Array.isArray(payload)) {
    payload = payload.map((promotion) => Utils.convertPromotionPrices(promotion, rate))
  } else {
    payload = Utils.convertPromotionPrices(payload, rate)
  }

  return next()
}

Utils.convertPromotionCurrency = convertPromotionCurrency

Utils.convertCouponPrices = function (coupon, rate) {
  if (coupon.discount_type === 'NET_REDUCTION');
  coupon.discount_value = convert(coupon.discount_value, rate)

  return coupon
}

function convertCouponCurrency (req, res, next) {
  if (!req.query.hasOwnProperty('currency')) { return next() }

  var wantedCurrencyCode = req.query.currency

  var rate = Utils.getCurrencyRate(wantedCurrencyCode, req.client.application)

  if (rate === null) {
    return next(new Errors.BadRequest('Cannot use currency ' + wantedCurrencyCode + '. Add it first as supported currency in your store\'s admin panel.'))
  }

  var payload = req.toSend

  if (Array.isArray(payload)) {
    payload = payload.map(function (coupon) {
      return Utils.convertCouponPrices(coupon, rate)
    })
  } else {
    payload = Utils.convertCouponPrices(payload, rate)
  }

  return next()
}
Utils.convertCouponCurrency = convertCouponCurrency

Utils.convertOrderPrices = function (order, wantedCurrencyCode, rate) {
  // COnverting products currencies
  order.products = order.products.map(function (product) {
    product = Utils.convertProductPrices(product, rate, wantedCurrencyCode)

    if (product.hasOwnProperty("variant")) {
      product.variant = Utils.convertProductPrices(product.variant, rate, wantedCurrencyCode) 
    }

    return product
  })

  if (order.coupon) {
    order.coupon = Utils.convertCouponPrices(order.coupon, rate)
  }

  if (order.promotion) {
    order.promotion = Utils.convertPromotionPrices(order.promotion, rate)
  }

  if (order.shipping) {
    order.shipping = Utils.convertShippingRulePrices(order.shipping, rate)
  }

  order.total = convert(order.total, rate)
  order.display_total = wantedCurrencyCode + ' ' + String(order.total)

  order.items_total = convert(order.items_total, rate)
  order.display_items_total = wantedCurrencyCode + ' ' + String(order.items_total)

  if (order.hasOwnProperty("shipping_total")) {
    order.shipping_total = convert(order.shipping_total, rate)
    order.display_shipping_total = wantedCurrencyCode + ' ' + String(order.shipping_total)
  }

  if (order.hasOwnProperty("taxes_total")) {
    order.taxes_total = convert(order.taxes_total, rate)
    order.display_taxes_total = wantedCurrencyCode + ' ' + String(order.taxes_total)
  }

  if (order.hasOwnProperty("coupon_total")) {
    order.coupon_total = convert(order.coupon_total, rate)
    order.display_coupon_total = wantedCurrencyCode + ' ' + String(order.coupon_total)
  }

  if (order.hasOwnProperty("promotion_total")) {
    order.promotion_total = convert(order.promotion_total, rate)
    order.display_promotion_total = wantedCurrencyCode + ' ' + String(order.promotion_total)
  }

  if (order.hasOwnProperty("payment_method_total")) {
    order.payment_method_total = convert(order.payment_method_total, rate)
    order.display_payment_method_total = wantedCurrencyCode + ' ' + String(order.payment_method_total)
  }

  return order
}

Utils.getTotalItemsWeight = function (lineItems) {
  if (lineItems.length === 0) { return 0 }

  var total_weight = lineItems
    .map((item) => {
      if (item.variant) {
        return item.variant.weight || 0
      } else {
        return item.weight || 0
      }
    })
    .reduce((a, b) => a + b, 0)

  return (Math.round(total_weight * 100) / 100)
}

Utils.getTotalItemsValue = function (lineItems) {
  if (lineItems.length === 0) {
    return 0
  }

  var total_value = lineItems
    .map((item) => {
      if (item.variant) {
        if (item.variant.hasOwnProperty('price_discount')) {
          return item.quantity * item.variant.price_discount
        } else {
          return item.quantity * item.variant.price
        }
      }

      if (item.hasOwnProperty('price_discount')) {
        return item.quantity * item.price_discount
      } else {
        return item.quantity * item.price
      }
    })
    .reduce((a, b) => a + b, 0)

  return (Math.round(total_value * 100) / 100)
}

Utils.convertCartPrices = function (cart, wantedCurrencyCode, rate) {
  if (cart.hasOwnProperty('items')) {
    cart.items = cart.items.map((lineItem) => {
      // We check for lineItem's variant
      if (lineItem.type === 'product_with_variants' && lineItem.hasOwnProperty('variant')) {
        lineItem.variant = Utils.convertProductPrices(lineItem.variant, rate, wantedCurrencyCode)
      }

      return Utils.convertProductPrices(lineItem, rate, wantedCurrencyCode)
    })

    cart.items_total = convert(cart.items_total, rate)

    // Attaching the display items total
    cart.display_items_total = wantedCurrencyCode + ' ' + String(cart.items_total)

    cart.total = convert(cart.total, rate)

    // Attaching the display total
    cart.display_total = wantedCurrencyCode + ' ' + String(cart.total)

    if (cart.hasOwnProperty("coupon_total")) {
      cart.coupon_total = convert(cart.coupon_total, rate)

      // Attaching the display coupon total
      cart.display_coupon_total = wantedCurrencyCode + ' ' + String(cart.coupon_total)
    }
  }

  return cart
}

Utils.convertCollectionPrices = function (collection, wantedCurrencyCode, rate) {
  if (collection.hasOwnProperty('items')) {
    collection.items = collection.items.map((item) => {
      item = Utils.convertProductPrices(item, rate, wantedCurrencyCode)
      // We check for item's variant
      if (item.type === 'product_with_variants') {
        item.variants = item.variants.map((variant) => {
          return Utils.convertProductPrices(variant, rate, wantedCurrencyCode)
        })
      }

      return item
    })
  }

  return collection
}

Utils.attachDisplayTotals = function (order) {

  //ensure that order has currency
  // Older orders will NOT have currency displayed
  if (!order.hasOwnProperty('currency') || !order.currency.hasOwnProperty('code'))
    return order;

  if (order.hasOwnProperty("items_total")) {
    order.display_items_total = String(order.items_total) + ' ' + order.currency.code;
  }

  if (order.hasOwnProperty("total")) {
    order.display_total = String(order.total) + ' ' + order.currency.code;
  }

  if (order.hasOwnProperty("coupon_total")) {
    order.display_coupon_total = String(order.coupon_total) + ' ' + order.currency.code
  }

  if (order.hasOwnProperty("promotion_total")) {
    order.display_promotion_total = String(order.promotion_total) + ' ' + order.currency.code
  }

  if (order.hasOwnProperty("shipping_total")) {
    order.display_shipping_total = String(order.shipping_total) + ' ' + order.currency.code
  }

  if (order.hasOwnProperty("payment_method_total")) {
    order.display_payment_method_total = String(order.payment_method_total) + ' ' + order.currency.code
  }

  if (order.hasOwnProperty("taxes_total")) {
    order.display_taxes_total = String(order.taxes_total) + ' ' + order.currency.code
  }

  return order;
}

Utils.attachDisplayPrices = function(product, currency_code){

  if (product.hasOwnProperty("price"))
    product.display_price = String(product.price) + ' ' +  currency_code;

  if (product.hasOwnProperty("price_discount"))
    product.display_price_discount = String(product.price_discount) + ' ' +  currency_code;

  if (product.hasOwnProperty('variants') && Array.isArray(product.variants)){
    product.variants.forEach(function(variant){
      if (variant.hasOwnProperty("price"))
        variant.display_price = String(variant.price) + ' ' +  currency_code;

      if (variant.hasOwnProperty("price_discount"))
        variant.display_price_discount = String(variant.price_discount) + ' ' +  currency_code;
    })
  }


  return product;
}



module.exports = Utils
