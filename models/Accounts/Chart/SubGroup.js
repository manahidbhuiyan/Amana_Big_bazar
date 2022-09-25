const mongoose = require('mongoose')
const Schema = mongoose.Schema

const ChartOfAccountsSubGroupSchema = new Schema({
    admin: {
        type: Schema.Types.ObjectId,
        ref: 'admin'
    },
    group: {
        type: Schema.Types.ObjectId,
        ref: 'chart_of_accounts_group'
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

module.exports = ChartOfAccountsSubGroup = mongoose.model('chart_of_accounts_sub_group', ChartOfAccountsSubGroupSchema)