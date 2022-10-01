const categorySell = require('./sell/category_sell')
const categorySellDetails = require('./sell/category_wise_sell_details')
const subCategorySell = require('./sell/subcategory_sell')
const cashMemo = require('./cash_memo')
const categoryWiseAnalysis = require('./analysis/category_wise_analysis')

module.exports = {
    categorySell,
    categorySellDetails,
    subCategorySell,
    cashMemo,
    categoryWiseAnalysis
}