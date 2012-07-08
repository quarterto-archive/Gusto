# router.co
{Config} = require "../main"
{signal} = require "../mvc/signal"
url = require \url
#{flip,each,obj-to-func,map} = require \prelude-ls

methods = <[ head get post put trace delete options patch ]>

every-method = map _,methods

class exports.NotFound extends Error
	-> super "Could not route #it"

class Aliases
	every-method (m)->::[m] = []
	add: (obj)->
		|typeof obj is \string => every-method (m)~>
			@[m].unshift obj
		|otherwise=> for m,url of obj=> @[m].unshift url
	set-method: (skip)-->
		every-method (m)~> when m is not skip => @[m] = []

class exports.Route
	(@method = '*',@path,@action)->
		@method .=to-upper-case!
		action.to-string = action.route = @~reverse
	equals: (other)->
		return all id,zip-with (==), @[\method,\path], other[\method,\path]
	to-string: -> "#{@method.to-upper-case!} #{@path}"
	match: (request)->
		return false unless @method in ['*',request.method]
		reqparts = request.path.substr 1 .split '/'
		searchparts = @path.split '/'

		params = {}
		for part,i in searchparts
			reqpart = reqparts.shift!
			if part.0 is '#'
				params[part.substr 1] = reqpart
			else
				if reqpart is not part then return false
		if @action.expects?
			for own param,type of @action.expects
				val = request.post[param]
				or    request.get[param]
				or    params[param]
				or    reqparts.shift!
				params[param] = new type val
		else params <<< request.get <<< request.post
		return params

	reverse: (params)->
		...
exports.alias = (obj,func)->
	(func.aliases ?= new Aliases).add obj
	return func

every-method (method)->
	exports[method] = (id,func)->
		| typeof id is \string => return exports.alias (method):id,func
		| otherwise => (id.aliases ?= new Aliases).set-method method
		return id

class exports.Router
	@routers = []
	@route = (req)->
		concat-map (router)->
			map (route)->
				if route.match req =>{route.action,params:that}
				else new NotFound req.url
			,router.routes
		,@routers
	routes: []
	-> ..routers.push @
	register: (method,path,action)-->
		| method.to-lower-case! in '*' & methods =>
			route = new Route method,path,action
			eq = route~equals
			if find eq, @routes
				that{action} = route
			else @routes.push route
		| otherwise => throw new Error "invalid method #method"
	add: (path,action)->
		if action.aliases?
			zip-with (method,paths)~>
				each (~> @register method,it,action),paths
			,methods,every-method action.aliases
			
		@~register '*',path,action

	every-method (method)->::[method] = ::register method

	use: (obj,re=true)->
		if re and obj.reload?
			obj.reload.connect ~> @use obj,false

		for own path, func of obj
			@add path, func

