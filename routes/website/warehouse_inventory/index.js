const addWarehouseInventoryRoute = require('./operation/add')
const resetWarehouseInventoryRoute = require('./operation/reset')
const adjustWarehouseInventoryRoute = require('./operation/adjust')
const warehouseInventoryReconciliationRoute = require('./operation/reconciliation')
const warehouseInventoryViewRoute = require('./operation/view')

module.exports = {
    addWarehouseInventoryRoute,
    resetWarehouseInventoryRoute,
    adjustWarehouseInventoryRoute,
    warehouseInventoryReconciliationRoute,
    warehouseInventoryViewRoute
}