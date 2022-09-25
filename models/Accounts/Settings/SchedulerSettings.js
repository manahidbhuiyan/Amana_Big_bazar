const mongoose = require('mongoose')
const Schema = mongoose.Schema

const SchedulerSettingsSchema = new Schema({
    admin: {
        type: Schema.Types.ObjectId,
        ref: 'admin'
    },
    branch: {
        type: Schema.Types.ObjectId,
        ref: 'branch',
        default: null
    },
    serialNo: {
        type: Number,
        required: true
    },
    product_receiving: {
        isActive:{
            type: Boolean,
            default: false
        },
        categorySerialNo:{
            type: Number,
            default: null
        },
        subcategorySerialNo:{
            type: Number,
            default: null
        },
        voucherSerialNo:{
            type: Number,
            default: null
        },
        currencySerialNo:{
            type: Number,
            default: null
        }
    },
    product_return: {
        isActive:{
            type: Boolean,
            default: false
        },
        categorySerialNo:{
            type: Number,
            default: null
        },
        subcategorySerialNo:{
            type: Number,
            default: null
        },
        voucherSerialNo:{
            type: Number,
            default: null
        },
        currencySerialNo:{
            type: Number,
            default: null
        }
    },
    product_disposal: {
        isActive:{
            type: Boolean,
            default: false
        },
        categorySerialNo:{
            type: Number,
            default: null
        },
        subcategorySerialNo:{
            type: Number,
            default: null
        },
        voucherSerialNo:{
            type: Number,
            default: null
        },
        currencySerialNo:{
            type: Number,
            default: null
        }
    },
    sell: {
        isActive:{
            type: Boolean,
            default: false
        },
        crsubcategorySerialNo:{
            type: Number,
            default: null
        },
        degroupSerialNo:{
            type: Number,
            default: null
        },
        desubgroupSerialNo:{
            type: Number,
            default: null
        },
        decategorySerialNo:{
            type: Number,
            default: null
        },
        voucherSerialNo:{
            type: Number,
            default: null
        },
        currencySerialNo:{
            type: Number,
            default: null
        }
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

module.exports = SchedulerSettings = mongoose.model('accounts_scheduler_settings', SchedulerSettingsSchema)