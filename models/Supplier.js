const mongoose = require('mongoose')
const Schema = mongoose.Schema

const SupplierSchema = new Schema({
    branch: [
        {
            type: Schema.Types.ObjectId,
            ref: 'branch'
        }
    ],
    category: [
        {
            type: Schema.Types.ObjectId,
            ref: 'category'
        }
    ],
    subcategory: [
        {
            type: Schema.Types.ObjectId,
            ref: 'subcategory'
        }
    ],
    brand: [
        {
            type: Schema.Types.ObjectId,
            ref: 'brand'
        }
    ],
    serialNo:{
        type: Number,
        required: true
    },
    name: {
        type: String,
        trim: true,
        required: true
    },
    contact: {
        phone: [
            {
                type: String
            }
        ],
        address:{
            type: String
        }
    },
    instantPayment:{
        type: Boolean,
        default: false
    },
    warehouseSupplier:{
        type: Boolean,
        default: false
    },
    activeSupplier:{
        type: Boolean,
        default: true
    },
    branchWiseOpeningBalance:[
        {
            branch: {
                type: Schema.Types.ObjectId,
                ref: 'branch'
            },
            amount: {
                type: Number,
                default: 0
            }
        }
    ],
    warehouseOpeningBalance: {
        type: Number,
        default: 0
    },
    opening_balance_last_updated_by: {
        type: Schema.Types.ObjectId,
        ref: 'admin',
        default: null
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

module.exports = Supplier = mongoose.model('supplier', SupplierSchema)