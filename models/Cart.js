const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const CartSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    branch: {
        type: Schema.Types.ObjectId,
        ref: 'branch'
    },
    product: {
        type: Schema.Types.ObjectId,
        ref: 'product'
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
    purchase_price: {
        type: Number,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    subtotal: {
        type: Number,
        required: true
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

module.exports = Cart = mongoose.model('cart', CartSchema)