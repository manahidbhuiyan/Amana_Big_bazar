const addBranchGeneralBookRoute = require('./operation/add_branch_general_book')
const reconcilBranchGeneralBookRoute = require('./operation/reconcil_branch_general_book')
const manageBranchGeneralBookRoute = require('./operation/manage_branch_general_book')

const addWarehouseGeneralBookRoute = require('./operation/add_warehouse_general_book')
const reconcilWarehouseGeneralBookRoute = require('./operation/reconcil_warehouse_general_book')
const manageWarehouseGeneralBookRoute = require('./operation/manage_warehouse_general_book')
const adjustBranchReceivingRoute = require('./operation/adjust_branch_receiving')
const adjustWarehouseReceivingRoute = require('./operation/adjust_warehouse_receiving')



module.exports = {
    addBranchGeneralBookRoute,
    manageBranchGeneralBookRoute,
    reconcilBranchGeneralBookRoute,
    addWarehouseGeneralBookRoute,
    reconcilWarehouseGeneralBookRoute,
    manageWarehouseGeneralBookRoute,
    adjustBranchReceivingRoute,
    adjustWarehouseReceivingRoute
}