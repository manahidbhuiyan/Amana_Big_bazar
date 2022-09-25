const cashMemoReport = require('./operation/cash_memo')
const personalDiscountReport = require('./operation/personal_discount')
const salesReport = require('./operation/sales_report')
const priceMarkUpDown = require('./operation/price_mark_up_down')
const disposalReport = require('./operation/disposal')
const currentStockReport = require('./operation/current_stock_report')
const PaymentReceivedReport = require('./operation/payment_received_by_user')
const stockSupplierPeriodReport = require('./operation/period_wise_stock_supplier')
const supplierWiseStockReport = require('./operation/supplier_wise_stock')
const supplierReceivingReport = require('./operation/supplier_receiving')
const supplierReturnReport = require('./operation/supplier_return')
const vatReport = require('./operation/vat_report')
const customerReport = require('./operation/customer')
const analysisReport = require('./operation/analysis')
const inventoryStockReport = require('./operation/inventory_stock_report')
const onlineUserReport = require('./operation/online_users')
const noPaymentResetReport = require('./operation/no-payment-reset')
const performanceReport = require('./operation/performance')
const stockStatusReport = require('./operation/stock_status')
const discountReport = require('./operation/discount')
const basketReport = require('./operation/basket')
const productReconciliationReport = require('./operation/reconciliation')
const accountsReport = require('./operation/accounts')
const dailyStockReport = require('./operation/daily_stock_report')
const branchWiseProductReport = require('./operation/branch_wise_product_report')
const supplierRequisitionReport = require('./operation/supplier_requisition')

module.exports={
    cashMemoReport,
    priceMarkUpDown,
    disposalReport,
    salesReport,
    currentStockReport,
    PaymentReceivedReport,
    stockSupplierPeriodReport,
    supplierWiseStockReport,
    supplierReceivingReport,
    supplierReturnReport,
    vatReport,
    customerReport,
    analysisReport,
    personalDiscountReport,
    inventoryStockReport,
    onlineUserReport,
    noPaymentResetReport,
    performanceReport,
    stockStatusReport,
    discountReport,
    basketReport,
    productReconciliationReport,
    accountsReport,
    dailyStockReport,
    branchWiseProductReport,
    supplierRequisitionReport
}