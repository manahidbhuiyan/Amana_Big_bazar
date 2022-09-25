const mongoose = require('mongoose')
const Schema = mongoose.Schema

const DiscountTrackingSchema = new Schema({
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
    amount: {
        type: Number,
        required: true,
        default: 0
    },
    create: {
        type: Date,
        default: Date.now
    }
})

module.exports = DiscountTracking = mongoose.model('product_discount_tracking', DiscountTrackingSchema)