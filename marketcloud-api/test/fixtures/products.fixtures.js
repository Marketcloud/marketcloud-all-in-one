var testProduct = {
    name: "The night when the stars turned away",
    sku: "300AAnc",
    price: 10,
    price_discount:9,
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


module.exports = {
    create  : testProduct,
    update  :replacementProduct
}