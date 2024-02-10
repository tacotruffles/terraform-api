const express = require('express');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const { ObjectId } = require('mongodb');

const router = express.Router();
const secureRequestHandler = require('../../../lib/secureRequestHandler');
const organizationHelper = require('../../../helpers/organizationHelper');

dayjs.extend(utc);

// FROM OLD PROEJECT TO BE REPURPOSED
// router.get('/autocomplete', secureRequestHandler(async (req, res) => {
//   try {
//     const { name, type } = req.query;
//     const data = await organizationHelper.orgAutoComplete(name, type, req.db);
//     return { options: data };
//   } catch (err) {
//     console.log(err);
//     return err;
//   }
//  }));

router.get(
  '/getByType/:type',
  secureRequestHandler(async (req, res) => {
    try {
      const { type } = req.params;
      let query = type;
      if (query.includes(',')) {
        const options = query.split(',');
        query = { $in: options };
      }
      const data = await organizationHelper.getAll(query, req.db);
      return data;
    } catch (err) {
      console.log(err);
      return { requestStatus: 500, errorMessage: err.message, details: err };
    }
  })
);
router.post(
  '/filter',
  secureRequestHandler(async (req) => {
    try {
      const { filter } = req.body;
      const data = await organizationHelper.query(filter, req.db);
      return data;
    } catch (err) {
      console.log(err);
      return { requestStatus: 500, errorMessage: err.message, details: err };
    }
  })
);
router.post(
  '/getOrgWithInfo',
  secureRequestHandler(async (req) => {
    try {
      const { filter } = req.body;
      const data = await organizationHelper.getOrgWithInfo(filter, req.db);
      return data;
    } catch (err) {
      console.log(err);
      return { requestStatus: 500, errorMessage: err.message, details: err };
    }
  })
);
router.post(
  '/create',
  secureRequestHandler(async (req) => {
    try {
      const { organization } = req.body;
      const newOrganization = {
        ...organization,
        contacts: [],
        createdAt: dayjs.utc().toDate(),
        parent: organization?.parent ? new ObjectId(organization.parent) : null,
        userId: organization?.userId ? new ObjectId(organization.userId) : null,
        // CONVERT ENDDATE TO UTC DATE TYPE
      };
      // DO WE NEED TO ENSURE THAT THE ORG DOESN'T ALREADY EXIST?
      const newOrg = await organizationHelper.create(newOrganization, req.db);
      return newOrg;
    } catch (err) {
      console.log(err);
      return { requestStatus: 500, errorMessage: err.message, details: err };
    }
  })
);

router.post(
  '/update',
  secureRequestHandler(async (req) => {
    try {
      const { organization } = req.body;
      delete organization.firstParent;
      delete organization.secondParent;
      delete organization.userInfo;


      //
      const updatedOrganization = {
        ...organization,
        updatedAt: dayjs.utc().toDate(),
        parent: organization?.parent ? new ObjectId(organization.parent) : null,
        userId: organization?.userId ? new ObjectId(organization.userId) : null,
      };
      const updatedOrg = await organizationHelper.update(updatedOrganization, req.db);
      return updatedOrg;
    } catch (err) {
      console.log(err);
      return { requestStatus: 500, errorMessage: err.message, details: err };
    }
  })
);

router.get(
  '/getUsersClasses/:userId',
  secureRequestHandler(async (req) => {
    try {
      const { userId } = req.params;
      const data = await organizationHelper.getUsersClasses(userId, req.db);
      return data;
    } catch (err) {
      console.log(err);
      return { requestStatus: 500, errorMessage: err.message, details: err };
    }
  })
);

router.delete(
  '/:id',
  secureRequestHandler(async (req) => {
    try {
      const { id } = req.params;
      const data = await organizationHelper.delete(id, req.db);
      return data;
    } catch (err) {
      console.log(err);
      return { requestStatus: 500, errorMessage: err.message, details: err };
    }
  })
)

module.exports = router;
