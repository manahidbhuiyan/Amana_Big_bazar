const mongoose = require('mongoose')
const Schema = mongoose.Schema

const WarehouseReturnToSupplierSchema = new Schema({
    serialNo: {
        type: Number,
        require: true
    },
    receivingID: {
        type: Schema.Types.ObjectId,
        default: null
    },
    chalan_date:{
        type: Date,
        default:null
    },
    supplier: {
        type: Schema.Types.ObjectId,
        ref: 'supplier'
    },
    purpose: {
        type: String,
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
            unit: {
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
            stock: {
                type: Number,
                require: true
            },
            vat: {
                type: Number,
                default: 0
            },
            quantity: {
                type: Number,
                require: true
            },
            total: {
                type: Number,
                require: true
            }
        }
    ],
    totalAmount: {
        type: Number,
        required: true
    },
    totalQuantity:{
        type: Number,
        require: true
    },
    admin:{
        type: Schema.Types.ObjectId,
        ref: 'admin'
    },
    create: {
        type: Date,
        default: Date.now
    }
})

module.exports = WarehouseReturnToSupplier = mongoose.model('warehouse_return_to_supplier', WarehouseReturnToSupplierSchema)