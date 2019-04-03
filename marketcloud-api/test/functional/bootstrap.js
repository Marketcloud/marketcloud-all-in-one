var frisby = require('frisby');

frisby.globalSetup({
    request: {
        headers: {
            'Authorization': process.env.key + ':' + process.env.token
        }
    }
});

module.exports = frisby;