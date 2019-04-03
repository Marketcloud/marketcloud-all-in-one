var Attachments = {}
const converter = require('html-pdf')
const ejs = require('ejs')
const fs = require('fs')

/*
* @returns {Buffer} The buffer of the PDF file to attach
*/
Attachments.getInvoicePDF = function (context, callback) {
  /**
   * Some apps have custom invoice template
   * in order to load the proper one we must load the template name in the app config
   */

  fs.readFile('./libs/templates/invoice_' + context.application.id + '.pdf.ejs', 'utf8', function (err, html) {
    if (err) {
      // Then this app does not have a custom file
      // We load the regular one
      fs.readFile('./libs/templates/invoice.pdf.ejs', 'utf8', function (err, html) {
        if (err) { return callback(err) }

        try {
          html = ejs.render(html, context)
        } catch (e) {
          callback(e)
        }

        converter.create(html).toBuffer(callback)
      })
    } else {
      try {
        html = ejs.render(html, context)
      } catch (e) {
        callback(e)
      }

      converter.create(html).toBuffer(callback)
    }
  })
}

/*
* @returns {Buffer} The buffer of the PDF file to attach
*/
Attachments.getRefundPDF = function (context, callback) {
  /**
   * Some apps have custom invoice template
   * in order to load the proper one we must load the template name in the app config
   */

  fs.readFile('./libs/templates/refund_' + context.application.id + '.pdf.ejs', 'utf8', function (err, html) {
    if (err) {
      // Then this app does not have a custom file
      // We load the regular one
      fs.readFile('./libs/templates/refund.pdf.ejs', 'utf8', function (err, html) {
        if (err) { return callback(err) }

        try {
          html = ejs.render(html, context)
        } catch (e) {
          callback(e)
        }

        converter.create(html).toBuffer(callback)
      })
    } else {
      try {
        html = ejs.render(html, context)
      } catch (e) {
        callback(e)
      }

      converter.create(html).toBuffer(callback)
    }
  })
}

module.exports = Attachments
