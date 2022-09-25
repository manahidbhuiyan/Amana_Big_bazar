const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const OrderSchema = new Schema({
    orderID: {
        type: Number,
        required: true
    },
    branch: {
        type: Schema.Types.ObjectId,
        ref: 'branch'
    },
    user: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'user'
    },
    admin: {
        type: Schema.Types.ObjectId,
        ref: 'admin',
        default: null
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
        category: {
            type: String,
            ref: 'category'
        },
        subcategory: {
            type: String,
            ref: 'subcategory'
        },
        supplier: {
            type: String,
            ref: 'supplier'
        },
        brand: {
            type: String,
            ref: 'brand'
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
        purchase_price: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        vat: {
            type: Number,
            required: true
        },
        subtotal: {
            type: Number,
            required: true
        },
        date: {
            type: Date,
            default: Date.now
        }
    }],
    delivery: {
        name: {
            type: String,
            required: true
        },
        division: {
            type: String,
            required: true
        },
        district: {
            type: String,
            required: true
        },
        thana: {
            type: String,
            required: true
        },
        address: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        delivery_datetime:{
            type: Date,
            default: Date.now()
        }
    },
    order_phone: {
        type: String,
        required: true

    },
    payment_status: {
        type: Boolean,
        default: false
    },
    payment_method: {
        type: String,
        require: true
    },
    paid_amount: {
        type: Number,
        default: 0
    },
    cancel_reason: {
        type: String
    },
    discount: {
        type: Number,
        default: 0
    },
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
    first_order_discount:{
        type: Number,
        default: 0
    },
    flat_order_discount:{
        type: Number,
        default: 0
    },
    coupon_code:{
        type: String,
        default: null
    },
    coupon_discount:{
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        required: true,
        default: 0
    },
    delivery_charge: {
        type: Number,
        default: 0
    },
    order_status: {
        type: String,
        require: true
    },
    view_status: {
        type: Boolean,
        default: false
    },
    progress: {
        pending: {
            type: Boolean,
            default: true
        },
        processing: {
            type: Boolean,
            default: false
        },
        shipping: {
            type: Boolean,
            default: false
        },
        delivered: {
            type: Boolean,
            default: false
        }
    },
    order_instractions: [{
        text: {
            type: String
        },
        status: {
            type: Boolean,
            default: false
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

module.exports = Order = mongoose.model('order', OrderSchema)