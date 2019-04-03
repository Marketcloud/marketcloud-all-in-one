var ImageSelectorControllerDependencies = [
  '$scope', 'FileUploader', '$http', '$element', '$attrs', '$exceptionHandler', '$marketcloud'
]

var ImageSelectorController = function (scope, FileUploader, $http, $element, $attrs, $exceptionHandler, $marketcloud) {
  var ctrl = null
  this.$onInit = function () {
    // Reference to the controller
    ctrl = this

    // List of image urls
    ctrl.images = ctrl.images || []

    // List of image objects
    // ctrl.media = ctrl.media || [];

    scope.closeOnUploadComplete = $attrs.closeOnUploadComplete

    /* Component configuration from attributes */
    // The classes used to style the button
    scope.buttonClass = $attrs.buttonClass

    // The text displayed on the button
    scope.buttonText = $attrs.buttonText

    // The icon displayed on the button
    scope.buttonIcon = $attrs.buttonIcon || null

    var tabs = $attrs.tabs || 'library,from_disk,from_url'

    // This will hold an array of tab names
    // The component will show only those tabs
    // whose name is in this array
    //
    // The first tab will be the active one.
    // TODO to improve this, we can add an attribute "activeTab"

    scope.tabs = tabs.split(',')

    // This is the name of the parent function which will return a reference to the image container
    // scope.getImagesContainer = $attrs.getImagesContainer || 'getImagesContainer';
  }

  /* Uploader configuration */
  scope.uploader = new FileUploader({
    url: window.API_BASE_URL + '/media',
    arrayKey: '',
    headers: {
      'Authorization': window.public_key + ':' + window.token
    },
    filters: []
  })

  // When closeDialog is called from within the component
  // we notify the parent component/controller by calling the on-close-dialog
  // callback
  scope.closeDialog = function () {
    ctrl.onCloseDialog()
  }

  scope.openDialog = function () {
    ctrl.onOpenDialog()
  }

  scope.uploadImages = function () {
    ctrl.onUploadImages()
  }

  scope.image = {}
  scope.media_files = []
  scope.loadingMediaFiles = false

  // Used to keep filters and pagination state
  scope.query = {}

  // Initializing the pagination object to null
  // This allows for convenient check on view pagination === null => dont show pagination
  scope.pagination = null

  scope.loadMedias = function (query) {
    scope.media_files = []
    scope.loadingMediaFiles = true
    /* $http({
        method: 'GET',
        url: window.API_BASE_URL + '/media',
        headers: {
          Authorization: window.public_key
        }
      }) */
    $marketcloud.media.list(query || {})
      .then(function (response) {
        scope.loadingMediaFiles = false
        scope.media_files = response.data.data

        scope.pagination = {
          currentPage: response.data.page,
          numberOfPages: response.data.pages,
          nextPage: response.data._links.next || null,
          previousPage: response.data._links.prev || null,
          count: response.data.count
        }
      })
      .catch(function (response) {
        scope.loadingMediaFiles = false
        notie.alert(2, 'An error has occurred, please retry.', 1.5)
      })
  }

  scope.loadPage = function (page_number) {
    scope.query.page = page_number
    return scope.loadData()
  }

  scope.loadMore = function () {
    var pageToFetch = scope.media_files.length / 20 + 1
    $marketcloud.media.list({ page: pageToFetch })
      .then(function (response) {
        scope.loadingMediaFiles = false

        scope.media_files = scope.media_files.concat(response.data.data)
      })
      .catch(function (response) {
        scope.loadingMediaFiles = false
        notie.alert(2, 'An error has occurred, please retry.', 1.5)
      })
  }
  scope.loadData = function (query) {
    scope.media_files = []
    scope.loadingMediaFiles = true

    if (!query) { query = scope.query || {} }

    $marketcloud.media
      .list(query)
      .then(function (response) {
        scope.loadingMediaFiles = false
        scope.media_files = response.data.data

        scope.pagination = {
          currentPage: response.data.page,
          numberOfPages: response.data.pages,
          nextPage: response.data._links.next || null,
          previousPage: response.data._links.prev || null,
          count: response.data.count
        }
      })
      .catch(function (response) {
        scope.loadingMediaFiles = false
        notie.alert(3, 'An error has occurred. Please try again.', 1.5)
      })
  }

  // Calling it right now because we want to initialize the media library
  if (scope.media_files.length === 0) {
    scope.loadMedias()
  }

  scope.showProgressBar = false
  scope.uploadingImages = false

  scope.howManySelectedMedia = function () {
    return ctrl.images.length
  }

  scope.addSelectedFromLibrary = function () {
    var modal = $element.find('#ImageSelectorModal')
    $(modal).modal('hide')
    /* $('#ImageSelectorModal').modal('hide') */
  }

  scope.isImageSelected = function (image) {
    return ctrl.images.indexOf(image.url) > -1
  }
  scope.selectImage = function (image) {
    ctrl.image = image.url
    scope.closeDialog()
    var modal = $element.find('#ImageSelectorModal')
    $(modal).modal('hide')
  }

  var removeImage = function (image) {
    // var pos = scope.$parent[scope.getImagesContainer]().indexOf(image.url);
    var pos = ctrl.images.indexOf(image.url)
    if (pos > -1) {
      ctrl.images.splice(pos, 1)
    }

    // Rimuovo il media
    /* for (var i =0; i< ctrl.media.length;i++) {
      if (ctrl.media[i].url === image.url)
        ctrl.media.splice(i,1);
    } */
  }

  scope.uploader.onCompleteAll = function () {
    scope.loadMedias()
    scope.showProgressBar = false
    scope.uploadingImages = false
    scope.uploader.clearQueue()

    // Checking if we need to close the dialog
    if (scope.closeOnUploadComplete === 'true') {
      scope.closeDialog()
      /* $('#ImageSelectorModal').modal('hide') */
      var modal = $element.find('#ImageSelectorModal')
      $(modal).modal('hide')
    }

    if (ctrl.onUploadComplete) {
      ctrl.onUploadComplete()
    }
  }

  scope.uploader.onProgressAll = function (progress) {

  }

  scope.uploader.onErrorItem = function (item, response, status, headers) {
    var err = new Error('Error uploading an item')
    err.response = response
    err.status = status
    err.headers = headers
    $exceptionHandler(err)
  }

  scope.chooseFileFromStorage = function () {
    $('#chooseFileFromStorageButton').trigger('click')
  }

  scope.uploadSelectedImages = function () {
    scope.showProgressBar = true
    scope.uploadingImages = true
    scope.uploader.uploadAll()
  }

  scope.addImageFromUrl = function () {
    ctrl.images.push(scope.image.url)
    // scope.$parent[scope.getImagesContainer]().push(scope.image.url);
    scope.image.url = null
  }

  scope.showImageSelectorModal = function () {
    /* $('#ImageSelectorModal').modal('show') */
    var modal = $element.find('#ImageSelectorModal')
    $(modal).modal('show')

    // Notifying the parent
    scope.openDialog()
  }
}

ImageSelectorController.$inject = ImageSelectorControllerDependencies

angular.module('DataDashboard')
  .controller('ImageSelectorController', ImageSelectorController)

angular.module('DataDashboard')
  .component('imageSelector', {
    templateUrl: '/modules/data_dashboard/src/components/imageSelector/imageSelector.component.html',
    controller: 'ImageSelectorController',
    bindings: {
      onCloseDialog: '&',
      onOpenDialog: '&',
      onUploadComplete: '&',
      image: '=?',
      buttonClass: '@',
      buttonIcon: '@',
      buttonText: '@',
      closeOnUploadComplete: '@'
    }
  })
