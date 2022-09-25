const addProductRoute = require('./operation/add')
const updateProductRoute = require('./operation/update')
const sizeProductRoute = require('./operation/size')
const weightProductRoute = require('./operation/weight')
const productListRoute = require('./operation/home')
const categoryDiscountRoute = require('./operation/category_discount')
const exportImportRoute = require('./operation/export_import')
const productReconcialiationRoute = require('./operation/product_reconciliation')

module.exports = {
    productListRoute,
    exportImportRoute,
    addProductRoute,
    updateProductRoute,
    sizeProductRoute,
    weightProductRoute,
    categoryDiscountRoute,
    productReconcialiationRoute
}