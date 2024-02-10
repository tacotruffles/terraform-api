const express = require('express');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');

const { ObjectId } = require('mongodb');
const secureRequestHandler = require('../../../lib/secureRequestHandler');
const commentHelper = require('../../../helpers/commentHelper');

const router = express.Router();
dayjs.extend(utc);
router.get(
  '/:lessonId',
  secureRequestHandler(async (req, res) => {
    const { lessonId } = req.params;
    try {
      const commentResult = await commentHelper.getByLessonId(lessonId, req.db);
      return { comments: commentResult };
    } catch (err) {
      return { requestStatus: 400, message: err.message, details: err };
    }
  })
);
router.get(
  '/user/:userId',
  secureRequestHandler(async (req, res) => {
    const { userId } = req.params;
    try {
      const commentResult = await commentHelper.getByUserId(userId, req.db);
      return { comments: commentResult };
    } catch (err) {
      return { requestStatus: 400, message: err.message, details: err };
    }
  })
)
router.post(
  '/new',
  secureRequestHandler(async (req, res) => {
    const { isChild, parentId } = req.body;
    try {
      const comment = {
        ...req.body,
        created: dayjs.utc().toDate(),
        permissions: 'none',
        shared: [],
        lessonId: new ObjectId(req.body.lessonId),
        owner: new ObjectId(req.user._id),
        children: [],
      };
      delete comment.parentId;
      const result = await commentHelper.create(comment, req.db);
      if (isChild && !result.requestStatus) {
        const response = await commentHelper.addChild(parentId, result._id, req.db);
        if (response) {
          return { ...response };
        }
      }
      return { ...result };
    } catch (err) {
      return { requestStatus: 400, errorMessage: err.message, details: err };
    }
  })
);
router.post(
  '/edit',
  secureRequestHandler(async (req, res) => {
    try {
      const comment = {
        ...req.body,
        updated: dayjs.utc().toDate(),
      };
      //this should only be the comment body, not the whole comment
      const result = await commentHelper.update(comment, req.db);
      return { ...result };
    } catch (err) {
      return { requestStatus: 400, errorMessage: err.message, details: err };
    }
  })
);
router.delete(
  '/:id',
  secureRequestHandler(async (req, res) => {
    const { id } = req.params;
    try {
      const result = await commentHelper.delete(id, req.db);
      return { ...result };
    } catch (err) {
      return { requestStatus: 400, errorMessage: err.message, details: err };
    }
  })
);
module.exports = router;
