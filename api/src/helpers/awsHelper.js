/* eslint-disable */
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const {
  // S3,
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  // ListObjectsCommand,
  // ListObjectsRequest,
} = require('@aws-sdk/client-s3');

const isLambda = require('is-lambda');

const region = process.env.AWS_REGION;

const awsHelper = {
    configS3Client: async function() {
      const clientConfig = { signatureVersion: 'v4', region }

      // Pass Lambda's IAM S3 Policy via AWS keys if this code is executed within AWS Lambda
      // Otherwise, rely on the AWS_PROFILE .env variable to run locally - i.e use AWS CLI credentials
      if (isLambda) clientConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN
      }

      return new S3Client(clientConfig);
    },
    getSignedPutUrl: async function(key, videoType, name, lessonDate, videoId, classId) {
        try{
          const s3Client = await this.configS3Client();

          let request = {
            Bucket: process.env.S3_UPLOAD_BUCKET,
            Key: key,  
            // Expires: parseInt(process.env.S3_UPLOAD_EXPIRATION),
            ContentType: videoType,
            Metadata: {
              "environment": process.env.NODE_ENV,
              "lesson-id": videoId.toString(),
              "lesson-name": name,
              "lesson-date": lessonDate,
              "class-id": classId,
              "version": "01"
            }
          };
            
          const command = new PutObjectCommand(request);
          const url = await getSignedUrl(s3Client, command, {
            expiresIn: parseInt(process.env.S3_UPLOAD_EXPIRATION),
          });
          return url; 
        }
        catch(ex){
            console.log(ex);
        }
    },
    getSignedGetUrl: async function(key) {
      try{
        const s3Client = await this.configS3Client();

        let request = {
            Bucket: process.env.S3_UPLOAD_BUCKET,
            Key: key,  
            // Expires: parseInt(process.env.S3_UPLOAD_EXPIRATION)
        };

        const command = new GetObjectCommand(request);
        const url = await getSignedUrl(s3Client, command, {
          expiresIn: parseInt(process.env.S3_UPLOAD_EXPIRATION),
        });
        console.log(url);
        return url;
      }
      catch(ex){
        console.log(ex);
      }
  }
}

module.exports = awsHelper;