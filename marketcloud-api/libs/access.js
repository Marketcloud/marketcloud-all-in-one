function getCommonPublicProfile() {
    return {
        list: true,
        findOne: true,
        getById: true,
        create: false,
        update: false,
        delete: false
    }
}

function getAllTrueProfile() {
    return {
        list: true,
        findOne: true,
        getById: true,
        create: true,
        update: true,
        delete: true
    }
}

function getAllFalseProfile() {
    return {
        list: false,
        findOne: false,
        getById: false,
        create: false,
        update: false,
        delete: false
    }
}


function getCommonUserProfile() {
    return {
        list: true,
        findOne: true,
        getById: true,
        create: false,
        update: false,
        delete: false
    }
}

function getCommonAdminProfile() {
    return {
        list: true,
        findOne: true,
        getById: true,
        create: true,
        update: true,
        delete: true
    }
}

var publicAccessMap = {
    addresses: getAllFalseProfile(),
    brands: getCommonPublicProfile(),
    carts: {
        list: false,
        findOne: false,
        getById: true,
        patch: true,
        create: true,
        update: true,
        checkout: true,
        delete: false
    },
    categories: getCommonPublicProfile(),
    collections: getCommonPublicProfile(),
    contents: getCommonPublicProfile(),
    coupons: getAllFalseProfile(),
    events: getAllFalseProfile(),
    promotions: getCommonPublicProfile(),
    currencies: getCommonPublicProfile(),
    orders: {
        list: false,
        findOne: false,
        getById: false,
        create: true,
        update: false,
        delete: false
    },
    payments : {
        list: false,
        findOne : false,
        getById : false,
        create : true,
        update : false,
        delete:false
    },
    paymentMethods: getCommonPublicProfile(),
    invoices: getAllFalseProfile(),
    products: getCommonPublicProfile(),
    shippings: getCommonPublicProfile(),
    stores: getCommonPublicProfile(),
    taxes: getCommonPublicProfile(),
    users: {
        list: false,
        findOne: false,
        getById: false,
        create: true,
        update: false,
        delete: false,
        authenticate: true
    },
    media: {
        list: true,
        findOne: true,
        getById: true,
        create: false,
        update: false,
        delete: false
    },
    variables: getCommonPublicProfile()
}


var userAccessMap = {
    addresses: {
        list: '$owner',
        findOne: '$owner',
        getById: '$owner',
        create: '$owner',
        update: '$owner',
        delete: '$owner'
    },
    brands: {
        list: true,
        findOne: true,
        getById: true,
        create: false,
        update: false,
        delete: false
    },
    carts: {
        list: '$owner',
        findOne: '$owner',
        getById: '$owner',
        patch: '$owner',
        create: '$owner',
        update: '$owner',
        checkout: '$owner',
        delete: '$owner'
    },
    categories: {
        list: true,
        findOne: true,
        getById: true,
        create: false,
        update: false,
        delete: false
    },
    collections: {
        list: true,
        findOne: true,
        getById: true,
        create: false,
        update: false,
        delete: false
    },
    contents: {
        list: true,
        findOne: true,
        getById: true,
        create: false,
        update: false,
        delete: false
    },
    coupons: getAllFalseProfile(),
    events: getAllFalseProfile(),
    promotions: {
        list: true,
        findOne: true,
        getById: true,
        create: false,
        update: false,
        delete: false
    },
    currencies: {
        list: true,
        findOne: true,
        getById: true,
        create: false,
        update: false,
        delete: false
    },
    media: {
        list: true,
        findOne: true,
        getById: true,
        create: true,
        update: true,
        delete: true
    },
    orders: {
        list: '$owner',
        findOne: '$owner',
        getById: '$owner',
        create: true,
        update: false,
        delete: false
    },
    payments : {
        list: false,
        findOne : false,
        getById : false,
        create : true,
        update : false,
        delete:false
    },
    paymentMethods: {
        list: true,
        findOne: true,
        getById: true,
        create: true, // I can order stuff on sites even if i'm not authenticated
        update: false,
        delete: false
    },
    products: {
        list: true,
        findOne: true,
        getById: true,
        create: false,
        update: false,
        delete: false
    },
    shippings: {
        list: true,
        findOne: true,
        getById: true,
        create: false,
        update: false,
        delete: false
    },
    stores: {
        list: true,
        findOne: true,
        getById: true,
        create: true,
        update: true,
        delete: true
    },
    taxes: {
        list: true,
        findOne: true,
        getById: true,
        create: false,
        update: false,
        delete: false
    },
    invoices: {
        list: '$owner',
        findOne: '$owner',
        getById: '$owner',
        create: false,
        update: false,
        delete: false
    },
    users: {
        list: true,
        findOne: false,
        getById: true,
        create: true,
        update: true,
        delete: true,
        authenticate: true
    },
    variables: getCommonUserProfile()
}


var adminAccessMap = {
    addresses: {
        list: true,
        findOne: true,
        getById: true,
        create: true,
        update: true,
        delete: true,
    },
    invoices: {
        list: true,
        findOne: true,
        getById: true,
        create: true,
        update: true,
        delete: true,
    },
    brands: {
        list: true,
        findOne: true,
        getById: true,
        create: true,
        update: true,
        delete: true
    },
    carts: {
        list: true,
        findOne: true,
        getById: true,
        create: true,
        patch: true,
        update: true,
        checkout: true,
        delete: true
    },
    categories: {
        list: true,
        findOne: true,
        getById: true,
        create: true,
        update: true,
        delete: true
    },
    collections: {
        list: true,
        findOne: true,
        getById: true,
        create: true,
        update: true,
        delete: true
    },
    contents: {
        list: true,
        findOne: true,
        getById: true,
        create: true,
        update: true,
        delete: true
    },
    coupons: {
        list: true,
        findOne: true,
        getById: true,
        create: true,
        update: true,
        delete: true
    },
    events: getAllTrueProfile(),
    promotions: {
        list: true,
        findOne: true,
        getById: true,
        create: true,
        update: true,
        delete: true
    },
    currencies: {
        list: true,
        findOne: true,
        getById: true,
        create: true,
        update: true,
        delete: true
    },

    orders: {
        list: true,
        findOne: true,
        getById: true,
        create: true,
        update: true,
        delete: true
    },
    payments : getAllTrueProfile(),
    paymentMethods: {
        list: true,
        findOne: true,
        getById: true,
        create: true,
        update: true,
        delete: true
    },
    products: {
        list: true,
        findOne: true,
        getById: true,
        create: true,
        update: true,
        delete: true
    },
    shippings: {
        list: true,
        findOne: true,
        getById: true,
        create: true,
        update: true,
        delete: true
    },
    stores: {
        list: true,
        findOne: true,
        getById: true,
        create: true,
        update: true,
        delete: true
    },
    taxes: {
        list: true,
        findOne: true,
        getById: true,
        create: true,
        update: true,
        delete: true
    },
    users: {
        list: true,
        findOne: true,
        getById: true,
        create: true,
        update: true,
        delete: true,
        authenticate: true
    },
    media: {
        list: true,
        findOne: true,
        getById: true,
        create: true,
        update: true,
        delete: true
    },
    variables: getCommonAdminProfile()
}


module.exports = {
    public: publicAccessMap,
    user: userAccessMap,
    admin: adminAccessMap
}