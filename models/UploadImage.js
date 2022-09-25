const mongoose = require('mongoose')
const Schema = mongoose.Schema

const uploadImageSchema = new Schema({
    name:{
        type: String,
        required: true
    },
    url:{
        type: String,
        required: true 
    },
    create: {
        type: Date,
        default: Date.now
    },
    update: {
        type: Date,
        default: null
    }
})

module.exports = UploadImage = mongoose.model('uploadimage', uploadImageSchema)