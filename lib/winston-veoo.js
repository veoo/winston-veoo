(function() {
  var ErrorLevels, Schema, mongoose, redisClient, settings, util, winston;

  util = require('util');

  winston = require('winston');

  mongoose = require('mongoose');

  settings = require('../../src/settings');

  redisClient = new RedisClient().client;

  winston.remove(winston.transports.Console);

  ErrorLevels = require('./ErrorLevels');

  winston.add(winston.transports.Console, {
    timestamp: true,
    level: 'debug',
    colorize: true
  });

  winston.setLevels(ErrorLevels.levels);

  winston.addColors(ErrorLevels.colors);

  Schema = mongoose.Schema;

  settings.mongo_log_url(function(err, mongo_log_url) {
    var FatalEntry, LogEntry, MongooseFatalEntry, MongooseLogEntry, MongooseLogger, application_name, db;
    if (err) {
      return console.log("Could not connect to redis for dynamic mongo info " + err + ", " + mongo_log_url);
    } else {
      db = mongoose.createConnection(mongo_log_url, function(err) {
        if (err) {
          return console.log("could not connect to DB: " + err);
        }
      });
      LogEntry = new Schema({
        application_name: {
          type: String,
          index: true,
          required: true
        },
        level: {
          type: String,
          index: true
        },
        message: String,
        meta: {},
        timestamp: Date
      });
      FatalEntry = new Schema({
        application_name: {
          type: String,
          index: true,
          required: true
        },
        message: String,
        stack: String,
        timestamp: Date
      });
      MongooseLogEntry = db.model(settings.application_name + 'Log', LogEntry);
      MongooseFatalEntry = db.model('fatalerrors' + 'Log', FatalEntry);
      MongooseLogger = winston.transports.MongooseLogger = function(options) {
        this.name = 'MongooseLogger';
        return this.application_name = options.application_name || 'default';
      };
      util.inherits(MongooseLogger, winston.Transport);
      MongooseLogger.prototype.log = function(level, msg, meta, callback) {
        return redisClient.get("log_level:" + this.application_name, (function(_this) {
          return function(err, resp) {
            var fatal_entry, log_entry;
            if (err) {
              console.log("Error accessing Redis for log-levels!");
              return callback(true, "Redis log level error.");
            } else {
              if (resp === 'info' && level === 'debug') {
                return callback(null, 'dropped');
              } else if (level === 'fatal') {
                fatal_entry = new MongooseFatalEntry({
                  application_name: _this.application_name,
                  message: msg,
                  stack: meta,
                  timestamp: Date.now()
                });
                return fatal_entry.save(callback);
              } else {
                log_entry = new MongooseLogEntry({
                  application_name: _this.application_name,
                  level: level,
                  message: msg,
                  meta: meta,
                  timestamp: Date.now()
                });
                return log_entry.save(callback);
              }
            }
          };
        })(this));
      };
      application_name = settings.application_name || 'default';
      return winston.add(winston.transports.MongooseLogger, {
        application_name: application_name
      });
    }
  });

  exports.logger = winston;

}).call(this);
