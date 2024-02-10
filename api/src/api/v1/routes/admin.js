const express = require('express');

const router = express.Router();

const secureRequestHandler = require('../../../lib/secureRequestHandler');

const userHelper = require('../../../helpers/userHelper');
const templateHelper = require('../../../helpers/templateHelper');
const logHelper = require('../../../helpers/logHelper');
const settingsHelper = require('../../../helpers/settingsHelper');

const moment = require('moment');
const requestHandler = require('../../../lib/requestHandler');

router.put(
  '/users/password/reset',
  secureRequestHandler(async (req, res) => {
    const { id } = req.body;

    let log = logHelper.getTemplate(req.user);
    log.message = `Password reset: ${id}`;
    await logHelper.create(log, req.db);

    let result = await userHelper.resetPassword(req.body, req.db);
    res.json(result);
  })
);
router.post(
  '/users/create',
  requestHandler(async (req, res) => {
    const { firstName, lastName, email, role, organizations } = req.body;
    let result = { code: 403, msg: 'Unauthorized: user not created.' };
    // THIS NEEDS TO MOVE TO AN ENV VAR
    const temporaryPassword = 'UVA2023AIAI!';
    if (!email || !role) {
      result.msg = 'You must include: email, role, organizations';
      return { ...result };
    }
    try {
      req.body.password = temporaryPassword;
      req.body.confirm = temporaryPassword;
      result = await userHelper.createUser(req.body, req.db);
      return { ...result };
    } catch (err) {
      console.log('Create user error: ', err.message);
      throw err;
    }
  })
);

router.delete(
  '/users/delete',
  secureRequestHandler(async (req, res) => {
    const { id } = req.body;

    let log = logHelper.getTemplate(req.user);
    log.message = `User deleted: ${id}`;
    await logHelper.create(log, req.db);

    const result = await userHelper.deleteUser(id, req.db);
    res.json(result);
  })
);

router.get(
  '/settings/get',
  secureRequestHandler(async (req, res) => {
    const query = {};
    const paging = {
      limit: 25,
      skip: 0,
    };
    let subscriptions = await settingsHelper.query(query, paging, req.db);
    res.json(subscriptions);
  })
);

router.post(
  '/settings/create',
  secureRequestHandler(async (req, res) => {
    let log = logHelper.getTemplate(req.user);
    log.message = 'Setting created';
    log.payload = req.body;
    await logHelper.create(log, req.db);

    let template = await settingsHelper.create(req.body, req.db);
    res.json(template);
  })
);

router.put(
  '/settings/update/:id',
  secureRequestHandler(async (req, res) => {
    let log = logHelper.getTemplate(req.user);
    log.message = `setting updated: ${req.params.id}`;
    log.payload = req.body;
    await logHelper.create(log, req.db);

    let template = await settingsHelper.update(req.body, req.db);
    res.json(template);
  })
);

router.delete(
  '/settings/delete/:id',
  secureRequestHandler(async (req, res) => {
    const { id } = req.params;

    let log = logHelper.getTemplate(req.user);
    log.message = `setting deleted: ${id}`;
    await logHelper.create(log, req.db);

    let template = await settingsHelper.remove(id, req.db);
    res.json(template);
  })
);

router.get(
  '/users/get',
  secureRequestHandler(async (req, res) => {
    const query = {};
    const { skip, limit, search } = req.headers;
    const paging = { skip, limit };
    if (search) {
      query.$or = [
        { firstName: new RegExp('.*' + search + '.*', 'i') },
        { phone: new RegExp('.*' + search + '.*', 'i') },
        { username: new RegExp('.*' + search + '.*', 'i') },
        { account: new RegExp('.*' + search + '.*', 'i') },
        { lastName: new RegExp('.*' + search + '.*', 'i') },
        { email: new RegExp('.*' + search + '.*', 'i') },
      ];
    }
    let users = await userHelper.query(query, paging, req.db);
    res.json(users);
  })
);

router.get(
  '/users/token/:id',
  secureRequestHandler(async (req, res) => {
    let user = await userHelper.getById(req.params.id, req.db);
    const token = await userHelper.generateToken(user.username);
    return { ...token };
  })
);

router.put(
  '/invites/update/:id',
  secureRequestHandler(async (req, res) => {
    let log = logHelper.getTemplate(req.user);
    log.message = `Invite updated: ${req.params.id}`;
    await logHelper.create(log, req.db);

    let template = await inviteHelper.update(req.params.id, req.body, req.db);
    res.json(template);
  })
);

router.get(
  '/admins/get',
  secureRequestHandler(async (req, res) => {
    let users = await userHelper.getAdminUsers(req.db);
    res.json(users);
  })
);

router.get(
  '/templates/get',
  secureRequestHandler(async (req, res) => {
    let users = await templateHelper.all(req.db);
    res.json(users);
  })
);

router.get(
  '/templates/get/:key',
  secureRequestHandler(async (req, res) => {
    let template = await templateHelper.get({ key }, req.db);
    res.json(template);
  })
);

router.post(
  '/templates/create',
  secureRequestHandler(async (req, res) => {
    let log = logHelper.getTemplate(req.user);
    log.message = 'Email template created';
    await logHelper.create(log, req.db);

    let template = await templateHelper.create(req.body, req.db);
    res.json(template);
  })
);

router.put(
  '/templates/update/:id',
  secureRequestHandler(async (req, res) => {
    const { id } = req.params;

    let log = logHelper.getTemplate(req.user);
    log.message = `Template updated: ${id}`;
    await logHelper.create(log, req.db);

    let template = await templateHelper.update(req.body, req.db);
    res.json(template);
  })
);

router.put(
  '/users/update/:id',
  secureRequestHandler(async (req, res) => {
    const { id } = req.params;

    let log = logHelper.getTemplate(req.user);
    log.message = `User updated: ${id}`;
    log.payload = req.body;
    await logHelper.create(log, req.db);

    const { admin } = req.body;
    req.body.role = req.user.role ? req.user.role : [];
    if (admin) {
      req.body.role.push('admin');
    } else {
      req.body.role = req.body.role.filter(function (value) {
        return value != 'admin';
      });
    }

    let template = await userHelper.update(req.body, req.db);
    res.json(template);
  })
);

router.delete(
  '/templates/delete/:id',
  secureRequestHandler(async (req, res) => {
    const { id } = req.params;

    let log = logHelper.getTemplate(req.user);
    log.message = `Template deleted: ${id}`;
    await logHelper.create(log, req.db);

    let template = await templateHelper.remove(req.body, req.db);
    res.json(template);
  })
);

router.delete(
  '/users/delete/:id',
  secureRequestHandler(async (req, res) => {
    const { id } = req.params;

    let log = logHelper.getTemplate(req.user);
    log.message = `User deleted: ${id}`;
    await logHelper.create(log, req.db);

    let template = await userHelper.deleteUser(id, req.db);
    res.json(template);
  })
);

router.get(
  '/logs/get',
  secureRequestHandler(async (req, res) => {
    let users = await logHelper.all(req.db);
    res.json(users);
  })
);

module.exports = router;
