const { ObjectId } = require('mongodb');
const { v4: uuidv4 } = require('uuid');

const contactHelper = {
  get: async (contactId, db) => {
    const contact = await db.collection('contacts').findOne({ _id: new ObjectId(contactId) });
    return contact;
  },
  getContacts: async (userOrgs, db) => {
    //with the input array of objectIds, find all users that share at least one org with the user
    const contacts = await db
      .collection('users')
      .find(
        !userOrgs.length || userOrgs.length === 0
          ? {}
          : { organizations: { $elemMatch: { $in: userOrgs } } }
      )
      .project({ _id: 1, firstName: 1, lastName: 1, email: 1 })
      .toArray();
    return contacts;
  },
  addContact: async (userId, contactId, db) => {
    const contact = await db.collection('contacts').findOne({ userId: new ObjectId(userId) });
    if (contact.contacts.includes(new ObjectId(contactId))) {
      throw new Error('Contact already exists');
    }
    await db
      .collection('contacts')
      .updateOne(
        { userId: new ObjectId(userId) },
        { $push: { contacts: new ObjectId(contactId) } }
      );
    const newContact = await db
      .collection('users')
      .find({ _id: new ObjectId(contactId) })
      .project({ _id: 1, firstName: 1, lastName: 1, email: 1 })
      .toArray();
    return newContact[0];
  },
  removeContact: async (userId, contactId, db) => {
    const contact = await db.collection('contacts').findOne({ userId: new ObjectId(userId) });
    if (!contact.contacts.map((c) => c.toString()).includes(contactId)) {
      throw new Error('Contact does not exist');
    }
    await db
      .collection('contacts')
      .updateOne(
        { userId: new ObjectId(userId) },
        { $pull: { contacts: new ObjectId(contactId) } }
      );
    return contact.contacts;
  },
  getContactsByOrg: async (orgId, db) => {
    console.log(orgId)
    const contacts = await db
      .collection('users')
      .find({ organizations: { $elemMatch: { $in: [new ObjectId(orgId)] } } })
      .project({ _id: 1, firstName: 1, lastName: 1, email: 1 })
      .toArray();
    return contacts;
  }
};

module.exports = contactHelper;