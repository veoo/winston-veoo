(function() {
  var Redis, RedisClient, Url, redis_settings;

  Url = require('url');

  redis_settings = require('../../../src/initializers/redis_settings');

  Redis = require('redis');

  RedisClient = (function() {
    function RedisClient() {
      var info;
      info = Url.parse(redis_settings.redis_url);
      this.client = Redis.createClient(info.port, info.hostname);
      if (info.auth) {
        this.client.auth(info.auth.split(":")[1]);
      }
      this.client.on("error", function(err) {
        return console.log("Error " + err);
      });
      this.client.on("connect", (function(_this) {
        return function() {
          return console.log("Successfully connected to Redis");
        };
      })(this));
    }

    return RedisClient;

  })();

  exports.RedisClient = RedisClient;

}).call(this);
