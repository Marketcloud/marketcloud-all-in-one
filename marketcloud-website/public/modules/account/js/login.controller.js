var app = angular.module('Marketcloud.Account')



app.controller('FormController',['$scope','$http',function(scope,http){

  scope.waitingForResponse = false;
  scope.errorMessage = null;
  scope.credentials = {
    email : "",
    password : ""
  }
  scope.login = function() {
    if ('undefined' !== typeof mixpanel)
      mixpanel.track('login_attempt',{
        email : scope.credentials.email
      })
    scope.waitingForResponse = true;
    http.post('/account/login',scope.credentials)
    .then(function(response){
      scope.waitingForResponse = false;
      location.href = '/applications'
    })
    .catch(function(response){
      scope.waitingForResponse = false;
      switch (response.data.errors[0].code) {
        case 401:
          scope.errorMessage = 'Invalid credentials';
          notie.alert(2,scope.errorMessage);
          break;
        default:
          scope.errorMessage = 'Unknown message, please try again.';
          notie.alert(2,scope.errorMessage);
        break;
      }
    })
  }


  scope.loginAndRedirect = function() {

    
    scope.waitingForResponse = true;
    http.post('/account/login',scope.credentials)
    .then(function(response){
      scope.waitingForResponse = false;
      location.href = '/applications/'+window.application_id+'/dashboard';
    })
    .catch(function(response){
      scope.waitingForResponse = false;
      switch (response.data.errors[0].code) {
        case 401:
          scope.errorMessage = 'Invalid credentials';
          notie.alert(2,scope.errorMessage);
          break;
        default:
          scope.errorMessage = 'Unknown message, please try again.';
          notie.alert(2,scope.errorMessage);
        break;
      }
    })
  }



}]);



app.controller('PasswordRecoveryForm',['$scope','$http',function(scope,http){

  scope.waitingForResponse = false;
  scope.errorMessage = null;
  scope.credentials = {
    email : "",
    password : ""
  }
  scope.recoverPassword = function() {
    if ('undefined' !== typeof mixpanel)
      mixpanel.track('password_recovery_request',{
        email : scope.credentials.email
      })
    scope.waitingForResponse = true;
    http.post('/account/recover',scope.credentials)
    .then(function(response){
      scope.waitingForResponse = false;
      scope.recovered = true;
    })
    .catch(function(response){
      scope.waitingForResponse = false;
      //console.log(response)
      switch (response.errors[0].code) {
        case 404:
          scope.errorMessage = 'Email not found'
          break;
        default:
          scope.errorMessage = 'Unknown error, please try again.'
        break;
      }
    })
  }

}]);