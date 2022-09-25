var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");
const Product = require('../../../../../models/Product');
const OrderForPos = require('../../../../../models/OrderForPos');
const PosOrderExchange = require('../../../../../models/PosOrderExchange');
const PosOrderRefund = require('../../../../../models/PosOrderRefund');

process.on('message', async (msg) => {
    let {
        from,
        to,
        reqire_quantity,
        type,
        branch,
        reportType
    } = msg

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

    let sellList = []
    let bestSaleWiseProductList = []
    let worstSaleWiseProductList = []
    let productBarcodes = []
    let reportData = []

    let totalSupplierEarnAmount = 0;
    let totalSupplierCostAmount = 0;
    let totalReqProductQuantity = 0;
    let totalSupplierQuantity = 0;
    let totalReqProductCostAmount = 0;
    let totalReqProductSellAmount = 0;

    let orderListParentArray = orderListItems.map(async (item, index) => {
        let orderListChildOneArray = item.products.map(async product => {
            if (productBarcodes.includes(product.code)) {
                sellList[productBarcodes.indexOf(product.code)].quantity += product.quantity
                sellList[productBarcodes.indexOf(product.code)].purchaseCost += (product.purchase_price * product.quantity)
                sellList[productBarcodes.indexOf(product.code)].sellCost += (product.price * product.quantity)
            } else {
                productBarcodes.push(product.code)
                sellList.push({
                    barcode: product.code,
                    name: product.name,
                    purchase_price: product.purchase_price,
                    sell_price: product.price,
                    quantity: product.quantity,
                    purchaseCost: product.purchase_price * product.quantity,
                    sellCost: product.price * product.quantity
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
                sellList[productBarcodes.indexOf(product.code)].purchaseCost += (product.purchase_price * product.quantity)
                sellList[productBarcodes.indexOf(product.code)].sellCost += (product.price * product.quantity)
            } else {
                productBarcodes.push(product.code)

                sellList.push({
                    barcode: product.code,
                    name: product.name,
                    purchase_price: product.purchase_price,
                    sell_price: product.price,
                    quantity: product.quantity,
                    purchaseCost: product.purchase_price * product.quantity,
                    sellCost: product.price * product.quantity
                })
            }

        })
        await Promise.all(exchangeListChildOneArray)

        let exchangeListChildTwoArray = item.exchangedBy.map(async product => {

            if (productBarcodes.includes(product.code)) {

                sellList[productBarcodes.indexOf(product.code)].quantity -= product.quantity
                sellList[productBarcodes.indexOf(product.code)].purchaseCost -= (product.purchase_price * product.quantity)
                sellList[productBarcodes.indexOf(product.code)].sellCost -= (product.price * product.quantity)
            } else {
                productBarcodes.push(product.code)

                sellList.push({
                    barcode: product.code,
                    name: product.name,
                    purchase_price: product.purchase_price,
                    sell_price: -product.price,
                    quantity: -product.quantity,
                    purchaseCost: -(product.purchase_price * product.quantity),
                    sellCost: -(product.price * product.quantity)
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
                sellList[productBarcodes.indexOf(product.code)].purchaseCost -= (product.purchase_price * product.quantity)
                sellList[productBarcodes.indexOf(product.code)].sellCost -= (product.price * product.quantity)
            } else {
                productBarcodes.push(product.code)

                sellList.push({
                    barcode: product.code,
                    name: product.name,
                    purchase_price: product.purchase_price,
                    sell_price: -product.price,
                    quantity: -product.quantity,
                    purchaseCost: -(product.purchase_price * product.quantity),
                    sellCost: -(product.price * product.quantity)
                })
            }

        })
        await Promise.all(refundListChildOneArray)
    })
    await Promise.all(refundListParentArray)

    if (type === 'best') {
        bestSaleWiseProductList = sellList.sort((a, b) => {
            return b.quantity - a.quantity;
        })
    } else {
        worstSaleWiseProductList = sellList.sort((a, b) => {
            return a.quantity - b.quantity;
        })
    }

    if (type == 'best') {
        let rearrangeSellListArray = bestSaleWiseProductList.map((sellInfo, index) => {

            if (index < reqire_quantity) {
                totalReqProductQuantity += sellInfo.quantity
                totalReqProductCostAmount += sellInfo.purchaseCost
                totalReqProductSellAmount += sellInfo.sellCost
            }
            totalSupplierEarnAmount += sellInfo.sellCost
            totalSupplierCostAmount += sellInfo.purchaseCost
            totalSupplierQuantity += sellInfo.quantity
            bestSaleWiseProductList[index].purchase_price = (reportType == 'pdf') ? sellInfo.purchase_price.toFixed(2) : sellInfo.purchase_price
            bestSaleWiseProductList[index].sell_price = (reportType == 'pdf') ? sellInfo.sell_price.toFixed(2) : sellInfo.sell_price
            bestSaleWiseProductList[index].quantity = (reportType == 'pdf') ? sellInfo.quantity.toFixed(2) : sellInfo.quantity
            bestSaleWiseProductList[index].purchaseCost = (reportType == 'pdf') ? sellInfo.purchaseCost.toFixed(2) : sellInfo.purchaseCost
            bestSaleWiseProductList[index].sellCost = (reportType == 'pdf') ? sellInfo.sellCost.toFixed(2) : sellInfo.sellCost
            bestSaleWiseProductList[index].gp = (reportType == 'pdf') ? ((sellInfo.sellCost > 0) ? (((sellInfo.sellCost - sellInfo.purchaseCost) / sellInfo.sellCost) * 100).toFixed(2) : '0.00') : (sellInfo.sellCost > 0) ? (((sellInfo.sellCost - sellInfo.purchaseCost) / sellInfo.sellCost) * 100).toFixed(2) : '0.00'
        })
        await Promise.all(rearrangeSellListArray)

        let rearrangeSellListArrayData = bestSaleWiseProductList.map((sellInfos, index) => {

            if (index < reqire_quantity) {
                bestSaleWiseProductList[index].percentage_in_reqQuantinty = (reportType == 'pdf') ? ((sellInfos.quantity / totalReqProductQuantity) * 100).toFixed(2) : ((sellInfos.quantity / totalReqProductQuantity) * 100),

                    bestSaleWiseProductList[index].percentage_in_supplier_quantinty = (reportType == 'pdf') ? ((sellInfos.quantity / totalSupplierQuantity) * 100).toFixed(2) : ((sellInfos.quantity / totalSupplierQuantity) * 100),

                    bestSaleWiseProductList[index].percentage_in_req_cost_amt = (reportType == 'pdf') ? ((sellInfos.purchaseCost / totalReqProductCostAmount) * 100).toFixed(2) : ((sellInfos.purchaseCost / totalReqProductCostAmount) * 100),

                    bestSaleWiseProductList[index].percentage_in_supplier_cost_amt = (reportType == 'pdf') ? ((sellInfos.purchaseCost / totalSupplierCostAmount) * 100).toFixed(2) : ((sellInfos.purchaseCost / totalSupplierCostAmount) * 100)
            }

        })
        await Promise.all(rearrangeSellListArrayData)
    } else {
        let rearrangeSellListArray = worstSaleWiseProductList.map((sellInfo, index) => {

            if (index < reqire_quantity) {
                totalReqProductQuantity += sellInfo.quantity
                totalReqProductCostAmount += sellInfo.purchaseCost
                totalReqProductSellAmount += sellInfo.sellCost
            }
            totalSupplierEarnAmount += sellInfo.sellCost
            totalSupplierCostAmount += sellInfo.purchaseCost
            totalSupplierQuantity += sellInfo.quantity
            worstSaleWiseProductList[index].purchase_price = (reportType == 'pdf') ? sellInfo.purchase_price.toFixed(2) : sellInfo.purchase_price
            worstSaleWiseProductList[index].sell_price = (reportType == 'pdf') ? sellInfo.sell_price.toFixed(2) : sellInfo.sell_price
            worstSaleWiseProductList[index].quantity = (reportType == 'pdf') ? sellInfo.quantity.toFixed(2) : sellInfo.quantity
            worstSaleWiseProductList[index].purchaseCost = (reportType == 'pdf') ? sellInfo.purchaseCost.toFixed(2) : sellInfo.purchaseCost
            worstSaleWiseProductList[index].sellCost = (reportType == 'pdf') ? sellInfo.sellCost.toFixed(2) : sellInfo.sellCost
            worstSaleWiseProductList[index].gp = (reportType == 'pdf') ? ((sellInfo.sellCost > 0) ? (((sellInfo.sellCost - sellInfo.purchaseCost) / sellInfo.sellCost) * 100).toFixed(2) : '0.00') : (sellInfo.sellCost > 0) ? (((sellInfo.sellCost - sellInfo.purchaseCost) / sellInfo.sellCost) * 100).toFixed(2) : '0.00'
        })
        await Promise.all(rearrangeSellListArray)

        let rearrangeSellListArrayData = worstSaleWiseProductList.map((sellInfos, index) => {

            if (index < reqire_quantity) {
                worstSaleWiseProductList[index].percentage_in_reqQuantinty = (reportType == 'pdf') ? ((sellInfos.quantity / totalReqProductQuantity) * 100).toFixed(2) : ((sellInfos.quantity / totalReqProductQuantity) * 100),
                    worstSaleWiseProductList[index].percentage_in_supplier_quantinty = (reportType == 'pdf') ? ((sellInfos.quantity / totalSupplierQuantity) * 100).toFixed(2) : ((sellInfos.quantity / totalSupplierQuantity) * 100),
                    worstSaleWiseProductList[index].percentage_in_req_cost_amt = (reportType == 'pdf') ? ((sellInfos.purchaseCost / totalReqProductCostAmount) * 100).toFixed(2) : ((sellInfos.purchaseCost / totalReqProductCostAmount) * 100),
                    worstSaleWiseProductList[index].percentage_in_supplier_cost_amt = (reportType == 'pdf') ? ((sellInfos.purchaseCost / totalSupplierCostAmount) * 100).toFixed(2) : ((sellInfos.purchaseCost / totalSupplierCostAmount) * 100)
            }

        })
        await Promise.all(rearrangeSellListArrayData)
    }


    let supplierProducts = await Product.find({
    }).select('barcode name price')

    let supplierAllProductArray = supplierProducts.map(productInfo => {
        if (productBarcodes.includes(productInfo.barcode) == false) {
            if (type == 'best') {
                bestSaleWiseProductList.push({
                    barcode: productInfo.barcode,
                    name: productInfo.name,
                    purchase_price: (reportType == 'pdf') ? productInfo.price.purchase.toFixed(2) : productInfo.price.purchase,
                    sell_price: (reportType == 'pdf') ? productInfo.price.sell.toFixed(2) : productInfo.price.sell,
                    quantity: '0.00',
                    purchaseCost: '0.00',
                    sellCost: '0.00',
                    gp: '0.00',
                    percentage_in_reqQuantinty: '0.00',
                    percentage_in_supplier_quantinty: '0.00',
                    percentage_in_req_cost_amt: '0.00',
                    percentage_in_supplier_cost_amt: '0.00'
                })
            } else {
                worstSaleWiseProductList.push({
                    barcode: productInfo.barcode,
                    name: productInfo.name,
                    purchase_price: (reportType == 'pdf') ? productInfo.price.purchase.toFixed(2) : productInfo.price.purchase,
                    sell_price: (reportType == 'pdf') ? productInfo.price.sell.toFixed(2) : productInfo.price.sell,
                    quantity: '0.00',
                    purchaseCost: '0.00',
                    sellCost: '0.00',
                    gp: '0.00',
                    percentage_in_reqQuantinty: '0.00',
                    percentage_in_supplier_quantinty: '0.00',
                    percentage_in_req_cost_amt: '0.00',
                    percentage_in_supplier_cost_amt: '0.00'
                })
            }

        }
    })

    await Promise.all(supplierAllProductArray)
    if (type == 'best') {
        bestSaleWiseProductList.length = reqire_quantity
        reportData = bestSaleWiseProductList.sort((a, b) => {
            return b.quantity - a.quantity;
        })
    } else {
        worstSaleWiseProductList.length = reqire_quantity
        reportData = worstSaleWiseProductList.sort((a, b) => {
            return a.quantity - b.quantity;
        })
    }

    process.send({
        reportData,
        totalReqProductQuantity,
        totalReqProductCostAmount,
        totalReqProductSellAmount,
        totalSupplierEarnAmount,
        totalSupplierQuantity,
        totalSupplierCostAmount
    });

});