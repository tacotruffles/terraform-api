// var bcrypt = require('bcrypt');
var bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const SALT_LENGTH = parseInt(process.env.SALT_LENGTH);
const JWT_KEY_EXPIRES = process.env.JWT_KEY_EXPIRES;
 
const encryption = {
    encryptPassword: async function(password){
        try { 
            const salt = await bcrypt.genSalt(SALT_LENGTH); 
            const hash = await bcrypt.hash(password, salt);
            return hash;
        }
        catch(ex){
            console.log(ex)
        }
        return "";
    },
    isPasswordMatch: async function(password, hash){
        try {
            const isPasswordMatch = await bcrypt.compare(password, hash);
            return isPasswordMatch;
        }
        catch(ex){
            console.log(ex)
        }
        return false;
    },
    generateToken: async function(data){
        const token = await jwt.sign({
            data,
        }, JWT_SECRET_KEY ? JWT_SECRET_KEY : process.env.JWT_SECRET_KEY, { expiresIn: JWT_KEY_EXPIRES  ? JWT_KEY_EXPIRES : process.env.JWT_KEY_EXPIRES });
        return token;
    },
    decryptToken: async function(token){
        try {
            // Ignore epxpiration as well check in securedHandler for easier error bubbling
            const decoded = await jwt.verify(token, JWT_SECRET_KEY, { ignoreExpiration: true }); 
            return decoded;
        }
        catch(ex){
            console.log(ex)
        }
        return {};
    },
    generateRandomString: async function(numChars) {
      const randomString = (length, chars) => {
        var result = '';
        for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
        return result;
      }
      
      return randomString(numChars, '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    }
}
 



 
 
module.exports = encryption;