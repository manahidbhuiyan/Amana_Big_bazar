var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");
const OrderForPos = require('../../../../../models/OrderForPos');
const PosOrderExchange = require('../../../../../models/PosOrderExchange');
const PosOrderRefund = require('../../../../../models/PosOrderRefund');
const Category = require('../../../../../models/Category');

process.on('message', async (msg) => {
    let { from, to, branch, condition, type } = msg

    from = new Date(from)
    to = new Date(to)

    let categories = await Category.find(condition).select('_id name serialNo')

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


    let allCategoryData = []

    let totalSupplierEarnAmount = 0;
    let totalSupplierDiscountAmount = 0;
    let totalSupplierQuantity = 0;

    let suppliersParentArray = categories.map(async (category, index) => {
        let sellList = []
        let productBarcodes = []

        let categoryWiseData = {
            _id: category._id,
            serial: category.serialNo,
            name: category.name.trim(),
            products: [],
            category_sold_quantity: 0,
            category_sell_amount: 0,
            category_discount: 0
        }

        let orderListParentArray = orderListItems.map(async (item, index) => {
            let orderListChildOneArray = item.products.map(async product => {
                if (product.category.toString() == category._id.toString()) {
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
                }
            })

            await Promise.all(orderListChildOneArray)
        })

        await Promise.all(orderListParentArray)

        let exchangeListParentArray = exchangeListItems.map(async (item, index) => {
            let exchangeListChildOneArray = item.products.map(async product => {
                if (product.category.toString() == category._id.toString()) {
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
                }
            })
            await Promise.all(exchangeListChildOneArray)

            let exchangeListChildTwoArray = item.exchangedBy.map(async product => {
                if (product.category.toString() == category._id.toString()) {
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
                }
            })
            await Promise.all(exchangeListChildTwoArray)
        })

        await Promise.all(exchangeListParentArray)

        let refundListParentArray = refundListItems.map(async (item, index) => {
            let refundListChildOneArray = item.products.map(async product => {
                if (product.category.toString() == category._id.toString()) {
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
                }
            })
            await Promise.all(refundListChildOneArray)
        })
        await Promise.all(refundListParentArray)


        let rearrangeSellListArray = sellList.map((sellInfo, index) => {

            categoryWiseData.products.push([
                sellInfo.barcode,
                sellInfo.name,
                type == 'pdf' ? (sellInfo.sell_price).toFixed(2) : sellInfo.sell_price,
                type == 'pdf' ? (sellInfo.sellCost).toFixed(2) : sellInfo.sellCost,
                type == 'pdf' ? (sellInfo.quantity).toFixed(2) : sellInfo.quantity,
                type == 'pdf' ? sellInfo.discount.toFixed(2) : sellInfo.discount,
                type == 'pdf' ? sellInfo.discountAmount.toFixed(2) : sellInfo.discountAmount,
            ])

            categoryWiseData.category_sell_amount += sellInfo.sellCost
            totalSupplierEarnAmount += sellInfo.sellCost

            categoryWiseData.category_sold_quantity += sellInfo.quantity
            totalSupplierQuantity += sellInfo.quantity

            categoryWiseData.category_discount += sellInfo.discountAmount
            totalSupplierDiscountAmount += sellInfo.discountAmount

            sellList[index].sell_price = (type == 'pdf') ? (sellInfo.sell_price).toFixed(2) : sellInfo.sell_price
            sellList[index].quantity = (type == 'pdf') ? (sellInfo.quantity).toFixed(2) : sellInfo.quantity
            sellList[index].sellCost = (type == 'pdf') ? (sellInfo.sellCost).toFixed(2) : sellInfo.sellCost
        })

        await Promise.all(rearrangeSellListArray)

        categoryWiseData.category_sell_amount = (type == 'pdf') ? categoryWiseData.category_sell_amount.toFixed(2) : categoryWiseData.category_sell_amount
        categoryWiseData.category_sold_quantity = (type == 'pdf') ? categoryWiseData.category_sold_quantity.toFixed(2) : categoryWiseData.category_sold_quantity
        categoryWiseData.category_discount = (type == 'pdf') ? categoryWiseData.category_discount.toFixed(2) : categoryWiseData.category_discount

        if (categoryWiseData.products.length !== 0) {
            allCategoryData.push(categoryWiseData)
        }

    })

    await Promise.all(suppliersParentArray)

    if (type == 'excel') {
        let mainData = []

        allCategoryData.map((info) => {
            let length = info.products.length
            info.products.map((productsInfo, index) => {
                let dataObj = {}

                dataObj.barcode = productsInfo[0]
                dataObj.productName = productsInfo[1]
                dataObj.sell_price = productsInfo[2]
                dataObj.sellCost = productsInfo[3]
                dataObj.quantity = productsInfo[4]
                dataObj.discountAmount = productsInfo[6]

                if (index == 0) {
                    dataObj.category = info.name
                }

                if (index == length - 1) {
                    dataObj.subtotalQuantity = info.category_sold_quantity
                    dataObj.subtotalDiscount = info.category_discount
                    dataObj.subtotalSell = info.category_sell_amount
                }

                mainData.push(dataObj)

            })

            mainData.push({
                barcode: ' ',
                productName: ' ',
                category: ' ',
                sell_price: ' ',
                sellCost: ' ',
                quantity: ' ',
                discountAmount: ' '
            })

            mainData.push({
                barcode: 'SubTotal:  ',
                productName: ' ',
                category: ' ',
                sell_price: ' ',
                sellCost: info.category_sell_amount,
                quantity: info.category_sold_quantity,
                discountAmount: info.category_discount
            })

            mainData.push({
                barcode: ' ',
                productName: ' ',
                category: ' ',
                sell_price: ' ',
                sellCost: ' ',
                quantity: ' ',
                discountAmount: ' '
            })
        })
        process.send({
            mainData,
            totalSupplierQuantity,
            totalSupplierDiscountAmount,
            totalSupplierEarnAmount
        });
    } else {
        process.send({
            allCategoryData,
            totalSupplierQuantity,
            totalSupplierDiscountAmount,
            totalSupplierEarnAmount
        });
    }
});