const priceMarkUpDown = require('./operation/price_mark_up_down')
const disposalReport = require('./operation/disposal')
const currentStockReport = require('./operation/current_stock_report')
const supplierReceivingReport = require('./operation/supplier_receiving')
const supplierReturnReport = require('./operation/supplier_return')
const supplyToBranchReport = require('./operation/supply_to_branch')
const receivingFromBranchReport = require('./operation/receiving_from_branch')
const inventoryStockReport = require('./operation/inventory_stock_report')
const productReconciliationReport = require('./operation/reconciliation')
const analysisReport = require('./operation/analysis')
const accountsReport = require('./operation/accounts')
const dailyStockReport = require('./operation/daily_stock_report')

module.exports={
    priceMarkUpDown,
    disposalReport,
    currentStockReport,
    supplierReceivingReport,
    supplierReturnReport,
    supplyToBranchReport,
    receivingFromBranchReport,
    inventoryStockReport,
    productReconciliationReport,
    analysisReport,
    accountsReport,
    dailyStockReport
}