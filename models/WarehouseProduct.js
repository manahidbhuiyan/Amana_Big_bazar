const mongoose = require('mongoose')
const Schema = mongoose.Schema

const WarehouseProductSchema = new Schema({
    category: {
        type: Schema.Types.ObjectId,
        ref: 'category'
    },
    subcategory: {
        type: Schema.Types.ObjectId,
        ref: 'subcategory'
    },
    brand: {
        type: Schema.Types.ObjectId,
        ref: 'brand'
    },
    supplier: {
        type: Schema.Types.ObjectId,
        ref: 'supplier'
    },
    serialNo:{
        type: Number,
        required: true
    },
    barcode: {
        type: String,
        required: false,
    },
    name: {
        type: String,
        required: false
    },
    slug: {
        type: String,
        required: false
    },
    quantity: {
        type: Number,
        required: true,
        default: 0
    },
    price: {
        sell: {
            type: Number,
            required: true,
            default: 0
        },
        purchase: {
            type: Number,
            required: true,
            default: 0
        }
    },
    second_price:{
        quantity:{
            type: Number,
            default: 0
        },
        sell: {
            type: Number,
            default: 0
        },
        purchase: {
            type: Number,
            default: 0
        } 
    },
    discount: {
        type: Number,
        default: 0
    },
    offerimage: {
        type: String,
        default: null
    },
    offerstatus: {
        type: Boolean,
        default: false
    },
    vat: {
        type: Number,
        default: 0
    },
    description: {
        type: String
    },
    images: {
        type: [String]
    },
    thumbnail: {
        type: String
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    expireDate: {
        type: Date
    },
    reorderLevel: {
        type: Number
    },
    weight: {
        type: Number
    },
    unitType: {
        type: Schema.Types.ObjectId,
        ref: 'productweightunit'
    },
    availableSize: [{
        type: Schema.Types.ObjectId,
        ref: 'productsize'
    }],
    online_active: {
        type: Boolean,
        default: false
    },
    pos_active: {
        type: Boolean,
        default: true
    },
    newProduct: {
        type: Boolean,
        default: false
    },
    specialOffer: {
        type: Boolean,
        default: false
    },
    bestSell: {
        type: Boolean,
        default: false
    },
    daily_transaction:[
        {
            receiving: {
                type: Number,
            },
            return: {
                type: Number,
            },
            disposal: {
                type: Number
            },
            date: {
                type: Date,
                default: Date.now
            }
        }
    ],
    created_by:{
        type: Schema.Types.ObjectId,
        ref: 'admin'
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

module.exports = WarehouseProduct = mongoose.model('warehouse_product', WarehouseProductSchema)