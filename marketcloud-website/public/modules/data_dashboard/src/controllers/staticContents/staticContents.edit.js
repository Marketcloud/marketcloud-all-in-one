var app = angular.module('DataDashboard')

app.controller('EditStaticContentController', [
  '$scope',
  '$http',
  'content',
  '$location',
  '$marketcloud',
  'moment',
  '$utils',
  '$validation',
  '$models',
  function(scope, http, content, location, $marketcloud, $moment, $utils, $validation, $model) {
    scope.content = content.data.data





    scope.unsafeSlug = false
    scope.updateSlug = function() {
      scope.content.slug = $utils.getSlugFromString(scope.content.title)
    }

    scope.getImagesContainer = function() {
      return scope.content.author.images
    }



    scope.updateContent = function() {
      $marketcloud.staticContents.update(scope.content.id, scope.content)
        .then(function(response) {
          notie.alert(1, 'Content updated with success', 1.5)
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