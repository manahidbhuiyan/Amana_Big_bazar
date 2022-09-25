const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const CategoryDiscountSchema = new Schema({
    branch: {
        type: Schema.Types.ObjectId,
        ref: 'branch'
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: 'category'
    },
    discount: {
        type: Number,
        default: 0
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

module.exports = CategoryDiscount = mongoose.model('category_discount', CategoryDiscountSchema)