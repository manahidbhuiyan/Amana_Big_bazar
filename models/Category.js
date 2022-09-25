const mongoose = require('mongoose')
const Schema = mongoose.Schema

const CategorySchema = new Schema({
    branch: [{
        type: Schema.Types.ObjectId,
        ref: 'branch'
    }],
    slug: {
        type: String,
        trim: true,
        required: true
    },
    serialNo:{
        type: Number,
        required: true
    },
    name: {
        type: String,
        trim: true,
        required: true
    },
    icon: {
        type: String,
        default: null
    },
    cover: {
        type: String,
        default: null
    },
    vat: {
        type: Number,
        default: 0
    },
    nbr_vat_code: {
        type: String,
        default: null
    },
    nbr_sd_code: {
        type: String,
        default: null
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

module.exports = Category = mongoose.model('category', CategorySchema)