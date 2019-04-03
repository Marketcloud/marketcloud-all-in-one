const config = require('../configuration/default.js')
module.exports = function(app) {

	var proxy = require('http-proxy-middleware');

	var options = {
	    target: config.marketcloud.apiBaseUrl,
	    changeOrigin : true,
	    pathRewrite: {
	       '^/api/v0' : '/v0'
	    },
	    onProxyReq : function(proxyReq, req, res) {
	    	if (process.env.NODE_ENV === 'development')
	    		console.time('proxy')
		    var user_header = JSON.stringify({
				email: req.session.user.email,
				full_name: req.session.user.full_name
			});
			proxyReq.setHeader('mc-dashboard-user',user_header);
		},
		onProxyRes : function(proxyRes, req, res) {
			if (process.env.NODE_ENV === 'development'){
				console.timeEnd('proxy');
			}
			
		}
	};

	var apiProxy = proxy('/api', options);
	return apiProxy
}