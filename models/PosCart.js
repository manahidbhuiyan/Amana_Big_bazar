const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const PosCartSchema = new Schema({
    admin: {
        type: Schema.Types.ObjectId,
        ref: 'admin'
    },
    branch: {
        type: Schema.Types.ObjectId,
        ref: 'branch'
    },
    product: {
        type: Schema.Types.ObjectId,
        ref: 'product'
    },
    browserTabID: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    thumbnail: {
        type: String,
        default: null
    },
    category: {
        type: String,
        required: true
    },
    subcategory: {
        type: String,
        require: true
    },
    brand: {
        type: Schema.Types.ObjectId
    },
    supplier: {
        type: Schema.Types.ObjectId
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
    vat: {
        type: Number,
        default: 0
    },
    price: {
        type: Number,
        required: true
    },
    purchase_price: {
        type: Number,
        default: 0
    },
    is_second_price:{
        type: Boolean,
        default: false
    },
    subtotal: {
        type: Number,
        required: true
    },
    personalDiscountAvailable:{
        type: Boolean,
        default: true
    },
    nbr_vat_code: {
        type: String,
        default: null
    },
    nbr_sd_code: {
        type: String,
        default: null
    },
    date: {
        type: Date,
        default: Date.now
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

module.exports = PosCart = mongoose.model('poscart', PosCartSchema)