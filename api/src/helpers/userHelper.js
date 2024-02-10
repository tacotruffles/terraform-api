const { ObjectId } = require('mongodb');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const encryption = require('./encryption');
const errors = require('../lib/errors');
const emailHelper = require('./emailHelper');
const templateHelper = require('./templateHelper');
const settingsHelper = require('./settingsHelper');
const contactHelper = require('./contactHelper')
const postmarkHelper = require('./postmarkHelper');

dayjs.extend(utc);
const FORGOT_PASSWORD_URL = process.env.FORGOT_PASSWORD_URL;
const BASE_URL = process.env.BASE_URL;

const userHelper = {
  user: {},
  collection: {},
  get: async function (username, db) {
    return await db.collection('users').findOne({ username });
  },
  getAllUsers: async function (db) {
    return await db.collection('users').find({}).toArray();
  },
  getById: async function (id, db) {
    const _id = new ObjectId(id);
    return await db.collection('users').findOne({ _id });
  },
  firstOrDefault: async function (query, db) {
    try {
      const result = await db.collection('users').find(query).toArray();
      if (result && result.length > 0) {
        return result[0];
      }
    } catch (ex) {
      console.log(ex);
    }
    return '';
  },
  // THIS PROBABLY NEEDS PAGINATION AND SORT, WILL EVENTUALLY BE AN AGGREGATE PROBABLY
  query: async (query, db) => {
    try {
      const users = await db.collection('users').aggregate(
        [
          {
            $match: query,
          },
          {
            $lookup: {
              from: 'organizations',
              localField: 'organizations',
              foreignField: '_id',
              as: 'organizations',
            },
          }
        ]).toArray();
      users.forEach((user) => {
        if (user.organizations && user.organizations.length > 0) {
          user.organizations.forEach((org) => {
            if (org.type === 'institute') {
              user.institute = org.name;
            }
            if (org.type === 'district') {
              user.district = org.name;
            }
            if (org.type === 'school') {
              user.school = org.name;
            }
          });
        }
      })
      return users;
    } catch (err) {
      console.log('Query users error ', err);
      throw err;
    }
  },
  // FINALIZE REGISTRATION AND MAKE ACTIVE
  register: async function (data, db) {
    // throw { requestStatus: 500, msg: "bad bad error" };
    const { password, email, firstName, lastName, userId } = data;
    const result = {
      requestStatus: 403,
      message: 'There was a problem with user registration. Please contact support',
    };
    if (!this.validateRegister(data)) {
      result.msg = 'Incomplete registration data.';
      return result;
    }
    try {
      const encryptedPassword = await encryption.encryptPassword(password);
      const username = uuidv4();
      const token = await encryption.generateToken(data.username);
      const user = {
        firstName,
        lastName,
        password: encryptedPassword,
        username,
        token,
        created: dayjs.utc().toDate(),
        lastLogin: dayjs.utc().toDate(),
        status: 'active',
      };
      const id = new ObjectId(userId);
      const updatedUser = await db
        .collection('users')
        .findOneAndUpdate({ _id: id }, { $set: { ...user } }, { returnNewDocument: true });
      delete updatedUser.password;
      return updatedUser;
    } catch (ex) {
      console.log(ex);
      result.message = ex.message;
      return result;
    }
  },
  validateEmail: async function (email) {
    const user = '';
    return user && user.length == 0;
  },
  /**
   *
   * @param {object} user
   * @param {boolean} registrationCodeRequired
   * @returns {boolean} whether user object is valid
   */
  validateInvite: function (user) {
    let isValid = true;
    if (!user.email || user.email.length === 0) {
      isValid = false;
    }
    if (!user.role || user.role.length === 0) {
      isValid = false;
    }
    return isValid;
  },
  validateRegister: function (user, registrationCodeRequired = true) {
    let isValid = true;
    if (!user.firstName || user.firstName.length === 0) {
      isValid = false;
    }
    if (!user.lastName || user.lastName.length === 0) {
      isValid = false;
    }
    if (!user.email || user.email.length === 0) {
      isValid = false;
    }
    if (!user.password || user.password.length === 0) {
      isValid = false;
    }
    if (!user.password || !user.confirm || user.password !== user.confirm) {
      isValid = false;
    }
    // if (
    //   registrationCodeRequired &&
    //   (!user.registrationCode || user.registrationCode.length === 0)
    // ) {
    //   isValid = false;
    // }
    return isValid;
  },
  // PUT THE USER IN THE SYSTEM, SEND EMAIL TO INVITE THEM TO REGISTER
  createUser: async function (user, db) {
    const { password, email } = user;
    const lowerEmail = email.toLowerCase();
    const result = {
      // status: 'error',
      requestStatus: 500,
      msg: 'Internal error. Unable to create user. Please contact support',
    };
    if (this.validateInvite(user, false)) {
      const dbUser = await this.firstOrDefault({ email: lowerEmail }, db);
      if (!dbUser) {
        delete user.confirm;
        user.email = lowerEmail;
        user.username = uuidv4();
        user.created = dayjs.utc().toDate();
        user.status = 'invited';
        user.organizations = [];
        if (user.institute) {
          user.organizations.push(new ObjectId(user.institute));
          delete user.institute;
        }
        if (user.district) {
          user.organizations.push(new ObjectId(user.district));
          delete user.district;
        }
        if (user.school) {
          user.organizations.push(new ObjectId(user.school));
          delete user.school;
        }
        if (user?.role?.includes('teacher') || user?.role?.includes('practicing-teacher') || user?.role?.includes('teacher-candidate')) {
          const {value: orgCounters} = await db.collection('settings').findOne({ key: 'org-counter'})
          user.idNumber = orgCounters.teacher
          orgCounters.teacher +=1
          await db.collection('settings').updateOne({ key: 'org-counter' }, { $set: { value: orgCounters } });
        }
        try {
          const insert = await db.collection('users').insertOne(user);
          if (insert?.insertedId) {
            // THIS NEEDS TO BECOME DYNAMIC BASED ON ENV
            const template = await templateHelper.get({ key: 'user-invite' }, db);
            const replaceKeys = [];

            
            const fullName = emailHelper.formatFullName(user.firstName, user.lastName)
            replaceKeys.push({ key: '{FULLNAME}', value: fullName });
            replaceKeys.push({ key: '{INVITE.URL}', value: `${BASE_URL}/signup?id=${insert?.insertedId}` });
     

            const _ = await emailHelper.sendTemplate(user, template, db, replaceKeys);

            user._id = insert.insertedId;
            return user;
          }
        } catch (ex) {
          console.log(ex);
          throw ex;
        }
      } else {
        result.requestStatus = '403';
        result.msg = 'User already exists. Duplicate email.';
      }
    }
    return result;
  },
  authenticate: async function (data, db) {
    const { email, password } = data;
    //user.password = await encryption.encryptPassword(password);
    const query = { email: email.toLowerCase() };
    try {
      // console.log(db);
      const dbUser = await this.firstOrDefault(query, db);
      //result.data.token = await encryption.encryptToken(username);
      if (dbUser && dbUser.username) {
        const isPasswordMatch = await encryption.isPasswordMatch(password, dbUser.password);
        if (isPasswordMatch) {
          const token = await encryption.generateToken(dbUser.username);
          const updateLogin = await db
            .collection('users')
            .updateOne({ _id: dbUser._id }, { $set: { token, lastLogin: dayjs.utc().toDate() } });
          //const res = await db.collection('users').update({username: dbUser.username}, dbUser);
          if (updateLogin) {
            dbUser.token = token;
            dbUser.lastLogin = dayjs.utc().toDate();
            delete dbUser.password;
          }
          const contacts = await contactHelper.getContacts(dbUser.organizations, db)
          dbUser.contacts = contacts;
          return dbUser;
        }
      }
      return { message: 'Incorrect email or password' };
    } catch (ex) {
      console.log(ex);
      return { message: 'There was an error signing in. Please try again later.' };
    }
  },
  submitConsent: async function (data, db) {
    const { date, submitDate, email } = data;
    try {
      console.log(date, submitDate, email);
      const user = await db.collection('users').findOne({ email: email });
      const consent = await db
        .collection('users')
        .updateOne(
          { email: email },
          { $set: { consent: true, consentDate: date, consentSubmitted: submitDate } }
        );
      return consent;
    } catch (ex) {
      console.log(ex);
    }
  },
  checkConsent: async function (data, db) {
    const { email } = data;
    try {
      console.log(email);
      const consent = await db.collection('users').findOne({ email: email });
      if (consent.consent) {
        return true;
      }
      return false;
    } catch (ex) {
      console.log(ex);
    }
  },
  reAuthenticate: async function (data, db) {
    const { email } = data;

    const result = {
      // status: 'error',
      token: '',
      email,
    };

    //let reEmail = new RegExp("^" + email.toLowerCase(), 'i');
    const query = { $or: [{ email: email }] };
    console.log(query);

    try {
      const dbUsers = await this.query(query, { limit: 1, skip: 0 }, db);

      if (dbUsers && dbUsers.length > 0) {
        const dbUser = dbUsers[0];
        const token = await encryption.generateToken(dbUser.username);
        console.log(token);
        const subscriptionQuery = { $or: [{ 'user._id': dbUser._id }] };
        delete dbUser.password;
        const lastLogin = dbUser.lastLogin;

        const res = await db.collection('users').updateOne(
          { _id: dbUser._id },
          {
            $set: {
              token,
              lastLogin: dayjs.utc().toDate(),
              lowerEmail: dbUser.email.toLowerCase(),
            },
          }
        );

        if (res) {
          dbUser.token = token;
          console.log('token', dbUser.token);
        } else {
          // is this error even possible?
        }
        return dbUser;
      }
    } catch (ex) {
      console.log(ex);
    }
    //throw errors.InvalidLogin;
    return {};
  },
  // deleteUser: async function (_id, db){
  //     try {
  //         const id = new ObjectId(_id);
  //         const data =  await db.collection('users').removeOne({_id: id});
  //         if(data && data.result.nModified == 1){
  //             return { id: _id, msg: "User deleted" };
  //         }
  //     }
  //     catch(ex){
  //         console.log(ex)
  //     }
  //     return {}
  // },
  deleteUser: async function (data, db) {
    try {
      const email = data.email;
      const result = await db.collection('users').removeOne({ email: email });
      if (result && result.deletedCount === 1) {
        return { msg: 'User deleted' };
      }
    } catch (ex) {
      console.log(ex);
    }
    return {};
  },
  updateAvatar: async function (user, avatar, db) {
    try {
      const id = new ObjectId(user._id);
      user.avatar = avatar.avatar;
      const data = await db.collection('users').updateOne({ _id: id }, { $set: { ...avatar } });
      if (data && data.result.nModified == 1) {
        return user;
      }
    } catch (ex) {
      console.log(ex);
    }
    return {};
  },
  updateUserDetails: async function (user, updates, db) {
    try {
      const id = new ObjectId(user._id);
      const details = updates.values;
      user.firstName = details.firstName;
      user.lastName = details.lastName;
      user.email = details.email;
      user.phone = details.phone;

      const update = {
        firstName: details.firstName,
        lastName: details.lastName,
        email: details.email,
        phone: details.phone,
      };
      console.log('user helper', update);
      const data = await db.collection('users').updateOne({ _id: id }, { $set: { ...update } });
      if (data && data.result.nModified == 1) {
        return user;
      }
    } catch (ex) {
      console.log(ex);
    }
    return user;
  },
  updatePassword: async function (user, updates, db) {
    try {
      const id = new ObjectId(user._id);
      const details = updates.values;
      user.password = await encryption.encryptPassword(details.password);

      const password = {
        password: user.password,
      };

      console.log(id, details.password, password);
      const data = await db.collection('users').updateOne({ _id: id }, { $set: { ...password } });
      if (data && data.result.nModified == 1) {
        return user;
      }
    } catch (ex) {
      console.log(ex);
    }
    return {};
  },
  updateAccount: async function (user, account, db) {
    try {
      const id = new ObjectId(user._id);

      const data = await db.collection('users').updateOne({ _id: id }, { $set: { account } });
      if (data && data.result.nModified == 1) {
        return user;
      }
    } catch (ex) {
      console.log(ex);
    }
    return {};
  },
  updateUserRole: async function (payload, db) {
    try {
      console.log(payload);
      const data = await db
        .collection('users')
        .updateOne({ email: payload.email }, { $set: { role: payload.role } });
      if (data && data.result.nModified == 1) {
        return data;
      }
    } catch (ex) {
      console.log(ex);
    }
    return {};
  },

  updateNotifications: async function (user, updates, db) {
    try {
      const id = new ObjectId(user._id);
      const details = updates.values;

      const notification = {
        notifications: {
          ...details,
        },
      };
      user.notifications = {
        ...details,
      };
      const data = await db
        .collection('users')
        .updateOne({ _id: id }, { $set: { ...notification } });
      if (data && (data.result.nModified == 1 || data.result.ok == 1)) {
        return user;
      }
    } catch (ex) {
      console.log(ex);
    }
    return {};
  },
  getTeachers: async function (db) {
    const data = await db
      .collection('users')
      .find({ role: { $in: ['teacher', 'practicing-teacher'] } })
      .project({ firstName: 1, lastName: 1, _id: 1, role: 1 })
      .toArray();
    return data;
  },
  getAttendees: async function (db) {
    const data = await db.collection('users').find({}).project({ email: 1, _id: 0 }).toArray();
    return data;
  },
  getUserInfo: async function (user, db) {
    const id = new ObjectId(user._id);
    const query = { _id: id };
    const data = await db
      .collection('users')
      .find(query)
      .project({ email: 1, firstName: 1, lastName: 1, phone: 1 })
      .toArray();
    return data;
  },
  getAdminUsers: async function (db) {
    const query = { role: /.*admin.*/i };
    const data = await db
      .collection('users')
      .find(query)
      .project({ email: 1, username: 1, firstName: 1, lastName: 1, _id: 1, avatar: 1 })
      .toArray();
    return data;
  },
  getUsers: async function (db) {
    const query = {};
    const data = await db
      .collection('users')
      .find(query)
      .project({ email: 1, username: 1, firstName: 1, lastName: 1, _id: 1, avatar: 1 })
      .toArray();
    return data;
  },
  getUserByEmail: async function (email, db) {
    const data = await db.collection('users').findOne({ email: email });
    return data;
  },
  notifyTeacher: async function (body, db) {
    const query = { classId: body.classId };
    const videoInfo = await db.collection('videoUploads').find(query).toArray();
    if (
      videoInfo &&
      videoInfo[0] &&
      videoInfo[0].teacherId &&
      videoInfo[0].videoName &&
      videoInfo[0]._id
    ) {
      const template = await templateHelper.get({ key: 'send-to-teacher' }, db);
      template.text = template.text.replace('{videoName}', `${videoInfo[0].videoName}`);
      template.text = template.text.replace('{researcher}', `${body.researcherName}`);
      template.text = template.text.replace('{teacher}', `${body.teacherName}`);
      template.text = template.text.replace(
        '{teacherAnalysis.URL}',
        `/teacherAnalysis?id=${videoInfo[0]._id}`
      );
      template.html = template.html.replace('{videoName}', `${videoInfo[0].videoName}`);
      template.html = template.html.replace('{researcher}', `${body.researcherName}`);
      template.html = template.html.replace('{teacher}', `${body.teacherName}`);
      template.html = template.html.replace(
        '{teacherAnalysis.URL}',
        `${BASE_URL}/teacherAnalysis?id=${videoInfo[0]._id}`
      );
      const reciever = { email: videoInfo[0].teacherId };
      const update = await db
        .collection('videoUploads')
        .updateOne(query, { $set: { researcherEmail: `${body.researcherEmail}` } });
      const success = await emailHelper.sendTemplate(reciever, template, db);
      return success;
    }
    return false;
  },
  commentNotification: async function (body, db) {
    const query = { classId: body.classId };
    const videoInfo = await db.collection('videoUploads').find(query).toArray();
    if (videoInfo && videoInfo[0] && videoInfo[0].teacherId && videoInfo[0].researcherEmail) {
      if (body.currentUser == videoInfo[0].teacherId) {
        const template = await templateHelper.get({ key: 'comment-notification' }, db);
        template.text = template.text.replace('{videoName}', `${videoInfo[0].videoName}`);
        template.text = template.text.replace('{sender}', `${body.senderName}`);
        template.text = template.text.replace('{reciever}', `${body.recipientName}`);
        template.text = template.text.replace(
          '{teacherAnalysis.URL}',
          `/Encoding?id=${videoInfo[0]._id}`
        );
        template.html = template.html.replace('{videoName}', `${videoInfo[0].videoName}`);
        template.html = template.html.replace('{sender}', `${body.senderName}`);
        template.html = template.html.replace(
          '{teacherAnalysis.URL}',
          `${BASE_URL}/Encoding?id=${videoInfo[0]._id}`
        );
        template.html = template.html.replace('{reciever}', `${body.recipientName}`);
        template.subject = template.subject.replace('{videoName}', `${videoInfo[0].videoName}`);
        const reciever = { email: videoInfo[0].researcherEmail };
        const success = await emailHelper.sendTemplate(reciever, template, db);
        template.text.replace('{reciever}', `${videoInfo[0].researcherEmail}`);
        return template.text;
      }

      const template = await templateHelper.get({ key: 'comment-notification' }, db);
      template.text = template.text.replace('{videoName}', `${videoInfo[0].videoName}`);
      template.text = template.text.replace('{sender}', `${body.senderName}`);
      template.text = template.text.replace('{reciever}', `${body.recipientName}`);
      template.text = template.text.replace(
        '{teacherAnalysis.URL}',
        `/teacherAnalysis?id=${videoInfo[0]._id}`
      );
      template.html = template.html.replace('{videoName}', `${videoInfo[0].videoName}`);
      template.html = template.html.replace('{sender}', `${body.senderName}`);
      template.html = template.html.replace(
        '{teacherAnalysis.URL}',
        `${BASE_URL}/teacherAnalysis?id=${videoInfo[0]._id}`
      );
      template.html = template.html.replace('{reciever}', `${body.recipientName}`);
      template.subject = template.subject.replace('{videoName}', `${videoInfo[0].videoName}`);
      const reciever = { email: videoInfo[0].teacherId };
      const success = await emailHelper.sendTemplate(reciever, template, db);
      template.text.replace('{reciever}', `${videoInfo[0].researcherEmail}`);
      return template.text;
    }
  },
  requestConsultation: async function (body, db) {
    const query = { classId: body.classId };
    const videoInfo = await db.collection('videoUploads').find(query).toArray();
    const researcherInfo = await db
      .collection('users')
      .find({ email: videoInfo[0].researcherEmail })
      .toArray();
    if (videoInfo && videoInfo[0] && videoInfo[0].researcherEmail) {
      const template = await templateHelper.get({ key: 'request-consultation' }, db);
      template.text = template.text.replace('{teacher}', `${body.firstName} ${body.lastName}`);
      template.text = template.text.replace('{researcher}', `${researcherInfo[0].firstName} `);
      template.text = template.text.replace('{teacherEmail}', `${body.email}`);
      template.text = template.text.replace('{videoName}', `${videoInfo[0].videoName}`);
      template.html = template.html.replace('{teacher}', `${body.firstName} ${body.lastName}`);
      template.html = template.html.replace('{researcher}', `${researcherInfo[0].firstName}`);
      template.html = template.html.replace('{teacherEmail}', `${body.email}`);
      template.html = template.html.replace('{videoName}', `${videoInfo[0].videoName}`);
      template.subject = template.subject.replace(
        '{teacher}',
        `${body.firstName} ${body.lastName}`
      );
      const reciever = { email: videoInfo[0].researcherEmail };
      const success = await emailHelper.sendTemplate(reciever, template, db);
      if (true) {
        const requested = await db
          .collection('videoUploads')
          .updateOne(query, { $set: { consultationRequested: true } });
        console.log(requested);
      }
    }
  },
  requestChanges: async function (body, db) {
    // GET ALL THE researcher-admin from users collection.
    // LOOP THROUGH THEM and send
    const query = { role: 'researcher-admin' };
    const researcherAdmins = await db.collection('users').find(query).toArray();
    const receivers = await researcherAdmins.map((person) => ({ email: person.email }));
    if (receivers.length > 0) {
      const template = await templateHelper.get({ key: 'request-encoding-change' }, db);
      const replaceKeys = [];
      replaceKeys.push({ key: '[REQUESTOR_NAME]', value: body.requestorName });
      replaceKeys.push({ key: '[VIDEO_NAME]', value: body.videoName });
      replaceKeys.push({ key: '[LOGIN_URL]', value: `${BASE_URL}/signin` });
      await Promise.all(
        receivers.map(async (receiver, index) => {
          const firstName = researcherAdmins[index].firstName;
          const finalKeys = [...replaceKeys, { key: '[RESEARCHER_NAME]', value: firstName }];
          const emailResult = await emailHelper.sendTemplate(receiver, template, db, finalKeys);
          console.log(emailResult);
        })
      );
      // if(true){
      //    const requested = await db.collection('videoUploads').updateOne(query, {$set: {consultationRequested: true}})
      //    console.log(requested)
      // }
    }
  },
  uploadComment: async function (body, db) {
    const success = await db.collection('comments').insertOne(body);
  },
  getComments: async function (body, db) {
    const classNum = parseInt(body.classId);
    const success = await db.collection('comments').find({ classId: classNum }).toArray();
    return success;
  },
  resetPassword: async function (reset, db) {
    const { _id, password } = reset;

    const userId = new ObjectId(_id);
    const hash = await encryption.encryptPassword(password);
    const data = await db
      .collection('users')
      .updateOne({ _id: userId }, { $set: { password: hash } });
    if (data && (data.result.nModified == 1 || data.result.ok == 1)) {
      return { msg: 'User password was reset' };
    }
    return {};
  },
  forgotPassword: async function (reset, db) {
    const { email } = reset;

    const query = { email };
    try {
      const dbUser = await this.query(query, { skip: 0, limit: 0 }, db);

      if (dbUser && dbUser[0] && dbUser[0].email) {
        const reset = {
          id: dbUser[0]._id,
          email,
          created: dayjs.utc().toDate(),
          expires: dayjs().add(1, 'hour').utc().toDate(),
          reset: 0,
          token: uuidv4(),
        };
        const insert = await db.collection('resets').insertOne(reset);
        if (insert.insertedCount === 1) {
          const template = await templateHelper.get({ key: 'forgot-password' }, db);

          const replaceKeys = [];

          const fullName = emailHelper.formatFullName(dbUser[0].firstName, dbUser[0].lastName)
          replaceKeys.push({ key: '{FULLNAME}', value: fullName });
          replaceKeys.push({ key: '{FORGOT.URL}', value:  `${BASE_URL}${FORGOT_PASSWORD_URL}?token=${reset.token}` });
          const success = await emailHelper.sendTemplate(reset, template, db, replaceKeys);

          if (success == true) {
            return { msg: 'Password reset email sent!', success: true };
          }
        }
      }
    } catch (ex) {
      console.log(ex);
    }
    return { msg: 'An error has occurred, please contact support', success: false };
  },
  resetUserPassword: async function (reset, db) {
    const { token, password, confirm } = reset;
    console.log(reset);
    const query = { token };
    const dbReset = await db.collection('resets').findOne(query);

    if (dbReset) {
      const now = dayjs.utc().toDate();
      const result = now - dbReset.expires;
      if (result < 0) {
        const data = await db
          .collection('resets')
          .updateOne({ _id: new ObjectId(dbReset._id) }, { $set: { reset: dayjs.utc().toDate() } });
        if (data && (data.result.nModified == 1 || data.result.ok == 1)) {
          const query = { $or: [{ email: dbReset.email }] };
          const [dbUser] = await this.query(query, { skip: 0, limit: 0 }, db);

          if (dbUser) {
            await this.updatePassword(dbUser, { values: { password } }, db);
            return dbUser;
          }
        }
      }
    }
    return { msg: 'An error has occurred, please contact support' };
  },
  validateResetToken: async function (data, db) {
    const { token } = data;
    const dbReset = await db.collection('resets').findOne({ token });
    if (dbReset) {
      const now = dayjs.utc().toDate();
      const result = now - dbReset.expires;
      if (result < 0) {
        return { msg: 'Token is valid', success: true };
      }
    }
    return { msg: 'An error has occurred, please contact support', success: false };
  },
  update: async (template, db) => {
    try {
      const id = new ObjectId(template._id);
      delete template._id;
      template.updated = dayjs.utc().toDate();
      const data = await db.collection('users').updateOne({ _id: id }, { $set: { ...template } });
      if (data && data.result.nModified == 1) {
        return template;
      }
    } catch (ex) {
      console.log(ex);
    }
    return {};
  },
  queryDuplicate: async function (query, paging, db) {
    try {
      const { skip, limit } = paging;
      const data = await db
        .collection('users')
        .find(query)
        .sort({ created: -1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .toArray();
      if (!data) {
        data = [];
      }
      return data;
    } catch (ex) {
      console.log(ex);
      return [];
    }
  },
  generateToken: async function (username) {
    const token = await encryption.generateToken(username);
    return token;
  },
  getUserFromToken: async function (token, db) {
    try {
      const decode = await encryption.decryptToken(token);
      const result = await this.get(decode.data, db);
      if (result && result['cognito:username']) {
        return result;
      }
    } catch (ex) {
      console.log(ex);
    }
    return {};
  },
  listWithQuery: async function (query, db) {
    try {
      let data = [];
      let search = {};
      if (query.filterBy == 'email') {
        search = { email: { $regex: query.filterQuery, $options: 'i' } };
        data = await db.collection('users').find(search).toArray();
      } else if (query.filterBy == 'name') {
        //split filterQuery into first and last name
        if (query.filterQuery.includes(' ')) {
          const names = query.filterQuery.split(' ');
          console.log(names[0], ' ', names[1]);
          const users = await db.collection('users').find().toArray();
          users.forEach((user) => {
            if (
              user.firstName.toLowerCase().includes(names[0].toLowerCase()) &&
              user.lastName.toLowerCase().includes(names[1].toLowerCase())
            ) {
              data.push(user);
            }
          });
        } else {
          firstSearch = await db
            .collection('users')
            .find({ firstName: { $regex: query.filterQuery, $options: 'i' } })
            .toArray();
          lastSearch = await db
            .collection('users')
            .find({ lastName: { $regex: query.filterQuery, $options: 'i' } })
            .toArray();
          firstSearch.forEach((element) => {
            data.push(element);
          });
          lastSearch.forEach((element) => {
            data.push(element);
          });
        }
      } else if (query.filterBy == 'role') {
        // search = { role: { $regex: query.filterQuery, $options: 'i' } }
        search = { role: query.filterQuery };
        data = await db.collection('users').find(search).toArray();
      }
      if (!data) {
        data = [];
      }
      return [...new Set(data)];
    } catch (ex) {
      console.log(ex);
      return [];
    }
  },
  getPhoneNumber: async function (user, db) {
    try {
      const query = { $or: [{ email: user.email }] };
      const [dbUser] = await this.query(query, { skip: 0, limit: 0 }, db);
      if (dbUser) {
        return dbUser.phone;
      }
    } catch (ex) {
      console.log(ex);
    }
    return '';
  },
  // systemSettings: async function( db ) {
  //     try {
  //         console.log("TEST DB READ. Database name: ", db.databaseName);
  //         console.log("Database info: ", db);
  //         // const dbset = await db.use('tellit_api_production');
  //         // console.log("set database: ", dbset);
  //         let data = await db.collection('admin_whitelists').find({}).toArray();
  //         // let data = await db.collection('users').countDocuments();
  //         console.log("TEST DB SUCCESS", data.length)

  //         if(!data) {
  //             data = [];
  //         }
  //         return data;
  //     }
  //     catch(ex){
  //         console.log("TEST DB ERROR: ",ex);
  //         return false;
  //     }
  // }
};

module.exports = userHelper;
