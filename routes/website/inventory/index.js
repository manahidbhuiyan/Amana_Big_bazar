const addInventoryRoute = require('./operation/add')
const resetInventoryRoute = require('./operation/reset')
const adjustInventoryRoute = require('./operation/adjust')
const inventoryReconciliationRoute = require('./operation/reconciliation')
const inventoryViewRoute = require('./operation/view')

module.exports = {
    addInventoryRoute,
    resetInventoryRoute,
    adjustInventoryRoute,
    inventoryReconciliationRoute,
    inventoryViewRoute
}