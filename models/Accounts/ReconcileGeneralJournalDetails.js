const mongoose = require('mongoose')
const Schema = mongoose.Schema

const ReconcileAccountsGeneralJournalDetailsSchema = new Schema({
    general_journal_id: {
        type: Schema.Types.ObjectId,
        ref: 'accounts_general_journal'
    },
    general_journal_details_id: {
        type: Schema.Types.ObjectId,
        ref: 'accounts_general_journal_details',
        default: null
    },
    isCredit: {
        previous: {
            type: Boolean,
            default: true               //credit true and debit false
        },
        current: {
            type: Boolean,
            default: null, 
        }
    },
    admin: {
        type: Schema.Types.ObjectId,
        ref: 'admin'
    },
    group: {
        previous: {
            type: Schema.Types.ObjectId,
            ref: 'chart_of_accounts_group'
        },
        current: {
            type: Schema.Types.ObjectId,
            ref: 'chart_of_accounts_group',
            default: null,
        }
    },
    subgroup: {
        previous: {
            type: Schema.Types.ObjectId,
            ref: 'chart_of_accounts_sub_group'
        },
        current: {
            type: Schema.Types.ObjectId,
            ref: 'chart_of_accounts_sub_group',
            default: null,
        }
    },
    category: {
        previous: {
            type: Schema.Types.ObjectId,
            ref: 'chart_of_accounts_category'
        },
        current: {
            type: Schema.Types.ObjectId,
            ref: 'chart_of_accounts_category',
            default: null,
        }
    },
    pay_to_supplier:{
        previous: {
            type: Boolean, 
            default: false
        },
        current: {
            type: Boolean, 
            default: false,
            default: null,
        }
    },
    supplier:{
        previous: {
            type: Schema.Types.ObjectId,
            ref: 'supplier',
            default: null
        },
        current: {
            type: Schema.Types.ObjectId,
            ref: 'supplier',
            default: null
        }
    },
    subcategory:{
        previous: {
            type: Schema.Types.ObjectId,
            ref: 'chart_of_accounts_sub_category',
            default: null
        },
        current: {
            type: Schema.Types.ObjectId,
            ref: 'chart_of_accounts_sub_category',
            default: null
        }
    },
    slip:{
        previous: {
            type: String
        },
        current: {
            type: String,
            default: null,
        }
    },
    record_date: {
        previous: {
            type: Date,
        },
        current: {
            type: Date,
            default: null
        }
    },
    cost_center:{
        previous: {
            type: Schema.Types.ObjectId,
            ref: 'branch'
        },
        current: {
            type: Schema.Types.ObjectId,
            ref: 'branch',
            default: null,
        }
    },
    voucher:{
        previous: {
            type: Schema.Types.ObjectId,
            ref: 'accounts_settings_voucher'
        },
        current: {
            type: Schema.Types.ObjectId,
            ref: 'accounts_settings_voucher',
            default: null,
        }
    },
    currency:{
        previous: {
            type: Schema.Types.ObjectId,
            ref: 'accounts_settings_currency'
        },
        current: {
            type: Schema.Types.ObjectId,
            ref: 'accounts_settings_currency',
            default: null,
        }  
    },
    pay_with_requisition_no:{
        previous: {
            type: Number,
            default: null,
        },
        current: {
            type: Number,
            default: null,
        }
    },
    pay_with_receiving_no:{
        previous: {
            type: Number,
            default: null
        },
        current: {
            type: Number,
            default: null,
        }
    },
    amount:{
        previous: {
            type: Number,
            required: true
        },
        current: {
            type: Number,
            default: null,
        }
    },
    narration:{
        previous: {
            type: String,
            trim: true
        },
        current: {
            type: String,
            default: null,
        }
    },
    isUpdated:{
        type: Boolean,
        default: false
    },
    isDeleted:{
        type: Boolean,
        default: false
    },
    create: {
        type: Date,
        default: null
    },
    update: {
        type: Date,
        default: Date.now
    }
})

module.exports = ReconcileAccountsGeneralJournalDetails = mongoose.model('reconcile_accounts_general_journal_details', ReconcileAccountsGeneralJournalDetailsSchema)