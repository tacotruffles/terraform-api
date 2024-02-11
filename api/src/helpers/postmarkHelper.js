// Require:
const postmark = require("postmark");

// Send an email:
const client = new postmark.ServerClient("");


const postmarkHelper = {
  /**
   * 
   * @param {string} email 
   * @param {string} msg 
   * @param {string} textMsg 
   * @param {string} subject 
   * @returns 
   */
  send: async function (email, msg, textMsg, subject = 'No Subject') {
    try {
      let message = {
        From: 'clayton@curve10.com', // sender address
        To: email, // list of receivers
        Subject: subject, // Subject line
        TextBody: msg, // plain text body
        HtmlBody: msg, // html body
      };
      const result = await client.sendEmail(message);
      return true;
    } catch (ex) {
      console.log(ex);
    }
  },
}
module.exports = postmarkHelper;