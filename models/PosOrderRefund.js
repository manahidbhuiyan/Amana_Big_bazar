const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const PosOrderRefundListSchema = new Schema({
    serialNo: {
        type: Number
    },
    posOrder: {
        type: Schema.Types.ObjectId,
        ref: 'orderforpos',
        default: null
    },
    posExchange: {
        type: Schema.Types.ObjectId,
        ref: 'pos_exchange_list',
        default: null
    },
    branch: {
        type: Schema.Types.ObjectId,
        ref: 'branch'
    },
    admin: {
        type: Schema.Types.ObjectId,
        ref: 'admin'
    },
    products: [{
        code: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        product: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'product'
        },
        category: {
            type: Schema.Types.ObjectId,
            required: true
        },
        subcategory: {
            type: Schema.Types.ObjectId,
            require: true
        },
        brand: {
            type: Schema.Types.ObjectId
        },
        supplier: {
            type: Schema.Types.ObjectId
        },
        thumbnail: {
            type: String,
            default: null
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
        price: {
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
        },
        subtotal: {
            type: Number,
            required: true
        },
        personalDiscountAvailable:{
            type: Boolean,
            default: true
        }
    }],
    total_bill: {
        type: Number,
        required: true
    },
    sub_total_bill: {
        type: Number,
        required: true
    },
    vat: {
        type: Number,
        required: true
    },
    discount: {
        product: {
            type: Number,
            default: 0
        },
        others: {
            type: Number,
            default: 0
        }
    },
    slip_point_removed: {
        type: Number,
        default: 0
    },
    customer: {
        name: {
            type: String,
            required: false
        },
        address: {
            type: String,
            required: false
        },
        phone: {
            type: String,
            required: false
        }
    },
    nbrDeviceInfo:{
        isWritten:{
            type: Boolean,
            default: false
        },
        invoiceNo:{
            type: String,
            default: null
        },
        invoiceResponse:{
            type: String,
            default: null
        }
    },
    create: {
        type: Date,
        default: Date.now
    }
})

module.exports = PosOrderRefundList = mongoose.model('pos_refund_list', PosOrderRefundListSchema)