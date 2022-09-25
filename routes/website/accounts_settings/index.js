const manageVoucherRoute = require('./operation/manage_voucher')
const manageCostCenterRoute = require('./operation/manage_cost_center')
const manageBankRoute = require('./operation/manage_bank')
const manageCurrencyRoute = require('./operation/manage_currency')
const supplierOpeningBalanceRoute = require('./operation/supplier_opening_balance')
const generalSettingsRoute = require('./operation/general_settings')

module.exports = {
    manageVoucherRoute,
    manageCostCenterRoute,
    manageBankRoute,
    manageCurrencyRoute,
    supplierOpeningBalanceRoute,
    generalSettingsRoute
}