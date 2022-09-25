const mongoose = require('mongoose');

const SpecialDiscountSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    specific_customer:[{
        type: String
    }],
    max_discount_percentage: {
        type: Number,
        min: 0,
        max: 100
    },
    max_amount: {
        type: Number,
        default: null
    },
    max_purchase_amount: {
        type: Number,
        default: null
    },
    wantToDefineContactNo:{
        type: Boolean,
        default: false
    },
    active:{
        type: Boolean,
        default: true
    },
    create: {
        type: Date,
        default: Date.now
    },
    update: {
        type: Date,
        default: null
    }
});

module.exports = SpecialDiscount = mongoose.model('special_discount_info', SpecialDiscountSchema);