Url      = require 'url'
redis_settings = require '../../../src/initializers/redis_settings' # has to be manually set to correct path
Redis    = require 'redis'

class RedisClient
  
  constructor: ->
    info = Url.parse redis_settings.redis_url 
    
    @client = Redis.createClient(info.port, info.hostname)
    if info.auth
      @client.auth info.auth.split(":")[1]
    @client.on "error", (err) ->
      console.log "Error #{err}"
    @client.on "connect", () =>
      console.log "Successfully connected to Redis"
      
exports.RedisClient = RedisClient


