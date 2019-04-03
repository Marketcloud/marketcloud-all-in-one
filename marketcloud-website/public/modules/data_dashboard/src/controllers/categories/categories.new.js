var app = angular.module('DataDashboard')

app.controller('CategoryController', 
  [
  '$scope', 
  '$http', 
  '$marketcloud', 
  '$location',
  '$utils',
  '$validation',
  '$models',
  function(scope, http, $marketcloud, location, $utils, $validation, $models) {

    scope.customPropertiesData = {};
    scope.newCategory = {};


    scope.categories = []
      // Loading categories
    $marketcloud.categories.list()
      .then(function(response) {
        scope.categories = response.data.data
      })
      .catch(function() {
        notie.alert(3, 'An error has occurred. Please retry', 1.5)
      })



    // mapping non-core attributes into scope.customPropertiesData
    var coreProperties = $models.Category.getPropertyNames()

    coreProperties.push(
      'id',
      'locales',
      'seo',
      'application_id',
      'images',
      'slug',
      'parent_id',
      'path',
      'updated_at',
      'created_at'
    )

    

    // For image thumbnails
    scope.removeImage = function(i) {
      scope.newCategory.images.splice(i, 1)
    }

    scope.saveCategory = function() {
      scope.newCategory.image_url = scope.newCategory.images[0]
      
      var toSave = angular.copy(scope.newCategory);

      for (var k in scope.customPropertiesData)
        toSave[k] = scope.customPropertiesData[k];

      $marketcloud.categories.save(toSave)
        .then(function(response) {
          notie.alert(1, 'Category saved', 1.5)
          location.path('/categories')
        })
        .catch(function(response) {

          if (response.status === 400) {
            notie.alert(2, 'The data you entered has some errors', 1.5);

            var validationObject = response.data.errors[0];
            var invalidPropertyName = validationObject.invalidPropertyName;

            $validation.showErrorMessage(validationObject,$models.Category.schema , '[ng-model="newCategory.'+invalidPropertyName+'"]')


          } else {
            notie.alert(3, 'An error has occurred. Please try again', 1.5)
          }

        })
    }

    
    scope.unsafeSlug = false

    scope.updateSlug = function() {
      scope.newCategory.slug = $utils.getSlugFromString(scope.newCategory.name)
    }
  }
])