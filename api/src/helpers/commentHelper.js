const { ObjectId } = require('mongodb');
const emailHelper = require('./emailHelper');
const templateHelper = require('./templateHelper');

const commentHelper = {
  collection: "comments",
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
  create: async (comment, db) => {
    try {
      const newComment = await db
      .collection('comments')
      .insertOne({ ...comment });
      comment._id = newComment.insertedId;
      return comment;
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
  update: async (comment, db) => {
    try {
      const updatedComment = await db
      .collection('comments')
      .findOneAndUpdate(
        { _id: new ObjectId(comment.commentId) },
        { $set: { ...comment } },
        { returnDocument: 'after' }
      );
      console.log(updatedComment);
      return updatedComment.value;
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
  getByLessonId: async function (id, db) {
    try {
      const lessonId = new ObjectId(id);
  
      // Perform a simple $lookup to get the owner information for parent comments
      const parentCommentsWithOwner = await db.collection('comments')
        .aggregate([
          {
            $match: {
              lessonId: lessonId,
              isChild: { $ne: true }
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'owner',
              foreignField: '_id',
              as: 'owner'
            }
          },
          {
            $unwind: {
              path: '$owner',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $project: {
              'owner.password': 0,
              'owner.email': 0,
              'owner.created': 0,
              'owner.lastLogin': 0,
              'owner.registrationCode': 0,
              'owner.token': 0,
              'owner.username': 0,
            }
          },
          {
            $sort: {
              created: -1
            }
          }
        ]).toArray();
  
      // Get a list of all child comment IDs from parent comments
      let childCommentIds = [];
      parentCommentsWithOwner.forEach(comment => {
        if (comment.children) {
          childCommentIds = childCommentIds.concat(comment.children);
        }
      });
  
      // Perform a simple $lookup to get the owner information for child comments
      const childCommentsWithOwner = await db.collection('comments')
        .aggregate([
          {
            $match: {
              _id: { $in: childCommentIds }
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'owner',
              foreignField: '_id',
              as: 'owner'
            }
          },
          {
            $unwind: {
              path: '$owner',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $project: {
              'owner.password': 0,
              'owner.email': 0,
              'owner.created': 0,
              'owner.lastLogin': 0,
              'owner.registrationCode': 0,
              'owner.token': 0,
              'owner.username': 0,
            }
          },
          {
            $sort: {
              created: -1
            }
          }
        ]).toArray();
  
      // Construct a map for quick lookup of child comments
      const childCommentsMap = {};
      childCommentsWithOwner.forEach(childComment => {
        childCommentsMap[childComment._id.toString()] = childComment;
      });
  
      // Add the child comments to their respective parents
      parentCommentsWithOwner.forEach(parentComment => {
        if (parentComment.children) {
          parentComment.children = parentComment.children.map(childId => childCommentsMap[childId.toString()]);
          //delete any children that are undefined or null
          parentComment.children = parentComment.children.filter(child => child);
          
        }
      });
  
      return parentCommentsWithOwner;
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
  getByUserId: async function (id, db) {
    try {
      const userId = new ObjectId(id);
      const comments = await db
      .collection('organizations')
      .aggregate( [
        {
          $match: {
            userId,
            type: 'class'
          },
        },
        {
          $lookup: {
            from: 'lessons',
            localField: '_id',
            foreignField: 'classId',
            as: 'lessons',
          },
        },
        {
          $unwind: '$lessons',
        },
        {
          $lookup: {
            from: 'comments',
            localField: 'lessons._id',
            foreignField: 'lessonId',
            as: 'comments',
          },
        },
        {
          $lookup: {
            'from': 'users',
            'localField': 'comments.owner',
            'foreignField': '_id',
            'as': 'commentOwner'  
          }
        },
        {
          $project: {
            'comments': 1,
            'lessons.name': 1,
            'commentOwner.firstName': 1,
            'commentOwner.lastName': 1,
        }
        },
      ], {
        allowDiskUse: false,
      }
    )
    .toArray();
    // console.log(comments)
    const allComments = []
    comments.forEach(comment => {
      comment.comments.forEach(c => {
        //add lesson name to comment
        c.lessonName = comment.lessons.name
        c.firstName = comment.commentOwner[0].firstName
        c.lastName = comment.commentOwner[0].lastName
        allComments.push(c)
      }
      )
    })
    //sort by created date then return the 4 most recent
    allComments.sort((a, b) => b.created - a.created)
    const recentComments = allComments.slice(0, 4)
    return recentComments;
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
  addChild: async function (parentId, childId, db) {
    try {
      const parent = await db
      .collection('comments')
      .findOneAndUpdate(
        { _id: new ObjectId(parentId) },
        { $push: { children: childId } },
        { returnDocument: 'after' }
      );
      return parent;
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
  delete: async function (id, db) {
    try {
      const commentToDelete = await db.collection('comments').findOne({ _id: new ObjectId(id) });
      const commentIds = [commentToDelete._id, ...commentToDelete.children];
      const result = await db.collection('comments').deleteMany({ _id: { $in: commentIds } })
      return result;
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
  /**
   * Generate HTML email for Lesson Mentions in Comments
   *
   * @param {Object} body - should contain { "commentId" } from req.body - email recipient/sender determined via db query
   * @param {Object} db MongoDB connection client sent via req.db in endpoint request
   *
   * Returns { "msg": String, "success": Boolean}
   */
  sendLessonMentionEmail: async function (body, db) {
    const { commentId } = body; // recipient

    try {  
      const query = [
        {
          $match: {
            _id: new ObjectId(commentId),
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
        // Recipient
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
        // Comment owner
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

      const [comment] = await this.query(query, db);

      if (comment) {
        const template = await templateHelper.get({ key: 'lesson-mention' }, db);
        const replaceKeys = [];

        const fullName = emailHelper.formatFullName(comment.teacher.firstName,comment.teacher.lastName)
        replaceKeys.push({ key: '{FULLNAME}', value: fullName });
        // TODO: Not sure how to handle comment owner query...will this message only be sent for child comments? and is "comment.owner" the commentor.
        replaceKeys.push({ key: '{COMMENT.FIRSTNAME}', value: comment.owner.firstName });
        replaceKeys.push({ key: '{COMMENT.LASTNAME}', value: comment.owner.lastName });
        // TODO: I don't see anything that would suggest a comment "subject"...maybe the lesson name is sufficient?
        // replaceKeys.push({ key: '{COMMENT.SUBJECT}', value: comment.subject });
        replaceKeys.push({ key: '{COMMENT}', value: comment.content });
        // NOTE: Many test lessons appear to be missing name fields
        replaceKeys.push({ key: '{LESSON.NAME}', value: comment.lesson.name });
        // TODO: determine deep link to lesson
        replaceKeys.push({ key: '{LESSON.URL}', value: `${process.env.BASE_URL}/lessons` });
        
        const emailResult = await emailHelper.sendTemplate({ email: comment.teacher.email }, template, db, replaceKeys);
        if (emailResult) return { msg: 'Comment Mention email sent!', success: true };
      }

    } catch (e) {
      console.log(e.message);
    }
    return { msg: "Unable to send Lesson Processed Email, please contact support", success: false };
  },
  /**
   * Generate HTML email for Direct Message in Comments
   *
   * @param {Object} body - should contain { "commentId" } from req.body - email recipient/sender determined via db query
   * @param {Object} db MongoDB connection client sent via req.db in endpoint request
   *
   * Returns { "msg": String, "success": Boolean}
   */
  sendDirectMessageEmail: async function (body, db) {
    const { commentId } = body; // recipient

    try {  
      // TODO: Are direct messages within the commenting architcure or another mechanism?
      const query = [
        {
          $match: {
            _id: new ObjectId(commentId),
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
        // Recipient
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
        // Comment owner
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

      const [comment] = await this.query(query, db);
      
      if (comment) {
        const template = await templateHelper.get({ key: 'direct-message' }, db);
        const replaceKeys = [];
        // TODO: Not sure how to handle recipient name: pull from db or passed in via req.body?

        
        const fullName = emailHelper.formatFullName(comment.teacher.firstName,comment.teacher.lastName)
        replaceKeys.push({ key: '{FULLNAME}', value: fullName });
        // TODO: Not sure how to handle comment owner query...will this message only be sent for child comments? and is "comment.owner" the commentor.
        replaceKeys.push({ key: '{SENDER.FIRSTNAME}', value: comment.owner.firstName });
        replaceKeys.push({ key: '{SENDER.LASTNAME}', value: comment.owner.lastName });
        // TODO: determine deep link to lesson
        replaceKeys.push({ key: '{MESSAGE.URL}', value: `${process.env.BASE_URL}/messages` });
        
        const emailResult = await emailHelper.sendTemplate({ email: comment.teacher.email }, template, db, replaceKeys);
        if (emailResult) return { msg: 'Direct Message email sent!', success: true };
      }

    } catch (e) {
      console.log(e.message);
    }
    return { msg: "Unable to send Direct Message Email, please contact support", success: false };
  }
}
module.exports = commentHelper;
