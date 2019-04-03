var Attachments = {};
const converter = require('html-pdf');
const ejs = require('ejs');
const fs = require('fs');


/*
* @returns {Buffer} The buffer of the PDF file to attach
*/
Attachments.getInvoicePDF = function(context, callback) {
  fs.readFile('./views/attachments/invoice.ejs', 'utf8', function(err, html) {
    if (err)
      return callback(err);

    try{
        html = ejs.render(html,context);
    } catch (e) {
      callback(e);
    }


    converter.create(html).toBuffer(callback);
  })
}

module.exports = Attachments;