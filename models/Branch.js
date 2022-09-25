const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const BranchSchema = new Schema({
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
    address: {
        type: String,
        required: true
    },
    thana: {
        id: {
            type: Number,
            required: true
        },
        name: {
            type: String,
            required: true
        }
    },
    district: {
        id: {
            type: Number,
            required: true
        },
        name: {
            type: String,
            required: true
        }
    },
    division: {
        id: {
            type: Number,
            required: true
        },
        name: {
            type: String,
            required: true
        }
    },
    phone: [{
        type: String
    }],
    nbr_sdc_ips: [{
        type: String
    }],
    isDefaultShop: {
        type: Boolean,
        default: false
    },
    point_apply_active: {
        type: Boolean,
        default: false
    },
    personal_discount_active: {
        type: Boolean,
        default: false
    },
    special_discount_active:{
        type: Boolean,
        default: false
    },
    sales_person_active: {
        type: Boolean,
        default: false
    },
    first_order: {
        activity: {
            type: Boolean,
            default: false
        },
        data: [{
            discount: {
                type: Number,
                default: 0
            },
            min_amount: {
                type: Number,
                default: 0
            },
            isFlatAmount: {
                type: Boolean,
                default: false
            }
        }]
    },
    flat_order: {
        activity: {
            type: Boolean,
            default: false
        },
        data: [{
            discount: {
                type: Number,
                default: 0
            },
            min_amount: {
                type: Number,
                default: 0
            },
            isFlatAmount: {
                type: Boolean,
                default: false
            }
        }]
    },
    facebook_page_id: {
        type: String,
        default: null
    },
    point_settings: {
        purchase: {
            type: Number,
            default: 0
        },
        expand: {
            type: Number,
            default: 0
        },
        bench_mark: {
            type: Number,
            default: 0
        },
        use_points_on: {
            type: Number,
            default: 0
        }
    },
    taxIdentificationNo:{
        type: String
    },
    vat_applicable_warehouse_receiving:{
        type: Boolean,
        default: false
    },
    pos_slip_notes:{
        type: String
    },
    branch_notice:{
        type: String
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

module.exports = Branch = mongoose.model('branch', BranchSchema)