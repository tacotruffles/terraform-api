const dotenv = require('dotenv');

// Initialize dotenv
dotenv.config();

const DEFAULT_LOG_LEVEL = (process.env.NODE_ENV === 'test') ? 'error' : 'debug';

const Config = {
  // Env and Logging Config
  port: process.env.PORT,
  dbConnectUrl: process.env.MONGODB_URI,
  Log: process.env.LOG || 'console',
  LogDirectory: process.env.LOG_DIRECTORY,
  fileLogLevel: process.env.FILE_LOG_LEVEL || DEFAULT_LOG_LEVEL,
  consoleLogLevel: process.env.CONSOLE_LOG_LEVEL || DEFAULT_LOG_LEVEL,
}
module.exports = { Config };
