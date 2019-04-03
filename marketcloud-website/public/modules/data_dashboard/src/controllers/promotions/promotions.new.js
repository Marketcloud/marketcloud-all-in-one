var app = angular.module('DataDashboard')
app.controller('NewPromotionController', ['$scope', '$http', '$marketcloud', '$location',
  function (scope, http, $marketcloud, location) {
		// Defaults
    scope.promotion = {
      name: null,
      conditions: [],
      effects: [],
      active: false,
      priority: 0
    }
    scope.newCondition = {}
    scope.newEffect = {}

    scope.save = function () {
      scope.$promotionValidation = window.Models.Promotion.validate(scope.promotion)
      if (scope.$promotionValidation.valid !== true) {
        return
      }

      $marketcloud.promotions.save(scope.promotion)
					.then(function (response) {
  notie.alert(1, 'Promotion saved', 1.5)
  location.path('/promotions')
})
					.catch(function (response) {
  notie.alert(3, 'An error has occurred. Promotion not saved', 1.5)
})
    }

    scope.addCondition = function () {
      scope.$newConditionValidation = window.Models.PromotionCondition.validate(scope.newCondition)
      if (scope.$newConditionValidation.valid !== true) {
        return
      }

      scope.promotion.conditions.push(scope.newCondition)
      scope.newCondition = {}
    }
    scope.removeCondition = function (i) {
      scope.promotion.conditions.splice(i, 1)
    }
    scope.removeEffect = function (i) {
      scope.promotion.effects.splice(i, 1)
    }
    scope.addEffect = function () {
      scope.$newEffectValidation = window.Models.PromotionEffect.validate(scope.newEffect)

      if (scope.$newEffectValidation.valid !== true) {
        return
      }

      scope.promotion.effects.push(scope.newEffect)
      scope.newEffect = {}
    }
  }
])
