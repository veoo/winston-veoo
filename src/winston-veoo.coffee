util = require 'util'
winston = require 'winston'
mongoose = require 'mongoose'
settings = require '../../../app/settings' # needs to be set to relative path
winston.remove(winston.transports.Console)
ErrorLevels = require './error_levels'
winston.add(winston.transports.Console, {timestamp: true, level: 'debug', colorize: true})
winston.setLevels(ErrorLevels.levels)
winston.addColors(ErrorLevels.colors)

log_levels_defn = {debug: 4, info: 3, error: 2, fatal: 1}

Schema = mongoose.Schema

settings.mongo_log_url((err, mongo_log_url, connection_options) ->
  if err
    console.log("Could not connect to redis for dynamic mongo info #{err}, #{mongo_log_url}, #{connection_options}")
  else
    connection_options ?= {}
    db = mongoose.createConnection(mongo_log_url, connection_options, (err) ->
      if err
        console.log("could not connect to DB: " + err)
    )

    # This is a log entry.
    LogEntry = new Schema(
      application_name: {type: String, index:true, required: true}
      level: {type: String, index:true}
      message: String
      meta: {}
      timestamp: Date
    )

    FatalEntry = new Schema(
      application_name: {type: String, index:true, required: true}
      message: String
      stack: String 
      timestamp: Date
    )

    MongooseLogEntry = db.model(settings.application_name + 'Log', LogEntry)
    MongooseFatalEntry = db.model('fatalerrors' + 'Log', FatalEntry)


    MongooseLogger = winston.transports.MongooseLogger = (options) ->
      @name = 'MongooseLogger'
      @application_name = options.application_name || 'default'
      @level = options.level || 'debug'
  


    util.inherits(MongooseLogger, winston.Transport)

    # Store this message and metadata, maybe use some custom logic
    # then callback indicating success.
    MongooseLogger.prototype.log = (level, msg, meta, callback) ->
      redisClient.get("log_level:#{@application_name}", (err, resp) =>
        if err 
          console.log("Error accessing Redis for log-levels!")
          callback(true, "Redis log level error.")
        else
          log_level_redis = log_levels_defn[resp]
          log_level_actual = log_levels_defn[level]

          if log_level_actual == 1
            fatal_entry = new MongooseFatalEntry({application_name: @application_name, message: msg, stack: meta, timestamp: Date.now() })
            fatal_entry.save callback
          else if log_level_actual <= log_level_redis
            log_entry = new MongooseLogEntry({application_name: @application_name, level: level, message: msg, meta: meta, timestamp: Date.now()})
            log_entry.save callback
          else
            callback(null, 'dropped')
      )


    application_name = settings.application_name || 'default'
    winston.add(winston.transports.MongooseLogger, {application_name: application_name})
    

)


exports.logger = winston


