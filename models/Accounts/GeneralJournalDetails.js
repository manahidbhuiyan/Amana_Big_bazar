const mongoose = require('mongoose')
const Schema = mongoose.Schema

const AccountsGeneralJournalDetailsSchema = new Schema({
    isCredit: {
        type: Boolean,
        default: true               //credit true and debit false
    },
    general_journal: {
        type: Schema.Types.ObjectId,
        ref: 'accounts_general_journal'
    },
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
    pay_to_supplier:{
        type: Boolean, 
        default: false
    },
    supplier:{
        type: Schema.Types.ObjectId,
        ref: 'supplier',
        default: null
    },
    subcategory:{
        type: Schema.Types.ObjectId,
        ref: 'chart_of_accounts_sub_category',
        default: null
    },
    slip:{
        type: String
    },
    record_date: {
        type: Date,
        default: Date.now
    },
    cost_center:{
        type: Schema.Types.ObjectId,
        ref: 'branch',
        default: null
    },
    voucher:{
        type: Schema.Types.ObjectId,
        ref: 'accounts_settings_voucher'
    },
    currency:{
        type: Schema.Types.ObjectId,
        ref: 'accounts_settings_currency'
    },
    pay_with_requisition_no:{
        type: Number,
        default: null
    },
    pay_with_receiving_no:{
        type: Number,
        default: null
    },
    amount:{
        type: Number,
        required: true
    },
    narration:{
        type: String,
        trim: true
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

module.exports = AccountsGeneralDetailsBook = mongoose.model('accounts_general_journal_details', AccountsGeneralJournalDetailsSchema)