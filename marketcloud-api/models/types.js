var Schematic = require('../libs/validators.js')
var Types = {}

Types.Notifications = {}

Types.Notifications['orders.create'] = new Schematic.Schema('orders.create', {
  type: {
    required: true,
    type: 'string'
  },
  application: {
    required: true,
    type: 'object'
  },
  order: {
    required: true,
    type: 'object'
  }
})
Types.Notifications['orders.update.processing'] = new Schematic.Schema('orders.update.processing', {
  type: {
    required: true,
    type: 'string'
  },
  application: {
    required: true,
    type: 'object'
  },
  order_id: {
    required: true,
    type: 'number'
  }
})
Types.Notifications['orders.update.completed'] = new Schematic.Schema('orders.update.completed', {
  type: {
    required: true,
    type: 'string'
  },
  application: {
    required: true,
    type: 'object'
  },
  order_id: {
    required: true,
    type: 'number'
  }
})
Types.Notifications['users.create'] = new Schematic.Schema('users.create', {
  type: {
    required: true,
    type: 'string'
  },
  application: {
    required: true,
    type: 'object'
  },
  user: {
    required: true,
    type: 'object'
  }
})

Types.CustomNotification = new Schematic.Schema('CustomNotification', {
  to: { type: 'string', required: true },
  text: { type: 'string', required: true },
  subject: { type: 'string', min: 3 },
  html: { type: 'string' }
})

Types.Address = new Schematic.Schema('Address', {
  'full_name': {
    type: 'string',
    required: true,
    max: 140
  },
  'country': {
    type: 'string',
    required: true,
    max: 140
  },
  'state': {
    type: 'string',
    max: 140
  },
  'city': {
    type: 'string',
    required: true,
    max: 140
  },
  'address1': {
    type: 'string',
    required: true,
    max: 250
  },
  'address2': {
    type: 'string',
    max: 250
  },
  'postal_code': {
    type: 'string',
    required: true,
    max: 20
  },
  phone_number: {
    type: 'string',
    max: 30
  },
  email: {
    type: 'string',
    required: true,
    max: 140
  },
  alternate_phone_number: {
    type: 'string',
    max: 140
  }
})

Types.LineItem = new Schematic.Schema('LineItem', {
  product_id: { type: 'number', required: true },
  variant_id: { type: 'number', required: false },
  quantity: { type: 'number', required: true, min: 1 }
})

Types.Refund = new Schematic.Schema('Refund', {
  'reason': {
    type: 'string',
    max: '500',
    required: false
  },
  'total': {
    type: 'number',
    min: 0,
    required: true
  },
  'products': {
    required: false,
    type: 'array',
    elements: { type: Types.LineItem }
  },
  'restock_refunded_items': {
    type: 'boolean',
    required: true
  }
})

Types.Payment = new Schematic.Schema('Payment', {
  payment_method_id: {
    required: false,
    type: 'number'
  },
  method: {
    required: true,
    type: 'string'
  },
  order_id: {
    type: 'number',
    required: true
  },
  amount: {
    type: 'number',
    required: true
  },
  data: {
    type: 'object'
  }
})
Types.PaymentMethod = new Schematic.Schema('PaymentMethod', {
  name: {
    type: 'string',
    required: true,
    min: 1,
    max: 100
  },
  description: {
    type: 'string',
    min: 0,
    max: 500
  },
  cost_type: {
    type: 'string',
    required: true,
    whitelist: ['no_cost', 'fixed_fee', 'percentage_fee', 'fixed_plus_percentage']
  },
  fixed_fee: {
    type: 'number',
    min: 0
  },
  percentage_fee: {
    type: 'number',
    min: 0
  }
})
Types.PromotionCondition = new Schematic.Schema('PromotionCondition', {
  'type': {
    type: 'string',
    whitelist: ['MIN_NUMBER_OF_PRODUCTS', 'MIN_CART_VALUE', 'CART_HAS_ITEM'],
    required: true
  },
  'value': {
    type: 'number',
    required: true
  }
})
Types.PromotionEffect = new Schematic.Schema('PromotionEffect', {
  'type': {
    type: 'string',
    whitelist: [
      'CART_VALUE_PERCENTAGE_REDUCTION',
      'CART_VALUE_NET_REDUCTION',
      'CART_ITEMS_NET_REDUCTION', // price reduction to apply on each item price
      'CART_ITEMS_PERCENTAGE_REDUCTION', // price reduction to apply on each item price
      'FREE_SHIPPING'
    ],
    required: true
  },
  'value': {
    required: true
  }
})

Types.Promotion = new Schematic.Schema('Promotion', {
  'name': {
    type: 'string',
    min: 2,
    max: 130,
    required: true
  },
  'active': {
    type: 'boolean',
    required: true
  },
  'conditions': {
    type: 'array',
    elements: {
      type: Types.PromotionCondition
    }
  },
  'effects': {
    type: 'array',
    required: true,
    elements: {
      type: Types.PromotionEffect
    }
  }
})

Types.BundleEntry = new Schematic.Schema('BundleEntry', {
  'product_id': {
    type: 'number',
    required: true
  },
  'bundle_price': {
    type: 'number',
    required: false
  },
  'quantity': {
    type: 'number',
    required: true,
    min: 1
  },
  'variant_id': {
    type: 'number',
    required: false
  }
})

Types.BundledProduct = new Schematic.Schema('Bundle', {
  name: {
    type: 'string',
    min: 1,
    max: 140,
    required: true
  },
  slug: {
    type: 'string',
    max: 500
  },
  description: {
    type: 'string'
  },
  items: {
    type: 'array',
    required: true,
    min: 0,
    elements: {
      type: Types.BundleEntry
    }
  }
})

Types.Category = new Schematic.Schema('Category', {
  'name': {
    type: 'string',
    min: 2,
    max: 30,
    required: true
  },
  'description': {
    type: 'string',
    max: 1400
  },
  'url': {
    type: 'string'
  },
  'image_url': {
    type: 'string'
  },
  'parent_id': {
    type: 'number',
    required: false
  }

})

Types.CategoryNew = new Schematic.Schema('Category', {
  'name': {
    type: 'string',
    min: 2,
    max: 30,
    required: true
  },
  'description': {
    type: 'string',
    max: 1400
  },
  'url': {
    type: 'string'
  },
  'image_url': {
    type: 'string'
  },
  'path': {
    type: 'string',
    required: true
  },
  'parent': {
    type: 'string',
    required: true
  }
})

Types.CollectionEntry = new Schematic.Schema('CollectionEntry', {
  'product_id': {
    type: 'number',
    required: true
  },
  'variant_id': {
    type: 'number'
  }
})

Types.Collection = new Schematic.Schema('Collection', {
  name: {
    type: 'string',
    min: 1,
    max: 140,
    required: true
  },
  slug: {
    type: 'string',
    max: 500
  },
  description: {
    type: 'string'
  },
  items: {
    type: 'array',
    required: true,
    elements: {
      type: Types.CollectionEntry
    }
  }
})

Types.ContentAuthor = new Schematic.Schema('ContentAuthor', {
  image_url: {
    type: 'string'
  },
  name: {
    type: 'string'
  },
  id: {
    type: 'number'
  }
})

Types.Content = new Schematic.Schema('Content', {
  title: {
    type: 'string',
    required: true
  },
  text: {
    type: 'string',
    required: true
  },
  author: {
    type: 'object'
  },
  date: {
    type: 'string'
  },
  published: {
    type: 'boolean'
  }
})
Types.CartEntry = new Schematic.Schema('CartEntry', {
  'product_id': {
    type: 'number',
    required: true
  },
  'quantity': {
    type: 'number',
    required: true,
    min: 1
  },
  'variant_id': {
    type: 'number'
  }
})
Types.CartUpdateEntry = new Schematic.Schema('CartUpdateEntry', {
  'product_id': {
    type: 'number',
    required: true
  },
  'quantity': {
    type: 'number',
    min: 0
  },
  'variant_id': {
    type: 'number'
  }
})

Types.Cart = new Schematic.Schema('Cart', {
  'items': {
    type: 'array',
    elements: {
      type: Types.CartEntry
    },
    required: true
  },
  'user_id': {
    type: 'number'
  }
})

Types.CartUpdate = new Schematic.Schema('CartUpdate', {
  'items': {
    type: 'array',
    elements: {
      type: 'object'
    },
    required: true
  },
  'op': {
    type: 'string',
    whitelist: ['add', 'remove', 'update']
  }
})

Types.Coupon = new Schematic.Schema('Coupon', {
  'code': {
    type: 'string',
    min: '1',
    max: '30',
    required: true
  },
  'name': {
    type: 'string',
    min: '1',
    max: '256',
    required: true
  },
  'target_type': {
    type: 'string',
    whitelist: [
      'CART_COUPON',
      'PRODUCT_COUPON',
      'CATEGORY_COUPON',
      'PRODUCTS_COUPON'
    ],
    required: true
  },
  'target_id': {
    type: 'number'
  },
  'discount_type': {
    type: 'string',
    whitelist: ['NET_REDUCTION', 'PERCENTAGE_REDUCTION'],
    required: true
  },
  'discount_value': {
    type: 'number',
    min: 0,
    required: true
  },
  'active': {
    type: 'boolean',
    required: true
  },
  'usages_left': {
    type: 'number',
    min: 0,
    required: false
  },
  'expiration_date': {
    type: 'string',
    required: false
  }
})

Types.Brand = new Schematic.Schema('Brand', {
  'name': {
    type: 'string',
    min: 3,
    max: 50,
    required: true
  },
  'description': {
    type: 'string'
  },
  'url': {
    type: 'string'
  },
  'image_url': {
    type: 'string'
  }
})

Types.File = new Schematic.Schema('File', {
  file: {
    type: 'string',
    required: true
  },
  filename: {
    type: 'string',
    required: true
  },
  name: {
    type: 'string',
    required: true
  },
  slug: {
    type: 'string',
    max: 140
  },
  description: {
    type: 'string'
  }
})
Types.FileUpdate = new Schematic.Schema('FileUpdate', {
  name: {
    type: 'string',
    required: true
  },
  slug: {
    type: 'string',
    max: 140
  },
  description: {
    type: 'string'
  }
})

Types.Notification = new Schematic.Schema('Notification', {
  event: {
    type: 'string',
    required: true,
    whitelist: [
      'custom', // Custom defined events, can only be sent programmaticaly
      'order.create', // Sent automatically by the system
      'order.paid', // Sent automatically by the system
      'user.create' // Sent automatically by the system
    ]
  },
  from_name: {
    type: 'string'
  },
  from_email: {
    type: 'string'
  },
  subject: {
    type: 'string'
  }
})

Types.User = new Schematic.Schema('User', {
  'name': {
    type: 'string',
    min: 1,
    max: 255
  },
  'email': {
    type: 'string',
    min: 4,
    max: 255
  },
  'password': {
    type: 'string',
    min: 4,
    max: 255
  },
  'image_url': {
    type: 'string'
  },
  'billing_address': {
    type: Types.Address
  },
  'shipping_address': {
    type: Types.Address
  }
})

Types.TaxRate = new Schematic.Schema('TaxRate', {
  'country': {
    type: 'string',
    required: true
  },
  'state': {
    type: 'string',
    required: true
  },
  'postcode': {
    type: 'string',
    required: true
  },
  'city': {
    type: 'string',
    required: true
  },
  'rate': {
    type: 'number',
    required: true,
    min: 0,
    max: 100
  },
  'priority': {
    type: 'number',
    required: true,
    min: 0
  }
})
Types.Tax = new Schematic.Schema('Tax', {
  'name': {
    type: 'string',
    min: 3,
    max: 30,
    required: true
  },
  'description': {
    type: 'string',
    max: 600
  },
  'rates': {
    type: 'array',
    elements: {
      type: Types.TaxRate
    }
  }
})
Types.Currency = new Schematic.Schema('Currency', {
  'name': {
    type: 'string',
    min: 3,
    max: 30,
    required: true
  },
  'formatting': {
    type: 'string',
    min: 0,
    max: 3,
    required: true
  }
})
Types.Product = new Schematic.Schema('Product', {
  'name': {
    type: 'string',
    required: true,
    min: 2
  },
  'type': {
    type: 'string',
    required: true,
    whitelist: ['simple_product', 'product_with_variants', 'grouped_product', 'bundled_product']
  },
  'category_id': {
    type: 'number'
  },
  'sku': {
    type: 'string'
  },
  'price': {
    type: 'number',
    required: true
  },
  'slug': {
    type: 'string'
  },
  'stock_level': {
    type: 'number',
    min: 0
  },
  'stock_type': {
    type: 'string',
    whitelist: ['infinite', 'track', 'status'],
    required: true
  },
  'stock_status': {
    type: 'string',
    whitelist: ['in_stock', 'out_of_stock']
  },
  'description': {
    type: 'string'
  },
  'weigth': {
    type: 'number'
  },
  'height': {
    type: 'number'
  },
  'depth': {
    type: 'number'
  },
  'width': {
    type: 'number'
  },
  'brand_id': {
    type: 'number'
  },
  'store_id': {
    type: 'number'
  },
  'images': {
    type: 'array'
  },
  'published': {
    type: 'boolean'
  },
  'price_discount': {
    type: 'number'
  }
})

Types.Variant = new Schematic.Schema('Variant', {
  variant_id: {
    type: 'number',
    required: true
  },
  product_id: {
    type: 'number',
    required: true
  },
  'stock_level': {
    type: 'number',
    min: 0
  },
  'stock_type': {
    type: 'string',
    whitelist: ['infinite', 'track', 'status'],
    required: true
  },
  'stock_status': {
    type: 'string',
    whitelist: ['in_stock', 'out_of_stock']
  },
  'price': {
    type: 'number',
    required: true
  }
})

Types.InvoiceLineItem = new Schematic.Schema('InvoiceLineItem', {
  name: {
    type: 'string',
    required: true,
    min: 1,
    max: 140
  },
  description: {
    type: 'string'
  },
  price: {
    type: 'number',
    required: true
  },
  quantity: {
    type: 'number',
    required: true,
    min: 1
  }
})
Types.Invoice = new Schematic.Schema('Invoice', {
  number: {
    type: 'string',
    required: true
  },
  order_id: {
    type: 'number',
    required: true
  },
  customer: {
    type: 'object',
    required: true
  },
  company: {
    type: 'object',
    required: true
  },
  lineItems: {
    type: 'array',
    elements: {
      type: Types.InvoiceLineItem
    }
  }
})
Types.GroupedProductEntry = new Schematic.Schema('GroupedProductEntry', {
  'product_id': {
    type: 'number',
    required: true
  },
  'quantity': {
    type: 'number',
    required: true
  }
})
Types.GroupedProduct = new Schematic.Schema('GroupedProduct', {
  'name': {
    type: 'string',
    required: true,
    min: 2
  },
  'category_id': {
    type: 'number'
  },
  'sku': {
    type: 'string'
  },
  'items': {
    type: 'array',
    elements: {
      type: Types.GroupedProductEntry
    },
    min: 1
  },
  'pricing_method': {
    type: 'string',
    whitelist: ['dynamic_pricing', 'fixed_pricing'],
    required: true
  },
  'price': {
    type: 'number'
  },
  'price_discount': {
    type: 'number'
  },
  'slug': {
    type: 'string'
  },
  'description': {
    type: 'string'
  },
  'brand_id': {
    type: 'number'
  },
  'store_id': {
    type: 'number'
  },
  'images': {
    type: 'array'
  },
  'published': {
    type: 'boolean'
  },
  'type': {
    type: 'string',
    whitelist: ['grouped_product']
  }
})

Types.ProductWithVariants = new Schematic.Schema('Product', {
  'name': {
    type: 'string',
    required: true,
    min: 2
  },
  'category_id': {
    type: 'number'
  },
  'sku': {
    type: 'string'
  },
  'price': {
    type: 'number',
    required: true
  },
  'stock_level': {
    type: 'number',
    min: 0
  },
  'description': {
    type: 'string'
  },
  'weigth': {
    type: 'number'
  },
  'height': {
    type: 'number'
  },
  'width': {
    type: 'number'
  },
  'depth': {
    type: 'number'
  },
  'brand_id': {
    type: 'number'
  },
  'store_id': {
    type: 'number'
  },
  'images': {
    type: 'array'
  },
  'slug': {
    type: 'string'
  },
  'published': {
    type: 'boolean'
  }
})

Types.Order = new Schematic.Schema('Order', {
  'status': {
    type: 'string',
    whitelist: ['created', 'processing', 'evaded', 'shipped']
  },
  'shipping_address_id': {
    type: 'number'
  },
  'billing_address_id': {
    type: 'number'
  },
  'items_total': {
    type: 'number'
  },
  'display_items_total': {
    type: 'string'
  },
  'total': {
    type: 'number'
  },
  'display_total': {
    type: 'string'
  },
  'items': {
    type: 'array',
    required: true
  },
  'currency': {
    type: 'string',
    whitelist: ['USD', 'CAD', 'EUR', 'AED', 'AFN', 'ALL', 'AMD', 'ARS', 'AUD', 'AZN', 'BAM', 'BDT', 'BGN', 'BHD', 'BIF', 'BND', 'BOB', 'BRL', 'BWP', 'BYR', 'BZD', 'CDF', 'CHF', 'CLP', 'CNY', 'COP', 'CRC', 'CVE', 'CZK', 'DJF', 'DKK', 'DOP', 'DZD', 'EEK', 'EGP', 'ERN', 'ETB', 'GBP', 'GEL', 'GHS', 'GNF', 'GTQ', 'HKD', 'HNL', 'HRK', 'HUF', 'IDR', 'ILS', 'INR', 'IQD', 'IRR', 'ISK', 'JMD', 'JOD', 'JPY', 'KES', 'KHR', 'KMF', 'KRW', 'KWD', 'KZT', 'LBP', 'LKR', 'LTL', 'LVL', 'LYD', 'MAD', 'MDL', 'MGA', 'MKD', 'MMK', 'MOP', 'MUR', 'MXN', 'MYR', 'MZN', 'NAD', 'NGN', 'NIO', 'NOK', 'NPR', 'NZD', 'OMR', 'PAB', 'PEN', 'PHP', 'PKR', 'PLN', 'PYG', 'QAR', 'RON', 'RSD', 'RUB', 'RWF', 'SAR', 'SDG', 'SEK', 'SGD', 'SOS', 'SYP', 'THB', 'TND', 'TOP', 'TRY', 'TTD', 'TWD', 'TZS', 'UAH', 'UGX', 'UYU', 'UZS', 'VEF', 'VND', 'XAF', 'XOF', 'YER', 'ZAR', 'ZMK']
  },
  'store_id': {
    type: 'number'
  },
  'notes': {
    type: 'string',
    max: 500
  },
  'shipping_fee': {
    type: 'number',
    min: 0
  }
})

// This resemble a taxrate
Types.ShippingZone = new Schematic.Schema('ShippingZone', {
  'country': {
    type: 'string',
    required: true
  },
  'state': {
    type: 'string',
    required: true
  },
  'postcode': {
    type: 'string',
    required: true
  },
  'city': {
    type: 'string',
    required: true
  }
})

Types.Shipping = new Schematic.Schema('Shipping', {
  'name': {
    type: 'string',
    required: true
  },
  'base_cost': {
    type: 'number',
    required: true
  },
  'per_item_cost': {
    type: 'number'
  },
  'description': {
    type: 'string'
  },
  'min_price': {
    type: 'number'
  },
  'max_price': {
    type: 'number'
  },
  'min_weight': {
    type: 'number'
  },
  'max_weight': {
    type: 'number'
  },
  'zones': {
    type: 'array'
  }
})

Types.Store = new Schematic.Schema('Store', {
  'name': {
    type: 'string',
    required: true
  },
  'owner_email': {
    type: 'string',
    required: true
  },
  'description': {
    type: 'string'
  },
  'custom_attributes': {
    type: 'object'
  }
})

Types.Customer = new Schematic.Schema('Customer', {
  'full_name': {
    type: 'string',
    required: true
  },
  'shipping_address': {
    type: Types.Address,
    required: true
  },
  'billing_address': {
    type: Types.Address,
    required: true
  },
  'email': {
    type: 'string',
    required: true
  }
})

Types.Variable = new Schematic.Schema('Variable', {
  name: {
    type: 'string',
    required: true,
    min: 1,
    max: 500
  },
  type: {
    type: 'string',
    required: false,
    whitelist: ['string', 'number', 'boolean', 'object', 'array']
  },
  value: {
    required: true
  }
})

Types.Shipment = new Schematic.Schema('Shipment', {
  'tracking_code': {
    type: 'string'
  },
  'tracking_link': {
    type: 'string'
  },
  'date': {
    type: 'string',
    required: true
  },
  'delivery_date': {
    type: 'string',
    required: true
  },
  'description': {
    type: 'string'
  },
  'method': {
    type: Types.Shipping,
    required: true
  }

})

module.exports = Types
