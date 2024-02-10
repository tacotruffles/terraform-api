const dayjs = require('dayjs');
const { logger } = require('./logger.js'); 
const userHelper = require('../helpers/userHelper') 
const encryption = require('../helpers/encryption')

const secureRequestHandler = handler => async (req, res, next) => {
  logger.info(`[requestHandler] Request: ${req.method} ${req.originalUrl} (route: "${req.route.path}")`);
  try {
    // res.setHeader("Access-Control-Allow-Origin", "*");
    // res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, token, Accept");
    if(req.headers.token) {
      const token = req.headers.token;
      const decoded = await encryption.decryptToken(token);

      if (decoded && decoded.data) {
        req.token = token;
        req.decodedToken = decoded;
        req.username = decoded.data;
        req.user = await userHelper.get(req.username, req.db);
      } else {
        return res.status(401).json({ msg: 'Token invalid.' });
      }
      
      if (decoded.exp < dayjs().unix()) {
        let error = new Error('Token expired.');
        return res.status(401).json({ msg: 'Token expired.' });
      }

      const output = await handler(req, res);
      const status = output.requestStatus !== undefined ? output.requestStatus : 200;
      delete output.status;  
      return res.status(status).json(output); // Pass the response status along with the output
    } 
    return res.status(403).json({msg: 'Token required.'});
  } catch (e) {
    next(e);
  }
};

module.exports = secureRequestHandler;