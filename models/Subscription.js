const mongoose = require('mongoose')
const Schema = mongoose.Schema

const SubscriptionSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
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

module.exports = Subscription = mongoose.model('subscription', SubscriptionSchema)