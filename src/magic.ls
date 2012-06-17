Q = require \q
crypto = require \crypto
{Log} = require "./log"
{Server} = require "./server/server"

exports.async = -> it.async!
exports.future = -> it.future!

exports.sync-promise = exports.async function sync-promise pr
	return pr.then.sync pr

exports.promise-future = exports.async promise-future(fu)=
	out = Q.defer!
	process.nextTick ->
		out.resolve fu.result
	return out.promise

class exports.sync-stream
	$buffer: null
	(@read,length)~>
		offset = 0
		@$buffer = new Buffer length or 1024
		@read.on \error, (e)-> throw e
		@read.on \data, (chunk)~>
			if chunk.length > @$buffer.length - offset
				bigger = new Buffer @$buffer.length+1024
				@$buffer.copy bigger
				@$buffer = bigger
			
			chunk.copy @$buffer,offset
			offset += chunk.length

	out: exports.async ->
		@read.on.sync @read,"end"
		return @$buffer

class exports.future-stream extends sync-stream
	-> super ...
	out: ->
		super.future this

exports.handle = (func)->
	trapped = {}
	!(...args)->
		hash = crypto.create-hash 'sha1'
		for a in args
			hash.update (a?.to-string! or 'undefined')
		id = hash.digest 'hex'
		try
			r = func ...
			if trapped[id]?
				trapped[id].resolve!
				delete trapped[id]
			return r
		catch
			trapped[id] = Q.defer!
			Log.error e.message
			console.log e.stack
			Server.hijack id,trapped[id].promise, {
				body: [e.message]
				status: 500
			}