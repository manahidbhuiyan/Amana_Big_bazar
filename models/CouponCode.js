const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const CouponCodeSchema = new Schema({
    admin: {
        type: Schema.Types.ObjectId,
        ref: 'admin'
    },
    code: {
        type: String,
        required: true
    },
    percentage:{
        type: Number,
        default: 0
    },
    max_amount:{
        type: Number,
        default: 0
    },
    validity_from: {
        type: Date,
        required: true
    },
    validity_to: {
        type: Date,
        required: true 
    },
    total_order_amount_min:{
        type: Number,
        default: 0
    },
    isAssignedAllUser: {
        type: Boolean,
        default: true
    },
    users:[{
        type: Schema.Types.ObjectId,
        ref: 'user'
    }],
    max_use_time:{
        type: Number,
        default: 0
    },
    use_count:{
        type: Number,
        default: 0 
    },
    used_by: [{
        type: Schema.Types.ObjectId,
        ref: 'user'
    }],
    isActive:{
        type: Boolean,
        default: true
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

module.exports = CouponCode = mongoose.model('coupon_code', CouponCodeSchema)