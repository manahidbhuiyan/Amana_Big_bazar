const mongoose = require('mongoose')
const Schema = mongoose.Schema
 
const PaymentSchema = new Schema({
    branch: {
        type: Schema.Types.ObjectId,
        ref: 'branch'
    },
    serialNo:{
        type: Number,
        required: true
    },
    validate_from: {
        type: Date,
        default: null
    },
    validate_till: {
        type: Date,
        default: null
    },
    expire_date: {
        type: Date,
        default: null
    },
    isLifetimeFreeAccess:{
        type: Boolean,
        default: false
    },
    notificationBeforeToUpgrade: {
        type: Number,
        default: 7
    },
    paid_amount: {
        type: Number,
        default: null
    },
    notes: {
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

module.exports = Payment = mongoose.model('billing_payment', PaymentSchema)