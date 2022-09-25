const mongoose = require('mongoose')
const Schema = mongoose.Schema

const WarehouseInventoryProductReconciliationSchema = new Schema({
    serialNo: {
        type: Number,
        require: true
    },
    reason: {
        type: String
    },
    remarks: {
        type: String
    },
    products: [
        {
            _id: {
                type: Schema.Types.ObjectId,
                ref: 'product'
            },
            barcode: {
                type: String,
                require: true
            },
            name: {
                type: String,
                require: true
            },
            price: {
                purchase: {
                    type: Number,
                    default: 0
                },
                sell: {
                    type: Number,
                    default: 0
                }
            },
            reconciliation: {
                type: Number,
                require: true
            },
            stock: {
                type: Number,
                require: true
            }
        }
    ],
    admin: {
        type: Schema.Types.ObjectId,
        ref: 'admin'
    },
    create: {
        type: Date,
        default: Date.now
    }
})

module.exports = WarehouseInventoryProductReconciliation = mongoose.model('warehouse_inventory_product_reconciliation', WarehouseInventoryProductReconciliationSchema)