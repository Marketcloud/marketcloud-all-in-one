var app = angular.module('DataDashboard')

app.directive('customOnChange', function() {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      var onChangeHandler = scope.$eval(attrs.customOnChange)
      element.bind('change', onChangeHandler)
    }
  }
})

function csvToJson(csv) {
  var lines = csv.split('\n')

  var result = []

  var headers = lines[0].split(',')

  for (var i = 1; i < lines.length; i++) {
    var obj = {}
    var currentline = lines[i].split(',')

    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = currentline[j]
    }

    result.push(obj)
  }

  return result
}

function validateTaxRates(rates) {
  var testFunction = function(rate) {
    return (
      rate.country &&
      rate.state &&
      rate.postcode &&
      rate.city &&
      rate.rate &&
      rate.hasOwnProperty('priority') // it can be 0 and would fail the simple test
    )
  }

  // Check that every item pass the test function
  return rates.every(testFunction)
}

function Rate(config) {
  this.state = '*'
  this.postcode = '*'
  this.city = '*'
  this.priority = 0

  for (var k in config) {
    this[k] = config[k]
  }

  // We store rates as strings in our default country list
  if (this.rate) {
    this.rate = Number(this.rate)
  }
}

app.controller('CreateTaxController', [
  '$scope', 
  '$http', 
  '$marketcloud', 
  '$location', 
  'Countries', 
  'TaxRates',
  '$validation',
  '$models',
  function(scope, http, $marketcloud, location, countries, tax_rates, $validation, $models) {
    scope.countries = countries
    scope.tax_rates = tax_rates

    scope.countriesWithTaxRates = scope.tax_rates
      .map(function(r) {
        return r.country
      })
      .filter(function(item, pos, self) {
        return self.indexOf(item) == pos
      })

    scope.countries.unshift({
      name: '*'
    })

    // Cache of states lists
    scope.states = {}

    // Whenever the country changes,
    // the list of states must be updated
    scope.tax = {
      rates: []
    }

    scope.updateCity = function(rate) {
      if (rate.postcode.indexOf('*') > -1) {
        rate.city = '*'
      }
    }
    scope.updatePostcode = function(rate) {
      if (rate.state === '*') {
        rate.postcode = '*'
      }
    }

    scope.importCSV = function() {
      $('#chooseFileButton').trigger('click')
    }
    scope.handleFileSelect = function(evt) {
      var files = $('#chooseFileButton')[0].files // FileList object

      // use the 1st file from the list
      var f = files[0]

      // HTML5 API
      var reader = new FileReader()

      // Closure to capture the file information.
      reader.onload = (function(theFile) {
        return function(e) {
          // Grabbing the file
          var csv_file = e.target.result

          // Converting to JSON
          var new_rates = csvToJson(csv_file)

          if (validateTaxRates(new_rates) === false) {
            notie.alert(2, 'The provided CSV file is not in a valid format', 2)
            return
          }

          // Transforming into a Rate object to handle defaults
          new_rates = new_rates.map(function(rate) {
            return new Rate(rate)
          })

          // Pushing new stuff to the bottom
          scope.tax.rates = scope.tax.rates.concat(new_rates)

          // Calling apply, since Angular is not aware of this async operation
          scope.$apply()
        }
      })(f)

      // Read in the image file as a data URL.
      reader.readAsText(f)
    }

    scope.loadRatesFromCountry = function(country) {
      var new_rates = scope.tax_rates
        .filter(function(rate) {
          return rate.country === country
        }).map(function(rate) {
          rate.country = country
          return new Rate(rate)
        })
      scope.tax.rates = scope.tax.rates.concat(new_rates)
    }

    scope.updateStates = function(rate) {
      if (rate.country === '*') {
        rate.state = '*'
        rate.city = '*'
        return
      }

      http({
          method: 'GET',
          url: '/countries/' + rate.country.toLowerCase()
        })
        .then(function(response) {
          scope.states[rate.country] = response.data
          scope.states[rate.country].unshift({
            name: '*'
          })
        })
        .catch(function(error) {
          var type = error.data.errors[0].type
          scope.states[rate.country] = '*'

          // We show an empty text input if its not available
          // notie.alert(2,"List of states not available for "+scope.tax.country,2);

          if (type !== 'StatesListNotAvailable') {
            notie.alert(3, 'An error has occurred. Please try again.', 1.5)
          }
        })
    }

    scope.addRate = function() {
      scope.tax.rates.push({
        name: '',
        country: '',
        state: '',
        postcode: '',
        city: '',
        rate: 0,
        priority: 0
      })
    }

    scope.deleteRate = function(index) {
      scope.tax.rates.splice(index, 1)
    }

    scope.saveTax = function() {

      $validation.hideErrors();

      $marketcloud.taxes.save(scope.tax)
        .then(function(response) {
          notie.alert(1, 'Tax saved', 1.5)
          location.path('/system/taxes')
        })
        .catch(function(response) {

          if (response.status === 400) {
            notie.alert(2, 'The data you entered has some errors', 1.5);

            var validation = response.data.errors[0];
            var selector = '[ng-model="tax.' + validation.invalidPropertyName + '"]';

            if (angular.element(selector).length === 0)
              selector = '[validate-for="' + validation.invalidPropertyName + '"]'

            $validation.showErrorMessage(validation, $models.Tax.schema, selector)
          } else
            notie.alert(3, 'An error has occurred.', 2)
        })
    }
  }
])