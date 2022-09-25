const addRequisitionSupplier = require('./supplier/add')
const printRequisitionSupplier = require('./supplier/print')
const addReceivingSupplier = require('./supplier_receiving/add')
const printReceivingSupplier = require('./supplier_receiving/print')
const addReturnSupplier = require('./supplier_return/add')
const printReturnSupplier = require('./supplier_return/print')
const getRequisitionSupplier = require('./supplier/get')
const getReceivingSupplier = require('./supplier_receiving/get')
const getReturnSupplier = require('./supplier_return/get')
const updateRequisitionSupplier = require('./supplier/update')

module.exports={
    addRequisitionSupplier,
    printRequisitionSupplier,
    addReceivingSupplier,
    printReceivingSupplier,
    addReturnSupplier,
    printReturnSupplier,
    getRequisitionSupplier,
    getReceivingSupplier,
    getReturnSupplier,
    updateRequisitionSupplier
}