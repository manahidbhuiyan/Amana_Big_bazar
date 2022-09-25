const mongoose = require('mongoose')
const Schema = mongoose.Schema
 
const ServiceSchema = new Schema({
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
    cost: {
        type: Number,
        default: null
    },
    serviceDuration:{
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

module.exports = Service = mongoose.model('billing_service', ServiceSchema)