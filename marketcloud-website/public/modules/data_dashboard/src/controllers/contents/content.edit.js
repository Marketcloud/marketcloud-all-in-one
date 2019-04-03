var app = angular.module('DataDashboard')

app.controller('EditContentController', [
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

    scope.content.date = $moment(scope.content.date);

    // mapping non-core attributes into scope.customPropertiesData
    var coreProperties = Models.Content.getPropertyNames()

    coreProperties.push(
      'id',
      'locales',
      'seo',
      'application_id',
      'images',
      'slug',
      'published',
      'category',
      'date',
      'updated_at',
      'created_at',
      'type'
    )

    scope.customPropertiesData = {};


    for (var k in scope.content){
      if (coreProperties.indexOf(k) === -1){
        scope.customPropertiesData[k] = scope.content[k]
        delete scope.content[k];
      }
    }



    scope.unsafeSlug = false
    scope.updateSlug = function() {
      scope.content.slug = $utils.getSlugFromString(scope.content.title)
    }

    scope.getImagesContainer = function() {
      return scope.content.author.images
    }

    scope.removeImage = function(i) {
      scope.content.author.images.splice(i, 1)
    }

    scope.updateContent = function() {
      var toSave = angular.copy(scope.content);

      for (var k in scope.customPropertiesData) {
        toSave[k] = scope.customPropertiesData[k];
      }
      $marketcloud.contents.update(scope.content.id, toSave)
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

            $validation.showErrorMessage(validation, $models.Content.schema, selector)
          } else
            notie.alert(3, 'An error has occurred.', 2)
        })
    }
  }
])