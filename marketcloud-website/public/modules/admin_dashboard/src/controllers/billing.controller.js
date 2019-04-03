module.exports = function(app) {
	app.controller('ApplicationBillingController', ['$scope', '$http', 'application', '$rootScope', '$app', 'account',
		function(scope, http, application, rootScope, $app, account) {

			//Sending to our analytics tool that the user is on the billing section

			rootScope.application = application;
			scope.application = application;



			rootScope.$broadcast('$dashboardSectionChange', {
				section: "billing"
			});

			// The form's step
			scope.step = 1;

			// The selected plan
			scope.selected_plan = null;

			// the error message
			scope.error = null;

			scope.invalidPropertyName = null;

			// holds the card data
			scope.card = {};

			// idle, processing, error, success
			scope.creditCardFormState = 'idle';

			scope.goToStep = function(step) {
				scope.step = step;
			}

			// Loads the current user information like profile and billing
			scope.account = account.data.data;


			scope.selectPlan = function(plan_id) {

				scope.plans.forEach(function(plan) {
					if (plan.id === plan_id) {
						scope.selected_plan = plan;
					}

				})
				console.log("selected_plan", scope.selected_plan)
				scope.goToStep(2);

			}



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

				return (scope.error === null);
			}

			scope.updateApplicationSubscription = function() {


				scope.creditCardFormState = 'processing';
				http({
						method: 'PUT',
						url: '/applications/' + application.id + '/billing',
						data: {
							plan_id: scope.selected_plan.id
						}
					})
					.then(function(response) {
						$app.clearAppCache(application.id)
						scope.goToStep(3);
						scope.creditCardFormState = 'success';

					})
					.catch(function(error) {
						console.log(error);
						scope.error = error;
						notie.alert(2, error.data.errors[0].message || 'Payment failed, please check your billing information.');
						scope.creditCardFormState = 'error';
					})
			}

			scope.canSeeStartupPlan = function(){
				var eligibleAccounts = [
				'cikkense@gmail.com',
				'info@stranomaverde.it'
				]

				return eligibleAccounts.indexOf(scope.account.email) > -1
			}



			scope.plans = [{
				name: 'free',
				id: 'free',
				price_monthly: 0,
				price_yearly: 0,
				api_calls: '5000',
				storage: '0.5'
			}, 
			{
				name: 'startup',
		    id: 'startup_plan_10_monthly',
		    price_monthly: 10,
		    price_yearly: 120,
		    api_calls: '50000',
		    storage: "1"
			},
			{
				name: 'cumulus',
				id: 'month-19',
				price_monthly: 19,
				price_yearly: 190,
				api_calls: '100K',
				storage: '1'
			}, {
				name: 'stratus',
				id: 'month-49',
				price_monthly: 49,
				price_yearly: 490,
				api_calls: '450K',
				storage: '2'
			}, {
				name: 'nimbo stratus',
				id: 'month-99',
				price_monthly: 99,
				price_yearly: 990,
				api_calls: '1500K',
				storage: '5'
			}, ];

		}
	])

}