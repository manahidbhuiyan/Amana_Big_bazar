const lookupListRoute = require('./operation/lookup')
const personalDiscountRoute = require('./operation/personal_discount')
const specialDiscountRoute = require('./operation/special_discount')
const SalesPersonRoute = require('./operation/sales_person')
const deliveryChargesRoute = require('./operation/delivery_charges')

module.exports={
    lookupListRoute,
    personalDiscountRoute,
    SalesPersonRoute,
    deliveryChargesRoute,
    specialDiscountRoute
}