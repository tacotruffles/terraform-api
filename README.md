# API - Layer 3 - IaC

## Prereqs

Repo Secrets:

* `AWS_ACCESS_KEY_ID`: AWS CLI deployment user access key
* `AWS_SECRET_ACCESS_KEY`: AWS CLI deployment user secret key
* `API_STAGE_DOTENV`: Stage pipeline `.env` file contents
* `API_PROD_DOTENV`: Prod pipeline `.env` file contents

# Stand up CI/CD pipeline and IaC

* Create `stage` and `prod` branches as needed to deploy IaC and application pipelines
* Subsequent merges into the each branch will build and deploy the API application in the typical CI/CD pattern.

# Test VPC/Static IP

1. Retrieve `api_base_url` and `whitelist_ip` from `Terraform Apply` log entry from GitHub Actions console.
2. Use browser to load test URL: `<api_base_url>/getip`
3. Response should contain `whitelist_ip`: `{"message":"Static IP: <whitelist_ip>","httpMethod":"GET","resource":"$default","path":"/stage/getip"}`
