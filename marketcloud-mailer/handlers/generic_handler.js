var Mail = require('../mail.js')

module.exports = function (mongodb) {
  /*
   *  message [Object]
   *  message.type [String]
   *  message.resource_id [Number]
   *  message.application [Object]
   *  message.notification [Object]
   *
   *  callback [Function]
   */
  return function (message, callback) {
    /*
  Tutte le notifiche che mi arrivano sono nella forma
  {
    type : <string>
    notification : <object>
    application : <application>
    resource_id : <number>
  }
  il tipo è nella forma
  <resource_type_name>.<action>.<modifiers>

  dal resource name ottengo la collection
  dal resource id l'id

  Da queste info faccio la query

  successivamente devo capire che template usare, ma potrei farmi qua un dizionario

*/
    // TODO add validation to message
    // se validation error, loggalo con mongodb
    // ogni volta che ho un errore, lo loggo e NON riaccordo il messaggio, che è malformed.
    // altrimenti mi rimane li all'infinito
    function handleError (message, error) {
      // todo logga su mongodb
      console.log('Error ', error)
      return callback(null)
    }

    if (!message.hasOwnProperty('type')) {
      return handleError(message, 'Missing required property message.type')
    }

    if (typeof message.type !== 'string') {
      return handleError(message, 'TypeError message.type must be a string')
    }

    if (!message.hasOwnProperty('resource_id')) {
      return handleError(message, 'Missing required property message.resource_id')
    }

    if (typeof message.resource_id !== 'number') {
      return handleError(message, 'TypeError message.resource_id must be number')
    }

    var eventToTemplate = {
      'invoices.create': Mail.Templates.NewInvoice,
      'orders.create': Mail.Templates.ConfirmOrder,
      'orders.update.processing': Mail.Templates.OrderPaid,
      'orders.update.completed': Mail.Templates.OrderCompleted,
      'users.create': Mail.Templates.UserCreated,
      'users.recoverPassword': Mail.Templates.RecoverUserPassword
    }

    var pluralToSingular = {
      'invoices' : 'invoice',
      'users': 'user',
      'orders': 'order',
      'categories': 'category',
      'products': 'product'
    }

    var resourceName = message.type.split('.')[0]
    var action = message.type.split('.')[1]

    mongodb.collection(resourceName)
      .findOne({
        application_id: message.application.id,
        id: message.resource_id
      }, function (err, resourceData) {
        if (err) {
          return handleError(message, err)
        }

        if (resourceData === null) {
          console.log('[Mail Service] Notification handler could not find the resource related to the notification ')
          return callback(null)
        }

        // Se non ce lho. allora non ho unn template
        if (!eventToTemplate.hasOwnProperty(message.type)) {
          console.log('[' + (new Date()) + '] NOT HANDLING message of type ' + message.type)
          return callback(null)
        }

        var templateFunction = eventToTemplate[message.type]

        // Context ha esigenze diverse in base al template
        // ad esempio la mail users.created vuole nel context user
        // mentre quella di orders.paid vuole order.
        // ho questi dati in resource
        // ho già il nome però, in resourceName
        var context = {
          application: message.application,
          notification: message.notification
        }
          // Nei template il nome risorsa è sempre singolare
          // negli endpoint è plurale
          // lo converto
        resourceName = pluralToSingular[resourceName]

        context[resourceName] = resourceData

        templateFunction(context, function (err, json) {
          console.log('La funzione di email ha finito di fare, err è ', err)
          if (err) {
            callback(err, null)
          } else {
            callback(null, json)
          }
        })
      })
  }
}
