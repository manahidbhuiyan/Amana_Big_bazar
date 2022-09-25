const mongoose = require('mongoose')
const Schema = mongoose.Schema

const CategoryWiseDailyStockSchema = new Schema({
    branch: {
        type: Schema.Types.ObjectId,
        ref: 'branch',
        default: null
    },
    categoryInfo: [
        {
            serial:{
                type: Number
            },
            name:{
                type: String
            },
            quantity:{
                type: Number
            },
            cost: {
                type: Number
            },
            sell: {
                type: Number
            },
            gpValue:{
                type: Number
            }
        }
    ],
    totalQuantity:{
        type: Number
    },
    totalCostAmount: {
        type: Number
    },
    totalSellAmount:{
        type: Number
    },
    totalGp:{
        type: Number
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

module.exports = CategoryWiseDailyStock = mongoose.model('category_wise_daily_stock', CategoryWiseDailyStockSchema)