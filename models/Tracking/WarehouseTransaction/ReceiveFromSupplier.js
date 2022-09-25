const mongoose = require('mongoose')
const Schema = mongoose.Schema

const WarehouseReceiveFromSupplierSchema = new Schema({
    serialNo: {
        type: Number,
        unique: true,
        require: true
    },
    requisitionID: {
        type: Schema.Types.ObjectId,
        ref: 'warehouse_requisition_to_supplier',
        default: null
    },
    chalan_no:{
        type: String,
        require: true
    },
    chalan_date:{
        type: Date,
        require: true
    },
    payment_date:{
        type: Date,
        require: true
    },
    supplier: {
        type: Schema.Types.ObjectId,
        ref: 'supplier'
    },
    products:[
        {
            requisition_date: {
                type: Date,
                default: Date.now
            },
            expected_delivery: {
                type: Date,
                require: Date.now
            },
            purpose: {
                type: String,
            },
            remarks:{
                type: String
            },
            product:{
                _id:{
                    type: Schema.Types.ObjectId,
                    ref: 'warehouse_product'
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
                free: {
                    type: Number,
                    default: 0
                },
                stock: {
                    type: Number,
                    require: true
                },
                vat: {
                    type: Number,
                    default: 0
                },
                total: {
                    type: Number,
                    require: true
                },
                quantity: {
                    type: Number,
                    require: true
                }
            }
        }
    ],
    applyDiscount: {
        type: Number,
        default: 0
    },
    totalFreeQuantity: {
        type: Number,
        default: 0
    },
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
    isAccountsAdjust:{
        type: Boolean,
        default: false
    },
    create: {
        type: Date,
        default: Date.now
    }
})

module.exports = WarehouseReceiveFromSupplier = mongoose.model('warehouse_receive_from_supplier', WarehouseReceiveFromSupplierSchema)