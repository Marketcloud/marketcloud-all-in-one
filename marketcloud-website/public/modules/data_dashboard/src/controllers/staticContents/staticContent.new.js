var app = angular.module('DataDashboard')
app.controller('CreateStaticContentController', [
  '$scope',
  '$http',
  '$location',
  '$marketcloud',
  '$utils',
  '$validation',
  '$models',
  function(scope, http, location, $marketcloud, $utils, $validation, $models) {


    scope.content = {
     name : '',
     content : ''
    }


    // This function is invoked when a seo property
    // changes.
    scope.computeSeoTags = function() {

    }

    scope.unsafeSlug = false
    scope.updateSlug = function() {
      scope.content.slug = $utils.getSlugFromString(scope.content.title)
    }
    scope.saveContent = function() {
      $validation.hideErrors()
      $marketcloud.staticContents.save(scope.content)
        .then(function(response) {
          // title text author
          notie.alert(1, 'Static content saved', 2)
          location.path('/contents/static')
        })
        .catch(function(response) {

          if (response.status === 400) {
            notie.alert(2, 'The data you entered has some errors', 1.5);

            var validation = response.data.errors[0];
            var selector = '[ng-model="content.' + validation.invalidPropertyName + '"]';

            if (angular.element(selector).length === 0)
              selector = '[validate-for="' + validation.invalidPropertyName + '"]'

            $validation.showErrorMessage(validation, $models.StaticContent.schema, selector)
          } else
            notie.alert(3, 'An error has occurred.', 2)
        })
    }
  }
])