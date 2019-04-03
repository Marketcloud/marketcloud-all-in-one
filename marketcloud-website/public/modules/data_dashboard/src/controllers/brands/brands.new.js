var app = angular.module('DataDashboard')
app.controller('BrandController', [
  '$scope', 
  '$http', 
  '$marketcloud', 
  '$location',
  '$utils',
  '$validation',
  '$models',
  function(scope, http, $marketcloud, location, $utils, $validation, $models) {


    scope.newBrand = {};

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

    scope.customPropertiesData = {}

    // For imageThumbnail
    scope.removeImage = function(i) {
      scope.newBrand.images.splice(i, 1)
    }


    scope.unsafeSlug = false;

    scope.updateSlug = function() {
      scope.newBrand.slug = $utils.getSlugFromString(scope.newBrand.name)
    }

    scope.saveBrand = function() {
      scope.newBrand.image_url = scope.newBrand.images[0];

      var toSave = angular.copy(scope.newBrand);

      for (var k in scope.customPropertiesData)
        toSave[k] = scope.customPropertiesData[k];

      $marketcloud.brands.save(toSave)
        .then(function(response) {
          notie.alert(1, 'Brand saved', 1.5)
          location.path('/brands')
        })
        .catch(function(response) {

          if (response.status === 400){
            notie.alert(2, 'The data you entered has some errors', 1.5);

            var validation = response.data.errors[0];
            $validation.showErrorMessage(validation,$models.Brand.schema , '[ng-model="newBrand.'+validation.invalidPropertyName+'"]')
          } else 
            notie.alert(3, 'An error has occurred.', 2)
        })
    }
  }
])