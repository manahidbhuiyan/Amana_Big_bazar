const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SalesPersonSchema = new mongoose.Schema({
    personID: {
        type: Number,
        required: true,
        unique: true
    },
    branch: {
        type: Schema.Types.ObjectId,
        ref: 'branch'
    },
    name: {
        type: String,
        trim: true,
        required: true
    },
    phone: {
        type: String,
        unique: true,
        required: true
    },
    email: {
        type: String,
        default: null
    },
    address: {
        type: String,
        default: null
    },
    notes: {
        type: String
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

module.exports = SalesPerson = mongoose.model('sales_person', SalesPersonSchema);