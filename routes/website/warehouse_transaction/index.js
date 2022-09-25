const requisitionSupplierRoute = require('./operation/supplierRequisition')
const receiveSupplierRoute = require('./operation/supplierReceiving')
const returnSupplierRoute = require('./operation/supplierReturn')
const disposalRoute = require('./operation/disposal')
const discountRoute = require('./operation/discount')
const vatRoute = require('./operation/vat')

module.exports = {
    requisitionSupplierRoute,
    receiveSupplierRoute,
    returnSupplierRoute,
    disposalRoute,
    discountRoute,
    vatRoute
}