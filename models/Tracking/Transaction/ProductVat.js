const mongoose = require('mongoose')
const Schema = mongoose.Schema

const ProductVatSchema = new Schema({
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
            vat: {
                type: Number,
                require: true
            },
            previous_vat:{
                type: Number,
                default: 0
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
    create: {
        type: Date,
        default: Date.now
    }
})

module.exports = ProductVat = mongoose.model('product_vat', ProductVatSchema)