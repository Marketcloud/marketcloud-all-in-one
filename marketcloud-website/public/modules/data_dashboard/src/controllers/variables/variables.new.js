var app = angular.module('DataDashboard')
app.controller('CreateVariableController', ['$scope', '$http', '$location', '$marketcloud',
  function (scope, http, location, $marketcloud) {
    scope.variable = {
      type: 'string',
      value: '',
      name: ''
    }

    scope.containerForNewMediaAttribute = []

    scope.containersForExistingMediaAttributes = {}

    scope.$watchCollection('containerForNewMediaAttribute', function () {
      scope.variable.value = scope.containerForNewMediaAttribute[scope.containerForNewMediaAttribute.length - 1]
    })

    scope.availableTypes =
    [
        { type: 'string', label: 'String'},
        { type: 'number', label: 'Number'},
        { type: 'URL', label: 'Url / Media'},
        { type: 'boolean', label: 'True/False'}
    ]

    scope.invalidPropertyName = null
    scope.validationMessage = null
    scope.validate = function () {

    }

    scope.save = function () {
      var payload = angular.copy(scope.variable)
      if (payload.type === 'URL') {
        payload.type = 'string'
      }
      $marketcloud.variables.save(payload)
        .then(function (response) {
          notie.alert(1, 'Variable successfully saved.', 1.5)
          location.path('/variables')
        })
        .catch(function (error) {
          notie.alert(3, 'An error has occurred, please try again.', 1.5)
        })
    }
  }
])
