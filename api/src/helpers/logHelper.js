const moment = require('moment');

const logHelper = {
    collection: 'logs',
    get: async function (query, db)  {
        try { 
            const data = await db.collection(this.collection).find(query).toArray();
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
    getById: async function (id, db)  {
        try {
            if(id){
                const _id = new ObjectId(id);  
                let data = await db.collection(this.collection).findOne({ _id });
                if(!data) {
                    data = {};
                }
                return data;
            }
        }
        catch(ex){
            console.log(ex);
        } 

        return {};
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
    all: async function (db)   { 
        try { 
            const data = await db.collection(this.collection).find({}).sort({created: -1}).toArray();
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
    update: async function (template, db)  {
        try {
            const id = new ObjectId(template._id);  
            delete template._id;
            const data =  await db.collection(this.collection).updateOne({_id: id}, { $set: { ...template }  });
            if(data && data.result.nModified == 1){
                return data.result;
            }
        }
        catch(ex){
            console.log(ex)
        }
        return {}
    },
    bulkUpdate: async function (template, db)  {
        try {
            //const id = new ObjectId(template._id);  
            let operations = [];
            template.map(function(operation){
                operations.push({ 
                    updateOne: { 
                        filter: { _id: operation._id }, 
                        update: { $set: { url: operation.url, expires: operation.expires } } 
                    } 
                })
            })

            const data =  await db.collection(this.collection).bulkWrite(operations, {});
            if(data && data.result.nModified > 0){
                return data.result;
            }
        }
        catch(ex){
            console.log(ex)
        }
        return template;
    },
    create: async function (template, db)  {
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
    delete: async function (_id, db)  {
        try {
            const id = new ObjectId(_id);  
            const data =  await db.collection(this.collection).removeOne({_id: id});
            if(data && data.deletedCount == 1){
                return data.result;
            }
        }
        catch(ex){
            console.log(ex)
        }
        return { deletedCount: 0 };
    },
    getTemplate: function(user){

        const template = {
            level: 'DEBUG',
            message: '',
            user,
            created: moment().valueOf()
        }
        return template;
    }
}

module.exports = logHelper; 