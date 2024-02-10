const { ObjectId } = require('mongodb');
const dayjs = require('dayjs');
const emailHelper = require('./emailHelper');
const templateHelper = require('./templateHelper');

const lessonHelper = {
  collection: "lessons",
  list: async function (filterBy, filterQuery, db) {
    try {
      const query = {};
      //we want to add the user data to the lesson object, so we need to do a lookup on the users collection against the teacherId
      const lessons = await db
      .collection('lessons')
      .aggregate([
        {
          $match: {
            [filterBy]: filterQuery,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'teacherId',
            foreignField: '_id',
            as: 'teacherData',
          },
        },
        {
          $unwind: {
            path: '$teacherData',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            'teacherData.email': 1,
            'teacherData.firstName': 1,
            'teacherData.lastName': 1,
            class: 1,
            created: 1,
            grade: 1,
            _id: 1,
            status: 1,
            name: 1,
            lessonDate: 1,
            term: 1
          },
        },
        {
          $group: {
            _id: "$_id",
            teacherData: { $first: "$teacherData" },
            class: { $first: "$class" },
            created: { $first: "$created" },
            grade: { $first: "$grade" },
            status: { $first: "$status" },
            lessonDetails: {
              $push: {
                name: "$name",
                lessonDate: "$lessonDate",
                term: "$term"
              }
            }
          }
        },
        {
          $project: {
            teacherData: 1,
            class: 1,
            created: 1,
            grade: 1,
            status: 1,
            name: 1,
            lessonDetails: 1
          }
        }
      ])
      .toArray(); 
      return lessons;
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
  teacherList: async function (filterBy, filterQuery, db, teacherId) {
    const query = { teacherId: new ObjectId(teacherId) };
    if (filterBy && filterQuery) {
      query[filterBy] = filterQuery;
    }
    try {
      //we want to add the user data to the lesson object, so we need to do a lookup on the users collection against the teacherId
      const lessons = await db
      .collection('lessons')
      .aggregate([
        {
          $match: query
        },
        {
          $lookup: {
            from: 'organizations',
            localField: 'classId',
            foreignField: '_id',
            as: 'classData',
          }
        },
        {
           $unwind: { path: '$classData', preserveNullAndEmptyArrays: true } 
        },
        {
          $lookup: {
            from: 'lessonActivities',
            localField: 'currentLessonAcivityResults',
            foreignField: '_id',
            as: 'lessonActivities',
          }
        },
        {
           $unwind: { path: '$lessonActivities', preserveNullAndEmptyArrays: true } 
        },
        {
          $project: {
            class: '$clasData.name',
            created: 1,
            grade: '$classData.grade',
            period: '$classData.period',
            subject: '$classData.subject',
            _id: 1,
            status: 1,
            name: 1,
            lessonDate: 1,
            term: 1,
            summary: 1,
            goal: 1,
            lessonActivities: 1
          },
        },
        {
          $group: {
            _id: "$_id",
            class: { $first: "$class" },
            created: { $first: "$created" },
            grade: { $first: "$grade" },
            period: { $first: "$period" },
            subject: {$first: "$subject"},
            status: { $first: "$status" },
            lessonDate: { $first: "$lessonDate" },
            lessonActivities: { $first: '$lessonActivities.data' },
            lessonDetails: {
              $push: {
                name: "$name",
                term: "$term",
                summary: "$summary",
                goal: "$goal",
              }
            }
          }
        },
        {
          $unwind: "$lessonDetails",
        },
        {
          $project: {
            class: 1,
            created: 1,
            grade: 1,
            period: 1,
            subject: 1,
            status: 1,
            name: 1,
            lessonDate: 1,
            lessonDetails: 1,
            lessonActivities: 1,

          }
        }
      ])
      .toArray(); 
      return lessons;
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
  getById: async function (id, db) {
    try {
      const lessonId = new ObjectId(id);
      const [lessonResult] = await db
        .collection('lessons')
        .aggregate(
          [
            {
              $match: {
                _id: lessonId,
              },
            },
            {
              $lookup: {
                from: 'lessonActivities',
                localField: 'currentLessonAcivityResults',
                foreignField: '_id',
                as: 'lessonActivityData',
              },
            },
            {
              $unwind: {
                path: '$lessonActivityData',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: 'reflections',
                localField: '_id',
                foreignField: 'lessonId',
                as: 'reflections',
              },
            },
            {
              $sort: {
                'reflections.questionNumber': 1,
              },
            },
          ],
          {
            allowDiskUse: false,
          }
        )
        .toArray();
      return lessonResult;
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
  firstOrDefault: async function (query, db) {
    try {
      const result = await db.collection(this.collection).find(query).toArray();
      if (result && result.length > 0) {
        return result[0];
      }
    } catch (ex) {
      console.log(ex);
    }
    return '';
  },
  // THIS PROBABLY NEEDS PAGINATION AND SORT 
  query: async function (query, db) {
    try {
      const result = await db.collection(this.collection).aggregate(query).toArray();
      return result;
    } catch (err) {
      console.log(`Query ${this.collection} error `, err);
      throw err;
    }
  },
  create: async function (lesson, db) {
    try {
      lesson.classId = new ObjectId(lesson.class)
      const classObj = await db.collection('organizations').findOne({ _id: lesson.classId });
      const teacherObj = await db.collection('users').findOne({ _id: new ObjectId(classObj.userId) });
      delete lesson.class;
      const result = await db
        .collection('lessons')
        .insertOne({
          ...lesson,
          teacherId: new ObjectId(teacherObj._id),
          created: dayjs.utc().toDate(),
          status: 'uploaded',
        });
      //create reflection questions for this lesson based on the array in the system settings
      const systemSettings = await db.collection('settings').findOne({ key: 'system-settings' });

      // create the private note:
      const PrivateReflection = {
        created: dayjs.utc().toDate(),
        owner: new ObjectId(teacherObj._id),
        lessonId: result.insertedId,
        response: '',
        isPrivate: true,
        questionText: "Private Reflection (never shared)",
        questionNumber: 0,
      };
      db.collection('reflections').insertOne(PrivateReflection);
      const reflectionQuestions = systemSettings.data.reflectionQuestions;
      reflectionQuestions.forEach((question, index) => {
        const reflection = {
          created: dayjs.utc().toDate(),
          owner: new ObjectId(teacherObj._id),
          lessonId: result.insertedId,
          response: '',
          isPrivate: false,
          questionText: question,
          questionNumber: index + 1,
        };
        db.collection('reflections').insertOne(reflection);
      });
      //assemble the lesson s3 key based on the idNumbers of the class, the classes parent, the teacher, and the lesson name
      const lessonName = lesson.name.replace(/ /g, '-');
      //get the current epoch time
      const epoch = Math.floor(new Date().getTime());
      const lessonKey = `C${classObj.idNumber}_T${teacherObj.idNumber}_L${lessonName}_D${lesson?.lessonDate?.replace('-','')}_E${epoch}.mp4`;
      return { lesson: result, lessonKey };
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
  update: async function (lesson, db) {
    try {
      const lessonId = new ObjectId(lesson.lessonId);
      delete lesson.lessonId;
      const result = await db
        .collection('lessons')
        .updateOne({ _id: new ObjectId(lessonId) }, { $set: lesson });
      return result;
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
  sharedList: async function (filterBy, filterQuery, db, userId) {
    try {
      const query = {userId: new ObjectId(userId)};
      if (filterBy && filterQuery) {
        query[filterBy] = filterQuery;
      }
      console.log(query)
      const result = await db
        .collection('lessonShares')
        .aggregate([
          {
            $match: query,
          },
          {
            $lookup: {
              from: 'lessons',
              localField: 'lessonId',
              foreignField: '_id',
              as: 'lessonData',
            }
          },
          {
            $unwind: {
              path: '$lessonData',
              preserveNullAndEmptyArrays: true,
            }
          },
          {
            $project: {
              'state': 1,
              'created': 1,
              'lessonData.class': 1,
              'lessonData.created': 1,
              'lessonData.grade': 1,
              'lessonData._id': 1,
              'lessonData.status': 1,
              'lessonData.name': 1,
              'lessonData.lessonDate': 1,
              'lessonData.term': 1,
              'lessonData.teacherId': 1,
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'lessonData.teacherId',
              foreignField: '_id',
              as: 'teacherData',
            },
          },
          {
            $unwind: {
              path: '$teacherData',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              'state': 1,
              'created': 1,
              'teacherData.email': 1,
              'teacherData.firstName': 1,
              'teacherData.lastName': 1,
              'lessonData.class': 1,
              'lessonData.created': 1,
              'lessonData.grade': 1,
              'lessonData._id': 1,
              'lessonData.status': 1,
              'lessonData.name': 1,
              'lessonData.lessonDate': 1,
              'lessonData.term': 1,
            },
          },
          {
            $group: {
              _id: "$lessonData._id",
              class: { $first: "$lessonData.class" },
              created: { $first: "$lessonData.created" },
              grade: { $first: "$lessonData.grade" },
              status: { $first: "$lessonData.status" },
              lessonDate: { $first: "$lessonData.lessonDate" },
              lessonDetails: {
                $push: {
                  name: "$lessonData.name",
                  term: "$lessonData.term"
                }
              },
              teacherData: { $first: "$teacherData" },
              shareStatus: { $first: "$state" },
              sharedAt: { $first: "$created" },
            }
          },
          {
            $unwind: {
              path: '$lessonDetails',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $sort: {
              'sharedAt': -1
            }
          }
        ])
        .toArray(); 
        console.log(result)
      return result;
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
  share: async function (payload, db) {
    try {
      const idUsers = payload.selectedUserIds.map((user) => new ObjectId(user));
      const lessonShares = await db
        .collection('lessonShares')
        .find({ lessonId: new ObjectId(payload.lessonId) }).toArray();
      const newUsers = idUsers.filter((user) => !lessonShares.find((share) => share.userId.equals(user)));
      const removedUsers = lessonShares.filter((share) => !idUsers.find((user) => share.userId.equals(user)));
      newUsers.forEach((user) => {
        db.collection('lessonShares').insertOne({
          lessonId: new ObjectId(payload.lessonId),
          userId: user,
          state: "new",
          permissionLevel: payload.permissionLevel,
          created: dayjs.utc().toDate(),
        });
      });
      //remove any users that were unselected
      removedUsers.forEach((user) => {
        db.collection('lessonShares').deleteOne({ _id: user._id, permissionLevel: payload.permissionLevel });
      });
      return { msg: 'success' };
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
  getShares: async function (lessonId, db) {
    try {
      const result = await db
        .collection('lessonShares')
        .aggregate([
          {
            $match: {
              lessonId: new ObjectId(lessonId),
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'userId',
              foreignField: '_id',
              as: 'userData',
            },
          },
          {
            $unwind: {
              path: '$userData',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              'userData.email': 1,
              'userData.firstName': 1,
              'userData.lastName': 1,
              permissionLevel: 1,
              userId: 1
            },
          },
        ])
        .toArray();
      return result;
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
  /**
   * Generate HTML email notification for completed pipeline processing for video lessons
   *
   * @param {Object} body - should contain { "lessonId" } from req.body - recipient determined via db query
   * @param {Object} db MongoDB connection client sent via req.db in endpoint request
   *
   * Returns { "msg": String, "success": Boolean}
   */
  sendLessonProcessedEmail: async function (body, db) {
    const { lessonId } = body; // recipient
    const msgType = "Lesson Processed";

    const query = [
      {
        $match: {
          _id: new ObjectId(lessonId),
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'teacherId',
          foreignField: '_id',
          as: 'teacher',
        },
      },
      {
        $unwind: '$teacher',
      },
    ];

    try {
      const [lesson] = await this.query(query, db);
      
      if (lesson) {
        const template = await templateHelper.get({ key: 'lesson-processed' }, db);
        const replaceKeys = [];
        const fullName = emailHelper.formatFullName(lesson.teacher.firstName, lesson.teacher.lastName)
        replaceKeys.push({ key: '{FULLNAME}', value: fullName });
        replaceKeys.push({ key: '{LESSON.NAME}', value: lesson.name });
        replaceKeys.push({ key: '{LESSON.DATE}', value: lesson.lessonDate });
        replaceKeys.push({ key: '{LESSON.GOAL}', value: lesson.goal });
        replaceKeys.push({ key: '{LESSON.SUMMARY}', value: lesson.summary });
        replaceKeys.push({ key: '{LESSON.URL}', value: `${process.env.BASE_URL}/lessons` }); // TODO: determine deep link
        
        const emailResult = await emailHelper.sendTemplate({ email: lesson.teacher.email }, template, db, replaceKeys);
        if (emailResult) return { msg: `${ msgType } email sent!`, success: true };
      }

    } catch (e) {
      console.log(e.message);
    }
    return { msg: `Unable to send ${ msgType } Email, please contact support`, success: false };
  },
  /**
   * Generate HTML email notification for lesson shares
   *
   * @param {Object} body - should contain { "lessonId" } from req.body - recipient determined via db query
   * @param {Object} db MongoDB connection client sent via req.db in endpoint request
   *
   * Returns { "msg": String, "success": Boolean}
   */
  sendLessonSharedEmail: async function (body, db) {
    const { lessonId } = body; // recipient
    const msgType = "Lesson Shared";

    const query = [
      {
        $match: {
          _id: new ObjectId(lessonId),
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'teacherId',
          foreignField: '_id',
          as: 'teacher',
        },
      },
      {
        $unwind: '$teacher',
      },
    ];

    try {
      const [lesson] = await this.query(query, db);
      
      if (lesson) {
        const template = await templateHelper.get({ key: 'lesson-shared' }, db);
        const replaceKeys = [];
        // Sender
        const fullName = emailHelper.formatFullName(lesson.teacher.firstName, lesson.teacher.lastName)
        replaceKeys.push({ key: '{FULLNAME}', value: fullName });
        
        // Recipient - TODO: Not sure how recipient is determine via db or req.body?
        // replaceKeys.push({ key: '{LESSON.FIRSTNAME}', value: lesson.teacher.firstName });
        // replaceKeys.push({ key: '{LESSON.LASTNAME}', value: lesson.teacher.lastName });
        // Content
        replaceKeys.push({ key: '{LESSON.NAME}', value: lesson.name });
        replaceKeys.push({ key: '{LESSON.DATE}', value: lesson.lessonDate });
        replaceKeys.push({ key: '{LESSON.GOAL}', value: lesson.goal });
        replaceKeys.push({ key: '{LESSON.SUMMARY}', value: lesson.summary });
        replaceKeys.push({ key: '{LESSON.URL}', value: `${process.env.BASE_URL}/lessons` }); // TODO: determine deep link
        
        // TODO: Not sure how recipient email is determined yet - via db or req.body? So using sender email as a render test.
        const emailResult = await emailHelper.sendTemplate({ email: lesson.teacher.email }, template, db, replaceKeys);
        if (emailResult) return { msg: `${ msgType } email sent!`, success: true };
      }

    } catch (e) {
      console.log(e.message);
    }
    return { msg: `Unable to send ${ msgType } Email, please contact support`, success: false };
  },
  /**
   * Generate HTML email notification for lesson shares
   * NOTE: This may not be the best location for this helper f(x). 
   * NOTE: Probably should be moved to the uploads helper
   * NOTE: It appears there isn't a collection for video uploads yet and it appears the "lessons" collection is serving that purpose. 
   *
   * @param {Object} body - should contain { "lessonId" } from req.body - recipient determined via db query
   * @param {Object} db MongoDB connection client sent via req.db in endpoint request
   *
   * Returns { "msg": String, "success": Boolean}
   */
  sendVideoUploadedByUserEmail: async function (body, db) {
    const { lessonId } = body; // recipient
    const msgType = "Lesson Uploaded By User";

    const query = [
      {
        $match: {
          _id: new ObjectId(lessonId),
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'teacherId',
          foreignField: '_id',
          as: 'teacher',
        },
      },
      {
        $unwind: '$teacher',
      },
    ];

    try {
      const [lesson] = await this.query(query, db);

      if (lesson) {
        const template = await templateHelper.get({ key: 'video-upload-user' }, db);
        const replaceKeys = [];

        const fullName = emailHelper.formatFullName(lesson.teacher.firstName, lesson.teacher.lastName)
        replaceKeys.push({ key: '{FULLNAME}', value: fullName });
        
        const emailResult = await emailHelper.sendTemplate({ email: lesson.teacher.email }, template, db, replaceKeys);
        if (emailResult) return { msg: `${ msgType } email sent!`, success: true };
      }

    } catch (e) {
      console.log(e.message);
    }
    return { msg: `Unable to send ${ msgType } Email, please contact support`, success: false };
  },
  /**
   * Generate HTML email notification for lesson shares
   * NOTE: This may not be the best location for this helper f(x). 
   * NOTE: Probably should be moved to the uploads helper
   * NOTE: It appears there isn't a collection for video uploads yet and it appears the "lessons" collection is serving that purpose. 
   *
   * @param {Object} body - should contain { "lessonId", "uploaderFirstName", "uploaderLastName" } from req.body - recipient determined via db query
   * @param {Object} db MongoDB connection client sent via req.db in endpoint request
   *
   * Returns { "msg": String, "success": Boolean}
   */
  sendVideoUploadedByAdminEmail: async function (body, db) {
    const { lessonId, uploaderFirstName, uploaderLastName } = body; // recipient
    const msgType = "Lesson Uploaded By Admin";

    const query = [
      {
        $match: {
          _id: new ObjectId(lessonId),
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'teacherId',
          foreignField: '_id',
          as: 'teacher',
        },
      },
      {
        $unwind: '$teacher',
      },
    ];

    try {
      const [lesson] = await this.query(query, db);

      if (lesson) {
        const template = await templateHelper.get({ key: 'video-upload-admin' }, db);
        const replaceKeys = [];

        const fullName = emailHelper.formatFullName(lesson.teacher.firstName, lesson.teacher.lastName)
        replaceKeys.push({ key: '{FULLNAME}', value: fullName });
        replaceKeys.push({ key: '{UPLOADER.FIRSTNAME}', value: uploaderFirstName });
        replaceKeys.push({ key: '{UPLOADER.LASTNAME}', value: uploaderLastName });
        
        const emailResult = await emailHelper.sendTemplate({ email: lesson.teacher.email }, template, db, replaceKeys);
        if (emailResult) return { msg: `${ msgType } email sent!`, success: true };
      }

    } catch (e) {
      console.log(e.message);
    }
    return { msg: `Unable to send ${ msgType } Email, please contact support`, success: false };
  },
  /**
   * NOTE: This may not be the best location for this helper f(x). 
   * NOTE: Probably should be moved to the uploads helper
   * NOTE: Mainly a) but there isn't a collection for that yet and it appears the "lessons" collection is serving that purpose. 
   * NOTE: b) there's no "shortcode" anywhere in the db, no idea where, how or when that is generated.
   * 
   * Generate HTML email for Pipeline Errors
   *
   * @param {ObjectId} lessonId - should contain { "lesson" } from req.body - email recipient/sender determined via db query
   * @param {Object} errorInfo - should contain { "videoName", "errorDateTime", "ErrorMessage"}
   * @param {Object} db MongoDB connection client sent via req.db in endpoint request
   *
   * Returns { "msg": String, "success": Boolean}
   */
  sendPipelineErrorEmail: async function (lessonId, errorInfo, db) {
    const msgType = "Pipeline Error";

    const query = [
      {
        $match: {
          _id: new ObjectId(lessonId.toString()), // just in case the object id is passed in as a string
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'teacherId',
          foreignField: '_id',
          as: 'teacher',
        },
      },
      {
        $unwind: '$teacher',
      },
    ];

    try {
      const [lesson] = await this.query(query, db);
      
      if (lesson) {
        const template = await templateHelper.get({ key: 'pipeline-error' }, db);
        const replaceKeys = [];

        replaceKeys.push({ key: '{VIDEO.NAME}', value: lesson.videoKey });
        // replaceKeys.push({ key: '{VIDEO.SHORTCODE}', value: 'UNKOWN' });
        replaceKeys.push({ key: '{ERROR.TIME}', value: errorInfo.errorDateTime });
        replaceKeys.push({ key: '{ERROR.MESSAGE}', value: errorInfo.errorMessage });
        
        // template.to and template.bcc fields, which are already sendGrid fromatted, are passed through
        const emailResult = await emailHelper.sendTemplate({ email: 'notused' }, template, db, replaceKeys);
        if (emailResult) return { msg: `${msgType} email sent!`, success: true };
      }

    } catch (e) {
      console.log(e.message);
    }
    return { msg: `Unable to send ${msgType} Email, please contact support`, success: false };
  }

};
module.exports = lessonHelper;
