const { ObjectId } = require('mongodb');

const emailHelper = require('./emailHelper');
const templateHelper = require('./templateHelper');

const reflectionHelper = {
  collection: "reflections",
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
  create: async function (reflection, db) {
    try {
      const newReflection = await db
      .collection(this.collection)
      .insertOne({ ...reflection });
      reflection._id = newReflection.insertedId;
      return reflection;
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
  update: async function (reflection, db) {
    try {
      const updatedReflection = await db
      .collection(this.collection)
      .findOneAndUpdate(
        { _id: new ObjectId(reflection.reflectionId) },
        { $set: { ...reflection } },
        { returnDocument: 'after' }
      );
      return updatedReflection.value;
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
  /**
   * Generate HTML email notification for lesson shares
   * NOTE: Reflection ID "65270516d08f001b2f25b829" is the only document in the db that had complete data in its child documents
   * NOTE: This may not be the best location for this helper f(x). 
   * NOTE: Probably should be moved to the uploads helper
   * NOTE: It appears there isn't a collection for video uploads yet and it appears the "lessons" collection is serving that purpose. 
   *
   * @param {Object} body - should contain { "reflectionId" } from req.body - recipient determined via db query
   * @param {Object} db MongoDB connection client sent via req.db in endpoint request
   *
   * Returns { "msg": String, "success": Boolean}
   */
  sendReflectionResponseEmail: async function (body, db) {
    const { reflectionId } = body; // recipient
    const msgType = "Reflection Response";

    const query = [
      {
        $match: {
          _id: new ObjectId(reflectionId),
        },
      },
      {
        $lookup: {
          from: 'lessons',
          localField: 'lessonId',
          foreignField: '_id',
          as: 'lesson',
        },
      },
      {
        $unwind: '$lesson',
      },
      // Sender
      {
        $lookup: {
          from: 'users',
          localField: 'lesson.teacherId',
          foreignField: '_id',
          as: 'teacher',
        },
      },
      {
        $unwind: '$teacher',
      },
      // Reflection owner - recipient
      {
        $lookup: {
          from: 'users',
          localField: 'owner',
          foreignField: '_id',
          as: 'owner',
        },
      },
      {
        $unwind: '$owner',
      },
    ];

    try {
      const [reflection] = await this.query(query, db);
console.log(reflection)
      if (reflection) {
        const template = await templateHelper.get({ key: 'reflection-response' }, db);
        const replaceKeys = [];

        const fullName = emailHelper.formatFullName(reflection.owner.firstName, reflection.owner.lastName)
        replaceKeys.push({ key: '{FULLNAME}', value: fullName });
        replaceKeys.push({ key: '{SENDER.FIRSTNAME}', value: reflection.teacher.firstName });
        replaceKeys.push({ key: '{SENDER.LASTNAME}', value: reflection.teacher.lastName });
        replaceKeys.push({ key: '{LESSON.NAME}', value: reflection.lesson.name }); // ???
        replaceKeys.push({ key: '{LESSON.SUBJECT}', value: reflection.questionText }); // ???
        
        const emailResult = await emailHelper.sendTemplate({ email: reflection.owner.email }, template, db, replaceKeys);
        if (emailResult) return { msg: `${ msgType } email sent!`, success: true };
      }

    } catch (e) {
      console.log(e.message);
    }
    return { msg: `Unable to send ${ msgType } Email, please contact support`, success: false };
  }
  
}
module.exports = reflectionHelper;
