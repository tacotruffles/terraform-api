const { ObjectId } = require('mongodb');

const emailHelper = require('./emailHelper');

const uploadHelper =   {
    collection: 'videoUploads',
    get: async function (query, db)  {
        try { 
            const data = await db.collection(this.collection).find(query).toArray();
            if(!data) {
                data = [];
            }
            //return only items that have uploadStatus of 'success'
            return data.filter(item => item.uploadedStatus === 'success');
        }
        catch(ex){
            console.log(ex);
            return [];
        } 
    },
    getClassId: async function(db) {
        try {
            const data = await db.collection(this.collection).find({}, {"classId": 1, _id: 0}).sort({ classId:-1 }).limit(1).toArray();
            return data[0].classId;
        }
        catch(ex){
            console.log(ex);
            return 0;
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
            return 0;
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
    all: async function (db)   { 
        try { 
            const data = await db.collection(this.collection).find({}).toArray();
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
                data.result._id = id;
                return data.result;
            }
        }
        catch(ex){
            console.log(ex)
        }
        return {}
    },
    create: async function (template, db)  {
        try {
            const newAsset = await db.collection(this.collection).insertOne({ ...template });       
            return newAsset;
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
    successfulUpload: async function (template, db)  {
        try{
            const classNum = template;
            const data = await db.collection(this.collection).updateOne({ classId: classNum }, {$set: {uploadedStatus: 'success'}});
            if(data && data.result.nModified == 1){
                return data.result;
            }
        }
        catch(ex){
            console.log(ex)
        }
        return { updatedCount: 0 };
    },
    createPdf: async function (query, template, db)  {
        try {
            console.log(query, template )
            const newAsset = await db.collection(this.collection).updateOne(query, { $push: { feedbackPdf: template } }, { upsert: true });
            return newAsset;
        }
        catch(ex){
            console.log(ex)
        }
        return {}
    }
}

module.exports = uploadHelper;