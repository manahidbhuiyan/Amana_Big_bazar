const mongoose = require('mongoose')
const Schema = mongoose.Schema

const BrandSchema = new Schema({
    branch: [
        {
            type: Schema.Types.ObjectId,
            ref: 'branch'
        }
    ],
    category: [
        {
            type: Schema.Types.ObjectId,
            ref: 'category'
        }
    ],
    subcategory: [
        {
            type: Schema.Types.ObjectId,
            ref: 'subcategory'
        }
    ],
    serialNo:{
        type: Number,
        required: true
    },
    name: {
        type: String,
        trim: true,
        required: true
    },
    slug: {
        type: String,
        trim: true,
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

module.exports = Brand = mongoose.model('brand', BrandSchema)