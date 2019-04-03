var app = angular.module('DataDashboard')
app.controller('EditVariableController',
  ['$scope', '$http', '$location', '$marketcloud', 'variable',
    function (scope, http, location, $marketcloud, variable) {
      scope.variable = variable.data.data

      function isURL (s) {
        if (typeof s !== 'string') { return false }
        if (typeof s.indexOf !== 'function') { return false }
        return s.indexOf('http://') === 0
      }

      if (isURL(scope.variable.value)) {
        scope.variable.type = 'URL'
      }

      scope.containerForNewMediaAttribute = []

      scope.containersForExistingMediaAttributes = {}

      scope.$watchCollection('containerForNewMediaAttribute', function () {
        if (scope.containerForNewMediaAttribute[scope.containerForNewMediaAttribute.length - 1]) {
          scope.variable.value = scope.containerForNewMediaAttribute[scope.containerForNewMediaAttribute.length - 1]
        }
      })

      if (isURL(scope.variable.value) === true) {
        scope.containersForExistingMediaAttributes['value'] = [scope.variable.value]
        scope.$watchCollection('containersForExistingMediaAttributes.value', function () {
          // If the value is null, it means that we just deleted it, so we don't have to re-update it
          if (scope.variable.value === null) {
            return
          }
          if (scope.containersForExistingMediaAttributes['value']) {
            scope.variable.value = scope.containersForExistingMediaAttributes['value'][scope.containersForExistingMediaAttributes['value'].length - 1]
          }
        })
      }

      scope.availableTypes =
      [
        { type: 'string', label: 'String' },
        { type: 'number', label: 'Number' },
        { type: 'URL', label: 'Url / Media' },
        { type: 'boolean', label: 'True/False' }
      ]

      scope.invalidPropertyName = null
      scope.validationMessage = null
      scope.validate = function () {

      }

      scope.update = function () {
        var payload = angular.copy(scope.variable)

        if (payload.type === 'URL') {
          payload.type = 'string'
        }
        $marketcloud.variables.update(scope.variable.id, payload)
        .then(function (response) {
          notie.alert(1, 'Variable successfully saved.', 1.5)
        })
        .catch(function (error) {
          notie.alert(3, 'An error has occurred, please try again.', 1.5)
        })
      }
    }
  ])
