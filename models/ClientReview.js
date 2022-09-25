const mongoose = require('mongoose')
const Schema = mongoose.Schema

const ClientReviewSchema = new Schema({
    name:{
        type: String,
        required: true
    },
    text:{
        type: String,
        required: true 
    },
    photo:{
        type: String
    },
    star:{
        type: Number,
        default: 0
    },
    isActive:{
        type: Boolean,
        default: true
    },
    serial:{
        type: Number,
        default: 0
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

module.exports = ClientReview = mongoose.model('clientreview', ClientReviewSchema)