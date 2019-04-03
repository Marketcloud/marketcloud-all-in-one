var app = angular.module('DataDashboard')
app.controller('ContentsController',
  [
    '$scope',
    '$http',
    'contents',
    '$marketcloud',
    function (scope, http, resources, $marketcloud) {
			// Pagination
      scope.pagination = {
        currentPage: resources.data.page,
        numberOfPages: resources.data.pages,
        nextPage: resources.data._links.next || null,
        previousPage: resources.data._links.prev || null,
        count: resources.data.count
      }

			// Query
      scope.query = {
        per_page: 20
      }

			// Initial data resolved from the router
      scope.contents = resources.data.data

      scope.loadPage = function (p) {
        return scope.loadData({page: p})
      }
      scope.loadData = function (query) {
        if (!query) {
          query = scope.query
        }

        $marketcloud.contents.list(query)
					.then(function (response) {
  scope.contents = response.data.data

  scope.pagination = {
    currentPage: response.data.page,
    numberOfPages: response.data.pages,
    nextPage: response.data._links.next || null,
    previousPage: response.data._links.prev || null,
    count: response.data.count
  }
})
					.catch(function (response) {
  notie.alert(3, 'An error has occurred. Please try again.', 1.5)
})
      }
      scope.setPublishing = function (content) {
        return http({
          method: 'PUT',
          url: API_BASE_URL + '/contents/' + content.id,
          data: {
            published: content.published
          },
          headers: {
            Authorization: window.public_key + ':' + window.token
          }

        })
				.then(function (response) {
  notie.alert(1, 'Updated!', 1.5)
})
				.catch(function (response) {
  notie.alert(3, 'An error has occurred, please try again.', 1.5)
})
      }

      scope.deleteContent = function (content_id, index) {
        $marketcloud.contents.delete(content_id)
					.then(function (response) {
  scope.loadData({
    page: 1
  })
  notie.alert(1, 'Content deleted', 1.5)
})
					.catch(function (response) {
  notie.alert(3, 'An error has occurred.Please try again.', 1.5)
})
      }
    }
  ])
