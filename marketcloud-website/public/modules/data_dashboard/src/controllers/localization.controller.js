var app = angular.module('DataDashboard')

app.controller('LocalizationController', ['$scope', '$http', 'Currencies', 'Timezones', 'LocalesFactory', '$application',
  function(scope, http, currencies, timezones, locales, $application) {
    scope.application = $application.get()

    scope.currencies = currencies;

    for (var k in scope.currencies){
      scope.currencies[k].name_plus_code = scope.currencies[k].name+ " (" + scope.currencies[k].code + ")";
    }
    scope.activeCurrencies = []
      // string '[{code,rate},{code,rate},{code,rate}]'
      // array  [{code,rate},{code,rate},{code,rate}]
      //

    if (typeof $application.get().currencies !== 'string') {
      $application.get().currencies = '[]'
    }
    var saved_currencies = JSON.parse($application.get().currencies)

    // scope.currencies.forEach(function(currency){
    for (var k in scope.currencies) {
      var currency = scope.currencies[k]
      saved_currencies.forEach(function(saved_currency) {
        if (saved_currency.code === currency.code) {
          var new_currency_obj = angular.copy(currency)
          new_currency_obj.rate = saved_currency.rate
          scope.activeCurrencies.push(new_currency_obj)
        }
      })
    }
    // })

    /*
     *  Adds a currency and updates app's settings
     */
    scope.addCurrency = function(currency) {
      if (scope.activeCurrencies.map(function(c) {
          return c.code
        }).indexOf(currency.code) > -1) {
        return
      }
      currency.rate = 1
      scope.activeCurrencies.push(currency)

      // saving the new settings configuration
      scope.updateSettings()
    }

    /*
     *  Removes a currency and updates app's settings
     */
    scope.removeCurrency = function(i) {
      scope.activeCurrencies.splice(i, 1)

      // saving the new settings configuration
      scope.updateSettings()
    }

    /*
      There are better APIs for currency exchange, but they are not free.
      Fixer only has a small subset of currencies.
      This is free for 1000 reqs/month
        https://currencylayer.com/product
      This starts from 12$/month and also free for 1000 res/month
      https://openexchangerates.org/signup

      We ended up using Yahoo Finance through Yahoo Query Console.
      It's a bit hacky but its working for now and it is the
      only free service with any exchange rate.
      very gouda.

      Yahoo Finance is DEAD 8 Nov 2017
    */
/*
    function buildURL(from_currency_code, to_currency_code) {
      return 'https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20csv%20where%20url%3D%22http%3A%2F%2Ffinance.yahoo.com%2Fd%2Fquotes.csv%3Fe%3D.csv%26f%3Dnl1d1t1%26s%3D' + from_currency_code + to_currency_code + '%3DX%22%3B&format=json&callback='
    }

    scope.applyExchangeRate = function(currencyToApply) {
      http({
          method: 'GET',
          url: buildURL($application.get().currency_code, currencyToApply.code)
        }).then(function(response) {
          currencyToApply.rate = Number(response.data.query.results.row.col1)
        })
        .catch(function(err) {
          notie.alert(2, "Sorry, we couldn't find exchange rates for for " + currencyToApply.name, 2)
        })
    }*/

    function buildURL(from_currency_code, to_currency_code) {
      return 'https://api.fixer.io/latest?symbols='+to_currency_code+'&base='+from_currency_code
    }

    scope.applyExchangeRate = function(currencyToApply) {
      http({
          method: 'GET',
          url: buildURL($application.get().currency_code, currencyToApply.code)
        }).then(function(response) {
          console.log("LA RISPOSONA DI FIXER",response)
          console.log("Io ")
          currencyToApply.rate = Number(response.data.rates[currencyToApply.code])
        })
        .catch(function(err) {
          notie.alert(2, "Sorry, we couldn't find exchange rates for for " + currencyToApply.name, 2)
        })
    }

    scope.applyAllExchangeRates = function() {
      scope.activeCurrencies.forEach(function(currencyToApply) {
        if (scope.exchangeRates.hasOwnProperty(currencyToApply.code)) {
          currencyToApply.rate = scope.exchangeRates[currencyToApply.code]
        }
      })
    }

    // This is for sorting the locales by name
    function compare(a, b) {
      if (a.name < b.name) {
        return -1
      } else if (a.name > b.name) {
        return 1
      } else {
        return 0
      }
    }

    // Locales are provided by the factory as an object with the code as key
    // For sorting them, we need an array.
    scope.locales = Object.keys(locales)
      .map(function(k) {
        return locales[k]
      })
      .sort(compare)

    if (scope.application.locales === '') {
      scope.activeLocales = []
    } else {
      scope.activeLocales = scope.application.locales.split(',').map(function(code) {
        return locales[code]
      })
    }

    /*
     *  Adds a locale to the app and saves
     */
    scope.addLocale = function(locale) {
      if (scope.activeLocales.map(function(l) {
          return l.code
        }).indexOf(locale.code) > -1) {
        return
      }

      scope.activeLocales.push(locale)

      // saving the new settings configuration
      scope.updateSettings()
    }

    scope.getFlagClassName = function(locale) {
      return 'flag-icon-' + locale.code.slice(-2).toLocaleLowerCase()
    }

    /*
     *  Removes a locale to the app and saves
     */
    scope.removeLocale = function(i) {
      scope.activeLocales.splice(i, 1)

      // saving the new settings configuration
      scope.updateSettings()
    }

    // Let's re-pack the active locales in a single string
    function activeLocalesToString() {
      return scope.activeLocales.map(function(locale) {
          return locale.code
        })
        .join(',')
    }

    function activeCurrenciesToString() {
      return JSON.stringify(scope.activeCurrencies.map(function(c) {
        return {
          code: c.code,
          rate: c.rate
        }
      }))
    }

    scope.updateSettings = function() {
      var payload = {
        locales: activeLocalesToString(),
        currencies: activeCurrenciesToString()
      }

      http({
          method: 'PUT',
          url: '/applications/' + scope.application.id,
          data: payload
        })
        .then(function(response) {
          notie.alert(1, 'Application successfully updated', 1)
          console.log('Setto i locales a ', response.data.data.locales)
          $application.set('locales', response.data.data.locales)
          $application.set('currencies', response.data.data.currencies)
        })
        .catch(function(err) {
          notie.alert(3, 'An error has occurred.')
        })
    }
  }
])