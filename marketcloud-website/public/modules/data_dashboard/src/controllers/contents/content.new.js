var app = angular.module('DataDashboard')
app.controller('ContentController', [
  '$scope',
  '$http',
  '$location',
  '$marketcloud',
  '$utils',
  '$validation',
  '$models',
  '$account',
  function(scope, http, location, $marketcloud, $utils, $validation, $models, $account) {


    scope.content = {
      title: '',
      slug: '',
      text: '',
      published: false,
      author: {
        name: $account.get('full_name'),
        description: '',
        images: [$account.get('image_url')]

      },
      seo: {
        meta: {},
        twitter: {},
        facebook: {}
      }
    }

    scope.customPropertiesData = {}

    // This method must be implemented in order to
    // make the media manager work
    scope.getImagesContainer = function() {
      return scope.content.author.images
    }

    scope.removeImage = function(i) {
      scope.content.author.images.splice(i, 1)
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
      for (var k in scope.customPropertiesData) {
        scope.content[k] = scope.customPropertiesData[k]
      }
      console.log("Salvo questo",scope.content)
      $validation.hideErrors()
      $marketcloud.contents.save(scope.content)
        .then(function(response) {
          // title text author
          notie.alert(1, 'Content saved', 2)
          location.path('/contents')
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