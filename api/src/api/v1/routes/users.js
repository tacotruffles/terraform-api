const express = require('express');
const { ObjectId } = require('mongodb');

const requestHandler = require('../../../lib/requestHandler');

const router = express.Router();

const secureRequestHandler = require('../../../lib/secureRequestHandler');
const requestHandlerr = require('../../../lib/requestHandler');

const userHelper = require('../../../helpers/userHelper');
const contactHelper = require('../../../helpers/contactHelper');

// *************************************************************************************
// ****************** EXAMPLE SECURED ENDPOINT WITH NEW REQUEST HANDLER ****************
// *************************************************************************************
router.post(
  '/secured',
  secureRequestHandler(async (req, res) => {
    const result = await (async () => {
      return { requestStatus: 200, msg: 'good secured result' };
      // throw { requestStatus: 405, msg: 'bad secured error'};
    })().catch((e) => e);

    // res.json({ ...req.body }); <=== the old bad way
    return { ...result };
  })
);

// *************************************************************************************
// ****************** ADJUSTED ENDPOINT WITH NEW REQUEST HANDLER ***********************
// *************************************************************************************
router.post(
  '/auth/signin',
  requestHandler(async (req) => {
    const { email } = req.body;
    const result = await userHelper.authenticate(req.body, req.db);
    if (result && result.email !== email) {
      return { status: 403, ...result };
    }
    return { ...result };
  })
);

// *************************************************************************************
// ****************** ADJUSTED ENDPOINT WITH NEW REQUEST HANDLER ***********************
// *************************************************************************************
router.post(
  '/auth/signup',
  requestHandler(async (req) => {
    const { email, firstName, lastName, registrationCode, userId } = req.body;
    if (!email || !firstName) {
      return { requestStatus: 403, message: 'You must include firstName, lastName, email' };
    }
    // See if the user exists based on userid and email
    const user = await userHelper.firstOrDefault({ email, _id: new ObjectId(userId) }, req.db);
    if (!user) {
      return {
        requestStatus: 400,
        message:
          'User not found. Please ensure you registered with the same email address, or contact the administrators.',
      };
    }
    if (user && user.status === 'active')
      return {
        requestStatus: 400,
        message: 'User is already registered. Please Sign in, or request a new password.',
      };
    const result = await userHelper.register(req.body, req.db).catch((e) => e);
    return { ...result };
  })
);
router.get(
  '/getTeachers',
  secureRequestHandler(async (req) => {
    try {
      const teachers = await userHelper.getTeachers(req.db);
      return teachers;
    } catch (err) {
      console.log(err);
      return { requestStatus: 500, message: 'Error getting teachers' };
    }
  })
);
router.post(
  '/filter',
  secureRequestHandler(async (req, res) => {
    try {
      const result = await userHelper.query(req.body, req.db);
      return result;
    } catch (err) {
      console.log(err);
      return { requestStatus: 500, message: err.message };
    }
  })
);

// NOT UPDATED
router.post(
  '/auth/reauthenticate',
  requestHandler(async (req) => {
    console.log(req.body);
    const authUser = await userHelper.reAuthenticate(req.body, req.db).catch((e) => console.log(e));
    console.log(authUser);
    return { ...authUser };
  })
);

// NOT UPDATED

router.post(
  '/auth/password/forgot',
  requestHandler(async (req) => {
    const result = await userHelper.forgotPassword(req.body, req.db);

    return { ...result };
  })
);

// NOT UPDATED
router.post(
  '/auth/validate/reset/token',
  requestHandler(async (req) => {
    const result = await userHelper.validateResetToken(req.body, req.db);

    return { ...result };
  })
);

// NOT UPDATED
router.post(
  '/auth/reset/password',
  requestHandler(async (req) => {
    const result = await userHelper.resetUserPassword(req.body, req.db);

    return { ...result };
  })
);

// NOT UPDATED
router.post(
  '/details/update',
  secureRequestHandler(async (req, res) => {
    console.log(req.body);
    const result = await userHelper.updateUserDetails(req.user, req.body, req.db);

    res.json({ data: result });
  })
);
// NOT UPDATED

router.post(
  '/details/getdetails',
  secureRequestHandler(async (req, res) => {
    const result = await userHelper.getUserInfo(req.user, req.db);

    res.json({ data: result });
  })
);
// NOT UPDATED
router.post(
  '/password/update',
  secureRequestHandler(async (req, res) => {
    const result = await userHelper.updatePassword(req.user, req.body, req.db);

    res.json({ data: result });
  })
);

router.get(
  '/contacts/:userId', 
  secureRequestHandler(async (req, res) => {
    const { userId } = req.params;
    try{
      const result = await contactHelper.getContacts(userId, req.db);
      res.json({ status: 200, data: result });
    } catch (err) {
      console.log(err);
      res.json({ status: 500, message: err.message });
    }
  })
);

router.get(
  '/getContactsByOrg/:orgId',
  secureRequestHandler(async (req, res) => {
    const { orgId } = req.params;
    try{
      const result = await contactHelper.getContactsByOrg(orgId, req.db);
      return { data: result };
    } catch (err) {
      console.log(err);
      res.json({ status: 500, message: err.message });
    }
  })
)
router.post(
  '/addContact/:userId',
  secureRequestHandler(async (req, res) => {
    const { userId } = req.params;
    const { contactId } = req.body;
    try{
      const result = await contactHelper.addContact(userId, contactId, req.db);
      res.json({ status: 200, data: result });
    } catch (err) {
      console.log(err);
      res.json({ status: 500, message: err.message });
    }
  })
);

router.post(
  '/removeContact/:userId',
  secureRequestHandler(async (req, res) => {
    const { userId } = req.params;
    const { contactId } = req.body;
    try{
      const result = await contactHelper.removeContact(userId, contactId, req.db);
      res.json({ status: 200, data: result });
    } catch (err) {
      console.log(err);
      res.json({ status: 500, message: err.message });
    }
  })
);

router.get(
  '/getActiveUsers',
  secureRequestHandler(async (req, res) => {
    try{
      const result = await userHelper.getActiveUsers(req.db);
      res.json({ status: 200, data: result });
    } catch (err) {
      console.log(err);
      res.json({ status: 500, message: err.message });
    }
  })
)

module.exports = router;
