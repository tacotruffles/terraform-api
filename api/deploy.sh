echo "Deploying to: $1 ..."
npm install 
serverless deploy --stage $1
echo "End $1 Deployment"