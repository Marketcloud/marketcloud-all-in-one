'use strict'

// Nodejs encryption with CTR
var algorithm = 'aes256',
    password = '0d7c84f6-f2ad-47a4-b3e7-91dda7fe1477',
    crypto = require('crypto');


/*
	@class Cipher
 */
function Cipher() {
	this.algorithm = 'aes256';
	this.password = '0d7c84f6-f2ad-47a4-b3e7-91dda7fe1477';
	this.cipher = crypto.createCipher(this.algorithm, this.password);
	this.decipher = crypto.createDecipher(this.algorithm, this.password);
}

/*
	@method encrypt {String}
 */
Cipher.prototype.encrypt = function(text) {

	if ('string' !== typeof text)
		throw new Error('Cipher.encrypt() only accepts Strings')

	var crypted = this.cipher.update(text, 'utf8', 'hex')
    crypted += this.cipher.final('hex');

    //Refreshing the cipher state
    this.cipher = crypto.createCipher(this.algorithm, this.password);

    return crypted;
}

/*
	@method decrypt {String}
 */
Cipher.prototype.decrypt = function(text) {

	if ('string' !== typeof text)
		throw new Error('Cipher.decrypt() only accepts Strings')

    var dec = this.decipher.update(text, 'hex', 'utf8')
    dec += this.decipher.final('utf8');

    //Refreshing the decipher state
    this.decipher = crypto.createDecipher(this.algorithm, this.password);


    return dec;
}

module.exports = Cipher;