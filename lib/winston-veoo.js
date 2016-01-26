(function() {
  var ErrorLevels, Schema, log_levels_defn, mongoose, settings, util, winston;

  util = require('util');

  winston = require('winston');

  mongoose = require('mongoose');

  settings = require('../../../app/settings');

  winston.remove(winston.transports.Console);

  ErrorLevels = require('./error_levels');

  winston.add(winston.transports.Console, {
    timestamp: true,
    level: 'debug',
    colorize: true
  });

  winston.setLevels(ErrorLevels.levels);

  winston.addColors(ErrorLevels.colors);

  log_levels_defn = {
    debug: 4,
    info: 3,
    error: 2,
    fatal: 1
  };

  Schema = mongoose.Schema;

  settings.mongo_log_url(function(err, mongo_log_url, connection_options) {
    var FatalEntry, LogEntry, MongooseFatalEntry, MongooseLogEntry, MongooseLogger, application_name, db;
    if (err) {
      return console.log("Could not connect to redis for dynamic mongo info " + err + ", " + mongo_log_url + ", " + connection_options);
    } else {
      if (connection_options == null) {
        connection_options = {};
      }
      db = mongoose.createConnection(mongo_log_url, connection_options, function(err) {
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
        this.application_name = options.application_name || 'default';
        return this.level = options.level || 'debug';
      };
      util.inherits(MongooseLogger, winston.Transport);
      MongooseLogger.prototype.log = function(level, msg, meta, callback) {
        return redisClient.get("log_level:" + this.application_name, (function(_this) {
          return function(err, resp) {
            var fatal_entry, log_entry, log_level_actual, log_level_redis;
            if (err) {
              console.log("Error accessing Redis for log-levels!");
              return callback(true, "Redis log level error.");
            } else {
              log_level_redis = log_levels_defn[resp];
              log_level_actual = log_levels_defn[level];
              if (log_level_actual === 1) {
                fatal_entry = new MongooseFatalEntry({
                  application_name: _this.application_name,
                  message: msg,
                  stack: meta,
                  timestamp: Date.now()
                });
                return fatal_entry.save(callback);
              } else if (log_level_actual <= log_level_redis) {
                log_entry = new MongooseLogEntry({
                  application_name: _this.application_name,
                  level: level,
                  message: msg,
                  meta: meta,
                  timestamp: Date.now()
                });
                return log_entry.save(callback);
              } else {
                return callback(null, 'dropped');
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
