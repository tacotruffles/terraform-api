const { logger } = require('./logger');
const Err = require('./errors');

// This is our error handling middleware. Any errors that are thrown by the API should
// be caught here. It's important that it have the signature (err, req, res, next)
// so that Express recognizes it as an error handler.

// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, next) {
  if (
    err instanceof Err.InvalidIngestDatabase ||
    err instanceof Err.InvalidIngestTables
  ) {
    res.status(400).json({ error: err.message });
  } else if (err instanceof Err.MissingResource) {
    res.status(404).json({ error: err.message });
  } else { 
    res.status(500).json({ error: err.name });
  }
};
