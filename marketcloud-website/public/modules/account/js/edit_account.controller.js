var app = angular.module('Marketcloud.Account')

app.controller('EditAccountController', ['$http', '$scope', 'Countries', function(http, scope, countries) {

	scope.countries = countries;

	scope.showSuccessMessage = false;

	scope.showErrorMessage = false;

	scope.errorMessage = null;

	scope.validation = {};

	scope.waitingForResponse = false;

	scope.account = JSON.parse(document.getElementById('userData').innerText);

	scope.card = {};

	scope.currentSection = 'account';

	scope.billingInformation = {
		full_name : scope.account.full_name,
		company_name : scope.account.company_name,
		country : scope.account.country,
		city : scope.account.city,
		address : scope.account.address,
		postal_code : scope.account.postal_code,
		vat : scope.account.vat
	};

	scope.toggleSection = function(section) {
		scope.currentSection = section;
	}

	//idle,processing,failed,success
	scope.creditCardFormState = 'idle';
	scope.billingInformationFormState = 'idle';

	var validateCard = function() {
		scope.error = null;


		if (!Stripe.card.validateExpiry(scope.card.exp_month, scope.card.exp_year)) {
			scope.error = 'The card\'s expiration is invalid';
			scope.invalidPropertyName = 'card.expiry';
		}

		if (!Stripe.card.validateCVC(scope.card.cvc)) {
			scope.error = 'The card\'s cvc is invalid';
			scope.invalidPropertyName = 'card.cvc';
		}

		if (!Stripe.card.validateCardNumber(scope.card.number)) {
			scope.error = 'The card\'s number is invalid'
			scope.invalidPropertyName = 'card.number';
		}

		if (scope.error !== null)
			notie.alert(2, scope.error, 2);

		return (scope.error === null);
	}


	var validateBillingInformation = function(){


		if (scope.billingInformation.company_name === "" && scope.billingInformation.full_name === "") {
			notie.alert(2, "You need to provide the company name or the full name",2);
			return false;
		}

		if (scope.billingInformation.country.length < 2) {
			notie.alert(2, "Please provide a valid country name",2);
			return false;
		}

		if (scope.billingInformation.country.length < 2) {
			notie.alert(2, "Please provide a valid country name",2);
			return false;
		}

		if (scope.billingInformation.city.length < 2) {
			notie.alert(2, "Please provide a valid city name",2);
			return false;
		}

		if (scope.billingInformation.address.length < 2) {
			notie.alert(2, "Please provide a valid address",2);
			return false;
		}

		if (scope.billingInformation.postal_code.length < 1) {
			notie.alert(2, "Please provide a valid postal code",2);
			return false;
		}

		return true;
	}


	scope.saveBillingInformation = function() {
		if (!validateBillingInformation())
			return;

		http({
				method: 'PUT',
				url: '/account',
				data: scope.billingInformation
			})
			.then(function(response) {
				notie.alert(1, "Your billing information have been updated", 2);
				scope.waitingForResponse = false;
			})
			.catch(function(response) {
				notie.alert(1, response.errors[0].message, 2);
				scope.waitingForResponse = false;
			})

	}

	// Creates a payment method for a customer
	// 
	scope.saveCreditCard = function() {

		if (!validateCard())
			return;

		scope.creditCardFormState = 'processing';
		//Crea il token con stripe
		Stripe.card.createToken(scope.card, function(status, response) {
			if (response.error) {
				scope.error = response.error.message;
				scope.creditCardFormState = 'error';
				notie.alert(2, scope.error, 2);
			} else {

				http({
						method: 'POST',
						url: '/account/billing',
						data: {
							stripe_token: response.id,
						}
					})
					.then(function(response) {
						scope.creditCardFormState = 'success';
						scope.account.stripe = response.data.data;
						scope.card = {};
						$("#updateCreditCardModal").modal('hide');
						scope.showUpdateSuccessfulMessage = true;

					})
					.catch(function(error) {
						scope.error = error;
						scope.creditCardFormState = 'error';
						notie.alert(2, scope.error, 2);
					})
			}
		})
	}


	scope.showError = function(m) {
		scope.showSuccessMessage = false;
		scope.showErrorMessage = true;
		scope.errorMessage = m;
		notie.alert(2, m, 2);
	}
	scope.showSuccess = function(m) {
		scope.showSuccessMessage = true;
		scope.showErrorMessage = false;
	}
	var AccountSchema = new Schematic.Schema('Account', {
		full_name: {
			type: "string"
		},
		email: {
			type: "string",
			required: true
		},
		company_name: {
			type: "string"
		},
		country: {
			type: "string"
		},
		password: {
			type: "string",
			min: 5,
			max: 254
		},
		confirm_password: {
			type: "string"
		}
	})

	var email_regex = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/


	scope.updatePassword = function() {


		if (scope.account.password.length < 5) {
			return notie.alert(2, "Password is too short, please insert at least 5 characters.", 2);
		}
		if (scope.account.password.length > 32) {
			return notie.alert(2, "Password is too long, please insert at maximum 32 characters.", 2);
		}

		if (scope.account.password !== scope.account.confirm_password) {
			return notie.alert(2, "Passwords don't match.", 2);
		}

		scope.waitingForResponse = true;
		http({
				method: 'PUT',
				url: '/account',
				data: {
					password: scope.account.password,
					confirm_password: scope.account.confirm_password
				}
			})
			.then(function(response) {
				notie.alert(1, "Your password has been updated", 2);
				scope.waitingForResponse = false;
			})
			.catch(function(response) {
				notie.alert(1, response.errors[0].message, 2);
				scope.waitingForResponse = false;
			})
	}

	scope.updateAccount = function() {
		scope.waitingForResponse = true;
		if (false === email_regex.test(scope.account.email)) {
			scope.validation.email = false
			scope.waitingForResponse = false;
			scope.showError('The email address is invalid');
			return
		}



		http({
				method: 'PUT',
				url: '/account',
				data: {
					email: scope.account.email,
					full_name: scope.account.full_name,
					country: scope.account.country,
					company_name: scope.account.company_name,
				}
			})
			.then(function(response) {
				notie.alert(1, "Your account has been updated", 2);
				scope.waitingForResponse = false;
			})
			.catch(function(response) {
				notie.alert(1, response.errors[0].message, 2);
				scope.waitingForResponse = false;
			})



	}

}])