const moment = require('moment');
const winston = require('winston');
const { Config } = require('./config');

function createLogger() {
  const transports = [];
  if (!Config.Log || Config.Log.toLowerCase().includes('console')) {
    transports.push(new (winston.transports.Console)({
      json: false,
      timestamp: true,
      level: Config.consoleLogLevel ? Config.consoleLogLevel : 'info',
      prettyPrint: true,
      colorize: true,
    }));
  }

  if (!!Config.Log && Config.Log.toLowerCase().includes('file')) {
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss Z');
    transports.push(new winston.transports.File({
      filename: `${Config.LogDirectory}/engine${timestamp}.log`,
      json: false,
      level: `${Config.fileLogLevel}`,
      prettyPrint: true,
    }));
  }
  const levels = {
    error: 0,
    info: 1,
    debug: 2,
  };
  const colors = {
    error: 'red',
    info: 'green',
    debug: 'gray',
  };
  const logger = winston.createLogger({ transports, levels, exitOnError: false });
  winston.addColors(colors);
  return logger;
}

const logger = createLogger();

module.exports = { logger };
