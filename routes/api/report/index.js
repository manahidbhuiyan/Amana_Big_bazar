const placeOrder = require('./place')
const getOrder = require('./get')
const categorySell = require('./sell/category_sell')
const subcategorySell = require('./sell/subcategory_sell')
const brandSell = require('./sell/brand_sell')
const supplierWiseSell = require('./sell/supplier_wise_sell')
const supplierWiseSellDetails = require('./sell/supplier_wise_sell_details')
const supplierWiseAnalysis = require('./analysis/supplier_wise_analysis')
const productNameWiseAnalysis = require('./analysis/name_wise_analysis')
const printBarcode = require('./print_barcode')
const zebraPrintBarcode = require('./print_barcode_zebra')
const warehousePrintBarcode = require('./warehouse_print_barcode')
const warehouseZebraPrintBarcode = require('./warehouse_print_barcode_zebra')
const cashMemo = require('./cash_memo')
const paymentReport = require('./payment_report')
const stockCategorySummery = require('./stock/category_stock_summery')
const stockCategoryDetails = require('./stock/category_stock_details')
const stockSubCategoryDetails = require('./stock/subcategory_stock_details')
const stockSubCategorySummery = require('./stock/subcategory_stock_summery')
const stockBrandDetails = require('./stock/brand_stock_details')
const stockBrandSummery = require('./stock/brand_stock_summery')
const stockSupplierSummery = require('./stock/supplier_stock_summery')
const stockSupplierDetails = require('./stock/supplier_stock_details')
const periodWiseStockAnalysisReportSupplier = require('./stock_analysis_supplier_period')
const periodWiseSupplierReceiving = require('./supplier_wise_receiving')
const periodWiseSupplierReturn = require('./supplier_wise_return')
const singleSupplierWiseReceivingSummery = require('./supplier/single_supplier_receiving_summery')
const singleSupplierWiseReceivingDetails = require('./supplier/single_supplier_receiving_details')
const singleSupplierWiseReturnSummery = require('./supplier/single_supplier_return_summery')
const singleSupplierWiseReturnDetails = require('./supplier/single_supplier_return_details')
const allSupplierWiseReceivingSummery = require('./supplier/all_supplier_receiving_summery')
const allSupplierWiseReceivingDetails = require('./supplier/all_supplier_receiving_details')
const allSupplierWiseReturnSummery = require('./supplier/all_supplier_return_summery')
const allSupplierWiseReturnDetails = require('./supplier/all_supplier_return_details')
const topSupplierPurchaseList = require('./purchase/top_sheet_purchase')
const orderUpdateList = require('./sell/pos_order_update')
const orderPaymentDetailsList = require('./payment/details')
const vatableSellList = require('./sell/vatable_sell')
const singlePosUserReport = require('./user/single_user_report')
const allPosUserReport = require('./user/all_user_report')
const allProductDisposal = require('./disposal/supplier_wise_details')
const allProductPriceMark = require('./price_mark/details')
const allProductDiscount = require('./discount/details')
const salesPersonWiseSell = require('./sales_person_wise_sell')
const personalDiscountOnSell = require('./discount/personal_discount')

const inventoryBrandDetails = require('./inventory/brand_inventory_details')
const inventoryBrandSummary = require('./inventory/brand_inventory_summary')
const inventoryCategoryDetails = require('./inventory/category_inventory_details')
const inventoryCategorySummary = require('./inventory/category_inventory_summary')
const inventorySubCategoryDetails = require('./inventory/subcategory_inventory_details')
const inventorySubCategorySummary = require('./inventory/subcategory_inventory_summary')
const inventorySupplierDetails = require('./inventory/supplier_inventory_details')
const inventorySupplierSummary = require('./inventory/supplier_inventory_summary')

const subscribedUser = require('./subscribedUser/subscribed_user_report')
const onlineUser = require('./onlineUser')
const noPaymentReset = require('./no-payment-reset')

const categorySellDetails = require('./sell/category_wise_sell_details')
const subcategorySellDetails = require('./sell/subcategory_wise_sell_details')
const brandSellDetails = require('./sell/brand_wise_sell_details')
const supplierWisePerformance = require('./performance/supplier_wise_performance')
const categoryWisePerformance = require('./performance/category_wise_performance')
const productWisePerformance = require('./performance/product_wise_performance')
const supplierWiseUnderStock = require('./stock_status/supplier_under_stock')
const supplierWiseOverStock = require('./stock_status/supplier_over_stock')
const categoryWiseUnderStock = require('./stock_status/category_under_stock')
const categoryWiseOverStock = require('./stock_status/category_over_stock')
const categoryWiseProductDiscountDetails = require('./discount/category_discount_details')
const categoryWiseProductDiscountSummary = require('./discount/category_discount_summary')
const categoryWiseAnalysis = require('./analysis/category_wise_analysis')
const paymentMethodWiseDiscountDetails = require('./discount/payment_method_dicount_details')
const paymentMethodWiseDiscountSummary = require('./discount/payment_method_discount_summery')
const pointDiscount = require('./discount/point_discount')
const fractionalDiscount = require('./discount/fractional_discount')
const specialDiscount = require('./discount/special_discount')
const supplierWiseProductDiscountDetails = require('./discount/supplier_discount_details')
const supplierWiseProductDiscountSummary = require('./discount/supplier_discount_summary')
const productWiseDiscount = require('./discount/product_discount')
const customerContribution = require('./user/contribution_report')
const chunkCustomer = require('./user/chunk_customer')
const basketReport = require('./basket/basket_report')
const productReconciliationReport = require('./reconciliation/reconciliation')
const dailyStockReport = require('./stock/daily_stock')
const branchWiseProductReport = require('./stock/branch_wise_product')

//accounts
const ledgerDetails = require('./accounts/ledger/ledger')
const trial_balance_summary = require('./accounts/trial_balance/trial_balance_summary')
const trial_balance_details = require('./accounts/trial_balance/trial_balance_details')
const finantial_position_statement = require('./accounts/finantial_position_statement/finantial_position_statement')
const statement_of_profit_loss = require('./accounts/statement_of_profit_loss/statement_of_profit_loss')

const singleSupplierWiseRequisitionSummery = require('./supplier_requisition/single_supplier_requisition_summery')
const singleSupplierWiseRequisitionDetails = require('./supplier_requisition/single_supplier_requisition_details')
const allSupplierWiseRequisitionSummery = require('./supplier_requisition/all_supplier_requisition_summery')
const allSupplierWiseRequisitionDetails = require('./supplier_requisition/all_supplier_requisition_details')
const categoryWiseDisposalDetails = require('./disposal/category_wise_details')

module.exports = {
    placeOrder,
    getOrder,
    categorySell,
    subcategorySell,
    brandSell,
    supplierWiseSellDetails,
    printBarcode,
    zebraPrintBarcode,
    cashMemo,
    paymentReport,
    stockCategorySummery,
    stockCategoryDetails,
    stockSupplierSummery,
    stockSupplierDetails,
    periodWiseStockAnalysisReportSupplier,
    periodWiseSupplierReceiving,
    periodWiseSupplierReturn,
    allSupplierWiseReceivingSummery,
    allSupplierWiseReturnSummery,
    allSupplierWiseReceivingDetails,
    allSupplierWiseReturnDetails,
    singleSupplierWiseReceivingSummery,
    singleSupplierWiseReturnSummery,
    singleSupplierWiseReceivingDetails,
    singleSupplierWiseReturnDetails,
    topSupplierPurchaseList,
    orderUpdateList,
    orderPaymentDetailsList,
    vatableSellList,
    singlePosUserReport,
    allPosUserReport,
    supplierWiseSell,
    supplierWiseAnalysis,
    productNameWiseAnalysis,
    stockSubCategorySummery,
    stockSubCategoryDetails,
    stockBrandSummery,
    stockBrandDetails,
    allProductDisposal,
    allProductPriceMark,
    allProductDiscount,
    salesPersonWiseSell,
    personalDiscountOnSell,
    warehousePrintBarcode,
    warehouseZebraPrintBarcode,
    inventoryBrandDetails,
    inventoryCategoryDetails,
    inventorySubCategoryDetails,
    inventorySupplierDetails,
    inventoryBrandSummary,
    inventoryCategorySummary,
    inventorySubCategorySummary,
    inventorySupplierSummary,
    subscribedUser,
    onlineUser,
    noPaymentReset,
    categorySellDetails,
    subcategorySellDetails,
    brandSellDetails,
    supplierWisePerformance,
    categoryWisePerformance,
    supplierWiseUnderStock,
    supplierWiseOverStock,
    categoryWiseUnderStock,
    categoryWiseOverStock,
    productWisePerformance,
    categoryWiseProductDiscountDetails,
    categoryWiseProductDiscountSummary,
    categoryWiseAnalysis,
    paymentMethodWiseDiscountDetails,
    paymentMethodWiseDiscountSummary,
    pointDiscount,
    fractionalDiscount,
    specialDiscount,
    supplierWiseProductDiscountDetails,
    supplierWiseProductDiscountSummary,
    productWiseDiscount,
    customerContribution,
    chunkCustomer,
    basketReport,
    productReconciliationReport,
    ledgerDetails,
    trial_balance_summary,
    trial_balance_details,
    finantial_position_statement,
    statement_of_profit_loss,
    dailyStockReport,
    branchWiseProductReport,
    singleSupplierWiseRequisitionSummery,
    singleSupplierWiseRequisitionDetails,
    allSupplierWiseRequisitionSummery,
    allSupplierWiseRequisitionDetails,
    categoryWiseDisposalDetails
}