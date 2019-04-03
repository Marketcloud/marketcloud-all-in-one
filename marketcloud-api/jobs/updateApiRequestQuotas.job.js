const cron = require('cron')

const cronInterval = '*/1 * * * *';



module.exports = function(app) {

  app.set("requests_register", {});

  var updateApiRequestQuotasJob = new cron.CronJob({
    cronTime: cronInterval,
    onTick: function() {

      var sequelize = app.get('sequelize');

      // Fetching the hash of app_id => howManyRequests
      // to update apps accordingly
      var requestsToRegister = app.get("requests_register");

      app.set("requests_register", {});

      // We will turn the hash into an array to easier recursion
      var arrayOfRequestsToRegister = []


      for (var k in requestsToRegister) {
        arrayOfRequestsToRegister.push({
          application_id: k,
          decrement: requestsToRegister[k]
        })
      }

      console.log("[JOB: updateApiRequestQuotas] Flushing these activities : ", arrayOfRequestsToRegister);

      // Cursor to track recursion
      var cursor = 0;

      // Recursively run update queries.
      var runUpdateQuery = function() {

        if (!arrayOfRequestsToRegister[cursor]) {
          console.log("[JOB: updateApiRequestQuotas] Done flushing ALL activities of this batch.");
          return;
        }

        // The piece of update we are doing now
        var currentUpdate = arrayOfRequestsToRegister[cursor];

        // We decrement the application's api call quota
        var qry = 'UPDATE applications SET api_calls_quota_left = api_calls_quota_left - :decrement WHERE id = :applicationId;'

        return sequelize.query(qry, {
            replacements: {
              applicationId: currentUpdate.application_id,
              decrement: currentUpdate.decrement
            }
          }).then(function(result) {

            console.log("[JOB: updateApiRequestQuotas] Done flushing activities of application " + currentUpdate.application_id)
            cursor++;
            runUpdateQuery()
          })
          .catch(function(error) {
            console.log("An error has occurred, unable to update api usage" + JSON.stringify(currentUpdate));

            // We had an error, so we must re-list the increment
            var callsRegister = req.app.get('requests_register');
            if (callsRegister.hasOwnProperty(req.client.application_id))
              callsRegister[currentUpdate.application_id] += currentUpdate.decrement;
            else
              callsRegister[currentUpdate.application_id] = currentUpdate.decrement;
            cursor++;

            runUpdateQuery();
          })
      }

      // Starting the iteration
      runUpdateQuery();


    }
  })

  return updateApiRequestQuotasJob;

}