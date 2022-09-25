const mongoose = require('mongoose')
const Schema = mongoose.Schema

const AccountsSettingsCurrencySchema = new Schema({
    admin: {
        type: Schema.Types.ObjectId,
        ref: 'admin'
    },
    serialNo:{
        type: Number,
        required: true
    },
    name: {
        type: String,
        trim: true,
        required: true
    },
    converted_to:{
        type: Schema.Types.ObjectId,
        ref: 'accounts_settings_currency',
        default: null
    },
    conversion_rate:{
        type: Number,
        default: null
    },
    slug: {
        type: String,
        trim: true,
        required: true
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

module.exports = AccountsSettingsCurrency = mongoose.model('accounts_settings_currency', AccountsSettingsCurrencySchema)