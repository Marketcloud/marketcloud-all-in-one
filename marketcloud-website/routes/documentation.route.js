'use strict';
/* jshint node:true */
var express = require('express');
var router = express.Router();


router.get('/', function(req, res) {
  //res.render('documentation/v0/home.ejs',{pageTitle : 'Documentation Home'})
  res.render('documentation/v0/page',{pageTitle : 'Documentation Home', page : 'documentation_home'})
})

router.get('/downloads',function(req,res){
  res.render('documentation/v0/downloads.ejs',{
    pageTitle : 'Marketcloud Downloads',
    pageName : 'Downloads'
  })
})


router.get('/rest-api', function(req, res) {
  
  res.redirect('/documentation/rest-api/introduction');
})
router.get('/rest-api/:page', function(req, res) {
  var page = req.params.page;
  var pageName = page.charAt(0).toUpperCase() + page.slice(1).toLowerCase();
  res.render('documentation/v0/rest-api/apipage',{page:'partials/'+page, pageTitle : 'Documentation | cURL API Reference', pageName :pageName});
})


/*

router.get('/rest-api', function(req, res) {
  res.render('documentation/v0/rest-api/introduction',{pageTitle : 'Documentation | cURL API Reference', pageName :'Introduction'})
})



router.get('/rest-api/application', function(req, res) {
  res.render('documentation/v0/rest-api/application',{pageTitle : 'Documentation | cURL API Reference', pageName :'Application'})
})

router.get('/rest-api/carts', function(req, res) {
  res.render('documentation/v0/rest-api/carts',{pageTitle : 'Documentation | cURL API Reference', pageName :'Carts'})
})

router.get('/rest-api/contents', function(req, res) {
  res.render('documentation/v0/rest-api/contents',{pageTitle : 'Documentation | cURL API Reference', pageName :'Contents'})
})
router.get('/rest-api/coupons', function(req, res) {
  res.render('documentation/v0/rest-api/coupons',{pageTitle : 'Documentation | cURL API Reference', pageName :'Coupons'})
})

router.get('/rest-api/promotions', function(req, res) {
  res.render('documentation/v0/rest-api/promotions',{pageTitle : 'Documentation | cURL API Reference', pageName :'Promotions'})
})

router.get('/rest-api/files', function(req, res) {
  res.render('documentation/v0/rest-api/files',{pageTitle : 'Documentation | cURL API Reference', pageName :'Files'})
})



router.get('/rest-api/notifications', function(req, res) {
  res.render('documentation/v0/rest-api/notifications',{pageTitle : 'Documentation | cURL API Reference', pageName :'Notifications'})
})
router.get('/rest-api/orders',function(req,res) {
   res.render('documentation/v0/rest-api/orders',{pageTitle: 'Documentation | cURL API Reference' , pageName : 'Orders'});
});


router.get('/rest-api/introduction',function(req,res){
    res.render('documentation/v0/rest-api/introduction',{pageTitle : 'Documentation | cURL API Reference', pageName :'Introduction'})
})
router.get('/rest-api/gettingstarted',function(req,res){
    res.render('documentation/v0/rest-api/gettingstarted',{pageTitle : 'Documentation | cURL API Reference', pageName :'Getting Started'})
})
router.get('/rest-api/brands',function(req,res){
    res.render('documentation/v0/rest-api/brands',{pageTitle : 'Documentation | cURL API Reference', pageName :'Brands'})
})
router.get('/rest-api/shippings',function(req,res){
    res.render('documentation/v0/rest-api/shippings',{pageTitle : 'Documentation | cURL API Reference', pageName :'Shippings'})
})
router.get('/rest-api/taxes',function(req,res){
    res.render('documentation/v0/rest-api/taxes',{pageTitle : 'Documentation | cURL API Reference', pageName :'Taxes'})
})
router.get('/rest-api/categories',function(req,res){
    res.render('documentation/v0/rest-api/categories',{pageTitle : 'Documentation | cURL API Reference', pageName :'Categories'})
})
router.get('/rest-api/users',function(req,res){
    res.render('documentation/v0/rest-api/users',{pageTitle : 'Documentation | cURL API Reference', pageName :'Users'})
})
router.get('/rest-api/stores',function(req,res){
    res.render('documentation/v0/rest-api/stores',{pageTitle : 'Documentation | cURL API Reference', pageName :'Stores'})
})
router.get('/rest-api/currencies',function(req,res){
    res.render('documentation/v0/rest-api/currencies',{pageTitle : 'Documentation | cURL API Reference', pageName :'Currencies'})
})
router.get('/rest-api/products',function(req,res){
    res.render('documentation/v0/rest-api/products',{pageTitle : 'Documentation | cURL API Reference', pageName :'Products'})
})

router.get('/rest-api/paymentmethods',function(req,res){
    res.render('documentation/v0/rest-api/paymentMethods',{pageTitle : 'Documentation | cURL API Reference', pageName :'Payment methods'})
})
*/



/* GUIDES */
router.get('/guides',function(req,res){
  res.render('documentation/v0/page',{pageTitle : 'Documentation | Roles',page : 'guides/guides_index'})
});

router.get('/roles',function(req,res){
  res.redirect('/documentation/guides/roles');
});
router.get('/guides/roles',function(req,res){
  res.render('documentation/v0/page',{pageTitle : 'Documentation | Roles',page : 'guides/roles'})
});

router.get('/guides/authentication',function(req,res){
  res.render('documentation/v0/page',{pageTitle : 'Documentation | Authentication',page : 'guides/authentication'})
});
router.get('/authentication',function(req,res){
  res.redirect('/documentation/guides/authentication');
});

router.get('/guides/handlingerrors',function(req,res){
  res.render('documentation/v0/page',{pageTitle : 'Documentation | Error handling', page : 'guides/error_handling'})
});
router.get('/handlingerrors',function(req,res){
  res.redirect('/documentation/guides/handlingerrors');
});



router.get('/guides/webhooks',function(req,res){
  res.render('documentation/v0/page',{pageTitle : 'Documentation | Webhooks', page : 'guides/webhooks'})
});
router.get('/webhooks',function(req,res){
  res.redirect('/documentation/guides/webhooks');
});




router.get('/guides/libraries',function(req,res){
  res.render('documentation/v0/page',{pageTitle : 'Documentation | API Libraries',page : 'guides/libraries'})
});
router.get('/libraries',function(req,res){
  res.redirect('/documentation/guides/libraries');
});


router.get('/guides/backoffice',function(req,res,next){
  res.render('documentation/v0/page',{pageTitle : 'Documentation | Backoffice', page : 'backoffice/backoffice_index'});
});
router.get('/backoffice',function(req,res,next){
  res.redirect('/documentation/guides/backoffice');
});


router.get('/guides/backoffice/products-with-variants',function(req,res,next){
  res.render('documentation/v0/page',{pageTitle : 'Documentation | Products with variants', page:'backoffice/variants'});
});
router.get('/backoffice/products-with-variants',function(req,res,next){
  res.redirect('/documentation/guides/backoffice/products-with-variants');
});

router.get('/guides/backoffice/setting-up-taxes',function(req,res,next){
  res.render('documentation/v0/page',{pageTitle : 'Documentation | Setting up taxes', page:'backoffice/setting-up-taxes'});
});

router.get('/guides/backoffice/translations',function(req,res,next){
  res.render('documentation/v0/page',{pageTitle : 'Documentation | Translating your store', page:'backoffice/translations'});
});

router.get('/guides/backoffice/currencies',function(req,res,next){
  res.render('documentation/v0/page',{pageTitle : 'Documentation | Accept multiple currencies', page:'backoffice/currencies'});
});


//Indexes
router.get('/reference',function(req,res){
  res.render('documentation/v0/reference-index',{pageTitle : 'Documentation | API Reference index'})
});
router.get('/quickstart',function(req,res){
  res.render('documentation/v0/quickstart-index',{pageTitle : 'Documentation | Quickstart index'})
});
router.get('/examples',function(req,res){
  res.render('documentation/v0/examples',{pageTitle : 'Code'})
});


router.get('/reference/javascript', function(req, res) {
  res.render('documentation/v0/javascript/reference_v2',{pageTitle : 'Documentation | Javascript API Reference latest'})
})
router.get('/reference/javascript/v2', function(req, res) {
  res.render('documentation/v0/javascript/reference_v2',{pageTitle : 'Documentation | Javascript API Reference v2'})
})
router.get('/reference/javascript/v1', function(req, res) {
  res.render('documentation/v0/javascript/reference_v1',{pageTitle : 'Documentation | Javascript API Reference v1'})
})

router.get('/quickstart/javascript', function(req, res) {
 // res.render('documentation/v0/javascript/quickstart',{pageTitle : 'Documentation | Javascript Quickstart'})
  res.render('documentation/v0/page',{pageTitle : 'Documentation | Javascript Quickstart',page : 'javascript/quickstart_javascript'})
})


router.get('/reference/nodejs', function(req, res) {
  res.render('documentation/v0/nodejs/reference',{pageTitle : 'Documentation | NodeJS API Reference'})
})
router.get('/quickstart/nodejs', function(req, res) {
  //res.render('documentation/v0/nodejs/quickstart',{pageTitle : 'Documentation | NodeJS Quickstart'})
  res.render('documentation/v0/page',{pageTitle : 'Documentation | NodeJS Quickstart',page : 'nodejs/quickstart_nodejs'})
})

router.get('/reference/php', function(req, res) {
  //res.render('documentation/v0/php/reference',{pageTitle : 'Documentation | PHP API Reference'})
  res.render('documentation/v0/reference_page',{pageTitle : 'Documentation | PHP API Reference',language : "php"})
})
router.get('/quickstart/php', function(req, res) {
  //res.render('documentation/v0/php/quickstart',{pageTitle : 'Documentation | PHP Quickstart'})
  res.render('documentation/v0/page',{pageTitle : 'Documentation | PHP Quickstart',page : 'php/quickstart_php'})
})


router.get('/reference/swift', function(req, res) {
  res.render('documentation/v0/swift/reference',{pageTitle : 'Documentation | Swift API Reference'})
})

router.get('/quickstart/swift', function(req, res) {
  //res.render('documentation/v0/swift/quickstart',{pageTitle : 'Documentation | Swift Quickstart'})
  res.render('documentation/v0/page',{pageTitle : 'Documentation | Swift Quickstart', page:'swift/quickstart_swift'})
})


router.get('/reference/android', function(req, res) {
  res.render('documentation/v0/android/reference',{pageTitle : 'Documentation | Android API Reference'})
})
router.get('/quickstart/android', function(req, res) {
  res.render('documentation/v0/android/quickstart',{pageTitle : 'Documentation | Android Quickstart'})
})

router.get('/reference/curl', function(req, res) {
  res.render('documentation/v0/swift/reference',{pageTitle : 'Documentation | Swift API Reference'})
})
router.get('/quickstart/curl', function(req, res) {
  res.render('documentation/v0/rest-api/quickstart',{pageTitle : 'Documentation | Android Quickstart'})
})

/*router.get('/reference/curl2/', function(req, res) {
  res.render('documentation/v0/curl/reference',{pageTitle : 'Documentation | cURL API Reference'})
})*/
/* END OF NEW STUFF */




router.get('/javascript', function(req, res) {
  res.redirect('/documentation/quickstart/javascript');
})

router.get('/nodejs', function(req, res) {
  res.redirect('/documentation/quickstart/nodejs');
  
})

router.get('/swift', function(req, res) {
  res.redirect('/documentation/quickstart/swift');
})

router.get('/android', function(req, res) {
  res.redirect('/documentation/quickstart/android');
})

router.get('/php', function(req, res) {
  res.redirect('/documentation/quickstart/php');
});


router.get('/android/guides/example-android-application',function(req,res){
  res.render('documentation/v0/android/guides/sample_android_application_guide',
  {
    pageTitle : 'Marketcloud powered Android eCommerce app development'
  })
})


router.get('/guides/stripe', function(req, res) {
  res.redirect('/documentation/guides/integrations/stripe')
});



router.get('/guides/braintree', function(req, res) {
  res.redirect('/documentation/guides/integrations/braintree')
});



router.get('/integrations', function(req, res) {
  res.redirect('/documentation/guides/integrations')
});

router.get('/guides/integrations', function(req, res) {
  res.render('documentation/v0/page',{pageTitle : 'Marketcloud documentation | Integrations', page : 'integrations/integrations_index'})
});

router.get('/guides/integrations/stripe', function(req, res) {
  //res.render('documentation/v0/guides/stripe',{pageTitle : 'Marketcloud documentation | Guides | Stripe'})
  res.render('documentation/v0/page',{pageTitle : 'Marketcloud documentation | Guides | Stripe', page : 'integrations/stripe'})
});
router.get('/guides/integrations/braintree', function(req, res) {
  res.render('documentation/v0/page',{pageTitle : 'Marketcloud documentation | Guides | Braintree', page : 'integrations/braintree'})
});
router.get('/guides/integrations/facebook-login', function(req, res) {
  res.render('documentation/v0/page',{pageTitle : 'Marketcloud documentation | Guides |Facebook login', page : 'integrations/facebook-login'})
  //res.render('documentation/v0/guides/facebook-login',{pageTitle : 'Marketcloud documentation | Guides |Facebook login'})
})


router.get('/integrations/stripe', function(req, res) {
  res.redirect('/documentation/guides/integrations/stripe')
});



router.get('/integrations/braintree', function(req, res) {
  res.redirect('/documentation/guides/integrations/braintree')
});

router.get('/integrations/facebook', function(req, res) {
  res.redirect('/documentation/guides/integrations/facebook-login')
});



router.get('/guides/facebook-login', function(req, res) {
  res.redirect('/documentation/guides/integrations/facebook-login')

})




module.exports = router;
