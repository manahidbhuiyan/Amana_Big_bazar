const mongoose = require('mongoose')
const Schema = mongoose.Schema

const AccountsGeneralJournalSchema = new Schema({
    serialNo:{
        type: Number,
        required: true
    },
    credit_balance:{
        type: Number,
        required: true
    },
    debit_balance:{
        type: Number,
        required: true
    },
    closing_balance:{
        type: Number,
        required: true
    },
    is_updatable: {
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

module.exports = AccountsGeneralBook = mongoose.model('accounts_general_journal', AccountsGeneralJournalSchema)