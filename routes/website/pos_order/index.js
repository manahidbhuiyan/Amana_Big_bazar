const addOrderRoute = require('./operation/add')
const orderListRoute = require('./operation/home')
const orderEditRoute = require('./operation/edit')
const exchangeRoute = require('./operation/exchange')
const refundRoute = require('./operation/refund')
const orderInvoiceRoute = require('./operation/invoice')
const exchangeListRoute = require('./operation/exchanges_list')
const exchangeOfExchange = require('./operation/exchangeOfexchange')
const refundOfExchange = require('./operation/refundOfexchange')
const refundListRoute = require('./operation/refunds_list')
const exchangeEditRoute = require('./operation/exchanges_edit')

module.exports = {
    addOrderRoute,
    orderListRoute,
    orderEditRoute,
    orderInvoiceRoute,
    exchangeRoute,
    refundRoute,
	exchangeListRoute,
    refundListRoute,
    exchangeOfExchange,
    refundOfExchange,
    exchangeEditRoute 
}