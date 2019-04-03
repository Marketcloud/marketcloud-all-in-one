var app = angular.module('DataDashboard')
app.controller('NewCouponController', [
  '$scope',
  '$http',
  '$marketcloud',
  '$location',
  '$validation',
  '$models',
  function(scope, http, $marketcloud, location, $validation, $models) {
    scope.coupon = {
      active: true,
      discount_type: 'NET_REDUCTION'
    }
    scope.randomizeCode = function() {
      scope.coupon.code = Math.random().toString(36).substr(2, 10).toUpperCase()
    }

    scope.updateCouponExpiration = function() {
      if (scope.hasExpirationDate !== true) {
        delete scope.coupon.expiration_date
      }
    }

    scope.clearTargetId = function(){
      scope.coupon.target_id = null;
    }

    scope.updateCouponUsage = function() {
      if (scope.limitedUsage !== true) {
        delete scope.coupon.usages_left
      }
    }

    scope.save = function() {

      
      for (var k in scope.coupon) {
        if (scope.coupon[k] === null) {
          delete scope.coupon[k]
        }
      }

      $validation.hideErrors()

      $marketcloud.coupons.save(scope.coupon)
        .then(function(response) {
          notie.alert(1, 'Coupon saved', 1.5)
          location.path('/coupons')
        })
        .catch(function(response) {

          if (response.status === 400){
            notie.alert(2, 'The data you entered has some errors', 1.5);

            var validation = response.data.errors[0];
            var selector = '[ng-model="coupon.'+validation.invalidPropertyName+'"]';

            if (angular.element(selector).length === 0)
              selector = '[validate-for="'+validation.invalidPropertyName+'"]'

            $validation.showErrorMessage(validation,$models.Coupon.schema , selector)
          } else 
            notie.alert(3, 'An error has occurred.', 2)
        })
    }

    scope.addCondition = function() {
      scope.coupon.conditions.push(scope.newCondition)
      scope.newCondition = {}
    }
    scope.addEffect = function() {
      scope.coupon.effects.push(scope.newEffect)
      scope.newEffect = {}
    }

    // Stuff to add a product.
    // This must be packaged into a component
    scope.products = []
    scope.itemsToAdd = []
      // This is used as a reference after i pick a product
    scope.targetProduct = null

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

    scope.handleCategoryChange = function() {

    }
  }
])