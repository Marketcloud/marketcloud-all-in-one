var app = angular.module('DataDashboard')
app.controller('EditCouponController', [
  '$scope',
  '$http',
  '$marketcloud',
  '$location', 
  '$validation', 
  '$models', 
  'coupon',
  function(scope, http, $marketcloud, location,  $validation, $models, coupon) {
    scope.coupon = coupon.data.data

    scope.save = function() {
      $validation.hideErrors()
      $marketcloud.coupons.update(scope.coupon.id, scope.coupon)
        .then(function(response) {
          notie.alert(1, 'Coupon updated', 1.5)
        })
        .catch(function(response) {

          if (response.status === 400) {
            notie.alert(2, 'The data you entered has some errors', 1.5);

            var validation = response.data.errors[0];
            var selector = '[ng-model="coupon.' + validation.invalidPropertyName + '"]';

            if (angular.element(selector).length === 0)
              selector = '[validate-for="' + validation.invalidPropertyName + '"]'

            $validation.showErrorMessage(validation, $models.Coupon.schema, selector)
          } else
            notie.alert(3, 'An error has occurred.', 2)
        })
    }

    if ('expiration_date' in scope.coupon) {
      scope.hasExpirationDate = true
    }

    if ('usages_left' in scope.coupon) {
      scope.limitedUsage = true
    }

    scope.toggleCouponExpiration = function() {
      scope.coupon.expiration_date = null
    }

    scope.toggleCouponUsage = function() {
      scope.coupon.usages_left = null
    }

    scope.clearTargetId = function(){
      scope.coupon.target_id = null;
    }

    scope.addCondition = function() {
      scope.coupon.conditions.push(scope.newCondition)
      scope.newCondition = {}
    }
    scope.addEffect = function() {
      scope.coupon.effects.push(scope.newEffect)
      scope.newEffect = {}
    }

    // Target management
    // Stuff to add a product.
    // This must be packaged into a component
    scope.products = []
    scope.itemsToAdd = []
      // This is used as a reference after i pick a product
    scope.targetProduct = null
      // If the coupon already has a target product
      // we must load it
    if (scope.coupon.target_type === 'PRODUCT_COUPON') {
      $marketcloud.products.getById(scope.coupon.target_id)
        .then(function(response) {
          scope.targetProduct = response.data.data
        })
        .catch(function(response) {
          notie.alert(2, 'An error has occurred', 2)
        })
    }

    scope.query = {}

    scope.prepareRegex = function() {
      scope.query.name.$options = 'i'
    }

    scope.showTheList = false
    scope.showList = function() {
      scope.showTheList = true
    }
    scope.hideList = function() {
      window.setTimeout(function() {
        scope.showTheList = false
        scope.$apply()
      }, 200)
    }
    scope.loadProducts = function(query) {
      query = query || scope.query

      $marketcloud.products.list(query)
        .then(function(response) {
          scope.products = response.data.data
            .filter(function(item) {
              return scope.itemsToAdd
                .map(function(i) {
                  return i.id
                })
                .indexOf(item.id) < 0
            })
        })
        .catch(function(response) {
          notie.alert(3, 'An error has occurred. Please try again')
        })
    }

    scope.selectProductAsTarget = function(product) {
      scope.targetProduct = product
      scope.coupon.target_id = product.id
    }
    scope.resetTargetProduct = function() {
      scope.targetProduct = null
    }

    scope.loadProducts()

    scope.handleCategoryChange = function() {}
  }
])