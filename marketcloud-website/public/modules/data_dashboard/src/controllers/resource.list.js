var app = angular.module('DataDashboard')

app.controller('ListResourcesController', [
  '$scope',
  'resources',
  'resourceName',
  '$q',
  '$marketcloud',
  'dependencies',
  '$utils',
  function(scope, resources, resource_name, $q, $marketcloud, $dependencies, $utils) {
    scope.resources = resources.data.data
    scope.dependencies = {}

    scope.$dependencies = $dependencies

    scope.pagination = $utils.getPaginationFromHTTPResponse(resources);

    scope.query = {
      per_page: 20
    }

    scope.prepareRegex = function() {
      for (var k in scope.query) {
        if (typeof scope.query[k] === 'object' && scope.query[k].hasOwnProperty('$regex')) {
          scope.query[k]['$options'] = 'i'
        }
      }
    }

    scope.toggleAll = function() {
      scope.resources.forEach(function(p) {
        p.selected = scope.selectAll
      })
    }

    scope.getSelectedItems = function() {
      return scope.resources.filter(function(p) {
        return p.selected === true
      })
    }

    scope.update = function(id, update) {
      return $marketcloud[resource_name].update(id, update)
        .then(function(response) {
          notie.alert(1, 'Item updated.', 1.5)
        })
        .catch(function(error) {
          notie.alert(3, 'An error has occurred, please try again.', 1.5)
        })
    }

    scope.bulkDelete = function() {
      notie.confirm('Delete ' + scope.getSelectedItems().length + ' items?', 'Delete', 'Cancel', function() {
        var defer = $q.defer()

        var promises = []

        scope
          .getSelectedItems()
          .forEach(function(item) {
            promises.push($marketcloud[resource_name].delete(item.id))
          })

        $q.all(promises)
          .then(function() {
            notie.alert(1, 'All items have been deleted', 1.5)
            scope.loadData()
          })

        return defer.promise
      })
    }
    scope.bulkUpdate = function(update) {
      notie.confirm('Update ' + scope.getSelectedItems().length + ' items?', 'Update', 'Cancel', function() {
        var defer = $q.defer()

        var promises = []



        scope
          .getSelectedItems()
          .forEach(function(item) {
            promises.push($marketcloud[resource_name].update(item.id, update))
          })

        $q.all(promises)
          .then(function() {
            notie.alert(1, 'All items have been updated', 1.5)
            scope.loadData()
          })

        return defer.promise
      })
    }

    scope.bulkJSONExport = function() {
      // If there are no selected items, we export the whole current view
      if (scope.getSelectedItems().length === 0)
        return $utils.exportAsJSON(scope.resources);

      $utils.exportAsJSON(scope.getSelectedItems());
    }



    scope.toggle = function(resource) {
      $marketcloud[resource_name].update(resource.id, resource)
        .then(function(response) {
          notie.alert(1, 'Update successful', 1.5)
        })
        .catch(function(error) {
          notie.alert(3, 'An error has occurred, please try again.', 1.5)
        })
    }

    scope.loadPage = function(page_number) {
      scope.query.page = page_number
      return scope.loadData()
    }

    scope.resetQuery = function() {
      var currentPage = scope.query.page || 1
      scope.query = {
        per_page: 20,
        page: currentPage
      }
    }
    scope.loadData = function(query) {



      if (query) {
        if ("object" !== typeof query)
          throw new TypeError("loadData(query) query must be an object of filters");

        for (var k in query)
          scope.query[k] = query[k];
      }



      if ($dependencies.queryOverrides) {
        for (var k in $dependencies.queryOverrides)
          scope.query[k] = $dependencies.queryOverrides[k];
      }
      
      return $marketcloud[resource_name]
        .list(scope.query)
        .then(function(response) {

          scope.resources = response.data.data

          scope.pagination = $utils.getPaginationFromHTTPResponse(response);

        })
        .catch(function(response) {
          notie.alert(3, 'An error has occurred. Please try again.', 1.5)
        })
    }

    scope.delete = function(resource_id, index) {
      $marketcloud[resource_name].delete(resource_id)
        .then(function(response) {
          scope.loadData()
          notie.alert(1, 'Item deleted', 1.5)
        })
        .catch(function(response) {
          notie.alert(3, 'An error has occurred.Please try again.', 1.5)
        })
    }



    /************************************************************
     *                        DUPLICATE
     **************************************************************/
    scope.clone = function(instance) {

      var toSave = angular.copy(instance)
      delete toSave.id
      delete toSave._id

      if (toSave.name)
        toSave.name += ' (Copy)'
      else if (toSave.title)
        toSave.title += ' (Copy)'


      $marketcloud[resource_name].save(toSave)
        .then(function(response) {
          scope.loadData();
          notie.alert(1, "Item successfully cloned", 1.5)
        })
        .catch(function(response) {
          notie.alert(3, 'An error has occurred. Please try again.', 1.5)
        })
    }



  }
])