const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const MenuSchema = new Schema({
    admin: {
        type: Schema.Types.ObjectId,
        ref: 'admin'
    },
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    slug: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    icon: {
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
})

module.exports = Menu = mongoose.model('menu', MenuSchema)