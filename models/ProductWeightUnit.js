const mongoose = require('mongoose')
const Schema = mongoose.Schema

const productWeightUnitSchema = new Schema({
    name:{
        type: String,
        trim: true,
        required: true
    },
    shortform: {
        type: String,
        trim: true,
        default: null
    },
    fractionAllowed:{
        type: Boolean,
        default: false
    },
    create:{
        type: Date,
        default: Date.now
    },
    update:{
        type: Date,
        default: null
    }
})

module.exports = ProductWeightUnit = mongoose.model('productweightunit', productWeightUnitSchema)