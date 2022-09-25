const mongoose = require('mongoose')
const Schema = mongoose.Schema

const ProductSchema = new Schema({
    branch: {
        type: Schema.Types.ObjectId,
        ref: 'branch'
    },
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
        trim: true,
    },
    name: {
        type: String,
        trim: true,
        required: false
    },
    slug: {
        type: String,
        trim: true,
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
    personalDiscountAvailable: {
        type: Boolean,
        default: true
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
    daily_sell:[
        {
            sell: {
                type: Number,
            },
            exchange: {
                type: Number,
            },
            refund: {
                type: Number
            },
            date: {
                type: Date,
                default: Date.now
            }
        }
    ],
    daily_stock:[
        {
            stock: {
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

module.exports = Product = mongoose.model('product', ProductSchema)