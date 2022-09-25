const mongoose = require('mongoose')
const Schema = mongoose.Schema

const OfferSchema = new Schema({
    title:{
        type: String,
        default: null
    },
    caption:{
        type: String,
        default: null
    },
    photo:{
        type: String
    },
    isActive:{
        type: Boolean,
        default: true
    },
    link:{
        type: String,
        required: true
    },
    admin: {
        type: Schema.Types.ObjectId,
        ref: 'admin'
    },
    branch: {
        type: Schema.Types.ObjectId,
        ref: 'branch'
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

module.exports = Offer = mongoose.model('ecommerce_slide_offer', OfferSchema)