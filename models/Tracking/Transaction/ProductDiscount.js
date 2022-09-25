const mongoose = require('mongoose')
const Schema = mongoose.Schema

const ProductDiscountSchema = new Schema({
    serialNo: {
        type: Number,
        require: true
    },
    reason: {
        type: String
    },
    remarks:{
        type: String
    },
    products:[
        {
            _id:{
                type: Schema.Types.ObjectId,
                ref: 'product'
            },
            barcode:{
                type: String,
                require: true
            },
            name:{
                type: String,
                require: true
            },
            price: {
                purchase:{
                    type: Number,
                    default: 0
                },
                sell:{
                    type: Number,
                    default: 0
                }
            },
            discount: {
                type: Number,
                require: true
            },
            previous_discount: {
                type: Number,
                require: true
            },
            stock: {
                type: Number,
                require: true
            }
        }
    ],
    admin:{
        type: Schema.Types.ObjectId,
        ref: 'admin'
    },
    branch:{
        type: Schema.Types.ObjectId,
        ref: 'branch'
    },
    discount_start:{
        type: Date,
        default: null
    },
    discount_stop:{
        type: Date,
        default: null
    },
    startDiscount:{
      type: Boolean,
      default: false
    },
    stopDiscount:{
        type: Boolean,
        default: false
    },
    reactivated:{
        type: Schema.Types.ObjectId,
        ref: 'product_discount',
        default: null
    },
    create: {
        type: Date,
        default: Date.now
    }
})

module.exports = ProductDiscount = mongoose.model('product_discount', ProductDiscountSchema)