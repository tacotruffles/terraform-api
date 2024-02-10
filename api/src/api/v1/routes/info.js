const express = require('express');
const requestHandler = require('../../../lib/requestHandler');
const emailHelper = require('../../../helpers/emailHelper');
const templateHelper = require('../../../helpers/templateHelper');
const userHelper = require('../../../helpers/userHelper');
const lessonHelper = require('../../../helpers/lessonHelper');
const commentHelper = require('../../../helpers/commentHelper');
const reflectionHelper = require('../../../helpers/reflectionHelper');
const settingsHelper = require('../../../helpers/settingsHelper');

const router = express.Router();

router.get(
  '/version',
  requestHandler(async (req, res) => {
    return { message: `API v1 on ${process.env.NODE_ENV}` };
  })
);

router.get(
  '/db',
  requestHandler(async (req, res) => {
    const [users] = await userHelper.getAllUsers(req.db);
    return { ...users };
  })
)

router.get(
  '/email-test',
  requestHandler(async (req, res) => {
    const result = await emailHelper.send(
      'edgar@curve10.com',
      'This is a message from Major Tom.',
      'Space message from mars'
    );
    return { result };
  })
); 

// router.get(
//   '/email-template-test',
//   requestHandler(async (req, res) => {
//     try {
//       const replaceKeys = [];
//       replaceKeys.push({ key: '{FORGOT.URL}', value: `${process.env.BASE_URL}${process.env.FORGOT_PASSWORD_URL}` });
//       const template = await templateHelper.get({ key: 'forgot-password' }, req.db);
//       const result = await emailHelper.sendTemplate(
//         { email: 'john.dawes@curve10.com' },
//         template,
//         req.db,
//         replaceKeys
//       );
//       return { result };
//     } catch (e) {
//       console.log(e.message);
//       return { error: e.message}
//     }
//   })
// ); 

router.get(
  '/lesson-template-test',
  requestHandler(async (req, res) => {
    try {
      const { body, db } = req;
      const result = await reflectionHelper.sendReflectionResponseEmail(body, db);
      return { result };
    } catch (e) {
      console.log(e.message);
      return { error: e.message}
    }
  })
); 

router.get(
  '/settings',
  requestHandler(async (req, res) => {
    try {
      const { query, db } = req;
      const result = await settingsHelper.getOne(query, db);
      return { result };
    } catch (e) {
      console.log(e.message);
      return { error: e.message}
    }
  })
); 


module.exports = router;
