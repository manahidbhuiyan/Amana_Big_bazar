const mongoose = require('mongoose')
const Schema = mongoose.Schema

const productSizeSchema = new Schema({
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
    create:{
        type: Date,
        default: Date.now
    },
    update:{
        type: Date,
        default: null
    }
})

module.exports = ProductSize = mongoose.model('productsize', productSizeSchema)