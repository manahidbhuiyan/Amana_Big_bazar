var createError = require('http-errors');
var express = require('express');
var path = require('path');
var expressSession = require('express-session');
var flash = require('express-flash');
var config = require('config');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var minify = require('express-minify');
var compression = require('compression');
var cors = require('cors')

// Run this cmd after npm install
// npm install --save html-pdf -g
// npm link html-pdf
// npm link phantomjs-prebuilt

const {
  stockOutNotification,
  mongoDatabaseBackup,
  mongoDatabaseRestore,
  stockReportScheduler,
  accountsPaymentReportScheduler,
  applyProductDiscount,
  removeProductDiscount,
  checkMatchedStock,
  checkAllNamesAndTrim,
  posClientsBranchIntegrate
} = require('./lib/helpers');

global.appRoot = path.resolve(__dirname);

// checkMatchedStock()
stockOutNotification()
// mongoDatabaseBackup()
// mongoDatabaseRestore()
// Load api route controllers
//  stockReportScheduler()
// applyProductDiscount()
// removeProductDiscount()
// checkAllNamesAndTrim()
// posClientsBranchIntegrate()
// accountsPaymentReportScheduler()

//var indexRouter = require('./routes/index');
var usersRouter = require('./routes/api/user');
var adminRouter = require('./routes/api/admin');
var menuRouter = require('./routes/api/admin/menu');
var permissionRouter = require('./routes/api/admin/permission');
var adminRoleRouter = require('./routes/api/admin/admin_roles');

var roleRouter = require('./routes/api/admin/roles');
var categoryRouter = require('./routes/api/category');
var subcategoryRouter = require('./routes/api/subcategory');
var brandRouter = require('./routes/api/brand');
var supplierRouter = require('./routes/api/supplier');
var productRouter = require('./routes/api/product');
var warehouseProductRouter = require('./routes/api/warehouse_product');
var categoryDiscountRouter = require('./routes/api/discount/category');
var productSizeRouter = require('./routes/api/productSize');
var productWeightUnitRouter = require('./routes/api/productWeightUnit');
var posCartRouter = require('./routes/api/poscart');
var posClientRouter = require('./routes/api/posclient');
var posOrderRouter = require('./routes/api/orderforpos');
var cartRouter = require('./routes/api/cart');
var uploadRouter = require('./routes/api/uploadimage');
var orderRouter = require('./routes/api/order');
var branchRouter = require('./routes/api/branch');
var locationRouter = require('./routes/api/location');
var clientReviewRouter = require('./routes/api/clientreview');
var contactRoute = require('./routes/api/contact');
var notificationRoute = require('./routes/api/notification/search');
var EmailNotificationRoute = require('./routes/api/notification/email');
var MobileNotificationRoute = require('./routes/api/notification/mobile');
var offerRouter = require('./routes/api/offer');
var shopSetupRouter = require('./routes/api/shopSetup');
var reportRouter = require('./routes/api/report');
var reportRouterEcommerce = require('./routes/api/report/ecommerce');
var reportRouterWarehouse = require('./routes/api/report/warehouse');
var transactionApiRouter = require('./routes/api/transaction');
var warehouseTransactionApiRouter = require('./routes/api/warehouse_transaction');
var warehouseSupplyApiRouter = require('./routes/api/warehouse_supply');
var warehousePriceMarkApiRouter = require('./routes/api/warehouse_price_mark');
var priceMarkApiRouter = require('./routes/api/price_mark');
var discountApiRouter = require('./routes/api/transaction/discount');
var disposalApiRouter = require('./routes/api/transaction/disposal');
var warehouseDisposalApiRouter = require('./routes/api/warehouse_transaction/disposal');
var productVatApiRouter = require('./routes/api/transaction/vat');
var branchManager = require('./routes/api/manager');
var lookupInformation = require('./routes/api/backoffice_settings/lookup');
var personalDiscount = require('./routes/api/backoffice_settings/personal_discount');
var specialDiscount = require('./routes/api/backoffice_settings/special_discount');
var salesPerson = require('./routes/api/backoffice_settings/sales_person');
var softwareReplaceAPI = require('./routes/api/software_replace');
var deliveryChargeAPI = require('./routes/api/backoffice_settings/delivery_charges');
var inventoryApiRouter = require('./routes/api/inventory');
var couponCodeApiRouter = require('./routes/api/coupon_code');
var subscriptionApiRouter = require('./routes/api/subscription');
var billingServiceApiRouter = require('./routes/api/billing/service');
var billingPaymentApiRouter = require('./routes/api/billing/payment');
var warehouseInventoryApiRouter = require('./routes/api/warehouse_inventory');
var reconciliationApiRouter = require('./routes/api/Reconciliation');
var warehouseReconciliationApiRouter = require('./routes/api/warehouse_reconciliation');
var inventoryReconciliationApiRouter = require('./routes/api/inventory_reconciliation');
var warehouseInventoryReconciliationApiRouter = require('./routes/api/warehouse_inventory_reconciliation');

//Accounts API
var chatOfAccountsGroup = require('./routes/api/accounts/chart/group');
var chatOfAccountsSubGroup = require('./routes/api/accounts/chart/subgroup');
var chatOfAccountsCategory = require('./routes/api/accounts/chart/category');
var chatOfAccountsSubCategory = require('./routes/api/accounts/chart/subcategory');

// var accountsSettingsBankBook = require('./routes/api/accounts/settings/bankbook');
// var accountsSettingsCostCenter = require('./routes/api/accounts/settings/costcenter');
var accountsSchedulerSettings = require('./routes/api/accounts/settings/scheduler');
var accountsSettingsCurrency = require('./routes/api/accounts/settings/currency');
var accountsSettingsVoucher = require('./routes/api/accounts/settings/voucher');
var generalJournal = require('./routes/api/accounts/general_journal');
var accountsReceiving = require('./routes/api/accounts/supplier_receiving');
var accountsWarehouseReceiving = require('./routes/api/accounts/warehouse_supplier_receiving');
//var updateSerialNo = require('./routes/api/update_serial_no/serial');


// Load Website Routes 
var authSiteRouter = require('./routes/website/auth');
var dashboardRouter = require('./routes/website/dashboard');
// var propertyAdminRouter = require('./routes/website/property');
var branchAdminRouter = require('./routes/website/branch');
var categoryAdminRouter = require('./routes/website/category');
var subcategoryAdminRouter = require('./routes/website/subcategory');
var brandAdminRouter = require('./routes/website/brand');
var supplierAdminRouter = require('./routes/website/supplier');
var warehouseProductAdminRouter = require('./routes/website/warehouse_product');
var productAdminRouter = require('./routes/website/product');
var productBarcodeRouter = require('./routes/website/barcode');
var manageImageRouter = require('./routes/website/media');
// var partitionAdminRouter = require('./routes/website/partition');
// var propertySellAdminRouter = require('./routes/website/sell');
// var propertyPaymentAdminRouter = require('./routes/website/payment');
var userAdminRouter = require('./routes/website/user');
var orderAdminRouter = require('./routes/website/order');
var posOrderAdminRouter = require('./routes/website/pos_order');
var manageClientReviewRouter = require('./routes/website/clientreview');
var notificationRouter = require('./routes/website/notification');
var manageOfferRouter = require('./routes/website/offer');
var manageShopSetupRouter = require('./routes/website/shop_setup');
var exportImportRouter = require('./routes/website/export_import');
var warehouseTransactionRouter = require('./routes/website/warehouse_transaction');
var warehouseSupplyRouter = require('./routes/website/warehouse_supply');
var transactionRouter = require('./routes/website/transaction');
var priceMarkRouter = require('./routes/website/price_mark');
var managerRouter = require('./routes/website/manager');
var downloadReportRouter = require('./routes/website/report');
var downloadEcommerceReportRouter = require('./routes/website/report/ecommerce');
var downloadWarehouseReportRouter = require('./routes/website/report/warehouse');
var backOfficeRouter = require('./routes/website/backoffice_settings');
var softwareReplace = require('./routes/website/software_replace');
var inventoryRouter = require('./routes/website/inventory');
var couponCodeRouter = require('./routes/website/coupon_code');
var billingRouter = require('./routes/website/billing');
var warehouseInventoryRouter = require('./routes/website/warehouse_inventory');
var accountsRouter = require('./routes/website/accounts');
var chartOfAccountsRouter = require('./routes/website/chart_of_accounts');
var accountsSettingsRouter = require('./routes/website/accounts_settings');

var app = express();

app.use(compression());
app.use(minify());
app.use(express.static(__dirname + '/public'));
app.use(express.json({limit: '50mb'}));

// var http = require('http').createServer(app);
// console.log(http)
// var io = require('socket.io')(http);
// io.on('connection', (socket) => {
//   console.log('a user connected');
// });
var minifyHTML = require('express-minify-html-2');

app.use(minifyHTML({
  override:      true,
  exception_url: false,
  htmlMinifier: {
      removeComments:            true,
      collapseWhitespace:        true,
      collapseBooleanAttributes: true,
      removeAttributeQuotes:     true,
      removeEmptyAttributes:     true,
      minifyJS:                  true
  }
}));

// Cross origin request *allow*
app.use(cors())

// Load Mongo Database Connection
var mongoConnection = require('./config/connectMongo')
mongoConnection()

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));


app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Load Session and Flash
app.use(expressSession({
  secret: config.get('sessionSecrect'),
  cookie: {
    maxAge: 4000000
  },
  resave: false,
  saveUninitialized: false
}))

app.use(flash())

//All the api routes start
//app.use('/', indexRouter);
app.use('/api/location', [locationRouter.getLocation]);
app.use('/api/user', [usersRouter.user, usersRouter.auth, usersRouter.verify, usersRouter.forgot, usersRouter.reset, usersRouter.contact, usersRouter.updatePhoto]);
app.use('/api/admin', [adminRouter.admin, adminRouter.auth, adminRouter.verify, adminRouter.forgot, adminRouter.reset, adminRouter.getAdminData, adminRouter.updateAdminData, adminRouter.removeAdminData, adminRouter.removeReportPermission]);
app.use('/api/category', [categoryRouter.addCategory, categoryRouter.updateCategory, categoryRouter.removeCategory, categoryRouter.getCategory, categoryRouter.importCategory, categoryRouter.exportCategory]);
app.use('/api/subcategory', [subcategoryRouter.addSubCategory, subcategoryRouter.updateSubCategory, subcategoryRouter.removeSubCategory, subcategoryRouter.getSubCategory, subcategoryRouter.importSubCategory, subcategoryRouter.exportSubCategory]);
app.use('/api/shop-setup', [shopSetupRouter.addShopSetup, shopSetupRouter.updateShopSetup, shopSetupRouter.removeShopSetup, shopSetupRouter.getShopSetup]);
app.use('/api/brand', [brandRouter.addBrand, brandRouter.updateBrand, brandRouter.removeBrand, brandRouter.getBrand, brandRouter.importBrand, brandRouter.exportBrand]);
app.use('/api/supplier', [supplierRouter.addSupplier, supplierRouter.updateSupplier, supplierRouter.removeSupplier, supplierRouter.getSupplier, supplierRouter.importSupplier, supplierRouter.exportSupplier]);
app.use('/api/warehouse/product', [warehouseProductRouter.addProduct, warehouseProductRouter.updateProduct, warehouseProductRouter.removeProduct, warehouseProductRouter.getProduct, warehouseProductRouter.exportProduct, warehouseProductRouter.importProduct]);
app.use('/api/product', [productRouter.addProduct, productRouter.updateProduct, productRouter.removeProduct, productRouter.getProduct, productRouter.exportProduct, productRouter.importProduct]);
app.use('/api/upload', [uploadRouter.uploadImages]);
app.use('/api/product/category/discount', [categoryDiscountRouter.addCategoryDiscount, categoryDiscountRouter.updateCategoryDiscount, categoryDiscountRouter.getCategoryDiscount, categoryDiscountRouter.removeCategoryDiscount]);
app.use('/api/product/size', [productSizeRouter.addProductSize, productSizeRouter.updateProductSize, productSizeRouter.removeProductSize, productSizeRouter.getProductSize]);
app.use('/api/product/weight', [productWeightUnitRouter.addProductWeight, productWeightUnitRouter.updateProductWeight, productWeightUnitRouter.removeProductWeight, productWeightUnitRouter.getProductWeight]);
//Menu and permission
app.use('/api/admin/menu', [menuRouter.addMenu, menuRouter.getMenu, menuRouter.updateMenu, menuRouter.removeMenu]);
app.use('/api/admin/permission', [permissionRouter.addPermission, permissionRouter.getPermission, permissionRouter.updatePermission, permissionRouter.removePermission]);
app.use('/api/admin/role', [adminRoleRouter.addAdminRole, adminRoleRouter.getAdminRole, adminRoleRouter.updateAdminRole, adminRoleRouter.removeAdminRole]);

app.use('/api/role', [roleRouter.addRole, roleRouter.getRole, roleRouter.updateRole, roleRouter.removeRole]);
app.use('/api/role', [roleRouter.addRole, roleRouter.getRole, roleRouter.updateRole, roleRouter.removeRole]);
app.use('/api/pos/cart', [posCartRouter.add, posCartRouter.update, posCartRouter.remove, posCartRouter.get, posCartRouter.noPaymentReset]);
app.use('/api/pos/client', [posClientRouter.add, posClientRouter.get, posClientRouter.update, posClientRouter.exportUser, posClientRouter.importUser]);
app.use('/api/pos/order', [posOrderRouter.placeOrder, posOrderRouter.getOrder]);
app.use('/api/cart', [cartRouter.add, cartRouter.update, cartRouter.remove, cartRouter.get]);
app.use('/api/order', [orderRouter.addOrder, orderRouter.getOrder, orderRouter.placeOrder, orderRouter.updateOrder, orderRouter.removeOrder]);
app.use('/api/branch', [branchRouter.addBranch, branchRouter.removeBranch, branchRouter.updateBranch, branchRouter.getBranch, branchRouter.importBranch, branchRouter.exportBranch]);
app.use('/api/branch/access', [branchManager.addBranchManager, branchManager.removeBranchManager, branchManager.getBranchManager, branchManager.updateBranchManager, branchManager.printBranchManagerInfo, branchManager.authBranchManagerInfo]);
app.use('/api/clientreview', [clientReviewRouter.clientReview]);
app.use('/api/contact', [contactRoute.contact]);
app.use('/api/notification', [notificationRoute.getSearch]);
app.use('/api/notification/email', [EmailNotificationRoute.getEmail, EmailNotificationRoute.addEmail, EmailNotificationRoute.updateEmail, EmailNotificationRoute.removeEmail]);
app.use('/api/notification/mobile', [MobileNotificationRoute.getMobile, MobileNotificationRoute.addMobile, MobileNotificationRoute.updateMobile, MobileNotificationRoute.removeMobile]);
app.use('/api/offer', [offerRouter.add, offerRouter.get, offerRouter.update, offerRouter.remove]);
app.use('/api/report', [reportRouter.personalDiscountOnSell, reportRouter.salesPersonWiseSell, reportRouter.allProductDisposal, reportRouter.allProductPriceMark, reportRouter.stockSubCategoryDetails, reportRouter.stockSubCategorySummery, reportRouter.stockBrandDetails, reportRouter.stockBrandSummery, reportRouter.supplierWiseAnalysis, reportRouter.supplierWiseSell, reportRouter.allPosUserReport, reportRouter.categorySell,
      reportRouter.subcategorySell, reportRouter.brandSell, reportRouter.printBarcode, reportRouter.zebraPrintBarcode, reportRouter.cashMemo, reportRouter.paymentReport, reportRouter.stockCategorySummery, reportRouter.stockCategoryDetails, reportRouter.stockSupplierSummery, reportRouter.stockSupplierDetails, reportRouter.periodWiseStockAnalysisReportSupplier, reportRouter.periodWiseSupplierReceiving, reportRouter.periodWiseSupplierReturn, 
      reportRouter.allSupplierWiseReceivingSummery, reportRouter.allSupplierWiseReturnSummery, reportRouter.allSupplierWiseReceivingDetails, reportRouter.allSupplierWiseReturnDetails, reportRouter.singleSupplierWiseReceivingSummery, reportRouter.singleSupplierWiseReturnSummery, reportRouter.singleSupplierWiseReceivingDetails, reportRouter.singleSupplierWiseReturnDetails, reportRouter.topSupplierPurchaseList, reportRouter.orderUpdateList,
      reportRouter.orderPaymentDetailsList, reportRouter.vatableSellList, reportRouter.singlePosUserReport, reportRouter.supplierWiseSellDetails, reportRouter.warehousePrintBarcode, reportRouter.warehouseZebraPrintBarcode, reportRouter.inventoryBrandDetails, reportRouter.inventoryCategoryDetails, reportRouter.inventorySubCategoryDetails, reportRouter.inventorySupplierDetails, reportRouter.inventoryBrandSummary, reportRouter.inventoryCategorySummary,
      reportRouter.inventorySubCategorySummary, reportRouter.inventorySupplierSummary, reportRouter.subscribedUser, reportRouter.onlineUser, reportRouter.productNameWiseAnalysis, reportRouter.noPaymentReset, reportRouter.categorySellDetails, reportRouter.subcategorySellDetails, reportRouter.brandSellDetails, reportRouter.supplierWisePerformance, reportRouter.categoryWisePerformance, reportRouter.productWisePerformance, reportRouter.supplierWiseUnderStock,
      reportRouter.categoryWiseUnderStock, reportRouter.categoryWiseProductDiscountDetails, reportRouter.categoryWiseProductDiscountSummary, reportRouter.categoryWiseAnalysis, reportRouter.supplierWiseOverStock, reportRouter.categoryWiseOverStock, reportRouter.paymentMethodWiseDiscountDetails, reportRouter.paymentMethodWiseDiscountSummary, reportRouter.pointDiscount, reportRouter.fractionalDiscount, reportRouter.specialDiscount, reportRouter.supplierWiseProductDiscountSummary,
      reportRouter.supplierWiseProductDiscountDetails, reportRouter.productWiseDiscount, reportRouter.customerContribution, reportRouter.chunkCustomer, reportRouter.basketReport, reportRouter.productReconciliationReport, reportRouter.ledgerDetails, reportRouter.trial_balance_summary, reportRouter.trial_balance_details, reportRouter.finantial_position_statement, reportRouter.statement_of_profit_loss, reportRouter.dailyStockReport, reportRouter.branchWiseProductReport, 
      reportRouter.singleSupplierWiseRequisitionSummery, reportRouter.singleSupplierWiseRequisitionDetails, reportRouter.allSupplierWiseRequisitionSummery, reportRouter.allSupplierWiseRequisitionDetails, reportRouter.categoryWiseDisposalDetails]);
app.use('/api/report/ecommerce',[reportRouterEcommerce.categorySell, reportRouterEcommerce.categorySellDetails, reportRouterEcommerce.subCategorySell, reportRouterEcommerce.cashMemo]);
app.use('/api/report/warehouse', [reportRouterWarehouse.stockCategorySummery, reportRouterWarehouse.stockCategoryDetails, reportRouterWarehouse.stockSubCategoryDetails, reportRouterWarehouse.stockSubCategorySummery, reportRouterWarehouse.stockBrandDetails, reportRouterWarehouse.stockBrandSummery, reportRouterWarehouse.stockSupplierSummery, reportRouterWarehouse.stockSupplierDetails, reportRouterWarehouse.singleSupplierWiseReceivingSummery, reportRouterWarehouse.singleSupplierWiseReceivingDetails, reportRouterWarehouse.singleSupplierWiseReturnSummery, reportRouterWarehouse.singleSupplierWiseReturnDetails, reportRouterWarehouse.allSupplierWiseReceivingSummery, reportRouterWarehouse.allSupplierWiseReceivingDetails, reportRouterWarehouse.allSupplierWiseReturnSummery, reportRouterWarehouse.allSupplierWiseReturnDetails, reportRouterWarehouse.allProductDisposal, reportRouterWarehouse.allProductPriceMark, reportRouterWarehouse.topSupplierPurchaseList, reportRouterWarehouse.branchWiseWarehouseSupply, reportRouterWarehouse.branchWiseWarehouseReturn, reportRouterWarehouse.inventoryBrandDetails, reportRouterWarehouse.inventoryCategoryDetails, reportRouterWarehouse.inventorySubCategoryDetails, reportRouterWarehouse.inventorySupplierDetails, reportRouterWarehouse.inventoryBrandSummary, reportRouterWarehouse.inventoryCategorySummary, reportRouterWarehouse.inventorySubCategorySummary, reportRouterWarehouse.inventorySupplierSummary, reportRouterWarehouse.productReconciliation, reportRouterWarehouse.categoryWiseAnalysis, reportRouterWarehouse.supplierWiseAnalysis, reportRouterWarehouse.productNameWiseAnalysis, reportRouterWarehouse.ledgerDetails, reportRouterWarehouse.trial_balance_summary, reportRouterWarehouse.trial_balance_details, reportRouterWarehouse.finantial_position_statement, reportRouterWarehouse.statement_of_profit_loss, reportRouterWarehouse.dailyStock]);
app.use('/api/transaction/supplier/request', [transactionApiRouter.addRequisitionSupplier, transactionApiRouter.getRequisitionSupplier, transactionApiRouter.updateRequisitionSupplier, transactionApiRouter.printRequisitionSupplier]);
app.use('/api/transaction/supplier/receive', [transactionApiRouter.addReceivingSupplier, transactionApiRouter.getReceivingSupplier, transactionApiRouter.printReceivingSupplier]);
app.use('/api/transaction/supplier/return', [transactionApiRouter.addReturnSupplier, transactionApiRouter.getReturnSupplier, transactionApiRouter.printReturnSupplier]);
app.use('/api/warehouse/price-mark/up-down', [warehousePriceMarkApiRouter.savePriceMarkUpDownSupplier, warehousePriceMarkApiRouter.printAllReportOfPriceMark, warehousePriceMarkApiRouter.getPriceMarkUpDown]);
app.use('/api/price-mark/up-down', [priceMarkApiRouter.savePriceMarkUpDownSupplier, priceMarkApiRouter.printAllReportOfPriceMark, priceMarkApiRouter.getPriceMarkUpDown]);
app.use('/api/transaction/disposal', [disposalApiRouter.saveDisposal, disposalApiRouter.getDisposal, disposalApiRouter.printAllReportOfDisposal]);
app.use('/api/transaction/discount', [discountApiRouter.savePriceDiscount, discountApiRouter.getPriceDiscount, discountApiRouter.printAllReportOfDiscount]);
app.use('/api/transaction/vat', [productVatApiRouter.saveProductVat, productVatApiRouter.getProductVat, productVatApiRouter.printAllReportOfProductVat]);
app.use('/api/lookup/info', [lookupInformation.addLookupInfo, lookupInformation.getLookupInfo, lookupInformation.updateLookupInformation, lookupInformation.removeLookupInformation]);
app.use('/api/personal-discount', [personalDiscount.add, personalDiscount.get, personalDiscount.update]);
app.use('/api/special-discount', [specialDiscount.add, specialDiscount.get, specialDiscount.update]);
app.use('/api/sales-person', [salesPerson.add, salesPerson.get, salesPerson.update]);
app.use('/api/delivery-charge', [deliveryChargeAPI.addDeliveryLocation, deliveryChargeAPI.getDeliveryLocation, deliveryChargeAPI.updateDeliveryLocation, deliveryChargeAPI.removeDeliveryLocation]);
app.use('/api/software-replace', [softwareReplaceAPI.loadQuantyity]);

app.use('/api/warehouse/transaction/supply', [warehouseSupplyApiRouter.addRequisitionSupply, warehouseSupplyApiRouter.getRequisitionSupply, warehouseSupplyApiRouter.printRequisitionSupply, warehouseSupplyApiRouter.addReturnSupply, warehouseSupplyApiRouter.getReturnSupply, warehouseSupplyApiRouter.printReturnSupply]);
app.use('/api/warehouse/transaction/supplier/request', [warehouseTransactionApiRouter.addRequisitionSupplier, warehouseTransactionApiRouter.getRequisitionSupplier, warehouseTransactionApiRouter.updateRequisitionSupplier, warehouseTransactionApiRouter.printRequisitionSupplier]);
app.use('/api/warehouse/transaction/supplier/receive', [warehouseTransactionApiRouter.addReceivingSupplier, warehouseTransactionApiRouter.getReceivingSupplier, warehouseTransactionApiRouter.printReceivingSupplier]);
app.use('/api/warehouse/transaction/supplier/return', [warehouseTransactionApiRouter.addReturnSupplier, warehouseTransactionApiRouter.getReturnSupplier, warehouseTransactionApiRouter.printReturnSupplier]);
app.use('/api/warehouse/transaction/disposal', [warehouseDisposalApiRouter.saveDisposal, warehouseDisposalApiRouter.getDisposal, warehouseDisposalApiRouter.printAllReportOfDisposal]);
app.use('/api/inventory', [inventoryApiRouter.addInventoryProduct, inventoryApiRouter.getInventoryProduct, inventoryApiRouter.resetInventoryProduct, inventoryApiRouter.adjustInventory]);
app.use('/api/coupon-code', [couponCodeApiRouter.addCoupon, couponCodeApiRouter.getCoupon, couponCodeApiRouter.updateCoupon, couponCodeApiRouter.removeCoupon]);
app.use('/api/subscription', [subscriptionApiRouter.subscriptionCreate]);
app.use('/api/billing/service', [billingServiceApiRouter.addService, billingServiceApiRouter.getService, billingServiceApiRouter.updateService, billingServiceApiRouter.removeService]);
app.use('/api/billing/payment', [billingPaymentApiRouter.addPayment, billingPaymentApiRouter.getPayment, billingPaymentApiRouter.updatePayment, billingPaymentApiRouter.removePayment]);
app.use('/api/warehouse/inventory', [warehouseInventoryApiRouter.addWarehouseInventoryProduct, warehouseInventoryApiRouter.getWarehouseInventoryProduct, warehouseInventoryApiRouter.resetWarehouseInventoryProduct, warehouseInventoryApiRouter.adjustWarehouseInventory]);
app.use('/api/reconciliation', [reconciliationApiRouter.saveProductReconciliation, reconciliationApiRouter.printProductReconciliation, reconciliationApiRouter.getProductReconciliation]);
app.use('/api/warehouse/reconciliation', [warehouseReconciliationApiRouter.saveWarehouseProductReconciliation, warehouseReconciliationApiRouter.printWarehouseProductReconciliation, warehouseReconciliationApiRouter.getWarehouseProductReconciliation]);
app.use('/api/inventory/reconciliation', [inventoryReconciliationApiRouter.saveInventoryProductReconciliation, inventoryReconciliationApiRouter.printInventoryProductReconciliation, inventoryReconciliationApiRouter.getInventoryProductReconciliation]);
app.use('/api/warehouse/inventory/reconciliation', [warehouseInventoryReconciliationApiRouter.saveWarehouseInventoryProductReconciliation, warehouseInventoryReconciliationApiRouter.printWarehouseInventoryProductReconciliation, warehouseInventoryReconciliationApiRouter.getWarehouseInventoryProductReconciliation]);

//app.use('/api/update/serial-no', [updateSerialNo]);

//Accounts API Use
app.use('/api/accounts/chart/group', [chatOfAccountsGroup.addGroup, chatOfAccountsGroup.getGroup, chatOfAccountsGroup.updateGroup, chatOfAccountsGroup.removeGroup]);
app.use('/api/accounts/chart/subgroup', [chatOfAccountsSubGroup.addSubGroup, chatOfAccountsSubGroup.getSubGroup,chatOfAccountsSubGroup.updateSubGroup,chatOfAccountsSubGroup.removeSubGroup]);
app.use('/api/accounts/chart/category', [chatOfAccountsCategory.addCategory, chatOfAccountsCategory.getCategory, chatOfAccountsCategory.updateCategory, chatOfAccountsCategory.removeCategory]);
app.use('/api/accounts/chart/subcategory', [chatOfAccountsSubCategory.addSubCategory, chatOfAccountsSubCategory.getSubCategory, chatOfAccountsSubCategory.updateSubCategory, chatOfAccountsSubCategory.removeSubCategory]);


// app.use('/api/accounts/settings/bank-book', [accountsSettingsBankBook.addBankBook, accountsSettingsBankBook.getBankBook, accountsSettingsBankBook.updateBankBook, accountsSettingsBankBook.removeBankBook]);
// app.use('/api/accounts/settings/cost-center', [accountsSettingsCostCenter.addCostCenter, accountsSettingsCostCenter.getCostCenter,accountsSettingsCostCenter.updateCostCenter,accountsSettingsCostCenter.removeCostCenter]);
app.use('/api/accounts/settings/scheduler-settings', [accountsSchedulerSettings.addSchedulerSettings, accountsSchedulerSettings.getSchedulerSettings,accountsSchedulerSettings.updateSchedulerSettings, accountsSchedulerSettings.removeSchedulerSettings]);
app.use('/api/accounts/settings/currency', [accountsSettingsCurrency.addCurrency, accountsSettingsCurrency.getCurrency, accountsSettingsCurrency.updateCurrency, accountsSettingsCurrency.removeCurrency]);
app.use('/api/accounts/settings/voucher', [accountsSettingsVoucher.addVoucher, accountsSettingsVoucher.getVoucher, accountsSettingsVoucher.updateVoucher, accountsSettingsVoucher.removeVoucher]);

app.use('/api/accounts/generaljournal', [generalJournal.addGeneralJournal, generalJournal.getGeneralJournal, generalJournal.updateGeneralJournal, generalJournal.removeGeneralJournal, generalJournal.printGeneralJournal]);
app.use('/api/accounts/supplier/receive', [accountsReceiving.adjustSupplierReceiving, accountsReceiving.getSupplierReceiving, accountsReceiving.printSupplierReceiving]);
app.use('/api/accounts/warehouse/supplier/receive', [accountsWarehouseReceiving.adjustWarehouseRecivingRoute, accountsWarehouseReceiving.getWarehouseReceivingRoute, accountsWarehouseReceiving.printWarehouseReceivingRoute])    
    
// Website Routes
app.use('/', [authSiteRouter.loginAuth, authSiteRouter.registerAuth, authSiteRouter.forgotAuth, authSiteRouter.resetAuth])
app.use('/dashboard', [dashboardRouter.homeRoute])
app.use('/dashboard/branch', [branchAdminRouter.branchListRoute, branchAdminRouter.exportImportRoute])
app.use('/product/branch', [branchAdminRouter.productBranchSelect])
app.use('/dashboard/category', [categoryAdminRouter.categoryListRoute, categoryAdminRouter.exportImportRoute])
app.use('/dashboard/subcategory', [subcategoryAdminRouter.subcategoryListRoute, subcategoryAdminRouter.exportImportRoute])
app.use('/dashboard/brand', [brandAdminRouter.brandListRoute, brandAdminRouter.exportImportRoute])
app.use('/dashboard/supplier', [supplierAdminRouter.supplierListRoute, supplierAdminRouter.exportImportRoute])
app.use('/dashboard/warehouse/product', [warehouseProductAdminRouter.productListRoute, warehouseProductAdminRouter.exportImportRoute, warehouseProductAdminRouter.addProductRoute, warehouseProductAdminRouter.updateProductRoute, productBarcodeRouter.warehouseBarcodePrintRoute, priceMarkRouter.warehousePriceMarkUpDownRoute, warehouseProductAdminRouter.productReconcialiationRoute])
app.use('/dashboard/warehouse/product/size', [warehouseProductAdminRouter.sizeProductRoute])
app.use('/dashboard/warehouse/product/weight', [warehouseProductAdminRouter.weightProductRoute])
app.use('/dashboard/product', [productAdminRouter.productListRoute, productAdminRouter.exportImportRoute, productAdminRouter.addProductRoute, productAdminRouter.updateProductRoute, productBarcodeRouter.barcodePrintRoute, productAdminRouter.productReconcialiationRoute])
app.use('/dashboard/product/category-wise-discount', [productAdminRouter.categoryDiscountRoute])
app.use('/dashboard/product/size', [productAdminRouter.sizeProductRoute])
app.use('/dashboard/product/weight', [productAdminRouter.weightProductRoute])
app.use('/dashboard/manage/images', [manageImageRouter.manageMediaRoute])
app.use('/dashboard/clientreview', [manageClientReviewRouter.manageClientReviewRoute])
// app.use('/dashboard/progress', [progressAdminRouter.addProgressRoute, progressAdminRouter.progressListRoute])
// app.use('/dashboard/partition', [partitionAdminRouter.addPartitionRoute, partitionAdminRouter.partitionListRoute, partitionAdminRouter.partitionTypeRoute, partitionAdminRouter.updatePartitionRoute])
// app.use('/dashboard/sell', [propertySellAdminRouter.addPropertySellRoute, propertySellAdminRouter.propertySellListRoute])
// app.use('/dashboard/payment', [propertyPaymentAdminRouter.addPropertyPaymentRoute, propertyPaymentAdminRouter.propertyPaymentListRoute])
app.use('/dashboard/admin', [userAdminRouter.addAdminRoute, userAdminRouter.adminListRoute, userAdminRouter.roleAdminRoute, userAdminRouter.updateAdminRoute, userAdminRouter.adminMenuRoute, userAdminRouter.adminPermissionRoute, userAdminRouter.adminRoleRoute])
// app.use('/dashboard/assessment', [assessmentAdminRouter.incomeTypeRoute, assessmentAdminRouter.expendTypeRoute, assessmentAdminRouter.expendRoute, assessmentAdminRouter.incomeRoute])

app.use('/dashboard/order', [orderAdminRouter.orderListRoute, orderAdminRouter.orderViewRoute])
app.use('/dashboard/pos/order', [posOrderAdminRouter.orderListRoute, posOrderAdminRouter.orderEditRoute, posOrderAdminRouter.addOrderRoute, posOrderAdminRouter.refundRoute, posOrderAdminRouter.exchangeRoute, posOrderAdminRouter.exchangeListRoute, posOrderAdminRouter.refundListRoute, posOrderAdminRouter.refundOfExchange, posOrderAdminRouter.exchangeOfExchange, posOrderAdminRouter.exchangeEditRoute ])
app.use('/order/invoice/print', [orderAdminRouter.orderInvoiceRoute])
app.use('/dashboard/notification', [notificationRouter.emailNotificationRoute, notificationRouter.mobileNotificationRoute])

app.use('/dashboard/offer', [manageOfferRouter.manageOfferRoute])
app.use('/dashboard/export-import', [exportImportRouter.branchRoute, exportImportRouter.brandRoute, exportImportRouter.categoryRoute, exportImportRouter.posClientRoute, exportImportRouter.productRoute, exportImportRouter.warehouseProductRoute, exportImportRouter.subCategoryRoute, exportImportRouter.supplierRoute])
app.use('/dashboard/manage/shop', [manageShopSetupRouter.manageShopListRoute, manageShopSetupRouter.manageShopBrandSetupRoute, manageShopSetupRouter.manageShopSupplierSetupRoute])
app.use('/dashboard/warehouse/transaction', [warehouseTransactionRouter.requisitionSupplierRoute, warehouseTransactionRouter.receiveSupplierRoute, warehouseTransactionRouter.returnSupplierRoute, warehouseTransactionRouter.disposalRoute, warehouseTransactionRouter.discountRoute, warehouseTransactionRouter.vatRoute])
app.use('/dashboard/supply', [warehouseSupplyRouter.manageSypply, warehouseSupplyRouter.manageReturn])
app.use('/dashboard/transaction', [transactionRouter.requisitionSupplierRoute, transactionRouter.receiveSupplierRoute, transactionRouter.returnSupplierRoute, transactionRouter.disposalRoute, transactionRouter.discountRoute, transactionRouter.vatRoute])
app.use('/dashboard/price-mark', [priceMarkRouter.priceMarkUpDownRoute])
app.use('/dashboard/manager', [managerRouter.managerListRoute])
app.use('/dashboard/back-office', [backOfficeRouter.deliveryChargesRoute, backOfficeRouter.lookupListRoute, backOfficeRouter.personalDiscountRoute, backOfficeRouter.SalesPersonRoute, backOfficeRouter.specialDiscountRoute])
app.use('/dashboard/report', [downloadReportRouter.personalDiscountReport, downloadReportRouter.disposalReport, downloadReportRouter.analysisReport, downloadReportRouter.priceMarkUpDown, downloadReportRouter.customerReport, downloadReportRouter.vatReport, downloadReportRouter.cashMemoReport, downloadReportRouter.salesReport, downloadReportRouter.currentStockReport, downloadReportRouter.PaymentReceivedReport, downloadReportRouter.stockSupplierPeriodReport, downloadReportRouter.supplierWiseStockReport, downloadReportRouter.supplierReceivingReport, downloadReportRouter.supplierReturnReport, downloadReportRouter.inventoryStockReport, downloadReportRouter.onlineUserReport, downloadReportRouter.noPaymentResetReport, downloadReportRouter.performanceReport, downloadReportRouter.stockStatusReport, downloadReportRouter.discountReport, downloadReportRouter.basketReport, downloadReportRouter.productReconciliationReport, downloadReportRouter.accountsReport, downloadReportRouter.dailyStockReport, downloadReportRouter.branchWiseProductReport, downloadReportRouter.supplierRequisitionReport])
app.use('/dashboard/report/ecommerce', [downloadEcommerceReportRouter.SalesReport, downloadEcommerceReportRouter.cashMemoReport, downloadEcommerceReportRouter.analysisReport]),
app.use('/dashboard/report/warehouse', [downloadWarehouseReportRouter.disposalReport, downloadWarehouseReportRouter.priceMarkUpDown, downloadWarehouseReportRouter.currentStockReport, downloadWarehouseReportRouter.supplierReceivingReport, downloadWarehouseReportRouter.supplierReturnReport, downloadWarehouseReportRouter.supplyToBranchReport, downloadWarehouseReportRouter.receivingFromBranchReport, downloadWarehouseReportRouter.inventoryStockReport, downloadWarehouseReportRouter.productReconciliationReport, downloadWarehouseReportRouter.analysisReport, downloadWarehouseReportRouter.accountsReport, downloadWarehouseReportRouter.dailyStockReport])
app.use('/dashboard/software-replace', [softwareReplace.productLoad])
app.use('/dashboard/inventory', [inventoryRouter.addInventoryRoute, inventoryRouter.resetInventoryRoute, inventoryRouter.adjustInventoryRoute, inventoryRouter.inventoryReconciliationRoute, inventoryRouter.inventoryViewRoute])
app.use('/dashboard/coupon_code', [couponCodeRouter.couponCodeCreateRoute, couponCodeRouter.couponCodeListRoute, couponCodeRouter.couponCodeUpdateRoute])
app.use('/dashboard/billing', [billingRouter.billingService, billingRouter.billingPayment])
app.use('/dashboard/warehouse/inventory', [warehouseInventoryRouter.addWarehouseInventoryRoute, warehouseInventoryRouter.resetWarehouseInventoryRoute, warehouseInventoryRouter.adjustWarehouseInventoryRoute, warehouseInventoryRouter.warehouseInventoryReconciliationRoute, warehouseInventoryRouter.warehouseInventoryViewRoute])
app.use('/dashboard/accounts', [accountsRouter.addBranchGeneralBookRoute, accountsRouter.manageBranchGeneralBookRoute, accountsRouter.reconcilBranchGeneralBookRoute, accountsRouter.addWarehouseGeneralBookRoute, accountsRouter.reconcilWarehouseGeneralBookRoute, accountsRouter.manageWarehouseGeneralBookRoute, accountsRouter.adjustBranchReceivingRoute, accountsRouter.adjustWarehouseReceivingRoute])

app.use('/dashboard/chart_of_accounts', [chartOfAccountsRouter.manageGroupRoute, chartOfAccountsRouter.manageSubGroupRoute, chartOfAccountsRouter.manageCategoryRoute, chartOfAccountsRouter.manageSubCategoryRoute])
app.use('/dashboard/accounts_settings', [accountsSettingsRouter.manageVoucherRoute, accountsSettingsRouter.manageCostCenterRoute, accountsSettingsRouter.manageBankRoute, accountsSettingsRouter.manageCurrencyRoute, accountsSettingsRouter.supplierOpeningBalanceRoute, accountsSettingsRouter.generalSettingsRoute])
// Redirect to 404 error page 
// app.use(function(req, res, next){
//   res.status(404);
//   const scripts = [
//     '/assets/bundles/libscripts.bundle.js',
//     '/assets/bundles/vendorscripts.bundle.js',
//     '/assets/js/auth/common.js',
//   ]
//   const styles = [
//     '/assets/css/main.css',
//     '/assets/css/authentication.css',
//     '/assets/css/color_skins.css',
//   ]

//   res.render('pages/auth/error/404', {
//     scripts: scripts,
//     styles: styles,
//     host: config.get('hostname')
//   });
// });

// catch 404 and forward to error handler
// app.use(function(req, res, next) {
//   next(createError(404));
// });



// Serve static assets in production
// if (process.env.NODE_ENV === 'production') {
//   // Set static folder
//   app.use('/', express.static(path.join(__dirname, './client/dist')))

//   app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, './client/dist', 'index.html'))
//   })
// }

// app.use('/', express.static(path.join(__dirname, './client/dist')))
app.use('/', function(req, res){
  return res.redirect('/login')
  // dbAutoBackUp()
})

// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, './client/dist', 'index.html'))
// })

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;