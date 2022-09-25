const mongoose = require('mongoose')
const Schema = mongoose.Schema

const NotificationSchema = new Schema({
    branch: [{
        type: Schema.Types.ObjectId,
        ref: 'branch'
    }],
    email: {
        type: String,
        default: null
    },
    phone: {
        type: String,
        default: null
    },
    type: {
        type: String,
        enum: ['email', 'phone'],
        default: 'email'
    },
    notificationType: [{
        type: String,
        enum: ['ecommerce order', 'product reorder', 'warehouse product reorder'],
        required: true
    }],
    status: {
        type: Boolean,
        default: false
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

module.exports = Notification = mongoose.model('notification', NotificationSchema)