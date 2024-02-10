const { ObjectId } = require('mongodb');
const collection = 'templates';

const templateHelper =   {
    collection: 'templates',
    get: async(query, db) => {
        try {
            const result = await db.collection(collection).findOne(query);
            if(result){
                return result;
            }
        }
        catch(ex){
            console.log(ex)
        }
        return {}
    },
    all: async( db) => {
        return await db.collection(collection).find({}).sort({'created': - 1}).toArray();
    },
    update: async(template, db) => {
        try {
            const id = new ObjectId(template._id);  
            delete template._id;
            const data =  await db.collection(collection).updateOne({_id: id}, { $set: { ...template }  });
            if(data && data.result.nModified == 1){
                return template;
            }
        }
        catch(ex){
            console.log(ex)
        }
        return {}
    },
    create: async(template, db) => {
        try {
            const insert = await db.collection(collection).insertOne(template);
            if(insert.insertedCount === 1){
                return template;
            }
        }
        catch(ex){
            console.log(ex)
        }
        return {}
    },
    remove: async(query, db) => {
        try {
            const id = new ObjectId(_id);  
            const data =  await db.collection(collection).removeOne({_id: id});
            if(data && data.result.nModified == 1){
                return { id: _id, msg: "Template deleted" };
            }
        }
        catch(ex){
            console.log(ex)
        }
        return {};
    }
}

module.exports = templateHelper;