module.exports = function(app) {

    var session = require('express-session');
    var RedisStore = require('connect-redis')(session);
    var uuid = require('node-uuid');
    app.use(session({
        cookie: {
            maxAge: 24 * 3600 * 1000 * 30
        },
        store: new RedisStore({
            prefix: '_mc_session',
            client: app.get('redis')
        }),
        ttl: 24 * 60 * 60, //1 day
        name: '_mc_sessid',
        secret: 'oasijdi0jw80dj1nc1hf18u9820310d1dj08810948n184d198s1131dk1di',
        saveUninitialized: true,
        resave: false
    }));

    app.use(function(req, res, next) {
        if (req.session && req.session.user) {
            req.app.locals.user = req.session.user
            next()
        } else {
            console.log("First time i see this user")
            req.session.user = {
                isAuthenticated: false,
                id: Date.now() + "-" + uuid.v4(),
                createdAt: Date.now()
            }
            req.app.locals.user = req.session.user
            next()
        }
    });

    return session;
}