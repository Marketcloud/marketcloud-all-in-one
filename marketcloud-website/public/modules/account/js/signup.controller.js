var app = angular.module('Marketcloud.Account')


app.controller('SignupFormController', ['$scope', '$http', function(scope, http) {
  scope.account = {
    password: '',
    confirm_password: '',
    email: '',
    subscribe_newsletter: true
  }
  scope.waitingForResponse = false;
  scope.acceptToU = true;
  scope.showSuccessMessage = false;
  scope.signupErrorMessage = null;
  scope.validation = {
    email: null,
    password: null,
    confirm_password: null
  };

  function hasDigit(s) {
    return s.split('').some(function(el) {
      return !isNaN(el)
    })
  }

  scope.createAccount = function() {
    scope.signupErrorMessage = null;
    var email_regex = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;

    if (!email_regex.test(scope.account.email)) {
      scope.validation.email = false;
      scope.signupErrorMessage = 'The email address is not valid';
      return notie.alert(2, scope.signupErrorMessage);
    } else
      scope.validation.email = true;



    if (scope.account.password.length < 5) {
      scope.signupErrorMessage = 'Password is too short';
      notie.alert(2, scope.signupErrorMessage);
      return scope.validation.password = false;
    } else if (scope.account.password.length > 253) {
      scope.signupErrorMessage = 'Password is too long';
      notie.alert(2, scope.signupErrorMessage);
      return scope.validation.password = false;
    } else if (!hasDigit(scope.account.password)) {
      scope.signupErrorMessage = 'Password must contain numbers and letters.';
      notie.alert(2, scope.signupErrorMessage);
      return scope.validation.password = false;
    } else {
      scope.validation.password = true;
    }


    if (scope.account.password !== scope.account.confirm_password) {
      scope.signupErrorMessage = 'The password confirm is wrong.';
      notie.alert(2, scope.signupErrorMessage);
      return scope.validation.confirm_password = false;
    } else {
      scope.validation.confirm_password = true;
    }

    if (scope.validation.email === true &&
      scope.validation.password === true &&
      scope.validation.confirm_password === true) {
      scope.waitingForResponse = true;
      http.post('/account', scope.account)
        .then(function(response) {
          scope.showSuccessMessage = true;
          scope.waitingForResponse = false;
          mixpanel.identify(scope.account.email);
          mixpanel.track("create_account", {
            "referrer": document.referrer,
            "$email": scope.account.email,
            "newsletter": scope.account.subscribe_newsletter
          });
          ga('send', 'event', 'button', 'click', 'CreateNewAccount');
        })
        .catch(function(response) {
          scope.waitingForResponse = false
          switch (response.errors[0].message) {
            case 'EMAIL_EXISTS':
              scope.validation.email = false;
              scope.signupErrorMessage = 'The email is already taken. Try to log in.'
              notie.alert(2, scope.signupErrorMessage);
              break;
            case 'INVALID_EMAIL':
              scope.validation.email = false;
              scope.signupErrorMessage = 'The email is invalid.'
              notie.alert(2, scope.signupErrorMessage);
              break;
            case 'INVALID_CONFIRMATION_PASSWORD':
              scope.validation.password = false;
              scope.signupErrorMessage = 'Passwords don\'t match.';
              notie.alert(2, scope.signupErrorMessage);
              break;

          }
        })

    }



  };

}]);

