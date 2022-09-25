const mongoose = require('mongoose')
const Schema = mongoose.Schema

const WarehouseProductDisposalSchema = new Schema({
    serialNo: {
        type: Number,
        require: true
    },
    reason: {
        type: String
    },
    remarks:{
        type: String
    },
    products:[
        {
            _id:{
                type: Schema.Types.ObjectId,
                ref: 'warehouse_product'
            },
            barcode:{
                type: String,
                require: true
            },
            name:{
                type: String,
                require: true
            },
            price: {
                purchase:{
                    type: Number,
                    default: 0
                },
                sell:{
                    type: Number,
                    default: 0
                }
            },
            disposal: {
                type: Number,
                require: true
            },
            stock: {
                type: Number,
                require: true
            }
        }
    ],
    admin:{
        type: Schema.Types.ObjectId,
        ref: 'admin'
    },
    create: {
        type: Date,
        default: Date.now
    }
})

module.exports = WarehouseProductDisposal = mongoose.model('warehouse_product_disposal', WarehouseProductDisposalSchema)