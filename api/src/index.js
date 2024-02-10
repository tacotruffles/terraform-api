
const bodyParser = require('body-parser');
const express = require('express');
const cors = require('cors');
const { Config } = require('./lib/config');
const { logger } = require('./lib/logger');
const errorHandler = require('./lib/errorHandler');
const routesV1 = require('./api/v1/routes');
const http = require('http');
const app = express();
let isLambda = require('is-lambda');
const client = require("./helpers/mongoHelper");
let mongo = null;

require('./api/v1/data/globals.js');
app.use(cors());

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());
app.use(bodyParser.raw());

async function initMongo() {
  if (!mongo) {
    mongo = await client();
    console.log("mongo connected")
  }
}

const db = async function (req, res, next) {
  if (!mongo) {
    await initMongo();
  }
  if (mongo) {
    req.db = mongo.db(process.env.MONGO_DATABASE)
  }
  next()
}

app.use(db)

// API routes
app.use(`${process.env.API_AWS_GW_STAGE}/api/v1`, routesV1);

// Define error handling. This needs to be after other app.use() calls.
app.use(errorHandler);

app.get('*', async (req, res) => {
  const method = req.method;
  const route = req.originalUrl;
  console.log(method + route)
  res.status(404).json({})
});

app.post('*', async (req, res) => {
  const method = req.method;
  const route = req.originalUrl;

  res.status(404).json({})
});

app.put('*', async (req, res) => {
  const method = req.method;
  const route = req.originalUrl;

  res.status(404).json({})
});
app.delete('*', async (req, res) => {
  const method = req.method;
  const route = req.originalUrl;

  res.status(404).json({})
});

app.options('*', async (req, res) => {
  const method = req.method;
  const route = req.originalUrl;

  res.status(200).json({})
});

// Server configuration
if (!isLambda) {
  let server = null;
  const { port, dbConnectUrl } = Config;
  app.set('port', port);

  logger.info('Creating HTTP server');
  server = http.createServer(app);

  // listen on provided ports
  (async function startServer() {
    server.listen(port, () => {
      console.log(`Listening on port ${port}`);
    });
  })();
}

module.exports = app; 