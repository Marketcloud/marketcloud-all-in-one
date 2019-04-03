var Utils = require('../../libs/util.js')

var expect = require('chai').expect

var application = {
  id: 229118,
  name: 'we-are-wild',
  owner: 'pejoessel@gmail.com',
  url: 'we-are-wild.com',
  status: 'exceeded_quota',
  plan_name: 'free',
  api_calls_quota_left: 4578,
  api_calls_quota_max: 5000,
  blocked: Buffer[ 0 ],
  public_key: 'ebe5bf2c-0bca-4495-bb5c-dca3c54aac7b',
  secret_key: 'mUR3oKxECdfBcwBHw8DUYSmzQRRaDS8m1YoechQInd0-',
  tax_rate: 10,
  tax_type: 'products_only',
  currency_code: 'CHF',
  timezone: 'Romance Standard Time',
  email_address: 'hello@we-are-wild.com',
  logo: 'https://www.marketcloud.it/img/logo/normal.png',
  stripe_subscription_id: null,
  storage_max: 524288,
  storage_left: 524288,
  locales: 'en-GB,fr-FR,de-CH',
  company_name: 'We are Wild',
  company_address: 'Route de Cojonnex 18',
  company_postalcode: '1001',
  company_city: 'Lausanne',
  company_state: 'Vaud',
  company_country: 'Switzerland',
  company_taxid: '',
  currencies: '[{"code":"EUR","rate":0.8724},{"code":"CHF","rate":1}]'

}

var order = {
  'shipping_address': {
    'state': 'Vaud',
    'first_name': 'Paul-Emile',
    'last_name': 'Joëssel',
    'address1': 'Route de la préla, 196',
    'postal_code': '1609',
    'city': 'Fiaugères',
    'country': 'Switzerland',
    'full_name': 'Paul-Emile Joëssel',
    'email': 'paul-emile.joessel@ehl.ch'
  },
  'billing_address': {
    'state': 'Vaud',
    'first_name': 'Paul-Emile',
    'last_name': 'Joëssel',
    'address1': 'Route de la préla, 196',
    'postal_code': '1609',
    'city': 'Fiaugères',
    'country': 'Switzerland',
    'full_name': 'Paul-Emile Joëssel',
    'email': 'paul-emile.joessel@ehl.ch'
  },
  'coupon': {
    'active': true,
    'discount_type': 'PERCENTAGE_REDUCTION',
    'name': 'Test coupon',
    'code': 'TEST_COUPON',
    'target_type': 'PRODUCT_COUPON',
    'discount_value': 10,
    'application_id': 229118,
    'id': 231567,
    'target_id' : 229125,
    'updated_at': '2017-07-31T08:45:50.627Z',
    'created_at': '2017-07-31T08:45:43.794Z',
    'total_usages': 27
  },
  'taxes': [
    {
      'rates': [
        {
          'name': '',
          'country': 'France',
          'state': '*',
          'postcode': '*',
          'city': '*',
          'rate': 10,
          'priority': 10
        }
      ],
      'name': 'Europe',
      'application_id': 229118,
      'id': 237836,
      'updated_at': '2017-08-17T09:32:33.247Z',
      'created_at': '2017-08-17T09:32:25.226Z'
    }
  ],
  'application_id': 229118,
  'products': [
    {
      'type': 'product_with_variants',
      'name': 'Sea Salt',
      'description': '<b>Dark Chocolate blended with house roasted almonds.</b><p>70% cacao, cane sugar, cocoabutter, almonds, sea salt.<br></p><p>Cacao origin: Tanzania</p><p></p>',
      'images': [
        'http://cdn.marketcloud.it/files/229118_WEBSITE_STRUCTURE_OK16jpg',
        'http://cdn.marketcloud.it/files/229118_Large_Goat_Milk_1024x1024jpg'
      ],
      'published': true,
      'has_variants': true,
      'slug': 'sea-salt',
      'price': 10,
      'brand_id': 229122,
      'category_id': 233330,
      'requires_shipping': false,
      'variantsDefinition': {
        'weight': [
          '100',
          '100 G'
        ]
      },
      'weight': 0,
      'id': 229125,
      'variant': {
        'type': 'product_with_variants',
        'name': 'Sea Salt',
        'description': '',
        'stock_type': 'status',
        'stock_status': 'in_stock',
        'images': [],
        'slug': 'sea-salt',
        'price': 10,
        'brand_id': 229122,
        'category_id': 229124,
        'requires_shipping': false,
        'weight': '100',
        'save': true,
        'id': 1,
        'variant_id': 1,
        'product_id': 229125,
        'application_id': 229118,
        'stock_level': null
      },
      'quantity': 2
    },
    
  ],
  'items_total': 20,
  'created_at': 1503564541026.0,
  'status': 'processing',
  'coupon_code': 'TEST_COUPON',
  'currency': {
    'symbol': 'CHF',
    'name': 'Swiss Franc',
    'symbol_native': 'CHF',
    'decimal_digits': 2,
    'rounding': 0.05,
    'code': 'CHF',
    'name_plural': 'Swiss francs',
    'rate': 1
  },
  'id': 240658,
  
}

describe('Test taxes value calculation functions', function () {
  it('Should calculate correctly taxes for order (discount_before_taxes)', function () {
    application.apply_discounts_before_taxes = true
    var v = Utils.getTotalTaxesForProducts(order, application)

    // item cost is 10
    // quantity is 2
    // coupon is 10% in item
    // coupon total should be 2
    //taxes are 10% so tax total here should be 1.8


    expect(v).to.equal(1.8)
  })

  it('Should calculate correctly taxes for order (discount_after_taxes)', function () {
    application.apply_discounts_before_taxes = false
    var v = Utils.getTotalTaxesForProducts(order, application)

    // item cost is 10
    // quantity is 2
    // coupon is 10% in item
    // coupon total should be 2
    //taxes are 10% so tax total here should be 2

    expect(v).to.equal(2)
  })

  

  it('Should apply correctly the global tax to the single product', function(){
    var product = {
      price : 10,
      price_discount : 5,
      variants : [{
        price : 20,
        price_discount : 10
      }]
    }

    var application = {
      tax_type : "products",
      tax_rate : 10
    }

    var tax = {
      name : "fake tax",
      rates : [{
          'name': '',
          'country': '*',
          'state': '*',
          'postcode': '*',
          'city': '*',
          'rate': 10,
          'priority': 10
        }]
    }

    var productWithTax = Utils.applyTaxesToProduct(product,application,tax)

    expect(product.price).to.equal(11);
    expect(product.price_discount).to.equal(5.5);
    expect(product.variants[0].price).to.equal(22);
    expect(product.variants[0].price_discount).to.equal(11);
  })
})
