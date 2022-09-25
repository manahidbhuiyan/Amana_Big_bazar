const mongoose = require('mongoose')
const Schema = mongoose.Schema

const WarehousePriceMarkUpDownSchema = new Schema({
    serialNo: {
        type: Number,
        require: true
    },
    reason: {
        type: String
    },
    remarks: {
        type: String
    },
    products: [
        {
            _id: {
                type: Schema.Types.ObjectId,
                ref: 'warehouse_product'
            },
            barcode: {
                type: String,
                require: true
            },
            name: {
                type: String,
                require: true
            },
            price: {
                purchase: {
                    type: Number,
                    default: 0
                },
                sell: {
                    type: Number,
                    default: 0
                },
                previous_purchase: {
                    type: Number,
                    require: true
                },
                previous_sell: {
                    type: Number,
                    require: true
                }
            },
            second_price: {
                purchase: {
                    type: Number,
                    default: 0
                },
                sell: {
                    type: Number,
                    default: 0
                },
                previous_purchase: {
                    type: Number,
                    default: 0
                },
                previous_sell: {
                    type: Number,
                    default: 0
                }
            },
            stock: {
                type: Number,
                require: true
            },
            second_stock: {
                type: Number,
                default: 0
            }
        }
    ],
    admin: {
        type: Schema.Types.ObjectId,
        ref: 'admin'
    },
    create: {
        type: Date,
        default: Date.now
    }
})

module.exports = WarehousePriceMarkUpDown = mongoose.model('warehouse_price_mark_up_down', WarehousePriceMarkUpDownSchema)