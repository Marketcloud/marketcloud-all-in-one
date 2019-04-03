angular
  .module('DataDashboard')
  .controller('BrandsSelectorController', BrandsSelectorController)
  .component('brandsSelector', {
    templateUrl: '/modules/data_dashboard/src/components/brandsSelector/brandsSelector.component.html',
    controller: 'BrandsSelectorController',
    bindings: {
      brand: '=',
      enableCreateBrand: '@',
      onError: '&'
    }
  })

BrandsSelectorController.$inject = ['$marketcloud', '$scope', '$element']

function BrandsSelectorController($marketcloud, scope, $elem) {
  var ctrl = null

  this.$onInit = function() {
    ctrl = this
    scope.ctrl = ctrl

    scope.newBrand = {}

    ctrl.modal = $($elem).find('.modal')[0]

    scope.enableCreateBrand = this.enableCreateBrand || true

    scope.ctrl.query = {
      name: {
        $regex: '',
        $options: 'i'
      }
    }
  }

  scope.showModal = function() {
    $(ctrl.modal).modal('show')
  }

  scope.saveBrand = function() {
    $marketcloud.brands.save(scope.newBrand)
      .then(function(response) {
        scope.ctrl.brands.push(response.data.data)
        scope.newBrand = {}
        scope.ctrl.brand = response.data.data.id
        return $marketcloud.brands.list()
      })
      .then(function(response) {
        scope.ctrl.brands = response.data.data
        $(ctrl.modal).modal('hide')
      })
      .catch(function(response) {
        $(ctrl.modal).hide()
        notie.alert(3, 'An error has occurred. Brand not saved', 1)
      })
  }

  scope.setSelectedBrand = function(brand) {
    scope.brand = brand
    scope.ctrl.brand = brand.id
    scope.ctrl.onChange({
      brand: brand.id
    })
  }

  // Uses the input box in the component to filter the wanted brand
  scope.filterBrands = function() {
    $marketcloud.brands.list(scope.ctrl.query)
      .then(function(response) {
        ctrl.brands = response.data.data
      })
      .catch(function(error) {
        notie.alert(2, 'An error has occurred while fetching brands, please retry.', 2)
      })
  }

  function initializeData() {
    // Initial fetch of brands
    $marketcloud.brands.list()
      .then(function(response) {
        ctrl.brands = response.data.data

        var currentBrand = null
          // Look for the currently selected brand, if any
        ctrl.brands.forEach(function(brand) {
          if (brand.id === scope.ctrl.brand) {
            currentBrand = brand
          }
        })

        // If found, we initialize the current brand
        if (currentBrand !== null) {
          scope.brand = currentBrand
        } else {
          // Otherwise we must fetch it
          return $marketcloud.brands.getById(scope.ctrl.brand)
        }
      })
      .then(function(response) {
        if (response.data.data) {
          scope.brand = response.data.data
        }
      })
      .catch(function(response) {
        ctrl.onError(response)
      })
  }

  initializeData()
}