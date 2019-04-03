// Require
const configuration = require('./config')
var sendgrid = require('sendgrid')(configuration.sendgrid.key)
var fs = require('fs')
var ejs = require('ejs')
var geoinfo = require('./geoinfo.js')
var Attachments = require('./attachments')
var mongodb = require('./services/mongodb.service.js')
var moment = require('moment')

var BASE_PATH = __dirname

/**
 * @param  {string} The email address to validate
 * @return {boolean} Returns True if the email is valid
 */
function validateEmail (email) {
  var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return re.test(email)
}

/*
   * Utility function that returns the locale code from a country name
   */
function getLocaleFromAddress (address) {
  var foundCountries = geoinfo.filter(function (c) {
    return c.Country.toLowerCase() === address.country.toLowerCase()
  })

  var country = foundCountries[0] || null

  if (country === null) {
    return []
  }

  if (country.Languages.indexOf(',') > -1) {
    return country.Languages.split(',')
  } else {
    return [country.Languages]
  }
}

/*
 * Proxy function. If the config specifies a template, we use that string as template
 * Otherwise we load the default template from the filesystem.
 */
function sendMail (config) {
  // IT means we are using the custom template feature
  if (config.customTemplate) {
    return sendCustomMail(config)
  } else {
    return sendMailFromTemplate(config)
  }
}

function applyTranslationToTemplate (template, translation) {
  for (var k in translation) {
    if (translation[k]) {
      template[k] = translation[k]
    }
  }
}

function sendMailFromTemplate (config) {
  fs.readFile(config.template_path, 'utf8', function (err, template) {
    if (err) {
      return config.callback(err)
    }

    var compiledTemplate = ejs.render(template, config.context)

    // We have to re-compile the template because some variable might have some template tag
    // e.g.
    // the title might be "We shipped your order {{order.id}}"
    // Then we turn that {{order.id}} into <%= order.id %>
    // and we send it
    if (typeof config.context.template === 'object') {
      // Globally replacing all occurrences of {{ and }} tags
      // and turning it into ejs tags
      compiledTemplate = compiledTemplate.replace(/\{\{/g, '<%= ')
      compiledTemplate = compiledTemplate.replace(/\}\}/g, '%> ')
      compiledTemplate = ejs.render(compiledTemplate, config.context)
    }

    var emailConfiguration = {
      to: config.to,
      from: config.from,
      subject: config.subject || 'Notification',
      text: compiledTemplate,
      html: compiledTemplate
    }

    if (config.hasOwnProperty('bcc')) {
      emailConfiguration.bcc = config.bcc
    }

    // For attachments
    if (config.files) { emailConfiguration.files = config.files }

    sendgrid.send(emailConfiguration, function (err, json) {
      if (err) {
        return config.callback(err, null)
      } else {
        return config.callback(null, json)
      }
    })
  })
}

function sendCustomMail (config) {
  // Se la notifica ha il campo template, significa che
  // non devo usare un template dal filesystem!

  // Devo fare del preprocessing al template, sostituendo i tag con quelli ejs

  config.customTemplate = config.customTemplate.replace(/\{\{/g, '<%')
  config.customTemplate = config.customTemplate.replace(/\}\}/g, '%>')
  var compiledTemplate = ejs.render(config.customTemplate, config.context)

  // Sengrid key

  var emailConfiguration = {
    to: config.to,
    from: config.from,
    subject: config.subject || 'Notification from ' + config.application.name,
    text: compiledTemplate,
    html: compiledTemplate
  }

  if (config.hasOwnProperty('bcc')) {
    emailConfiguration.bcc = config.bcc
  }

  // For attachments
  if (config.files) { emailConfiguration.files = config.files }

  sendgrid.send(emailConfiguration, function (err, json) {
    if (err) {
      return config.callback(err, null)
    } else {
      return config.callback(null, json)
    }
  })
}

function applyBCC (notification, emailConfig, application) {
  // Now we add any required bcc, that can be programmatically added as a string
  // of comma separated address
  // and/or thgough the option "sendCopyToOwner"
  var bccAddresses = []

  // Checking if the notification has  a bcc value
  // We also have to strictly validate email addresses here, or the notification will
  // fail to be sent.
  // The additional typecheck is required because we don't want to crash the process
  if (notification.hasOwnProperty('bcc') && typeof notification.bcc === 'string') {
    bccAddresses = notification.bcc
      .replace(/\s/g, '')
      .split(',')
      .filter(validateEmail)
  }

  // Checking if the notification has the sendCopyToOwner option se to true
  // Which means that we have to add the application owner as a bcc
  if (notification.sendCopyToOwner === true) {
    var address = application.email_address || application.owner
    bccAddresses.push(address)
  }
  // Adding the bcc option only if we have at least 1 address
  if (bccAddresses.length > 0) { emailConfig.bcc = bccAddresses }

  return emailConfig
}

var Mail = {}

Mail.Templates = {}

Mail.send = sendMail

/**
 *
 **/
Mail.Templates.ConfirmOrder = function (message, callback) {
  var order = message.order
  var application = message.application
  var notification = message.notification
  // If the notification has a "template" property,
  // then we use the provided custom template

  var emailConfig = {
    to: order.billing_address.email,
    from: application.email_address || application.owner,
    fromname: application.name,
    template_path: BASE_PATH + '/views/emails/new_order_email.ejs',
    context: {
      email: order.billing_address.email,
      order: order,
      application: application
    },
    subject: notification.subject || 'Your order is confirmed!',
    bcc: application.email_address || application.owner,
    callback: callback
  }

  // If we provided a full HTML template string, we use it instead of a template from the filesystem
  if (notification.customTemplate) {
    emailConfig.customTemplate = notification.customTemplate
  }
  // If we provided a template object we add it to the context to customize
  // email's text
  if (notification.template && typeof notification.template === 'object') {
    emailConfig.context.template = notification.template
  }

  if (notification.locales) {
    // Controllo che l'app supporti il locale del billing address
    // Se lo supporta, cerco nei locale della notifica il locale corrispondente
    // Se lo ha, allora lo sostituisco al template
    var addressForNotification = order.billing_address || order.shipping_address
    applyTranslationToTemplate(emailConfig.context.template, getLocaleForNotification(notification, addressForNotification).template)
    emailConfig.subject = getLocaleForNotification(notification, addressForNotification).subject || emailConfig.subject
  }

  emailConfig = applyBCC(notification, emailConfig, application)

  return sendMail(emailConfig)
}

function getLocaleForNotification (notification, addressLikeObject) {
  // An array of possible locales for the recipient
  var recipientLocales = getLocaleFromAddress(addressLikeObject)

  // The list of locales available in this notification
  var availableLocales = Object.keys(notification.locales)

  // Now we look for the supported locales matching with one of the locales
  // that match the billing address country
  var supportedRecipientLocales = recipientLocales.filter(function (locale) {
    return availableLocales.indexOf(locale) > -1
  })

  if (supportedRecipientLocales.length > 0) {
    var chosenLocale = supportedRecipientLocales[0]
    // Then we found a locale matching the billing country

    // We return the locale
    return notification.locales[chosenLocale]
  } else {
    return notification.template
  }
}

/**
 *
 **/
Mail.Templates.OrderCompleted = function (message, callback) {
  var order = message.order
  var application = message.application
  var notification = message.notification

  var emailTemplatePath = __dirname + '/views/emails/' + application.id + '_order_shipped_email.ejs'
  if (!fs.existsSync(emailTemplatePath)) {
    console.log('There is no custom email for application ' + application.id)
    emailTemplatePath = __dirname + '/views/emails/order_shipped_email.ejs'
    console.log('Using template path at ' + emailTemplatePath)
  } else {
    console.log('>>> Using custom template at ' + emailTemplatePath)
  }

  var emailConfig = {
    to: order.billing_address.email,
    from: application.email_address || application.owner,
    fromname: application.name,
    template_path: emailTemplatePath,
    context: {
      email: order.billing_address.email,
      order: order,
      application: application
    },
    subject: notification.subject || 'We shipped your order!',
    bcc: application.email_address || application.owner,
    callback: callback
  }

  // Localizing the shipment date
  if (order.shipments && order.shipments.length > 0) {
    order.shipments.forEach(function (shipment) {
      if (shipment.date) {
        if (order.shipping_address.country) {
          var locales = getLocaleFromAddress(order.shipping_address)
          if (locales.length > 0) {
            moment.locale(locales[0])
            emailConfig.context.locale = locales[0]
            shipment.date = moment(shipment.date).format('D MMMM YYYY')
          }
        }
      }
    })
  }

  console.log('ER LOCALE è ' + emailConfig.context.locale)
  // If we provided a full HTML template string, we use it instead of a template from the filesystem
  if (notification.customTemplate) {
    emailConfig.customTemplate = notification.customTemplate
  }
  // If we provided a template object we add it to the context to customize
  // email's text
  if (notification.template && typeof notification.template === 'object') {
    emailConfig.context.template = notification.template
  }

  if (notification.locales) {
    // Controllo che l'app supporti il locale del billing address
    // Se lo supporta, cerco nei locale della notifica il locale corrispondente
    // Se lo ha, allora lo sostituisco al template

    // We don't just replace the template with a translation, because the translation
    // might be missing some fields.
    var addressForNotification = order.billing_address || order.shipping_address

    console.log("L'indirizzo usato per dedurre il locale è ", addressForNotification)
    applyTranslationToTemplate(emailConfig.context.template, getLocaleForNotification(notification, addressForNotification).template)

    // Translating also the subject if possible
    emailConfig.subject = getLocaleForNotification(notification, addressForNotification).subject || emailConfig.subject
  }

  emailConfig = applyBCC(notification, emailConfig, application)

  return sendMail(emailConfig)
}

/**
 *
 **/
Mail.Templates.OrderPaid = function (message, callback) {
  var order = message.order
  var application = message.application
  var notification = message.notification

  var emailTemplatePath = __dirname + '/views/emails/' + application.id + '_order_paid_email.ejs'
  if (!fs.existsSync(emailTemplatePath)) {
    console.log('There is no custom email for application ' + application.id)
    emailTemplatePath = __dirname + '/views/emails/order_paid_email.ejs'
    console.log('Using template path at ' + emailTemplatePath)
  }

  var emailConfig = {
    to: order.billing_address.email,
    from: application.email_address || application.owner,
    fromname: application.name,
    template_path: emailTemplatePath,
    context: {
      email: order.billing_address.email,
      order: order,
      application: application
    },
    subject: notification.subject || 'Payment received!',
    bcc: application.email_address || application.owner,
    callback: callback
  }

  // If we provided a full HTML template string, we use it instead of a template from the filesystem
  if (notification.customTemplate) {
    emailConfig.customTemplate = notification.customTemplate
  }
  // If we provided a template object we add it to the context to customize
  // email's text
  if (notification.template && typeof notification.template === 'object') {
    emailConfig.context.template = notification.template
  }

  if (notification.locales) {
    // Controllo che l'app supporti il locale del billing address
    // Se lo supporta, cerco nei locale della notifica il locale corrispondente
    // Se lo ha, allora lo sostituisco al template
    var addressForNotification = order.billing_address || order.shipping_address
    applyTranslationToTemplate(emailConfig.context.template, getLocaleForNotification(notification, addressForNotification).template)
    emailConfig.subject = getLocaleForNotification(notification, addressForNotification).subject || emailConfig.subject
  }
  emailConfig = applyBCC(notification, emailConfig, application)

  return sendMail(emailConfig)
}

/**
 *
 **/
Mail.Templates.OrderRefunded = function (message, callback) {
  var order = message.order
  var application = message.application
  var notification = message.notification
  var refund = message.refund

  var emailConfig = {
    to: order.billing_address.email,
    from: application.email_address || application.owner,
    fromname: application.name,
    template_path: __dirname + '/views/emails/new_refund_email.ejs',
    context: {
      email: order.billing_address.email,
      order: order,
      refund: refund,
      application: application
    },
    subject: notification.subject || 'Refund for order ' + order.id,
    bcc: application.email_address || application.owner,
    callback: callback
  }

  // If we provided a full HTML template string, we use it instead of a template from the filesystem
  if (notification.customTemplate) {
    emailConfig.customTemplate = notification.customTemplate
  }
  // If we provided a template object we add it to the context to customize
  // email's text
  if (notification.template && typeof notification.template === 'object') {
    emailConfig.context.template = notification.template
  }

  if (notification.locales) {
    // Controllo che l'app supporti il locale del billing address
    // Se lo supporta, cerco nei locale della notifica il locale corrispondente
    // Se lo ha, allora lo sostituisco al template
    var addressForNotification = order.billing_address || order.shipping_address
    applyTranslationToTemplate(emailConfig.context.template, getLocaleForNotification(notification, addressForNotification).template)
    emailConfig.subject = getLocaleForNotification(notification, addressForNotification).subject || emailConfig.subject
  }
  emailConfig = applyBCC(notification, emailConfig, application)

  return sendMail(emailConfig)
}

/*
  Requires that message has a "user" property
  we must add validation at some point
*/
Mail.Templates.UserCreated = function (message, callback) {
  var user = message.user
  var application = message.application
  var notification = message.notification
  var emailConfig = {
    to: user.email,
    from: application.email_address || application.owner,
    fromname: application.name,
    template_path: BASE_PATH + '/views/emails/user_created_email.ejs',
    context: {
      email: user.email,
      user: user,
      application: application
    },
    subject: notification.subject || 'Account created!',
    callback: callback
  }

  // If we provided a full HTML template string, we use it instead of a template from the filesystem
  if (notification.customTemplate) {
    emailConfig.customTemplate = notification.customTemplate
  }
  // If we provided a template object we add it to the context to customize
  // email's text
  if (notification.template && typeof notification.template === 'object') {
    emailConfig.context.template = notification.template
  }

  if (notification.locales) {
    // Controllo che l'app supporti il locale del billing address
    // Se lo supporta, cerco nei locale della notifica il locale corrispondente
    // Se lo ha, allora lo sostituisco al template
    // USers can have properties billing_address and shipping_address

    var addressForNotification = null

    if (user.shipping_address && user.shipping_address.country) { addressForNotification = user.shipping_address } else if (user.billing_address && user.billing_address.country) { addressForNotification = user.billing_address } else { console.log('This user has no address attached, so its impossible to guess a locale.') }

    if (addressForNotification !== null) {
      applyTranslationToTemplate(emailConfig.context.template, getLocaleForNotification(notification, addressForNotification).template)
      emailConfig.subject = getLocaleForNotification(notification, addressForNotification).subject || emailConfig.subject
    }
  }

  emailConfig = applyBCC(notification, emailConfig, application)

  return sendMail(emailConfig)
}

Mail.Templates.RecoverUserPassword = function (message, callback) {
  var user = message.user
  var application = message.application
  var notification = message.notification
  var emailConfig = {
    to: user.email,
    from: application.email_address || application.owner,
    fromname: application.name,
    template_path: BASE_PATH + '/views/emails/user_recover_password.ejs',
    context: {
      email: user.email,
      user: user,
      application: application,
      redirect_url: notification.redirect_url
    },
    subject: notification.subject || 'Recover your password',
    bcc: application.email_address || application.owner,
    callback: callback
  }

  // If we provided a full HTML template string, we use it instead of a template from the filesystem
  if (notification.customTemplate) {
    emailConfig.customTemplate = notification.customTemplate
  }
  // If we provided a template object we add it to the context to customize
  // email's text
  if (notification.template && typeof notification.template === 'object') {
    emailConfig.context.template = notification.template
  }

  emailConfig = applyBCC(notification, emailConfig, application)

  return sendMail(emailConfig)
}

Mail.Templates.NewInvoice = function (message, callback) {
  var invoice = message.invoice
  var application = message.application
  var notification = message.notification
  // If the notification has a "template" property,
  // then we use the provided custom template

  var emailConfig = {
    to: invoice.customer.email,
    from: application.email_address || application.owner,
    fromname: application.name,
    template_path: BASE_PATH + '/views/emails/new_invoice_email.ejs',
    context: {
      email: invoice.customer.email,
      invoice: invoice,
      application: application
    },
    subject: notification.subject || 'Invoice for your order',
    bcc: application.email_address || application.owner,
    callback: callback
  }

  // If we provided a full HTML template string, we use it instead of a template from the filesystem
  if (notification.customTemplate) {
    emailConfig.customTemplate = notification.customTemplate
  }
  // If we provided a template object we add it to the context to customize
  // email's text
  if (notification.template && typeof notification.template === 'object') {
    emailConfig.context.template = notification.template
  }

  if (notification.locales) {
    // Controllo che l'app supporti il locale del billing address
    // Se lo supporta, cerco nei locale della notifica il locale corrispondente
    // Se lo ha, allora lo sostituisco al template
    var addressForNotification = invoice.customer
    applyTranslationToTemplate(emailConfig.context.template, getLocaleForNotification(notification, addressForNotification).template)
    emailConfig.subject = getLocaleForNotification(notification, addressForNotification).subject || emailConfig.subject
  }

  emailConfig = applyBCC(notification, emailConfig, application)

  // Need to create and load the invoice pdf

  // We need to gather more info for this notification
  mongodb.getDatabaseInstance()
    .collection('orders')
    .findOne({
      application_id: application.id,
      id: invoice.order_id
    }, function (err, orderDocument) {
      if (err) { return callback(err) }

      // This object holds data to be rendered in the invoice
      var pdfContext = {
        invoice: invoice,
        application: application
      }

      if (orderDocument) {
        pdfContext.order = orderDocument
        emailConfig.context.order = orderDocument
      }

      Attachments.getInvoicePDF(pdfContext, function (err, buffer) {
        if (err) { return callback(err) }

        if (buffer) {
          emailConfig.files = [{
            filename: 'Invoice.pdf',
            content: buffer, // Sendgrid expects a buffer
            contentType: 'application/pdf'
          }]
        }

        return sendMail(emailConfig)
      })
    })
}

module.exports = Mail
