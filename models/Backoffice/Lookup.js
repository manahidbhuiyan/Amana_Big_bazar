const mongoose = require('mongoose')
const Schema = mongoose.Schema

const BackofficeSettingsLookupSchema = new Schema({
    serialNo:{
        type: Number,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    type: [{
        type: String,
        required: true,
        enum: ['requisition_purpose', 'receiving_purpose', 'return_purpose', 'disposal_purpose', 'discount_purpose', 'vat_change_purpose', 'price_mark_change_purpose', 'pos_payment', 'pos_refund', 'card_name', 'mobile_banking', 'reconciliation_purpose']
    }],
    min_payment_amount: {
        type: Number,
        default: 0
    },
    discount_percentage: {
        type: Number,
        min: 0,
        max: 100,
        default: null
    },
    max_discount_amount: {
        type: Number,
        default: null
    },
    last_updated_by:{
        type: Schema.Types.ObjectId,
        ref: 'admin'
    },
    create:{
        type: Date,
        default: Date.now
    },
    update:{
        type: Date,
        default: Date.now
    }
});

module.exports = BackofficeSettingsLookup = mongoose.model('backoffice_settings_lookup', BackofficeSettingsLookupSchema);