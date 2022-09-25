const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const NoPaymentResetSchema = new Schema({
    branch: {
        type: Schema.Types.ObjectId,
        ref: 'branch'
    },
    admin: {
        type: Schema.Types.ObjectId,
        ref: 'admin'
    },
    products: [{
        barcode: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        discount: {
            type: Number,
            required: true,
            default: 0
        },
        quantity: {
            type: Number,
            required: true,
            default: 1
        },
        sell_price: {
            type: Number,
            required: true
        },
        purchase_price: {
            type: Number,
            default: 0
        },
        vat: {
            type: Number,
            required: true
        }
    }],
    create: {
        type: Date,
        default: Date.now
    },
    update: {
        type: Date,
        default: null
    }
})

module.exports = NoPaymentReset = mongoose.model('nopaymentreset', NoPaymentResetSchema)