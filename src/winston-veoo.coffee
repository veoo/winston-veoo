util = require 'util'
winston = require 'winston'
mongoose = require 'mongoose'
settings = require './settings' # needs to be set to relative path
winston.remove(winston.transports.Console)
ErrorLevels = require './ErrorLevels'
winston.add(winston.transports.Console, {timestamp: true, level: 'debug', colorize: true})
winston.setLevels(ErrorLevels.levels)
winston.addColors(ErrorLevels.colors)


Schema = mongoose.Schema

settings.mongo_log_url((err, mongo_log_url) ->
  if err
    console.log("Could not connect to redis for dynamic mongo info #{err}, #{mongo_log_url}")
  else
    db = mongoose.createConnection(mongo_log_url, (err) ->
      if err
        console.log("could not connect to DB: " + err)
    )

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
      # @level = options.level
  


    util.inherits(MongooseLogger, winston.Transport)

    # Store this message and metadata, maybe use some custom logic
    # then callback indicating success.
    MongooseLogger.prototype.log = (level, msg, meta, callback) ->
      redisClient.get("log_level:#{@application_name}", (err, resp) =>
        if err 
          console.log("Error accessing Redis for log-levels!")
          callback(true, "Redis log level error.")
        else
          if resp is 'info' and level is 'debug'
            # do nothing
            callback(null, 'dropped')
          else if level is 'fatal'
            # write to fatalerrors
            fatal_entry = new MongooseFatalEntry({application_name: @application_name, message: msg, stack: meta, timestamp: Date.now() })
            fatal_entry.save callback
          else
            log_entry = new MongooseLogEntry({application_name: @application_name, level: level, message: msg, meta: meta, timestamp: Date.now()})
            log_entry.save callback
      )


    application_name = settings.application_name || 'default'
    winston.add(winston.transports.MongooseLogger, {application_name: application_name})
    

)


exports.logger = winston


