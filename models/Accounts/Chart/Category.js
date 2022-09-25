const mongoose = require('mongoose')
const Schema = mongoose.Schema

const ChartOfAccountsCategorySchema = new Schema({
    admin: {
        type: Schema.Types.ObjectId,
        ref: 'admin'
    },
    group: {
        type: Schema.Types.ObjectId,
        ref: 'chart_of_accounts_group'
    },
    subgroup: {
        type: Schema.Types.ObjectId,
        ref: 'chart_of_accounts_sub_group'
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
    pay_to_supplier:{
        type: Boolean, 
        default: false
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

module.exports = ChartOfAccountsCategory = mongoose.model('chart_of_accounts_category', ChartOfAccountsCategorySchema)