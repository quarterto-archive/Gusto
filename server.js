const config = require.main.exports.config,
http = require("http"),
router = require("router.js"),
static = require("static.js"),
list = require("mvc/list.js"),
url = require("url"),
path = require("path"),
querystring = require("querystring"),
fs = require("fs"),
vm = require("vm"),
data = fs.readFileSync(path.join(config.appDir,"conf","routes.conf")).toString(),
routes = data.split(/[\n\r]/).map(function(line) {
	var parts = line.split(/\s+/);
	if(line.startsWith("#")) return;
	if(parts.length < 2) return;
	if(!["*","HEAD","GET","POST","PUT","TRACE","DELETE","OPTIONS","PATCH"].some(parts[0]))
		throw new SyntaxError("Invalid HTTP method "+parts[0]);
	parts[2] = vm.createScript(parts[2],parts[1]);
	return parts;
}).compact();
const server = http.createServer(function(req,res) {
	var body = new Buffer(req.headers['content-length'] || 0),
	off = 0,
	match = [];
	if(req.method == "POST") {
		req.on("data",function(chunk) {
			off = body.write(chunk,off);
		});
	}
	try {
		match = routes.map(require("router.js")
		                  .bind(null,req,res))
		                  .compact();
	} catch(e) {
		console.log(e);
	}
	req.on("end", function() {
		var post = {}, get = url.parse(req.url,true).query;
		if(off) {
			post = querystring.parse(body.toString());
		}
		if(match.length) {
			match[0](get.merge(post));
			res.on("finishRender",function(data,opts) {
				opts = opts || {};
				res.writeHead(
					opts.status || 200,
					'Content-Type',opts.type || "text/html"
				);
				res.end(data);
			});
		} else {
			console.log("NO ROUTE:",req.url);
			//console.log(req);
		}
	});
}),
port = config[require.main.exports.mode].port || 8000;
exports.go = function() {
	if("address" in config[require.main.exports.mode]) {
		server.listen(
			port,
			config[require.main.exports.mode].address,
			console.log.bind(null,
				"Listening on %s:%d",
				config[require.main.exports.mode].address,
				port
			)
		);
	} else {
		server.listen(
			port,
			console.log.bind(null,
				"Listening on *:%d",
				port
			)
		);
	}
};