const mongoose = require('mongoose')
const Schema = mongoose.Schema

const BranchManagerSchema = new Schema({
    serialNo:{
        type: Number,
        required: true
    },
    branch:[{
        type: Schema.Types.ObjectId,
        ref: 'branch'
    }],
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        required: true
    },
    active: {
        type: Boolean,
        default: true
    },
    last_updated_by:{
        type: Schema.Types.ObjectId,
        ref: 'admin'
    },
    create:{
        type: Date,
        default: Date.now
    },
    update:{
        type: Date,
        default: Date.now
    }
});

module.exports = BranchManager = mongoose.model('branch_manager', BranchManagerSchema);