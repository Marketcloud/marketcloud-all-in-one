var frisby = require('./bootstrap')


var testProduct = {
    name: "The night when the stars turned away",
    sku: "300AAnc",
    price: 7.79,
    stock_type: 'track',
    stock_level: 30,
    description: "One night, a conspiracy greater than our own galaxy, took place in a small town.",
    published: true,
    "tags": ["fantasy", "CoC"],
    "isbn-10": "thn189719",
    "isbn-13": "978-0553582024",
    "pages": 1060,
    "editor": "Best Books",
    "author": "Mattia Alfieri",
    "genre": "Fantasy",
    "cover": "Paperback",
    "publication_year": "2017"


}


var replacementProduct = {
    name: "The night when the stars turned away",
    sku: "300AAnc",
    price: 7.79,
    stock_type: 'track',
    stock_level: 30,
    description: "One night, a conspiracy greater than our own galaxy, took place in a small town.",
    published: true,
    "tags": ["fantasy", "CoC"],
    "isbn-10": "055358202X",
    "isbn-13": "978-0553582024",
    "pages": 1089,
    "editor": "Best Books",
    "author": "Mattia Alfieri",
    "genre": "Fantasy",
    "cover": "Paperback",
    "publication_year": "2018"


}


var TestGet = function(json) {
    frisby.create('Retrieve the product')
        .get(process.env.url + '/v0/products/' + json.data.id)
        .expectStatus(200)
        .afterJSON(TestGetSomeFields)
        .toss();
}


var TestGetProductsByNonExistingCategoryPath = function(){
    // We ensure that non matching categor paths are handled properly
    // This Test is addressing a bug discovered in 0.17.29 and to be fixed in 0.17.30
    frisby.create('Retrieve a list of products by a non existing category path and return an empty list ')
        .get(process.env.url + '/v0/products?category=sdoasjdoijaosjdjasodj')
        .expectStatus(200)
        .expectJSON({
            data : function(v){
                expect(v.length).toBe(0)
            }
        })
        .toss();
}

var TestGetProductsWithDifferentCurrency = function(){
    // We ensure that non matching categor paths are handled properly
    // This Test is addressing a bug discovered in 0.17.29 and to be fixed in 0.17.30
    frisby.create('Retrieve a list of products with a specific currency ')
        .get(process.env.url + '/v0/products?currency=USD&per_page=1')
        .expectStatus(200)
        .expectJSON('data.*',{
            display_price : function(v){
                expect(v.indexOf("USD") > 0).toBe(true)
            }
        })
        .toss();
}

var TestGetSubResourcesForList = function(json) {
    frisby.create('Retrieve a list of products with embedded subresources')
        .get(process.env.url + '/v0/products?expand=category,brand')
        .expectStatus(200)
        .expectJSONTypes('_embedded',{
            categories : Array,
            brands : Array
        })
        .toss();
}
var TestGetSubResources = function(json) {
    frisby.create('Retrieve the product with embedded subresources')
        .get(process.env.url + '/v0/products/'+json.data.id+'?expand=category,brand')
        .expectStatus(200)
        .expectJSONTypes('_embedded',{
            categories : Array,
            brands : Array
        })
        .toss();
}


function TestGetSomeFields(json) {
    frisby.create('Retrieve only some fields from the product')
        .get(process.env.url + '/v0/products/' + json.data.id + '?fields=name,id')
        .expectStatus(200)
        .expectJSON({
            data: {
                id: json.data.id,
                name: testProduct.name

            }
        })
        .expectJSONTypes('data', {
            description: function(value) {
                expect(value).toBeUndefined()
            },
            url: function(value) {
                expect(value).toBeUndefined()
            }
        })
        .afterJSON(function(json) {
            TestGetBadFormedFieldsParameter(json)
            TestUpdateWithInvalidData(json)
            TestUpdate(json)
            TestGetSubResources(json);
            TestGetSubResourcesForList();
            TestGetProductsByNonExistingCategoryPath();
            TestGetProductsWithDifferentCurrency();
        })
        .toss();
}



function TestGetBadFormedFieldsParameter(json) {
    frisby.create('Retrieve a bad formed field from the product')
        .get(process.env.url + '/v0/products/' + json.data.id + '?fields=')
        .expectStatus(400)
        .expectJSON({
            status: false
        })
        .toss();
}

var TestUpdateWithInvalidData = function(json) {
    frisby.create('PUT updates the product but tries to set invalid values. Should reject with a 400.')
        .put(
            process.env.url + '/v0/products/' + json.data.id, {
                price: "three thousand dollars"
            }, {
                json: true
            })
        .expectStatus(400)
        .toss()
}
var TestUpdate = function(json) {
    frisby.create('PUT updates the product')
        .put(
            process.env.url + '/v0/products/' + json.data.id, {
                stock_level: 300
            }, {
                json: true
            })
        .expectStatus(200)
        .expectJSON({
            status: true,
            data: {
                name: testProduct.name,
                stock_level: 300
            }
        })
        .afterJSON(function(json_plpl) {
            frisby.create('After the update, the api must return the updated document')
                .get(process.env.url + '/v0/products/' + json_plpl.data.id)
                .expectStatus(200)
                .expectJSON({
                    status: true,
                    data: {
                        name: testProduct.name,
                        stock_level: 300
                    }
                })
                .afterJSON(TestDelete)
                .toss()
        })
        .toss()
}

var TestDelete = function(json) {

    frisby.create('Delete the product')
        .delete(process.env.url + '/v0/products/' + json.data.id)
        .expectStatus(200)
        .expectJSON({
            status: true
        })
        .afterJSON(function() {
            frisby.create('Ensure that the deleted product no longer exists')
                .get(process.env.url + '/v0/products/' + json.data.id)
                .expectStatus(404)
                .toss()
        })
        .afterJSON(TestUpdateNonExistingResource)
        .toss()
}


var TestUpdateNonExistingResource = function(json) {
    frisby.create('Updates NON-EXISTING product')
        .put(
            process.env.url + '/v0/products/' + 0, replacementProduct, {
                json: true
            })
        .expectStatus(404)
        .expectJSON({
            status: false,
            errors: [{
                code: 404,
                type: 'NotFound'
            }]
        })
        .toss()
}


frisby.create('Get a list of products')
    .get(process.env.url + '/v0/products?')
    .expectStatus(200)
    .expectJSONTypes('data.*', {
        id: function(v) {
            expect(v).not.toBeUndefined();
            expect(v).toBeTypeOrNull(Number)
        }
    })
    .afterJSON(function(j) {
        // Now we do a search from previous results
        
        frisby.create('Search for a product')
        .get(process.env.url + '/v0/products?q='+j.data[0].name)
        .expectStatus(200)
        .toss()
    })

.toss()



frisby.create('Get a list of products but only some fields')
    .get(process.env.url + '/v0/products?fields=name')
    .expectStatus(200)
    .expectJSONTypes('data.*', {
        name: function(v) {
            expect(v).not.toBeUndefined();
            expect(v).toBeTypeOrNull(String)
        },
        id: function(v) {
            expect(v).toBeUndefined()
        },
        description: function(v) {
            expect(v).toBeUndefined()
        }
    })
    .toss()



frisby
    .create('Create valid product')
    .post(process.env.url + '/v0/products', testProduct, {
        json: true
    })
    .expectStatus(200)
    .expectJSON({
        status: true
    })
    .afterJSON(function(json) {
        replacementProduct.id = json.data.id
        TestGet(json)
    })
    .toss();

/*
frisby.create('Get a list of 25 products ')
    .get(process.env.url+'/v0/products?limit=25')
    .expectStatus(200)
    .expectJSONTypes('',{
        data : function(v) {expect(v.length).toBe(25);}
    })
    .toss()
    
*/