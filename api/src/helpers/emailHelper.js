const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_KEY);
const moment = require('moment');
const escapeStringRegexp = require('escape-string-regexp');
const templateHelper = require('./templateHelper');
const settingsHelper = require('./settingsHelper');

const emailHelper = {
  send: async function (email, msg, subject = 'No Subject') {
    try {
      let message = {
        from: process.env.SENDGRID_SENDER, // sender address
        to: email, // list of receivers
        subject: subject, // Subject line
        text: msg, // plain text body
        html: msg, // html body
      };
      const result = await sgMail.send(message);
      return true;
    } catch (ex) {
      console.log(ex);
    }
    return false;
  },
  sendTemplate: async function (receiver, template, db, replaceKeys = []) {
    try {
      if (!template.templateKey) {
        return null;
      }

      // Retrieve HTML branded template from the db
      const emailBrandKey = replaceKeys.filter(item => item.key === 'EMAIL-BRANDING');
      const brandedKey = emailBrandKey && emailBrandKey.length > 0 ?  `${template.templateKey}-${emailBrandKey[0].value}`  : template.templateKey;
      const query = { key: brandedKey };

      let setting = await settingsHelper.firstOrDefault(query, db);
      if (setting && setting.value) {
        setting.value = setting.value.replace(/\r?\n|\r/g, '');
      }
      else {
        setting = {
          value: ''
        }
      }

      // Replace keywords in all parts of email template
      let { html, text, subject } = template;

      replaceKeys.forEach((keyword) => {
        // Replace all instances of the following keys
        html = html.replace(new RegExp(escapeStringRegexp(keyword.key), 'g'), keyword.value);
        text = text.replace(new RegExp(escapeStringRegexp(keyword.key), 'g'), keyword.value);
        subject = subject.replace(new RegExp(escapeStringRegexp(keyword.key), 'g'), keyword.value);
      });

      // Construct the basic SendGrid transaction message with a branded template
      const message = {
        from: template.from,
        to: (process.env.SENDGRID_RECIPIENT_BYPASS) ? process.env.SENDGRID_RECIPIENT_BYPASS : receiver.email,
        subject,
        text,
        html: setting.value ? setting.value.replace("{content}", html) : html
      };

      // Add any bcc addresses if assigned in template - i.e. pipeline-error message
      if (template.to && !process.env.SENDGRID_RECIPIENT_BYPASS) message.to = template.to; // override receiver.email cause this is probably a system notification
      if (template.bcc && !process.env.SENDGRID_RECIPIENT_BYPASS) message.bcc = template.bcc;

      // Unsubscribe link if template contains an opt-out group id
      if (template.optOutGroup) {
        message.asm = { groupId: template.optOutGroup };
        // Immediate Unsubscribe Link - Otherwise use <%asm_preferences_raw_url%> to display preferences and global opt-out link
        message.html = message.html.replace('{unsubscribe}', '<a href="<%asm_group_unsubscribe_raw_url%>" target="_blank">Unsubscribe</a>'); 
      } else {
        message.html = message.html.replace('{unsubscribe}', '');
      }

      message.html = message.html.replace('{banner}', template.banner);
      message.html = message.html.replace('{year}',  moment().year());

      // Send the message and result
      console.log('template',template)
      const result = await sgMail.send(message);

      // TODO: Add logging here if needed.
      if (result) return true;

    }
    catch (ex) {
      console.log(ex)
    }

    // TODO: Add logging for failed email send if needed.
    return false;
  },
  formatFullName: function (firstName,lastName) {
    if(firstName && lastName) {
      return ` ${firstName} ${lastName}`
    } else if(firstName) {
      return ` ${firstName}`
    } else {
      return ""
    }
  }
};

module.exports = emailHelper;
