# REST API

REST API service.

### Setup

Node.js 16.x required. 

npm install -g nodemon

`$ npm install`

### Local Setup for Environment Variables

1) Be sure to get a current .env file from the lead developer
2) Be sure you have a .pem file for ssh for this project
3) Be sure you have rds-combined-ca-bundle.pem from AWS
4) Update the .env file variable LOCALMONGO_URL to point to the two .pem files
5) if wanting to reach the prod database, you need to update the .env file variable MONGODB_URI (default is stage db)

##### Run in development mode

Without debuggging:
`$ npm start`

This fires up the API server. Source file changes have immediate effect.

# HOW TO DEPLOY API

TBD

# IF API URL CHANGES 

In the rare case that serverless generates a new Labmda url different from the ones below. Be sure to update the `constants.js` file in `www` to reflect the new url.

STAGE: 
PROD: 

Additionally, if url changes, check the Lambda's role includes the `SecretsManagerReadWrite` policy, so that AWS keys can be retrieved for S3 uploads

## CREATE LOCAL CREDENTIALS FOR AWS
A one-time configuration for AWS-CLI credentials is required

```
$ aws configure --profile <profilename>
```
 In this project, the deployment scripts are expecting `<profilename>` to be `aiai`