/*
  @module Mailer

  Exports utility functions to send emails through our provider and account
*/
const fs = require('fs')
const ejs = require('ejs')
const config = require('')
const sendgrid = require('sendgrid')(config.sendgrid.key)

/*
    @param email {String} The email to validate
*/
function validateEmail(email) {
	var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
	return re.test(email);
}

/*
  @param config.to {String} The  recipient's address
  @param config.template_path {String} the path to the EJS template
  @param config.context {Object} Object to be used in template compilation
  @param config.callback {Function} Callback
 */
function sendMail(config) {
	fs.readFile(config.template_path,'utf8',function(err,template){
		if (err)
			return config.callback(err);

		if ('string' !== typeof config.to)
			throw new Error('config.to must be a string and a valid email address.');
      
		var compiled_template = ejs.render(template,config.context);
		var email_config = {
			to      : config.to,
			from    : config.organization.email,
			fromname : config.organization.name,
			subject : config.subject || 'Your Marketcloud Account',
			text    : compiled_template,
			html    : compiled_template
		};

		if (config.hasOwnProperty('bcc')) {
			email_config.bcc = config.bcc;
		}
      
		sendgrid.send(email_config,config.callback);
	});
    
}



module.exports = {
	send : sendMail,
	validateAddress : validateEmail
};