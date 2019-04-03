var app = angular.module('DataDashboard')

app.controller('EditCategoryController', 
  [
    '$scope', 
    '$http', 
    'category', 
    '$location', 
    '$marketcloud',
    '$utils',
    '$validation',
    '$models',
  function(scope, http, category, location, $marketcloud, $utils, $validation, $models) {
    scope.loadingData = true

    scope.category = category.data.data

    scope.categories = [];

    // mapping non-core attributes into scope.customPropertiesData
    var coreProperties = Models.Brand.getPropertyNames()

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

    scope.customPropertiesData = {};


    for (var k in scope.category){
      if (coreProperties.indexOf(k) === -1){
        scope.customPropertiesData[k] = scope.category[k]
        delete scope.category[k];
      }
    }

    // For image thumbnail
    scope.removeImage = function(i) {
      scope.category.images.splice(i, 1)
    }

    // Loading categories
    $marketcloud.categories.list()
      .then(function(response) {
        scope.categories = response.data.data
      })
      .catch(function() {
        notie.alert(2, 'An error has occurred while loading categories', 1.5)
      })

    scope.updateCategory = function() {
      scope.category.image_url = scope.category.images[0]

      var toSave = angular.copy(scope.category);

      for (var k in scope.customPropertiesData) {
        toSave[k] = scope.customPropertiesData[k];
      }

      $marketcloud.categories.update(category.data.data.id, toSave)
        .then(function(response) {
          notie.alert(1, 'Category updated with success ', 2)
          location.path('/categories')
        })
        .catch(function(response) {

          if (response.status === 400){
            notie.alert(2, 'The data you entered has some errors', 1.5);

            var validation = response.data.errors[0];
            $validation.showErrorMessage(validation,$models.Category.schema , '[ng-model="category.'+validation.invalidPropertyName+'"]')
          } else 
            notie.alert(3, 'An error has occurred.', 2)
        })
    }

    
    scope.unsafeSlug = false

    scope.updateSlug = function() {
      scope.category.slug = $utils.getSlugFromString(scope.category.name)
    }
  }
])