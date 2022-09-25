var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");

const OrderForPos = require('../../../../../models/OrderForPos');
const PosOrderExchange = require('../../../../../models/PosOrderExchange');
const PosOrderRefund = require('../../../../../models/PosOrderRefund');

process.on('message', async (msg) => {
    let { from, to, branch, type } = msg

    from = new Date(from)
    to = new Date(to)

    let orderListItems = await OrderForPos.find({
        branch: branch,
        create: {
            $gte: isodate(from),
            $lte: isodate(to)
        }
    })

    let exchangeListItems = await PosOrderExchange.find({
        branch: branch,
        create: {
            $gte: isodate(from),
            $lte: isodate(to)
        }
    })

    let refundListItems = await PosOrderRefund.find({
        branch: branch,
        create: {
            $gte: isodate(from),
            $lte: isodate(to)
        }
    })


    let productBarcodes = []

    let totalSupplierEarnAmount = 0;
    let totalSupplierDiscountAmount = 0;
    let totalSupplierQuantity = 0;

    let sellList = []

    let orderListParentArray = orderListItems.map(async (item, index) => {
        let orderListChildOneArray = item.products.map(async product => {

            if (productBarcodes.includes(product.code)) {
                sellList[productBarcodes.indexOf(product.code)].quantity += product.quantity
                sellList[productBarcodes.indexOf(product.code)].sellCost += (product.price * product.quantity)
                sellList[productBarcodes.indexOf(product.code)].discountAmount += (product.discount * product.quantity)
            } else {
                productBarcodes.push(product.code)
                sellList.push({
                    barcode: product.code,
                    name: product.name,
                    sell_price: product.price,
                    quantity: product.quantity,
                    sellCost: product.price * product.quantity,
                    discount: product.discount,
                    discountAmount: product.discount * product.quantity
                })
            }

        })

        await Promise.all(orderListChildOneArray)
    })

    await Promise.all(orderListParentArray)

    let exchangeListParentArray = exchangeListItems.map(async (item, index) => {
        let exchangeListChildOneArray = item.products.map(async product => {

            if (productBarcodes.includes(product.code)) {
                sellList[productBarcodes.indexOf(product.code)].quantity += product.quantity
                sellList[productBarcodes.indexOf(product.code)].discountAmount += (product.discount * product.quantity)
                sellList[productBarcodes.indexOf(product.code)].sellCost += (product.price * product.quantity)
            } else {
                productBarcodes.push(product.code)
                sellList.push({
                    barcode: product.code,
                    name: product.name,
                    sell_price: product.price,
                    quantity: product.quantity,
                    sellCost: product.price * product.quantity,
                    discount: product.discount,
                    discountAmount: product.discount * product.quantity
                })
            }

        })
        await Promise.all(exchangeListChildOneArray)

        let exchangeListChildTwoArray = item.exchangedBy.map(async product => {

            if (productBarcodes.includes(product.code)) {
                sellList[productBarcodes.indexOf(product.code)].quantity -= product.quantity
                sellList[productBarcodes.indexOf(product.code)].discountAmount -= (product.discount * product.quantity)
                sellList[productBarcodes.indexOf(product.code)].sellCost -= (product.price * product.quantity)
            } else {
                productBarcodes.push(product.code)
                sellList.push({
                    barcode: product.code,
                    name: product.name,
                    sell_price: -product.price,
                    quantity: -product.quantity,
                    sellCost: -(product.price * product.quantity),
                    discount: -product.discount,
                    discountAmount: -(product.discount * product.quantity)
                })
            }

        })
        await Promise.all(exchangeListChildTwoArray)
    })

    await Promise.all(exchangeListParentArray)

    let refundListParentArray = refundListItems.map(async (item, index) => {
        let refundListChildOneArray = item.products.map(async product => {

            if (productBarcodes.includes(product.code)) {
                sellList[productBarcodes.indexOf(product.code)].quantity -= product.quantity
                sellList[productBarcodes.indexOf(product.code)].discountAmount -= (product.discount * product.quantity)
                sellList[productBarcodes.indexOf(product.code)].sellCost -= (product.price * product.quantity)
            } else {
                productBarcodes.push(product.code)
                sellList.push({
                    barcode: product.code,
                    name: product.name,
                    sell_price: -product.price,
                    quantity: -product.quantity,
                    discount: -product.discount,
                    discountAmount: -(product.discount * product.quantity)
                })
            }

        })
        await Promise.all(refundListChildOneArray)
    })
    await Promise.all(refundListParentArray)


    let rearrangeSellListArray = sellList.map((sellInfo, index) => {

        totalSupplierEarnAmount += sellInfo.sellCost
        totalSupplierQuantity += sellInfo.quantity
        totalSupplierDiscountAmount += sellInfo.discountAmount

        sellList[index].sell_price = (type == 'pdf') ? (sellInfo.sell_price).toFixed(2) : sellInfo.sell_price
        sellList[index].quantity = (type == 'pdf') ? (sellInfo.quantity).toFixed(2) : sellInfo.quantity
        sellList[index].sellCost = (type == 'pdf') ? (sellInfo.sellCost).toFixed(2) : sellInfo.sellCost
        sellList[index].discountAmount = (type == 'pdf') ? (sellInfo.discountAmount).toFixed(2) : sellInfo.discountAmount
    })

    await Promise.all(rearrangeSellListArray)

    sellList = sellList.filter((data) => data.discountAmount !== 0)

    process.send({
        sellList,
        totalSupplierQuantity,
        totalSupplierDiscountAmount,
        totalSupplierEarnAmount
    });

});










