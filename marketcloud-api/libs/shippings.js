test
var testShippingMethodAgainstOrderData = function(method, items, address) {
	{
    "_id" : ObjectId("5703be6a7d4b640410a433dd"),
    "availability" : "ALL",
    "base_cost" : 10,
    "per_item_cost" : 1,
    "zones" : [ 
        {
            "name" : "Europe",
            "code" : "EUROPE"
        }
    ],
    "rules" : [ 
        {
            "name" : "total_value_gt",
            "value" : 1
        }
    ],
    "name" : "TNT TRACO BURRACO CIOCCOLATO",
    "id" : 15537,
    "application_id" : 14705
}
	var result = true;
	method.rules.forEach(function(rule){
		
	})
}


function testRuleAgainstItems(rule,items) {
	switch (rule.name) {
			case "total_value_lt":
				return rule.value >= items.map(x => {return x.price*x.quantity}).reduce((a,b) => {return a+b} )
			break;
			case "total_value_gt":
				return rule.value <= items.map(x => {return x.price*x.quantity}).reduce((a,b) => {return a+b} )
			break;
			case "total_weight_lt":
				return rule.value >= items.map(x => {return x.weight || 0}).reduce((a,b) => {return a+b} )
			break;
			case "total_weight_gt":
				return rule.value <= items.map(x => {return x.weight || 0}).reduce((a,b) => {return a+b} )
			break;
			case "total_height_lt":
				return rule.value >= items.map(x => {return x.height || 0}).reduce((a,b) => {return a+b} )
			break;
			case "total_height_gt":
				return rule.value <= items.map(x => {return x.height || 0}).reduce((a,b) => {return a+b} )
			break;
			case "total_depth_lt":
				return rule.value >= items.map(x => {return x.depth || 0}).reduce((a,b) => {return a+b} )
			break;
			case "total_depth_gt":
				return rule.value <= items.map(x => {return x.depth || 0}).reduce((a,b) => {return a+b} )
			break;
			case "total_width_gt":
				return rule.value >= items.map(x => {return x.width || 0}).reduce((a,b) => {return a+b} )
			break;
			case "total_width_lt":
				return rule.value <= items.map(x => {return x.width || 0}).reduce((a,b) => {return a+b} )
			break;

	}
}