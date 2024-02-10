const express = require('express');
const requestHandler = require('../../../lib/requestHandler');
const secureRequestHandler = require('../../../lib/secureRequestHandler');
const lessonHelper = require('../../../helpers/lessonHelper');
const commentHelper = require('../../../helpers/commentHelper');
const awsHelper = require('../../../helpers/awsHelper');

const router = express.Router();

router.post('/list', secureRequestHandler(async (req, res) => {
  const { filterBy, filterQuery } = req.body;
  try {
    const result = await lessonHelper.list(filterBy, filterQuery, req.db);
    return { lessons: result };
  } catch (err) {
    console.log(err);
    return { requestStatus: 400, msg: err.message, details: err };
  }
}));

router.post('/teacher/list/:teacherId', secureRequestHandler(async (req, res) => {
  const { filterBy, filterQuery } = req.body;
  const { teacherId } = req.params;
  try {
    const result = await lessonHelper.teacherList(filterBy, filterQuery, req.db, teacherId);
    return { lessons: result };
  } catch (err) {
    console.log(err);
    return { requestStatus: 400, msg: err.message, details: err };
  }
}));

router.post('/shared/list/:userId', secureRequestHandler(async (req, res) => {
  const { filterBy, filterQuery } = req.body;
  const { userId } = req.params;
  try {
    const result = await lessonHelper.sharedList(filterBy, filterQuery, req.db, userId);
    return { lessons: result };
  } catch (err) {
    console.log(err);
    return { requestStatus: 400, msg: err.message, details: err };
  }
}));

router.get(
  '/lessonInfo/:lessonId/:userId',
  secureRequestHandler(async (req, res) => {
    const { lessonId, userId } = req.params;
    try {
      console.log(lessonId, userId)
      const lessonResult = await lessonHelper.getById(lessonId, req.db);
      // FILTER OUT PRIVATE REFLECTIONS IF THIS LESSON DOES NOT BELONG TO THE USER/TEACHER
      if (lessonResult?.teacherId?.toString() !== userId) {
        const filteredReflections = lessonResult?.reflections.filter((el) => el.isPrivate !== true);
        lessonResult.reflections = filteredReflections;
      }
      // GET A LIST OF CATEGORIES THAT HAVE DATA
      if (lessonResult?.lessonActivityData?.data) {
        const cats = Object.keys(lessonResult.lessonActivityData.data).filter(
          (el) => el !== 'stats' && lessonResult.lessonActivityData.data[el].numMoments !== 0
        );
        lessonResult.categories = cats;
      }
      // GET AN ARRAY OF KEY MOMENTS
      const metrics = lessonResult?.categories?.map((el) => ({
        count: Math.round(lessonResult.lessonActivityData.data[el].length / 60),
        length: lessonResult.lessonActivityData.data[el].numMoments,
        name: el,
      }));
      lessonResult.metrics = metrics;
      if (lessonResult.videoKey) {
        lessonResult.videoUrl = await awsHelper.getSignedGetUrl(lessonResult.videoKey, lessonResult.videoKey?.split('.')[1] || 'mp4');
      }
      return { lesson: lessonResult };
    } catch (err) {
      console.log(err);
      return { requestStatus: 400, msg: err.message, details: err };
    }
  })
);

router.post('/getSignedUrl',
  secureRequestHandler(async (req, res) => {
    const { key, mime, name, lessonDate, lessonId, classId  } = req.body;
    try {
      const signedUrl = await awsHelper.getSignedPutUrl(key, mime, name, lessonDate, lessonId, classId);
      return {  url: signedUrl };
    } catch (err) {
      console.log(err);
      return { requestStatus: 400, msg: err.message, details: err };
    }
  })
);

router.post('/new',
  secureRequestHandler(async (req, res) => {
    try {
      const result = await lessonHelper.create(req.body, req.db);
      return { lesson: result };
    } catch (err) {
      console.log(err);
      return { requestStatus: 400, msg: err.message, details: err };
    }
  }
));

router.post('/update',
  secureRequestHandler(async (req, res) => {
    try {
      const result = await lessonHelper.update(req.body, req.db);
      return { lesson: result };
    } catch (err) {
      console.log(err);
      return { requestStatus: 400, msg: err.message, details: err };
    }
  }
));

router.post('/share',
  secureRequestHandler(async (req, res) => {
    try {
      const result = await lessonHelper.share(req.body, req.db);
      return { lesson: result };
    } catch (err) {
      console.log(err);
      return { requestStatus: 400, msg: err.message, details: err };
    }
  }
));

router.get('/share/:lessonId',
  secureRequestHandler(async (req, res) => {
    const { lessonId } = req.params;
    try {
      const result = await lessonHelper.getShares(lessonId, req.db);
      return { shares: result };
    } catch (err) {
      console.log(err);
      return { requestStatus: 400, msg: err.message, details: err };
    }
  })
);

router.post('/unshare',
  secureRequestHandler(async (req, res) => {
    try {
      const result = await lessonHelper.unshare(req.body, req.db);
      return { lesson: result };
    } catch (err) {
      console.log(err);
      return { requestStatus: 400, msg: err.message, details: err };
    }
  }
));

module.exports = router;
