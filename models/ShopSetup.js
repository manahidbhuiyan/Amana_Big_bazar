const mongoose = require('mongoose')
const Schema = mongoose.Schema

const ShopSetupSchema = new Schema({
    from_branch: {
        type: Schema.Types.ObjectId,
        ref: 'branch'
    },
    category: [{
        type: Schema.Types.ObjectId,
        ref: 'category'
    }],
    to_branch: {
        type: Schema.Types.ObjectId,
        ref: 'branch'
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

module.exports = ShopSetup = mongoose.model('shopsetup', ShopSetupSchema)