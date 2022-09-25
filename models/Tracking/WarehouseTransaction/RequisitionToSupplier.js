const mongoose = require('mongoose')
const Schema = mongoose.Schema

const WarehouseRequisitionToSupplierSchema = new Schema({
    serialNo: {
        type: Number,
        unique: true,
        required: true
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
    supplier: {
        type: Schema.Types.ObjectId,
        ref: 'supplier'
    },
    totalQuantity:{
        type: Number,
        require: true
    },
    totalAmount:{
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
    },
    update: {
        type: Date,
        default: Date.now
    }
})

module.exports = WarehouseRequisitionToSupplier = mongoose.model('warehouse_requisition_to_supplier', WarehouseRequisitionToSupplierSchema)