const jwt = require('jsonwebtoken');
const { logger } = require('./logger.js'); 

const requestHandler = (handler) => async (req, res, next) => {
  logger.info(`[requestHandler] Request: ${req.method} ${req.originalUrl} (route: "${req.route.path}")`);
  try {
    let output = await handler(req, res);
    const status = output.requestStatus !== undefined ? output.requestStatus : 200;
    delete output.status;  
    // res.setHeader("Access-Control-Allow-Origin", "*");
    // res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, token, Accept");
    return res.status(status).json(output); // Pass the response status along with the output
  } catch (err) {
    // console.log(err)
    const json = {
      errorCode: err.errorCode,
      errorMessage: err.message,
      details: err,
    };

    if (err.statusCode) err.httpCode = err.statusCode;

    if (!err.httpCode) err.httpCode = 500;

    logger.error(`HTTP ${err.httpCode}`, json);
    return res.status(err.httpCode).json(json);
  }
};

module.exports = requestHandler;
