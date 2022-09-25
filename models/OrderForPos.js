const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const OrderForPosSchema = new Schema({
    orderID: {
        type: Number,
        required: true
    },
    branch: {
        type: Schema.Types.ObjectId,
        ref: 'branch'
    },
    admin: {
        type: Schema.Types.ObjectId,
        ref: 'admin'
    },
    updateType: [
        {
            type: String,
            enum: ['exchange', 'refund']
        }
    ],
    refundedProducts: [
        {
            type: Schema.Types.ObjectId
        }
    ],
    exchangedProducts: [
        {
            type: Schema.Types.ObjectId
        }
    ],
    orderType: {
        type: String,
        default: 'sell'
    },
    salesPerson: {
        type: Schema.Types.ObjectId,
        ref: 'sales_person',
        default: null
    },
    discountPerson: {
        type: Schema.Types.ObjectId,
        ref: 'personal_discount',
        default: null
    },
    personalDiscountPercentage: {
        type: Number,
        default: 0
    },
    personalDiscountAmount: {
        type: Number,
        default: 0
    },
    paymentDiscountAmount: {
        type: Number,
        default: 0
    },
    specialDiscountAmount: {
        type: Number,
        default: 0
    },
    special_discount_info: {
        specialDiscountID: {
            type: Schema.Types.ObjectId,
            ref: 'special_discount'
        },
        costomer_contact: {
            type: String
        },
        discount_apply: {
            type: Number
        }
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
        },
        date: {
            type: Date,
            default: Date.now
        }
    }],
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
    payment_status: {
        type: Boolean,
        default: true
    },
    payment: [{
        method: {
            type: String,
            require: true
        },
        discount:{
            type: Number,
            default: 0
        },
        amount: {
            type: Number,
            require: true
        },
        type: {
            type: String,
            default: null
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
    point_value: {
        type: Number,
        default: 0
    },
    used_points: {
        type: Number,
        default: 0
    },
    earned_point: {
        type: Number,
        default: 0
    },
    fractionalDiscount:{
        type: Number,
        default: 0
    },
    orderDiscount:{
        type: Number,
        default: 0
    },
    any_instruction: {
        type: String
    },
    couponApply:{
        coupon:{
            type: Schema.Types.ObjectId,
            ref: 'coupon_code'
        },
        amount:{
            type: Number,
            default: 0
        }
    },
    isOnlineOrder:{
        type: Boolean,
        default: false
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
    },
    update: {
        type: Date,
        default: null
    }
})

module.exports = OrderForPos = mongoose.model('orderforpos', OrderForPosSchema)