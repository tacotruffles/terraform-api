/* eslint-disable */
const { ObjectId } = require('mongodb');

const settingsHelper =   {
    collection: 'settings',
    get: async function (query, db) {
        try {
            const result = await db.collection(this.collection).find(query).toArray();
            if(result){
                return result;
            }
        }
        catch(ex){
            console.log(ex)
        }
        return []
    },
    firstOrDefault: async function (query, db)   {
        try {
            const result = await db.collection(this.collection).find(query).toArray();
            if(result){
                return result[0];
            }
        }
        catch(ex){
            console.log(ex)
        }
        return {}
    },
    all: async function ( db)   {
        return await db.collection(this.collection).find({}).toArray();
    },
    count: async function(query, db){
        try { 
            let data = await db.collection(this.collection).find(query).count()
            if(!data) {
                data = 0;
            }
            return data;
        }
        catch(ex){
            console.log(ex);
            return [];
        }  
    },
    query: async function(query, paging, db){
        try {
            const { skip, limit } = paging;
            const data = await db.collection(this.collection).find(query).sort({ created: -1 }).skip(parseInt(skip)).limit(parseInt(limit)).toArray();
            if(!data) {
                data = [];
            }
            return data;
        }
        catch(ex){
            console.log(ex);
            return [];
        }  
    }, 
    update: async function (template, db){
        try {
            const id = new ObjectId(template._id);  
            delete template._id;
            const data =  await db.collection(this.collection).updateOne({_id: id}, { $set: { ...template }  });
            if(data && data.result.nModified == 1){
                return template;
            }
        }
        catch(ex){
            console.log(ex)
        }
        return {}
    },
    create: async function (template, db)   {
        try {
            const insert = await db.collection(this.collection).insertOne(template);
            if(insert.insertedCount === 1){
                return template;
            }
        }
        catch(ex){
            console.log(ex)
        }
        return {}
    },
    remove: async function(id, db)  {
        try {
            const _id = new ObjectId(id);  
            const data =  await db.collection(this.collection).removeOne({_id});
            if(data && data.result.nModified == 1){
                return { id: _id, msg: "Template deleted" };
            }
        }
        catch(ex){
            console.log(ex)
        }
        return {};
    },
    getOne: async function(params, db) {
      try {
        const data =  await db.collection(this.collection).findOne(params);
        return( data?.data );
    }
    catch(ex){
        console.log(ex)
    }
    return {settings: 'none found'};
    }
}

module.exports = settingsHelper;