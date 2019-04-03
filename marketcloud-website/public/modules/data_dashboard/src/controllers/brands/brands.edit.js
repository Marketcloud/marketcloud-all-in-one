var app = angular.module('DataDashboard')

app.controller('EditBrandController', [
  '$scope',
  '$http',
  'brand',
  '$location',
  '$marketcloud',
  '$utils',
  '$validation',
  '$models',
  function(scope, http, brandResponse, location, $marketcloud, $utils, $validation,$models) {
    scope.brand = brandResponse.data.data

    // mapping non-core attributes into scope.customPropertiesData
    var coreProperties = Models.Brand.getPropertyNames()

    coreProperties.push(
      'id',
      'locales',
      'seo',
      'application_id',
      'images',
      'slug',
      'updated_at',
      'created_at'
    )

    scope.customPropertiesData = {};


    for (var k in scope.brand){
      if (coreProperties.indexOf(k) === -1){
        scope.customPropertiesData[k] = scope.brand[k]
        delete scope.brand[k];
      }
    }

    scope.removeImage = function(i) {
      scope.brand.images.splice(i, 1)
    }

    scope.updateBrand = function() {
      scope.brand.image_url = scope.brand.images[0]

      var toSave = angular.copy(scope.brand);

      for (var k in scope.customPropertiesData)
        toSave[k] = scope.customPropertiesData[k];


      $marketcloud.brands.update(scope.brand.id, toSave)
        .then(function(response) {
          notie.alert(1, 'Brand successfully update.', 1.5)
        })
        .catch(function(response) {

          if (response.status === 400){
            notie.alert(2, 'The data you entered has some errors', 1.5);

            var validation = response.data.errors[0];
            $validation.showErrorMessage(validation,$models.Brand.schema , '[ng-model="brand.'+validation.invalidPropertyName+'"]')
          } else 
            notie.alert(3, 'An error has occurred.', 2)
        })
    }


    scope.unsafeSlug = false

    scope.updateSlug = function() {
      scope.brand.slug = $utils.getSlugFromString(scope.brand.name)
    }
  }
])