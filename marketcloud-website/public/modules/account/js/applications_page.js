var app = angular.module('ApplicationsPage',[]);
/* jshint asi:true */



app.controller('ApplicationsController',
  ['$scope','$http',function(scope,http){
  scope.showSplashscreen = true;
  //Loading data into the application
  scope.applications = JSON.parse(document.getElementById('JSONListOfApplications').textContent);

  scope.collaborator_applications = JSON.parse(document.getElementById('JSONListOfCollaboratorApplications').textContent);
  scope.showSplashscreen = false;
	scope.current_user = JSON.parse(document.getElementById('JSONUserData').textContent);
  scope.applications.forEach(function(a){
    a.owned = true;
  })
  scope.newApplication = {}
  scope.newKey = {}
  scope.newKeyValidation = {
    name : null,
    access : null
  }
  scope.errorMessage = null
  scope.currentApplication = {}
  scope.deletingAnApp = false;
  scope.creatingAnApp = false;
  scope.appToBeDeleted = null;


  scope.syncApplications = function() {
    http.get('/applications/list')
    .then(function(response){
      scope.applications = response.data.data
    })
    .catch(function(response){
      //console.log("Unable to load applications")
    })
  }





  /**************************************
  COLLABORATORS
  ****************************************/
  scope.newCollaborator = {};
  scope.newCollaboratorValidation = {};

  scope.showCollaboratorsModal = function(app){
    scope.collaboratorsErrorMessage = null;
    scope.currentApplication = app
    scope.currentApplication.collaborators = [];

    http({
      method : "GET",
      url  : '/applications/'+app.id+'/collaborators',
    })
    .then(function(response){
        scope.currentApplication.collaborators = response.data.data;
        $("#manageCollaboratorsModal").modal('show');
    })
    .catch(function(response){
      notie.alert(3,"An error has occurred while loading collaborators.",1);
    })
  }


    scope.syncCollaborators = function() {
    http.get('/applications/'+scope.currentApplication.id+'/collaborators')
    .then(function(response){
      scope.currentApplication.collaborators = response.data.data
    })
    .catch(function(response){
      //console.log("Unable to load collaborators")
    })
  }


  

    scope.deleteCollaborator = function(collaborator) {
      
    scope.collaboratorsErrorMessage = null;
    collaborator.deleting = true
    http.delete('/applications/'+collaborator.application_id+'/collaborators/'+collaborator.email)
    .then(function(response){
      scope.syncCollaborators()
      collaborator.deleting = false;
    })
    .catch(function(response){
      scope.collaboratorsErrorMessage = 'An error has occurred'
      collaborator.deleting = false;
    })
  }

  scope.percentage = function(app) {
    var v = app.api_calls_quota_left;
    var t = app.api_calls_quota_max;
    return (v/t)*100
  }
  scope.createCollaborator = function() {
    
      scope.collaboratorsErrorMessage = null;
      scope.newCollaboratorValidation.email = null

      var regex = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/
    
  if (!regex.test(scope.newCollaborator.email)){
      scope.newCollaboratorValidation.email = false;
      scope.collaboratorsErrorMessage = 'Please insert a valid email address.'
    
    } else {
            scope.creatingNewCollaborator = true;
            var app_id = scope.currentApplication.id
            //console.log("creo questo collaborator",scope.newCollaborator)
           
            http({
              method : "POST",
              url : '/applications/'+app_id+'/collaborators',
              data : scope.newCollaborator
            })
            .then(function(response){
              scope.creatingNewCollaborator = false
              scope.newCollaborator.email = null
              var collaborator = response.data.data;
              scope.currentApplication.collaborators.push(collaborator);
              notie.alert(1,"Collaborator added successfully",1);
            })
            .catch(function(response){
              scope.creatingNewCollaborator = false;

              if (response.status === 400) {
                notie.alert(2,response.data.errors[0].message);
              }

              notie.alert(3,"An error has occurred",1);
            })
    }

  }




  /**************************************
  APPLICATIONS
  ****************************************/
  scope.showApplicationDetails = function(app) {
    scope.errorMessage = null;
    scope.currentApplication = app
    console.log(app)
    scope.currentApplication.created_at = scope.currentApplication.created_at.toString().split('T')[0]
    scope.currentApplication.renew_date = scope.currentApplication.renew_date.toString().split('T')[0]
    
    $("#applicationDetailsModal").modal('show')
  }
  scope.showDeleteApplicationModal = function(app) {
    scope.errorMessage = null;
    $("#deleteApplicationModal").modal('show')
    scope.appToBeDeleted = app;
    
  }
  scope.confirmDeleteApplication = function() {
    scope.errorMessage = null;
    scope.deletingAnApp = true;
    
    http
    .delete('/applications/'+scope.appToBeDeleted.id)
    .then(function(response){
      $("#deleteApplicationModal").modal('hide')
      scope.syncApplications()
      scope.deletingAnApp = false;
    })
    .catch(function(response){
      scope.deletingAnApp =false;
    })
  }

  scope.regenerateKeys = function(app) {
    http
    .put('/applications/'+app.id+'/regenerateKeys')
    .then(function(response){
      console.log(response)
      app.public_key = response.data.data.public_key;
      app.secret_key = response.data.data.secret_key;
    })
    .catch(function(response){
      alert("Error")
    })
  } 
  scope.showUpdateApplicationModal = function(app) {
    scope.applicationUpdate = app;
    scope.errorMessage = null;
    $("#updateApplicationModal").modal('show')

  }
  scope.updateApplication = function() {
          scope.errorMessage = null;
      

      if ('string' !== typeof scope.applicationUpdate.name){
        scope.errorMessage = 'The application name must be a string'
        return
      }
      if (scope.applicationUpdate.name.length < 4 || scope.applicationUpdate.name.length > 250){
        scope.errorMessage = 'The application name must have a number of characters between 4 and 249'
        return
      }

      var payload = {
        name : scope.applicationUpdate.name,
        url : scope.applicationUpdate.url
      }
      scope.updatingAnApp = true;
      http
      .put('/applications/'+scope.applicationUpdate.id,payload)
      .then(function(response){
        scope.syncApplications()
        scope.applicationUpdate = {}
        $("#updateApplicationModal").modal('hide')
        scope.updatingAnApp = false;
      })
      .catch(function(response){
        
        scope.errorMessage = 'An error has occurred, please try again'
        scope.updatingAnApp = false
      })
  }

  scope.createApplication = function() {
      scope.errorMessage = null;
      if ('undefined' !== typeof mixpanel)
        mixpanel.track("click_create_application")

      if ('string' !== typeof scope.newApplication.name){
        scope.errorMessage = 'The application name must be a string'
        return
      }
      if (scope.newApplication.name.length < 4 || scope.newApplication.name.length > 250){
        scope.errorMessage = 'The application name must have a number of characters between 4 and 249'
        return
      }

      
      scope.creatingAnApp = true;
      http
      .post('/applications',scope.newApplication)
      .then(function(response){
        scope.syncApplications()
        scope.newApplication = {}
        $("#createApplicationModal").modal('hide')
        scope.creatingAnApp = false
      })
      .catch(function(response){
        scope.errorMessage = 'An error has occurred, please try again'
        scope.creatingAnApp = false
      })
    }







}])
