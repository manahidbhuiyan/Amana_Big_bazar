const mongoose = require('mongoose')
const Schema = mongoose.Schema

const SubCategorySchema = new Schema({
    branch: [
        {
            type: Schema.Types.ObjectId,
            ref: 'branch'
        }
    ],
    category:[
        {
            type: Schema.Types.ObjectId,
            ref: 'category'
        }
    ],
    serialNo:{
        type: Number,
        required: true
    },
    slug:{
     type: String,
     trim: true,
     required: true
    },
    name: {
        type: String,
        trim: true,
        required: true
    },
    isSizeAvailable: {
        type: Boolean,
        default: false
    },
    isWeightAvailable: {
        type: Boolean,
        default: false
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

module.exports = SubCategory = mongoose.model('subcategory', SubCategorySchema)