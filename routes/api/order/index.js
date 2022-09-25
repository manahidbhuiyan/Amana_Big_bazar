const addOrder = require('./add')
const placeOrder = require('./place')
const updateOrder = require('./update')
const removeOrder = require('./remove')
const getOrder = require('./get')

module.exports={
    addOrder,
    placeOrder,
    getOrder,
    updateOrder,
    removeOrder
}