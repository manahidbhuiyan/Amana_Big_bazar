const branchRoute = require('./operation/branch')
const categoryRoute = require('./operation/category')
const subCategoryRoute = require('./operation/sub_category')
const brandRoute = require('./operation/brand')
const supplierRoute = require('./operation/supplier')
const productRoute = require('./operation/product')
const warehouseProductRoute = require('./operation/warehouse_product')
const posClientRoute = require('./operation/pos_client')

module.exports = {
    branchRoute,
    categoryRoute,
    subCategoryRoute,
    brandRoute,
    supplierRoute,
    productRoute,
    posClientRoute,
    warehouseProductRoute
}