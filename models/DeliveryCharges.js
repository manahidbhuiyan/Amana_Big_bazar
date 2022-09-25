const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const DeliveryChargeSchema = new Schema({
    admin: {
        type: Schema.Types.ObjectId,
        ref: 'admin'
    },
    branch: {
        type: Schema.Types.ObjectId,
        ref: 'branch'
    },
    serialNo:{
        type: Number,
        required: true
    },
    thana: {
        id: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        }
    },
    district: {
        id: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        }
    },
    division: {
        id: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        }
    },
    minimum:{
        type: Number,
        default: 0
    },
    maximum:{
        type: Number,
        default: 0
    },
    notes:{
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

module.exports = DeliveryCharge = mongoose.model('delivery_charge', DeliveryChargeSchema)