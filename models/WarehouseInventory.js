const mongoose = require('mongoose')
const Schema = mongoose.Schema

const WarehouseInventorySchema = new Schema({
    product: {
        type: Schema.Types.ObjectId,
        ref: 'product'
    },
    supplier: {
        type: Schema.Types.ObjectId,
        ref: 'supplier'
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: 'category'
    },
    subcategory: {
        type: Schema.Types.ObjectId,
        ref: 'subcategory'
    },
    brand: {
        type: Schema.Types.ObjectId,
        ref: 'brand'
    },
    barcode: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true
    },
    stock_quantity: {
        type: Number,
        required: true,
        default: 0
    },
    price: {
        sell: {
            type: Number,
            required: true,
            default: 0
        },
        purchase: {
            type: Number,
            required: true,
            default: 0
        }
    },
    is_adjusted: {
        type: Boolean,
        default: false
    },
    created_by: {
        type: Schema.Types.ObjectId,
        ref: 'admin'
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

module.exports = WarehouseInventory = mongoose.model('warehouse_inventory', WarehouseInventorySchema)