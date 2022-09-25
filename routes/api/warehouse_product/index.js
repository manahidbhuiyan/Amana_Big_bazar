const addProduct = require('./add')
const getProduct = require('./get')
const updateProduct = require('./update')
const removeProduct = require('./remove')
const exportProduct = require('./export')
const importProduct = require('./import')

module.exports={
    addProduct,
    updateProduct,
    removeProduct,
    getProduct,
    exportProduct,
    importProduct
}