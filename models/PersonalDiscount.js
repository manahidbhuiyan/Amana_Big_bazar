const mongoose = require('mongoose');

const PersonalDiscountSchema = new mongoose.Schema({
    personID: {
        type: Number,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        unique: true,
        required: true,
        trim: true
    },
    email: {
        type: String,
        default: null,
        trim: true
    },
    address: {
        type: String,
        default: null
    },
    notes: {
        type: String
    },
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
    person_type: {
        type: String,
        enum: ['employee', 'share holder', 'management', 'others']
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

module.exports = PersonalDiscount = mongoose.model('personal_discount', PersonalDiscountSchema);