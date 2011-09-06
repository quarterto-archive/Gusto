importPackage(java.io);
require("extend.js").extend(Object,String,Array);
var buffer;
exports.fromFiles = function(folder,skip) {
	var files = new File(folder).listFiles()
	                .filter(function(f) f.getName().substr(-3) == ".js"),
	    objects = {};
	for each(let file in files) {
		if(file.getName() === skip) continue;
		let basename = file.getName().substring(0,file.getName().length()-3)
		objects[basename] = require(file.getPath())[basename];
	}
	return objects;
};
exports.init = function(base) {
	if(typeof base != "undefined") {
		var name = new File(base).getName(),
		    thing = name.substr(0,name.length()-3);
	}
	return {
		fromFiles: exports.fromFiles,
		models: function(id) exports.fromFiles("app/models",id),
		controllers: function(id) exports.fromFiles("app/controllers",id),
		setBuffer: function(b) buffer = b,
		getBuffer: function() buffer,
		controller: function(actions) {
			//print(controller)
			spec = {
				"renderJSON": function(action,args) {
					buffer.append(JSON.stringify(args));
				},
				"render": function(action,args,other) {
					[action,args] = Object.isString(args) ? [args,other] : [action,args];
					args = Object.isUndefined(args) ? {} : args;
					buffer.append(thing+"\n");
					buffer.append(action+"\n");
					buffer.append(JSON.stringify(args));
					
				}
			};
			for each(let [name,action] in Iterator(actions)) {
				let context = {};
				for each(let [k,v] in Iterator(spec)) {
					context[k] = v.bind(context,name);
				}
				spec[name] = action.bind(context);
			}
			return spec;
		},
		model: function(model,spec) {
			//print(model)
			return {
				create: function(params) {
					for each(let [k,v] in Iterator(spec)) {
						var type = v;
						if(!Object.isFunction(type)) {
							if(Object.isArray(type) && Object.isFunction(type[0])) {//TODO: arrays
								type = type[0];
							} else throw new TypeError("Must be a constructor or array constructor");
						}
						this[k] = new type(params[k]);
					}
					return this;
				}
			}
		}
	};
};