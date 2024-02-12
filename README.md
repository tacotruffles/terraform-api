# API - Layer 3: RESTful API for front-end console

## Pattern

A Node.Js RESTful API deployed on a single Lambda behind an API Gateway:

* JWT authentication
* DocumentDB connection string for local and deployed behaviors
* API URL output for use in the `www` repo

## Prereqs

Repo Secrets:

* `AWS_ACCESS_KEY_ID`: AWS CLI deployment user access key
* `AWS_SECRET_ACCESS_KEY`: AWS CLI deployment user secret key
* `API_STAGE_DOTENV`: Stage pipeline `.env` file contents
* `API_PROD_DOTENV`: Prod pipeline `.env` file contents

## Stand Up CI/CD Pipeline

* Create `stage` and `prod` branches as needed to deploy IaC and application pipelines
* Subsequent merges into the each branch will build and deploy the API application in the typical CI/CD pattern.

## Teardown Process

Before tearding down the labmda deployment, the higher levels of the stack must be torn down first: `www`

1. Create the following branch name to tear down the corresponding environment: i.e. `destroy-stage` or `destroy-prod`
2. All S3 upload buckets will be preserved so it can be imported later
3. DBs are not created as part of the Terraform Infrastruce so the same connection strings is used to stand data back up
4. The state file buckets are untouched as they were created with a sepereate Terraform processing on the `seed` branch so re-seeding will not be necessary to recover staging or production.