/* eslint-disable */
const AWS = require('aws-sdk');
const encryption = require('./encryption');
const { response } = require('express');

const awsHelper = {
    configS3Client: async function() {
      const region = process.env.SM_REGION;

      // When running locally use the local AWS CLI profile config
      if(process.env.NODE_ENV === 'local'){
        const credentials = new AWS.SharedIniFileCredentials({profile: process.env.AWS_PROFILE});
        AWS.config.credentials = credentials;
      } else { // Otherwise use value stored in Secrets Manager
        const secretName = process.env.SM_NAME;
        
        const client = new AWS.SecretsManager({
          region: region
        });

        const smResult = await new Promise(async (resolve, reject) => { 
          client.getSecretValue({SecretId: secretName}, function(err, data) {
            let secret, decodedBinarySecret = null;
            if (err) {
                console.log('Secrets Manager Error: ', err.code);
            }
            else {
                // Decrypts secret using the associated KMS CMK.
                // Depending on whether the secret is a string or binary, 
                // one of these fields will be populated.
                if ('SecretString' in data) {
                    secret = data.SecretString;
                    // console.log('string: ', secret);
                    return resolve(JSON.parse(secret));
                } else {
                    let buff = new Buffer(data.SecretBinary, 'base64');
                    decodedBinarySecret = buff.toString('ascii');
                    // console.log('decoded: ',decodedBinarySecret);
                    return resolve(JSON.parse(decodedBinarySecret));
                }
            }

            return resolve({ });
          });
        });

        // Set the AWS credentials retrieved from Secrets Manager
        AWS.config.credentials = (smResult && smResult.KEY) ? { accessKeyId: smResult.KEY, secretAccessKey: smResult.SECRET } : {};
      }

      AWS.config.update({region: region});
      let s3 = new AWS.S3({apiVersion: '2006-03-01', signatureVersion: 'v4' });

      return s3;
    },
    configSNSClient: async function() {
      const region = process.env.SM_REGION;

      // When running locally use the local AWS CLI profile config
      if(process.env.NODE_ENV === 'local'){
        const credentials = new AWS.SharedIniFileCredentials({profile: process.env.AWS_PROFILE});
        AWS.config.credentials = credentials;
      } else { // Otherwise use value stored in Secrets Manager
        const secretName = process.env.SM_NAME;
        const client = new AWS.SecretsManager({
          region: region
        });

        const smResult = await new Promise(async (resolve, reject) => { 
          client.getSecretValue({SecretId: secretName}, function(err, data) {
            let secret, decodedBinarySecret = null;
            if (err) {
                console.log('Secrets Manager Error: ', err.code);
            }
            else {
                // Decrypts secret using the associated KMS CMK.
                // Depending on whether the secret is a string or binary, 
                // one of these fields will be populated.
                if ('SecretString' in data) {
                    secret = data.SecretString;
                    // console.log('string: ', secret);
                    return resolve(JSON.parse(secret));
                } else {
                    let buff = new Buffer(data.SecretBinary, 'base64');
                    decodedBinarySecret = buff.toString('ascii');
                    // console.log('decoded: ',decodedBinarySecret);
                    return resolve(JSON.parse(decodedBinarySecret));
                }
            }

            return resolve({ });
          });
        });

        // Set the AWS credentials retrieved from Secrets Manager
        AWS.config.credentials = (smResult && smResult.KEY) ? { accessKeyId: smResult.KEY, secretAccessKey: smResult.SECRET } : {};
      }

      AWS.config.update({region: region});
      let sns = new AWS.SNS({apiVersion: '2010-03-31'});
      return sns;
    },
    getSignedPutUrl: async function(key, videoType) {
        try{
        const s3 = await this.configS3Client();

        let request = {
            Bucket: process.env.S3_UPLOAD_BUCKET,
            Key: key,  
            Expires: parseInt(process.env.S3_UPLOAD_EXPIRATION),
            ContentType: videoType
          };
          return await s3.getSignedUrl('putObject', request); 
        }
        catch(ex){
            console.log(ex);
        }
    },
    getSignedGetUrl: async function(key) {
      try{
        const s3 = await this.configS3Client();

        let request = {
            Bucket: process.env.S3_UPLOAD_BUCKET,
            Key: key,  
            Expires: parseInt(process.env.S3_UPLOAD_EXPIRATION)
        };
          return await s3.getSignedUrl('getObject', request); 
      }
      catch(ex){
        console.log(ex);
      }
  },
  sendTwoFactorAuth: async function(user){
    try {
        const sns = await this.configSNSClient();
        let randString = '';
        let characters = '0123456789';
        let charactersLength = characters.length;
        let phone = ''
        for ( let i = 0; i < 6; i++ ) { randString += characters.charAt(Math.floor(Math.random() * charactersLength));}
        if(user.phone.length == 10){
          phone = '+1' + user.phone;
        }
        else{
          phone = '+' + user.phone
        }
        let request = {
          Message: `${randString} is your code for Cultivate Belonging Collaborative`,
          PhoneNumber: phone,
          MessageAttributes: {
            'AWS.SNS.SMS.SMSType': {
               DataType: 'String',
               StringValue: 'Transactional'
            }
         }
        }
        try{
          console.log('sending sns')
          await sns.publish(request).promise();
          let encryptedString = await encryption.encryptPassword(randString);
          let response = {
            statusCode: 200,
            body: JSON.stringify({
              message: 'SMS sent successfully',
              code: encryptedString
          })
        };
        return response
        }
        catch(ex){
          console.log(ex)
          let response = {
            statusCode: 500,
            body: JSON.stringify({
              message: 'SMS not sent'
          })
        };
        return response
      }
    }
    catch(ex){
      console.log(ex)
    }
  },
  sendFeedbackNotificationText: async function(textInfo){
    try {
      console.log(textInfo)
        const sns = await this.configSNSClient();
        let phone = ''
        if(textInfo.phone.length == 10){
          phone = '+1' + textInfo.phone;
        }
        else{
          phone = '+' + textInfo.phone
        }
        let request = {
          Message: `${textInfo.feedbackMessage}`,
          PhoneNumber: phone,
          MessageAttributes: {
            'AWS.SNS.SMS.SMSType': {
                DataType: 'String',
                StringValue: 'Transactional'
            }
          }
        }
        try{
          console.log('sending sns', request)
          await sns.publish(request).promise();
          let response = {
            statusCode: 200,
            body: JSON.stringify({
              message: 'SMS sent successfully'
          })
        };
        return response
        }
        catch(ex){
          console.log(ex)
          let response = {
            statusCode: 500,
            body: JSON.stringify({
              message: 'SMS not sent'
          })
          };
          return response
        }
      }
      catch(ex){
        console.log(ex)
        let response = {
          statusCode: 500,
          body: JSON.stringify({
            message: 'SMS not sent'
          })
        };
        return response
      }
    },          
  twoFactorCheck: async function(body){
    try{
      let decryptedString = await encryption.isPasswordMatch(body.userCode, body.actualCode);
      if(decryptedString){
        let response = {
          statusCode: 200,
          body: JSON.stringify({
            success: true
        })
      };
      return response
      }
      else{
        let response = {
          statusCode: 200,
          body: JSON.stringify({
            success: false
        })
      };
      return response
      }
    }
    catch(ex){
      console.log(ex)
    }
  }
}

module.exports = awsHelper;