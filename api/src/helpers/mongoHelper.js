const MongoClient = require('mongodb').MongoClient;
const isLambda = require('is-lambda');

// See README.md for jumphost command when standing up locally
const host = (isLambda) ? process.env.MONGODB_HOST : "localhost"; 
const port = process.env.MONGODB_PORT;
const user = process.env.MONGODB_USERNAME;
const pass = process.env.MONGODB_PASSWORD;
const db = process.env.MONGODB_DATABASE;
const localParams = (isLambda) ? '' : '&directConnection=true'; // for MacOS/local stand-up connection issues

// Allow invalid hostnames with the SSL cert so that localhost port mapping works when running locally
const connectUrl = `mongodb://${user}:${pass}@${host}:${port}/${db}?tls=true&tlsAllowInvalidHostnames=true&retryWrites=false&w=majority${localParams}`;

// Use connect method to connect to the server
const mongo = async () => {
  console.log(`connected to mongo: ${host}:${port}`);
  // Connect to DocumentDB with the CA Cert Bundle provide by AWS
  // Must be placed in root of project folder and availble via `wget` command as documented here: 
  // https://docs.aws.amazon.com/documentdb/latest/developerguide/connect-from-outside-a-vpc.html
  return MongoClient.connect(connectUrl, { tls: true, tlsCAFile: "global-bundle.pem"}); 
}

module.exports = mongo;
