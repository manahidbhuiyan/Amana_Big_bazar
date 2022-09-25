const mongoose = require('mongoose')
const Schema = mongoose.Schema

const BranchTransferSchema = new Schema({
    serialNumber: {
        type: Number,
        unique: true,
        require: true
    },
    criteria: {
        type: String,
        require: true
    },
    transfer_from:{
        type: Schema.Types.ObjectId,
        ref: 'branch'
    },
    transfer_to:{
        type: Schema.Types.ObjectId,
        ref: 'branch'
    },
    transfer_date:{
        type: Date,
        require: true
    },
    purpose:{
        type: String
    },
    remarks:{
        type: String
    },
    transfer_area:{
        type: String
    },
    products:[
        {
            barcode:{
                type: String,
                require: true
            },
            name:{
                type: String,
                require: true
            },
            unit: {
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
            previous_stock: {
                type: Number,
                require: true
            },
            transfer_quantity:{
                type: Number,
                require: true
            }
        }
    ],
    admin:{
        type: Schema.Types.ObjectId,
        ref: 'admin'
    },
    branch:{
        type: Schema.Types.ObjectId,
        ref: 'branch'
    },
    total_amount:{
        type: Number,
        default: 0
    },
    total_quantity:{
        type: Number,
        default: 0
    },
    create: {
        type: Date,
        default: Date.now
    }
})

module.exports = BranchTransfer = mongoose.model('branch_transfer', BranchTransferSchema)