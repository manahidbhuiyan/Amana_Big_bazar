var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");
const Product = require('../../../../../models/Product');
const Category = require('../../../../../models/Category');
const OrderForPos = require('../../../../../models/OrderForPos');
const PosOrderExchange = require('../../../../../models/PosOrderExchange');
const PosOrderRefund = require('../../../../../models/PosOrderRefund');

process.on('message', async (msg) => {
    const { from, to, currentDate, branch, condition, type } = msg

    let suppliers = await Category.find(condition).select('_id serialNo name')

    let productFindCondition = {
        branch: branch,
    }

    let ProductList = await Product.find(productFindCondition)

    let orderListItems_prev = await OrderForPos.find({
        branch: branch,
        create: {
            $gte: isodate(from),
            $lte: isodate(currentDate)
        }
    })

    let exchangeListItems_prev = await PosOrderExchange.find({
        branch: branch,
        create: {
            $gte: isodate(from),
            $lte: isodate(currentDate)
        }
    })

    let refundListItems_prev = await PosOrderRefund.find({
        branch: branch,
        create: {
            $gte: isodate(from),
            $lte: isodate(currentDate)
        }
    })

    let refundListItems = await PosOrderRefund.find({
        branch: branch,
        create: {
            $gte: isodate(to),
            $lte: isodate(currentDate)
        }
    })


    let orderListItems = await OrderForPos.find({
        branch: branch,
        create: {
            $gte: isodate(to),
            $lte: isodate(currentDate)
        }
    })

    let exchangeListItems = await PosOrderExchange.find({
        branch: branch,
        create: {
            $gte: isodate(to),
            $lte: isodate(currentDate)
        }
    })

    let totalOverStock = 0;
    let totalStock = 0;
    let totalStock_prev = 0;
    let totalSoldQuantity = 0;
    let allCategoryData = []

    let mainSupplierArray = suppliers.map(async (category, index) => {

        let categoryWiseData = {
            _id: category._id,
            serial: category.serialNo,
            name: category.name.trim(),
            products: [],
            category_Sold_quantity: 0,
            category_Stock: 0,
            category_Stock_prev: 0,
            category_over_Stock: 0
        }


        let childArrayList = ProductList.map(async (productInfo, index) => {
            if (productInfo.category.toString() == category._id.toString()) {
                let orderQty_prev = 0;
                let exchangeQty_prev = 0;
                let exchangedByQty_prev = 0;
                let refundQty_prev = 0;
                let soldQty_prev = 0;
                let stock_prev = 0;

                let orderQty = 0;
                let exchangeQty = 0;
                let exchangedByQty = 0;
                let refundQty = 0;
                let soldQty = 0;
                let stock = 0;

                //to find sold quantity from date to current date
                let fromOrderListParentArray = orderListItems_prev.map(async (item, index) => {
                    let fromOrderListChildOneArray = item.products.map(async product => {
                        if (product.code == productInfo.barcode) {

                            orderQty_prev += product.quantity
                        }
                    })

                    await Promise.all(fromOrderListChildOneArray)
                })
                await Promise.all(fromOrderListParentArray)

                let fromExchangeListParentArray = exchangeListItems_prev.map(async (item, index) => {
                    let fromExchangeListChildOneArray = item.products.map(async product => {
                        if (product.code == productInfo.barcode) {

                            exchangeQty_prev += product.quantity
                        }
                    })
                    await Promise.all(fromExchangeListChildOneArray)

                    let fromExchangeListChildTwoArray = item.exchangedBy.map(async product => {
                        if (product.code == productInfo.barcode) {

                            exchangedByQty_prev += product.quantity
                        }
                    })
                    await Promise.all(fromExchangeListChildTwoArray)
                })

                await Promise.all(fromExchangeListParentArray)


                let fromRefundListParentArray = refundListItems_prev.map(async (item, index) => {
                    let fromRefundListChildOneArray = item.products.map(async product => {
                        if (product.code == productInfo.barcode) {

                            refundQty_prev += product.quantity
                        }
                    })
                    await Promise.all(fromRefundListChildOneArray)
                })
                await Promise.all(fromRefundListParentArray)

                soldQty_prev = ((orderQty_prev + exchangeQty_prev) - (exchangedByQty_prev + refundQty_prev))
                stock_prev = (productInfo.quantity + soldQty_prev)


                //to find sold quantity last(to) date to current date

                let orderListParentArray = orderListItems.map(async (item, index) => {
                    let orderListChildOneArray = item.products.map(async product => {
                        if (product.code == productInfo.barcode) {

                            orderQty += product.quantity
                        }
                    })

                    await Promise.all(orderListChildOneArray)
                })
                await Promise.all(orderListParentArray)

                let exchangeListParentArray = exchangeListItems.map(async (item, index) => {
                    let exchangeListChildOneArray = item.products.map(async product => {
                        if (product.code == productInfo.barcode) {

                            exchangeQty += product.quantity
                        }
                    })
                    await Promise.all(exchangeListChildOneArray)

                    let exchangeListChildTwoArray = item.exchangedBy.map(async product => {
                        if (product.code == productInfo.barcode) {

                            exchangedByQty += product.quantity
                        }
                    })
                    await Promise.all(exchangeListChildTwoArray)
                })

                await Promise.all(exchangeListParentArray)


                let refundListParentArray = refundListItems.map(async (item, index) => {
                    let refundListChildOneArray = item.products.map(async product => {
                        if (product.code == productInfo.barcode) {

                            refundQty += product.quantity
                        }
                    })
                    await Promise.all(refundListChildOneArray)
                })
                await Promise.all(refundListParentArray)

                soldQty = ((orderQty + exchangeQty) - (exchangedByQty + refundQty))
                stock = (productInfo.quantity + soldQty)


                if (((stock_prev / 2) > (stock_prev - stock))) {
                    let over_stock = ((Math.floor(stock_prev / 2) + 1) - (stock_prev - stock))
                    categoryWiseData.products.push([
                        productInfo.barcode,
                        productInfo.name,
                        (type == 'pdf') ? (productInfo.price.purchase).toFixed(2) : (productInfo.price.purchase),
                        (type == 'pdf') ? (productInfo.price.sell).toFixed(2) : (productInfo.price.sell),
                        (type == 'pdf') ? (stock_prev - stock).toFixed(2) : (stock_prev - stock),
                        (type == 'pdf') ? stock_prev.toFixed(2) : stock_prev,
                        (type == 'pdf') ? stock.toFixed(2) : stock,
                        (type == 'pdf') ? over_stock.toFixed(2) : over_stock
                    ])
                    categoryWiseData.serial = productInfo.serialNo

                    categoryWiseData.category_Sold_quantity += (stock_prev - stock)
                    totalSoldQuantity += (stock_prev - stock)

                    categoryWiseData.category_Stock += stock
                    totalStock += stock

                    categoryWiseData.category_Stock_prev += stock_prev
                    totalStock_prev += stock_prev

                    categoryWiseData.category_over_Stock += over_stock
                    totalOverStock += over_stock
                }

            }

        })

        await Promise.all(childArrayList)

        categoryWiseData.category_Sold_quantity = (type == 'pdf') ? categoryWiseData.category_Sold_quantity.toFixed(2) : categoryWiseData.category_Sold_quantity
        categoryWiseData.category_Stock = (type == 'pdf') ? categoryWiseData.category_Stock.toFixed(2) : categoryWiseData.category_Stock
        categoryWiseData.category_over_Stock = (type == 'pdf') ? categoryWiseData.category_over_Stock.toFixed(2) : categoryWiseData.category_over_Stock
        categoryWiseData.category_Stock_prev = (type == 'pdf') ? categoryWiseData.category_Stock_prev.toFixed(2) : categoryWiseData.category_Stock_prev

        allCategoryData.push(categoryWiseData)
    })

    await Promise.all(mainSupplierArray)

    allCategoryData = allCategoryData.filter((object) => object.products.length !== 0)

    if (type == 'excel') {
        let mainData = []

        allCategoryData.map((info) => {
            info.products.map((productsInfo, index) => {
                let dataObj = {}

                dataObj.barcode = productsInfo[0]
                dataObj.productName = productsInfo[1]
                dataObj.unitCost = productsInfo[2]
                dataObj.unitSell = productsInfo[3]
                dataObj.soldQuantity = productsInfo[4]
                dataObj.fromDateStock = productsInfo[5]
                dataObj.toDateStock = productsInfo[6]
                dataObj.overStock = productsInfo[7]

                if (index == 0) {
                    dataObj.supplier = info.name
                }
                mainData.push(dataObj)

            })

            mainData.push({
                supplier: ' ',
                barcode: ' ',
                productName: ' ',
                unitCost: ' ',
                unitSell: ' ',
                soldQuantity: ' ',
                fromDateStock: ' ',
                toDateStock: ' ',
                overStock: ' '
            })

            mainData.push({
                supplier: 'Subtotal: ',
                barcode: ' ',
                productName: ' ',
                unitCost: ' ',
                unitSell: ' ',
                soldQuantity: info.category_Sold_quantity,
                fromDateStock: info.category_Stock_prev,
                toDateStock: info.category_Stock,
                overStock: info.category_over_Stock
            })

            mainData.push({
                supplier: ' ',
                barcode: ' ',
                productName: ' ',
                unitCost: ' ',
                unitSell: ' ',
                soldQuantity: ' ',
                fromDateStock: ' ',
                toDateStock: ' ',
                overStock: ' '
            })
        })
        process.send({
            mainData,
            totalOverStock,
            totalStock,
            totalSoldQuantity,
            totalStock_prev
        });
    } else {
        process.send({
            allCategoryData,
            totalOverStock,
            totalStock,
            totalSoldQuantity,
            totalStock_prev
        });
    }
});