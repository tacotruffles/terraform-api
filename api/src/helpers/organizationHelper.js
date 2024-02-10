const { ObjectId } = require('mongodb');

const organizationHelper = {
  create: async (organization, db) => {
    try {
      const newCityLower = organization.city ? organization.city.toLowerCase() : ''
      const newNameLower = organization.name ? organization.name.toLowerCase() : ''
      const newState = organization.state;
      const {value: orgCounters} = await db.collection('settings').findOne({ key: 'org-counter'});
      if (organization.type === 'district') {
        //make sure the city state name combo is unique
        const existingDistrict = await db
          .collection('organizations')
          .findOne({ type: 'district', nameLower: newNameLower, cityLower: newCityLower, state: newState });
        organization.idNumber = orgCounters.parentOrg;
        orgCounters.parentOrg += 1;
        if (existingDistrict) {
          throw new Error('This district already exists');
        }
      }
      if (organization.type === 'institute') {
        const existingInstitute = await db
          .collection('organizations')
          .findOne({ nameLower: newNameLower });
        organization.idNumber = orgCounters.institute;
        orgCounters.institute += 1;
        if (existingInstitute) {
          throw new Error('This institute already exists');
        }
      }
      if ( organization.type === 'school') {
        const existingDistrict = await db
          .collection('organizations')
          .findOne({ nameLower: newNameLower, cityLower: newCityLower, state: newState });
        organization.idNumber = orgCounters.school;
        if (existingDistrict) {
          throw new Error('This school already exists');
        }
      }
      if (organization.type === 'class' && organization?.supportTeam?.length) {

        organization.supportTeam = organization.supportTeam.map((memberId) => new ObjectId(memberId));
        organization.idNumber = orgCounters.class;
        orgCounters.class += 1;
      }
      if(organization.name) {
        organization.nameLower = newNameLower
      }
      if(organization.city) {
        organization.cityLower = newCityLower
      }
      const newOrganization = await db.collection('organizations').insertOne({ ...organization });
      await db.collection('settings').updateOne({ key: 'org-counter' }, { $set: { value: orgCounters } });
      organization._id = newOrganization.insertedId;
      return organization;
    } catch (err) {
      console.log('Create organization error ', err);
      throw err;
    }
  },
  getAll: async (type, db) => {
    try {
      const organizations = await db.collection('organizations').find({ type }).toArray();
      return organizations;
    } catch (err) {
      console.log('Get all organizations error ', err);
      throw err;
    }
  },
  // THIS PROBABLY NEEDS PAGINATION AND SORT, WILL EVENTUALLY BE AN AGGREGATE PROBABLY
  query: async (query, db) => {
    try {
      if ( query?._id ){
        query._id = new ObjectId(query._id)
      }
      const organizations = await db.collection('organizations').aggregate(
        [
          {
            $match: query || {}
          },
          {
            $lookup: {
              from: 'users',
              localField: 'userId',
              foreignField: '_id',
              as: 'userInfo'
            }
          },
        ]
      ).toArray();
      const populatedOrgsPromises = organizations.map(async (org) => {
        if(org.type === 'class' && org?.supportTeam?.length) {
          //populate the support team from the users collection
          const userIds = org.supportTeam.map((memberId) => new ObjectId(memberId));
          const users = await db.collection('users')
            .find({ _id: { $in: userIds } })
            .project({ _id: 1, firstName: 1, lastName: 1, email: 1 })
            .toArray();
          org.supportTeam = users;
        }
        return org
      });
      const populatedOrgs = await Promise.all(populatedOrgsPromises);
      return populatedOrgs;
    } catch (err) {
      console.log('Query organizations error ', err);
      throw err;
    }
  },
  update: async (organization, db) => {
    try {
      
      const orgId = new ObjectId(organization._id)
      delete organization._id
      console.log('UPDATE ORG ', organization, orgId)
      if (organization.name) {
        organization.nameLower = organization.name.toLowerCase();
      }
      if (organization.city) {
        organization.cityLower = organization.city.toLowerCase();
      }


      const updatedOrganization = await db
        .collection('organizations')
        .updateOne({ _id: orgId }, { $set: { ...organization } });
      return updatedOrganization;
    } catch (err) {
      console.log('Update organization error ', err);
      throw err;
    }
  },
  delete: async (id, db) => {
    try {
      const orgId = new ObjectId(id);
      const deletedOrganization = await db.collection('organizations').deleteOne({ _id: orgId });
      return deletedOrganization;
    } catch (err) {
      console.log('Delete organization error ', err);
      throw err;
    }
  },
  getOrgWithInfo: async (query, db) => {
    try {
      if ( query?._id ){
        query._id = new ObjectId(query._id)
      }
      const organizations = await db.collection('organizations').aggregate(
        [
          {
            $match: query || {}
          },
          {
            $lookup: {
              from: 'users',
              localField: 'userId',
              foreignField: '_id',
              as: 'userInfo'
            }
          },
          {
            $lookup: {
              from: 'organizations',
              localField: 'parent',
              foreignField: '_id',
              as: 'firstParent'
            }
          },
          {
            $unwind: {
              path: '$firstParent',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'organizations',
              localField: 'firstParent.parent',
              foreignField: '_id',
              as: 'secondParent'
            },
          },
          {
            $unwind: {
              path: '$secondParent',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'organizations',
              localField: 'secondParent.parent',
              foreignField: '_id',
              as: 'thirdParent'
            }
          },
          {
            $unwind: {
              path: '$thirdParent',
              preserveNullAndEmptyArrays: true
            }
          }
        ]
      ).toArray();
      const populatedOrgsPromises = organizations.map(async (org) => {
        if(org.type === 'class' && org?.supportTeam?.length) {
          //populate the support team from the users collection
          const userIds = org.supportTeam.map((memberId) => new ObjectId(memberId));
          const users = await db.collection('users')
            .find({ _id: { $in: userIds } })
            .project({ _id: 1, firstName: 1, lastName: 1, email: 1 })
            .toArray();
          org.supportTeam = users;
        }
        return org
      });
      const populatedOrgs = await Promise.all(populatedOrgsPromises);
      return populatedOrgs;
    } catch (err) {
      console.log('Query organizations error ', err);
      throw err;
    }
  },
  getUsersClasses: async (userId, db) => {
    try {
      const organizations = await db.collection('organizations').find({ userId: new ObjectId(userId), type: 'class' }).toArray();
      return organizations;
    } catch (err) {
      console.log('Get users classes error ', err);
      throw err;
    }
  }
  // FOR NON STUDENT USERS
  // orgAutoComplete: async (searchTerm, orgType, db) => {
  //   try {
  //     const result = await db
  //       .collection('organizations')
  //       .aggregate([
  //         {
  //           $search: {
  //             index: 'organization_autocomplete',
  //             compound: {
  //               filter: [
  //                 {
  //                   text: {
  //                     query: [ orgType ],
  //                     path: 'type',
  //                   },
  //                 },
  //               ],
  //               should: [
  //                 {
  //                   autocomplete: {
  //                     query: searchTerm,
  //                     path: 'name',
  //                   },
  //                 },
  //               ],
  //               minimumShouldMatch: 1,
  //             },
  //           },
  //         },
  //         {
  //           $limit: 5,
  //         },
  //       ])
  //       .toArray();
  //     return result;
  //   } catch (err) {
  //     console.log(err);
  //     //rethrow the error
  //     return null;
  //   }
  // },
};

module.exports = organizationHelper;
