var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
const OrderForPos = require('../../../../../models/OrderForPos');
const PosOrderExchange = require('../../../../../models/PosOrderExchange');
const PosOrderRefund = require('../../../../../models/PosOrderRefund');
const Supplier = require('../../../../../models/Supplier');
const Product = require('../../../../../models/Product');
var isodate = require("isodate");

process.on('message', async (msg) => {
    let { from, to, branch, supplier, type } = msg

    from = new Date(from)
    to = new Date(to)

    let suppliers = await Supplier.find({
        _id: supplier,
        branch: {
            $in: branch
        }
    }).select('_id name serialNo')

    let orderListItems = await OrderForPos.find({
        branch: branch,
        "products.supplier": supplier,
        create: {
            $gte: isodate(from),
            $lte: isodate(to)
        }
    }).populate('products.product', 'name price')

    let exchangeListItems = await PosOrderExchange.find({
        branch: branch,
        $or: [{ 'products.supplier': supplier }, { 'exchangedBy.supplier': supplier }],
        create: {
            $gte: isodate(from),
            $lte: isodate(to)
        }
    }).populate('products.product', 'name price').populate('exchangedBy.product', 'name price')

    let refundListItems = await PosOrderRefund.find({
        branch: branch,
        "products.supplier": supplier,
        create: {
            $gte: isodate(from),
            $lte: isodate(to)
        }
    }).populate('products.product', 'name price')

    let sellList = []

    let productBarcodes = []


    let totalSupplierEarnAmount = 0;
    let totalSupplierCostAmount = 0;
    let totalSupplierQuantity = 0;

    let suppliersParentArray = suppliers.map(async (category, index) => {
        let orderListParentArray = orderListItems.map(async (item, index) => {
            let orderListChildOneArray = item.products.map(async product => {
                if (product.supplier.toString() == category._id.toString()) {
                    if (productBarcodes.includes(product.code)) {
                        sellList[productBarcodes.indexOf(product.code)].quantity += product.quantity
                        sellList[productBarcodes.indexOf(product.code)].purchaseCost += (product.product.price.purchase * product.quantity)
                        sellList[productBarcodes.indexOf(product.code)].sellCost += (product.product.price.sell * product.quantity)
                    } else {
                        productBarcodes.push(product.code)
                        sellList.push({
                            barcode: product.code,
                            name: product.name,
                            purchase_price: product.product.price.purchase,
                            sell_price: product.product.price.sell,
                            quantity: product.quantity,
                            purchaseCost: product.product.price.purchase * product.quantity,
                            sellCost: product.product.price.sell * product.quantity
                        })
                    }
                }
            })

            await Promise.all(orderListChildOneArray)
        })

        await Promise.all(orderListParentArray)

        let exchangeListParentArray = exchangeListItems.map(async (item, index) => {
            let exchangeListChildOneArray = item.products.map(async product => {
                if (product.supplier.toString() == category._id.toString()) {
                    if (productBarcodes.includes(product.code)) {
                        sellList[productBarcodes.indexOf(product.code)].quantity += product.quantity
                        sellList[productBarcodes.indexOf(product.code)].purchaseCost += (product.product.price.purchase * product.quantity)
                        sellList[productBarcodes.indexOf(product.code)].sellCost += (product.product.price.sell * product.quantity)
                    } else {
                        productBarcodes.push(product.code)
                        sellList.push({
                            barcode: product.code,
                            name: product.name,
                            purchase_price: product.product.price.purchase,
                            sell_price: product.product.price.sell,
                            quantity: product.quantity,
                            purchaseCost: product.product.price.purchase * product.quantity,
                            sellCost: product.product.price.sell * product.quantity
                        })
                    }
                }
            })
            await Promise.all(exchangeListChildOneArray)

            let exchangeListChildTwoArray = item.exchangedBy.map(async product => {
                if (product.supplier.toString() == category._id.toString()) {
                    if (productBarcodes.includes(product.code)) {
                        sellList[productBarcodes.indexOf(product.code)].quantity -= product.quantity
                        sellList[productBarcodes.indexOf(product.code)].purchaseCost -= (product.product.price.purchase * product.quantity)
                        sellList[productBarcodes.indexOf(product.code)].sellCost -= (product.product.price.sell * product.quantity)
                    } else {
                        productBarcodes.push(product.code)
                        sellList.push({
                            barcode: product.code,
                            name: product.name,
                            purchase_price: product.product.price.purchase,
                            sell_price: -product.product.price.sell,
                            quantity: -product.quantity,
                            purchaseCost: -(product.product.price.purchase * product.quantity),
                            sellCost: -(product.product.price.sell * product.quantity)
                        })
                    }
                }
            })
            await Promise.all(exchangeListChildTwoArray)
        })

        await Promise.all(exchangeListParentArray)

        let refundListParentArray = refundListItems.map(async (item, index) => {
            let refundListChildOneArray = item.products.map(async product => {
                if (product.supplier.toString() == category._id.toString()) {
                    if (productBarcodes.includes(product.code)) {
                        sellList[productBarcodes.indexOf(product.code)].quantity -= product.quantity
                        sellList[productBarcodes.indexOf(product.code)].purchaseCost -= (product.product.price.purchase * product.quantity)
                        sellList[productBarcodes.indexOf(product.code)].sellCost -= (product.product.price.sell * product.quantity)
                    } else {
                        productBarcodes.push(product.code)
                        sellList.push({
                            barcode: product.code,
                            name: product.name,
                            purchase_price: product.product.price.purchase,
                            sell_price: -product.product.price.sell,
                            quantity: -product.quantity,
                            purchaseCost: -(product.product.price.purchase * product.quantity),
                            sellCost: -(product.product.price.sell * product.quantity)
                        })
                    }
                }
            })
            await Promise.all(refundListChildOneArray)
        })
        await Promise.all(refundListParentArray)

        let rearrangeSellListArray = sellList.map((sellInfo, index) => {
            totalSupplierEarnAmount += sellInfo.sellCost
            totalSupplierCostAmount += sellInfo.purchaseCost
            totalSupplierQuantity += sellInfo.quantity
            sellList[index].purchase_price = (type == 'pdf') ? sellInfo.purchase_price.toFixed(2) : sellInfo.purchase_price
            sellList[index].sell_price = (type == 'pdf') ? sellInfo.sell_price.toFixed(2) : sellInfo.sell_price
            sellList[index].quantity = (type == 'pdf') ? sellInfo.quantity.toFixed(2) : sellInfo.quantity
            sellList[index].purchaseCost = (type == 'pdf') ? sellInfo.purchaseCost.toFixed(2) : sellInfo.purchaseCost
            sellList[index].sellCost = (type == 'pdf') ? sellInfo.sellCost.toFixed(2) : sellInfo.sellCost
        })

        await Promise.all(rearrangeSellListArray)
    })

    await Promise.all(suppliersParentArray)

    let supplierProducts = await Product.find({
        branch: branch,
        supplier
    }).select('barcode name price')

    let supplierAllProductArray = supplierProducts.map(productInfo => {
        if (productBarcodes.includes(productInfo.barcode) == false) {
            sellList.push({
                barcode: productInfo.barcode,
                name: productInfo.name,
                purchase_price: (type == 'pdf') ? productInfo.price.purchase.toFixed(2) : productInfo.price.purchase,
                sell_price: (type == 'pdf') ? productInfo.price.sell.toFixed(2) : productInfo.price.sell,
                quantity: '0.00',
                purchaseCost: '0.00',
                sellCost: '0.00'
            })
        }
    })

    await Promise.all(supplierAllProductArray)

    process.send({
        sellList,
        totalSupplierQuantity,
        totalSupplierCostAmount,
        totalSupplierEarnAmount,
        suppliers
    });
});