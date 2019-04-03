module.exports = {
	defaults : {
			"keywords" :			'<meta name="keywords" content="ecommerce backend, e-commerce mobile, ecommerce rest api, ecommerce as a service, nodejs ecommerce">',
			"description" :			'<meta name="description" content="Marketcloud is a mobile first eCommerce backend made for developers. With our API you will no longer need complex server and database setup and you can focus on building an awesome frontend app." />',
			"og:title":				'<meta property="og:title" content="Marketcloud | Mobile first eCommerce backend"/>',
			"og:type":				'<meta property="og:type" content="website"/>',
			"og:url":				'<meta property="og:url" content="http://www.marketcloud.it"/>',
			"og:description":		'<meta property="og:description" content="Mobile first eCommerce backend. Build mobile and web e-commerce apps in minutes." />',
			"og:image" : 			'<meta property="og:image" content="https://marketcloudstatic01.blob.core.windows.net/images/grafica_adv_1.png" />',
			"twitter:title":		'<meta name="twitter:title" content="Marketcloud | Mobile first eCommerce backend" />',
			"twitter:card":			'<meta name="twitter:card" content="summary_large_image" />',
			"twitter:site":			'<meta name="twitter:site" content="@Marketcloudit" />',
			"twitter:url":			'<meta name="twitter:url" content="http://www.marketcloud.it"/>',
			"twitter:description":	'<meta name="twitter:description" content="Mobile first eCommerce backend. Build mobile and web e-commerce apps in minutes."/>',
			"twitter:image" :   	'<meta name="twitter:image" content="https://marketcloudstatic01.blob.core.windows.net/images/grafica_adv_1.png" />',
	},
	getMetaTags : function(){
		return {
			"keywords" :			'<meta name="keywords" content="ecommerce backend, e-commerce mobile, ecommerce rest api, ecommerce as a service, nodejs ecommerce">',
			"description" :			'<meta name="description" content="Marketcloud is a mobile first eCommerce backend made for developers. With our API you will no longer need complex server and database setup and you can focus on building an awesome frontend app." />',
			"og:title":				'<meta property="og:title" content="Marketcloud | Mobile first eCommerce backend"/>',
			"og:type":				'<meta property="og:type" content="website"/>',
			"og:url":				'<meta property="og:url" content="http://www.marketcloud.it"/>',
			"og:description":		'<meta property="og:description" content="Mobile first eCommerce backend. Build mobile and web e-commerce apps in minutes." />',
			"og:image" : 			'<meta property="og:image" content="https://marketcloudstatic01.blob.core.windows.net/images/grafica_adv_1.png" />',
			"twitter:title":		'<meta name="twitter:title" content="Marketcloud | Mobile first eCommerce backend" />',
			"twitter:card":			'<meta name="twitter:card" content="summary_large_image" />',
			"twitter:site":			'<meta name="twitter:site" content="@Marketcloudit" />',
			"twitter:url":			'<meta name="twitter:url" content="http://www.marketcloud.it"/>',
			"twitter:description":	'<meta name="twitter:description" content="Mobile first eCommerce backend. Build mobile and web e-commerce apps in minutes."/>',
			"twitter:image" :   	'<meta name="twitter:image" content="https://marketcloudstatic01.blob.core.windows.net/images/grafica_adv_1.png" />',
		};
	},

	toString : function(o) {
		var s = '';
		if (o) {
			for (var k in o){
				s += o[k];
			}
		} else {
			for (var k in this.defaults){
				s += this.defaults[k];
			}
		}
		
		return s;
	}

}