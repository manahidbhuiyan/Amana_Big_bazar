const stockCategorySummery = require('./stock/category_stock_summery')
const stockCategoryDetails = require('./stock/category_stock_details')
const stockSubCategoryDetails = require('./stock/subcategory_stock_details')
const stockSubCategorySummery = require('./stock/subcategory_stock_summery')
const stockBrandDetails = require('./stock/brand_stock_details')
const stockBrandSummery = require('./stock/brand_stock_summery')
const stockSupplierSummery = require('./stock/supplier_stock_summery')
const stockSupplierDetails = require('./stock/supplier_stock_details')
const singleSupplierWiseReceivingSummery = require('./supplier/single_supplier_receiving_summery')
const singleSupplierWiseReceivingDetails = require('./supplier/single_supplier_receiving_details')
const singleSupplierWiseReturnSummery = require('./supplier/single_supplier_return_summery')
const singleSupplierWiseReturnDetails = require('./supplier/single_supplier_return_details')
const allSupplierWiseReceivingSummery = require('./supplier/all_supplier_receiving_summery')
const allSupplierWiseReceivingDetails = require('./supplier/all_supplier_receiving_details')
const allSupplierWiseReturnSummery = require('./supplier/all_supplier_return_summery')
const allSupplierWiseReturnDetails = require('./supplier/all_supplier_return_details')
const allProductDisposal = require('./disposal/details')
const allProductPriceMark = require('./price_mark/details')
const topSupplierPurchaseList = require('./purchase/top_sheet_purchase')

const branchWiseWarehouseReturn = require('./branch_receiving/supplier_wise_receiving')
const branchWiseWarehouseSupply = require('./branch_supply/supplier_wise_supply')

const inventoryBrandDetails = require('./inventory/brand_inventory_details')
const inventoryBrandSummary = require('./inventory/brand_inventory_summary')
const inventoryCategoryDetails = require('./inventory/category_inventory_details')
const inventoryCategorySummary = require('./inventory/category_inventory_summary')
const inventorySubCategoryDetails = require('./inventory/subcategory_inventory_details')
const inventorySubCategorySummary = require('./inventory/subcategory_inventory_summary')
const inventorySupplierDetails = require('./inventory/supplier_inventory_details')
const inventorySupplierSummary = require('./inventory/supplier_inventory_summary')

const productReconciliation = require('./reconciliation/reconciliation')
const categoryWiseAnalysis = require('./analysis/category_wise_analysis')
const supplierWiseAnalysis = require('./analysis/supplier_wise_analysis')
const productNameWiseAnalysis = require('./analysis/name_wise_analysis')

const ledgerDetails = require('./accounts/ledger/ledger')
const trial_balance_summary = require('./accounts/trial_balance/trial_balance_summary')
const trial_balance_details = require('./accounts/trial_balance/trial_balance_details')
const finantial_position_statement = require('./accounts/finantial_position_statement/finantial_position_statement')
const statement_of_profit_loss = require('./accounts/statement_of_profit_loss/statement_of_profit_loss')
const dailyStock = require('./stock/daily_stock')

module.exports = {
    stockCategorySummery,
    stockCategoryDetails,
    stockSubCategoryDetails,
    stockSubCategorySummery,
    stockBrandDetails,
    stockBrandSummery,
    stockSupplierSummery,
    stockSupplierDetails,
    topSupplierPurchaseList,
    singleSupplierWiseReceivingSummery,
    singleSupplierWiseReceivingDetails,
    singleSupplierWiseReturnSummery,
    singleSupplierWiseReturnDetails,
    allSupplierWiseReceivingSummery,
    allSupplierWiseReceivingDetails,
    allSupplierWiseReturnSummery,
    allSupplierWiseReturnDetails,
    allProductDisposal,
    allProductPriceMark,
    branchWiseWarehouseReturn,
    branchWiseWarehouseSupply,
    inventoryBrandDetails,
    inventoryCategoryDetails,
    inventorySubCategoryDetails,
    inventorySupplierDetails,
    inventoryBrandSummary,
    inventoryCategorySummary,
    inventorySubCategorySummary,
    inventorySupplierSummary,
    productReconciliation,
    categoryWiseAnalysis,
    supplierWiseAnalysis,
    productNameWiseAnalysis,
    ledgerDetails,
    trial_balance_summary,
    trial_balance_details,
    finantial_position_statement,
    statement_of_profit_loss,
    dailyStock
}