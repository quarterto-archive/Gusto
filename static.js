const util = require("util"),
fs = require("fs"),
pathutil = require("path"),
mime = require("mime");

exports.file = function(path) {
	try {
		var read = fs.createReadStream(path);
		util.pump(read,this.result,function(error) {
			if(error) throw error;
		});
		this.result.emit("finishRender",null,{type:mime.lookup("path")});
	} catch(e) {
		this.result.emit("finishRender",null,{status:404});
	}
};
exports.file.id = "static.file";
exports.dir = function(dir,vars) {
	exports.file(pathutil.join(dir,vars.file));
};

exports.dir.id = "static.dir";