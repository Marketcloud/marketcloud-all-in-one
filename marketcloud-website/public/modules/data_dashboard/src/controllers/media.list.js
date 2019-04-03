var app = angular.module('DataDashboard')

app.controller('MediaListController', ['$scope', '$http', 'media', '$marketcloud', '$q',
  function(scope, http, resources, $marketcloud, $q) {
    // Pagination
    scope.pagination = {
      currentPage: resources.data.page,
      numberOfPages: resources.data.pages,
      nextPage: resources.data._links.next || null,
      previousPage: resources.data._links.prev || null,
      count: resources.data.count
    }


    scope.inspectFile = function(file) {
      scope.inspectedFile = file;
      $("#inspectFileModal").modal("show");
    }

    scope.formatFileSize = function(file) {
      if (!file)
        return "";

      var size = Number(file.size);
      var formatted = size + "b";

      var kb = 1000;
      var mb = kb * 1000;
      var gb = mb * 1000;

      if (size > kb && size < mb) {
        // Kilobytes
        size = (size / kb).toFixed(2);
        return String(size) + " KB"
      } else if (size > mb && size < gb) {
        // Megabytes
        size = (size / mb).toFixed(2);
        return String(size) + " MB"
      } else {
        size = (size / gb).toFixed(2);
        return String(size) + " GB";
      }
    }

    // Query
    scope.query = {
      per_page: 20
    }

    scope.prepareRegex = function() {
      scope.query.name.$options = 'i'
    }
    scope.toggleAll = function() {
      scope.media.forEach(function(p) {
        p.selected = scope.selectAll
      })
    }

    scope.getSelectedItems = function() {
      return scope.media.filter(function(p) {
        return p.selected === true
      })
    }

    scope.bulkDelete = function() {
      notie.confirm('Delete ' + scope.getSelectedItems().length + ' items?', 'Delete', 'Cancel', function() {
        var defer = $q.defer()

        var promises = []

        scope
          .getSelectedItems()
          .forEach(function(item) {
            promises.push($marketcloud.media.delete(item.id))
          })

        $q.all(promises)
          .then(function() {
            notie.alert(1, 'All items have been deleted', 1.5)
            scope.loadPage(scope.currentPage)
          })

        return defer.promise
      })
    }

    // Initial data resolved from the router
    scope.media = resources.data.data

    // This method must be implemented in order to
    // make the media manager work
    scope.getImagesContainer = function() {
      return scope.media
    }

    scope.loadPage = function(page) {
      scope.query.page = page
      return scope.loadData({
        page: page
      })
    }

    scope.loadData = function(query) {
      if (!query) {
        query = scope.query
      }

      return $marketcloud.media.list(query)
        .then(function(response) {
          scope.pagination = {
            currentPage: response.data.page,
            numberOfPages: response.data.pages,
            nextPage: response.data._links.next || null,
            previousPage: response.data._links.prev || null,
            count: response.data.count
          }

          scope.media = response.data.data
        })
        .catch(function(response) {
          notie.alert(3, 'An error has occurred. Please try again.', 1.5)
        })
    }


    scope.updateInspectedFile = function(){
      console.log("Saving this",scope.inspectedFile)
      $marketcloud.media.update(scope.inspectedFile.id,{name : scope.inspectedFile.name})
      .then(function(response){
        notie.alert(1, 'File updated', 1.5)
      })
      .catch(function(error){
        notie.alert(3, 'An error has occurred. Please retry.', 1.5)
      })
    }

    scope.deleteMedia = function(media_id, index) {
      $marketcloud.media.delete(media_id)
        .then(function(response) {
          scope.loadData({
            page: scope.currentPage
          })
          notie.alert(1, 'Media deleted', 1.5)
        })
        .catch(function(response) {
          notie.alert(3, 'An error has occurred.Please try again.', 1.5)
        })
    }
  }
])