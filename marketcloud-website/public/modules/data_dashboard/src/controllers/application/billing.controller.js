var app = angular.module('DataDashboard')

app.controller('ApplicationBillingController', [
  '$scope',
  '$http',
  '$rootScope',
  '$application',
  '$account',
  function(scope, http, rootScope, $application, $account) {
    var application = $application.get()
    scope.application = application

    rootScope.currentSection = 'application.billing'

    // The form's step
    scope.step = 1

    // The selected plan
    scope.selected_plan = null

    // the error message
    scope.error = null

    scope.invalidPropertyName = null

    // holds the card data
    scope.card = {}

    // idle, processing, error, success
    scope.creditCardFormState = 'idle'

    scope.showYearlyPlans = false

    scope.goToStep = function(step) {
      scope.step = step
    }

    // Loads the current user information like profile and billing
    scope.account = $account.get();



    scope.selectPlan = function(plan_id) {
      scope.plans.forEach(function(plan) {
        if (plan.id === plan_id) {
          scope.selected_plan = plan
        }
      })
      console.log('selected_plan', scope.selected_plan)
      scope.goToStep(2)
    }

    var validateCard = function() {
      scope.error = null

      if (!Stripe.card.validateExpiry(scope.card.exp_month, scope.card.exp_year)) {
        scope.error = 'The card\'s expiration is invalid'
        scope.invalidPropertyName = 'card.expiry'
      }

      if (!Stripe.card.validateCVC(scope.card.cvc)) {
        scope.error = 'The card\'s cvc is invalid'
        scope.invalidPropertyName = 'card.cvc'
      }

      if (!Stripe.card.validateCardNumber(scope.card.number)) {
        scope.error = 'The card\'s number is invalid'
        scope.invalidPropertyName = 'card.number'
      }

      return (scope.error === null)
    }

    scope.updateApplicationSubscription = function() {
      scope.creditCardFormState = 'processing'
      http({
          method: 'PUT',
          url: '/applications/' + application.id + '/billing',
          data: {
            plan_id: scope.selected_plan.id
          }
        })
        .then(function(response) {
          scope.goToStep(3)
          scope.creditCardFormState = 'success'
        })
        .catch(function(error) {
          console.log(error)
          scope.error = error
          notie.alert(2, error.data.errors[0].message || 'Payment failed, please check your billing information.')
          scope.creditCardFormState = 'error'
        })
    }

    scope.filterByInterval = function(value, index, arr) {
      if (scope.showYearlyPlans === true) {
        return value.interval === 'yearly'
      } else {
        return value.interval === 'monthly'
      }
    }

    scope.plans = []

    http.get('/applications/' + scope.application.id + '/plans')
      .then(function(response) {
        console.log('PLANS', response.data)
        scope.plans = response.data.data

        scope.plans.forEach(function(plan) {
          plan.api_calls_quota_max = plan.api_calls_quota_max / 1000
          plan.api_calls_quota_max = plan.api_calls_quota_max + 'K'
        })
      })
      .catch(function(error) {
        console.log(error)
      })
  }
])