const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const PermissionSchema = new Schema({
    admin: {
        type: Schema.Types.ObjectId,
        ref: 'admin'
    },
    menu: {
        type: Schema.Types.ObjectId,
        ref: 'menu'
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

module.exports = Permission = mongoose.model('permission', PermissionSchema)