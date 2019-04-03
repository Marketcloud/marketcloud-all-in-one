var testAddress = {
   "full_name": "John Doe",
    "address1": "Fake Street 123",
    "address2": "Apt. 6",
    "city": "Springfield",
    "state": "Illinois",
    "country": "United States of America",
    "postal_code": "62701",
    "email": "john.doe@example.com"
}

var updatedTestAddress = {
    "full_name": "John Doe",
    "address1": "Real Street 123",
    "address2" : "Apt. 6",
    "city" : "Springfield",
    "state" : "Illinois",
    "country" : "United States of America",
    "postal_code" : "62701",
    "email" : "john.doe@example.com"
}

var InvalidAddress = {
    full_name: "John Doe",
    postal_code: 60125
}


module.exports = {
    create  : testAddress,
    createInvalid : InvalidAddress,
    update  :updatedTestAddress
}