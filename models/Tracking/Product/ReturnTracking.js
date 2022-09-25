const mongoose = require('mongoose')
const Schema = mongoose.Schema

const ReturnTrackingSchema = new Schema({
    product: {
        type: Schema.Types.ObjectId,
        ref: 'product'
    },
    branch: {
        type: Schema.Types.ObjectId,
        ref: 'branch'
    },
    admin: {
        type: Schema.Types.ObjectId,
        ref: 'admin'
    },
    quantity: {
        type: Number,
        required: true,
        default: 0
    },
    create: {
        type: Date,
        default: Date.now
    }
})

module.exports = ReturnTracking = mongoose.model('return_product_tracking', ReturnTrackingSchema)