const mongoose = require('mongoose')
const Schema = mongoose.Schema

const ChartOfAccountsSubCategorySchema = new Schema({
    admin: {
        type: Schema.Types.ObjectId,
        ref: 'admin',
        default: null
    },
    group: {
        type: Schema.Types.ObjectId,
        ref: 'chart_of_accounts_group'
    },
    subgroup: {
        type: Schema.Types.ObjectId,
        ref: 'chart_of_accounts_sub_group'
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: 'chart_of_accounts_category'
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
    account_no:{
        type: String,
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    branchWiseOpening:[
        {
            branch:{
                type: Schema.Types.ObjectId,
                ref: 'branch',
                default: null
            },
            opening_balance:{
                type: Number,
                required: true
            },
            depreciation_amount:{
                type: Number,
                default: 0
            },
            cr_amount:{
                type: Number,
                default: 0
            },
            de_amount:{
                type: Number,
                default: 0
            } 
        }
    ],
    warehouse_opening_balance:{
        type: Number,
        default: 0
    },
    warehouse_depreciation_amount:{
        type: Number,
        default: 0
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

module.exports = ChartOfAccountsSubCategory = mongoose.model('chart_of_accounts_sub_category', ChartOfAccountsSubCategorySchema)