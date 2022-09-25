const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PosUserSchema = new mongoose.Schema({
    clientID: {
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
        trim: true,
        unique: true,
        required: true
    },
    email: {
        type: String,
        trim: true,
        default: null
    },
    address: {
        type: String,
        default: null
    },
    notes: {
        type: String
    },
    points: {
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
});

module.exports = PosUser = mongoose.model('posuser', PosUserSchema);