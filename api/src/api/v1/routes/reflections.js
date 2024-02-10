const express = require('express');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const secureRequestHandler = require('../../../lib/secureRequestHandler');
const reflectionHelper = require('../../../helpers/reflectionHelper');

const router = express.Router();
dayjs.extend(utc);

router.post(
  '/edit',
  secureRequestHandler(async (req, res) => {
    try {
      const reflection = {
        ...req.body,
        updated: dayjs.utc().toDate(),
      };
      const result = await reflectionHelper.update(reflection, req.db);
      return { ...result };
    } catch (err) {
      return { requestStatus: 400, errorMessage: err.message, details: err };
    }
  })
);
// router.delete(
//   '/:id',
//   secureRequestHandler(async (req, res) => {
//     const { id } = req.params;
//     try {
//       const result = await reflectionHelper.delete(id, req.db);
//       return { ...result };
//     } catch (err) {
//       return { requestStatus: 400, errorMessage: err.message, details: err };
//     }
//   })
// );
module.exports = router;
