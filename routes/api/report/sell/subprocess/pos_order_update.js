var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");
const PosOrderExchange = require('../../../../../models/PosOrderExchange');
const PosOrderRefund = require('../../../../../models/PosOrderRefund');
const Admin = require('../../../../../models/admin/Admin');

process.on('message', async (msg) => {
    let { from, to, branch, type, reportType } = msg

    from = new Date(from)
    to = new Date(to)

    const adminDetails = await Admin.find({
        branches: {
            $in: branch
        }
    }).select("_id name email")

    let orderListItems = []

    if (type == "exchange") {
        orderListItems = await PosOrderExchange.find({
            branch: branch,
            create: {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        }).select('_id serialNo products exchangedBy total_bill discount vat exchange_amount create').populate('admin', 'name')
    } else {
        orderListItems = await PosOrderRefund.find({
            branch: branch,
            create: {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        }).select('_id serialNo products total_bill discount vat create').populate('admin', 'name')
    }



    let grandTotalQuantity = 0
    let grandTotalAmount = 0
    let exchangedByGrandTotalQuantity = 0
    let exchangedByGrandTotalAmount = 0

    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    let reportData = []

    let parentArray = await orderListItems.map(async (orderInfo, index) => {
        let updateDate = new Date(orderInfo.create)

        let productData = []
        let exchangedByProductData = []
        let totalQuantity = 0
        let totalAmount = 0
        let exchangedByTotalQuantity = 0
        let exchangedByTotalAmount = 0

        let childArray = orderInfo.products.map(productInfo => {
            totalQuantity += productInfo.quantity
            totalAmount += (productInfo.quantity * productInfo.price)
            productData.push([productInfo.code, productInfo.name, (reportType == 'pdf') ? productInfo.price.toFixed(2) : productInfo.price, (reportType == 'pdf') ? productInfo.quantity.toFixed(2) : productInfo.quantity, (reportType == 'pdf') ? (productInfo.price * productInfo.quantity).toFixed(2) : (productInfo.price * productInfo.quantity)])
        })



        await Promise.all(childArray)

        if (type == "exchange") {
            let childArrayTwo = orderInfo.exchangedBy.map(exchangedProduct => {
                exchangedByTotalQuantity += exchangedProduct.quantity
                exchangedByTotalAmount += (exchangedProduct.quantity * exchangedProduct.price)
                exchangedByProductData.push([exchangedProduct.code, exchangedProduct.name, (reportType == 'pdf') ? exchangedProduct.price.toFixed(2) : exchangedProduct.price, (reportType == 'pdf') ? exchangedProduct.quantity.toFixed(2) : exchangedProduct.quantity, (reportType == 'pdf') ? (exchangedProduct.price * exchangedProduct.quantity).toFixed(2) : (exchangedProduct.price * exchangedProduct.quantity)])
            })

            await Promise.all(childArrayTwo)
        }




        grandTotalQuantity += totalQuantity
        exchangedByGrandTotalQuantity += exchangedByTotalQuantity
        if (type == "exchange") {
            grandTotalAmount += (orderInfo.total_bill - orderInfo.exchange_amount)
            exchangedByGrandTotalAmount += exchangedByTotalAmount
        } else {
            grandTotalAmount += (orderInfo.total_bill)
        }

        if (productData.length > 0) {
            let data = {
                orderID: orderInfo.serialNo,
                admin: orderInfo.admin.name,
                date: ("0" + updateDate.getDate()).slice(-2) + ' ' + months[updateDate.getMonth()] + ', ' + updateDate.getUTCFullYear(),
                products: productData,
                exchangedByProducts: exchangedByProductData,
                subtotal: (reportType == 'pdf') ? totalAmount.toFixed(2) : totalAmount,
                vat: (reportType == 'pdf') ? orderInfo.vat.toFixed(2) : orderInfo.vat,
                discount: (reportType == 'pdf') ? (orderInfo.discount.product + orderInfo.discount.others).toFixed(2) : (orderInfo.discount.product + orderInfo.discount.others),
                totalQuantity: (reportType == 'pdf') ? totalQuantity.toFixed(2) : totalQuantity,
                totalAmount: (reportType == 'pdf') ? orderInfo.total_bill.toFixed(2) : orderInfo.total_bill,
                exchangedByTotalQuantity: (reportType == 'pdf') ? exchangedByTotalQuantity.toFixed(2) : exchangedByTotalQuantity,
                exchangedByTotalAmount: (reportType == 'pdf') ? exchangedByTotalAmount.toFixed(2) : exchangedByTotalAmount,
            }

            if (type == "exchange") {
                data.exchange = true
                data.exchangeAmount = (reportType == 'pdf') ? orderInfo.exchange_amount.toFixed(2) : orderInfo.exchange_amount
                data.paidAmount = (reportType == 'pdf') ? (orderInfo.total_bill - orderInfo.exchange_amount).toFixed(2) : (orderInfo.total_bill - orderInfo.exchange_amount)
            } else {
                data.exchange = false
            }

            reportData.push(data)
        }

    })

    await Promise.all(parentArray)

    if (reportType == 'excel') {
        let mainData = []

        if (type == 'exchange') {
            reportData.map((info) => {

                mainData.push({
                    barcode: ' ',
                    name: ' ',
                    costPrice: ' ',
                    quantity: ' ',
                    amount: ' '
                })
                mainData.push({
                    barcode: 'Receipt No: ' + info.orderID,
                    name: ' ',
                    costPrice: 'User Name: ' + info.admin,
                    quantity: ' ',
                    amount: 'Date: ' + info.date
                })

                mainData.push({
                    barcode: ' ',
                    name: ' ',
                    costPrice: ' ',
                    quantity: ' ',
                    amount: ' '
                })

                mainData.push({
                    barcode: 'Exchanged Product Details: ',
                    name: ' ',
                    costPrice: ' ',
                    quantity: ' ',
                    amount: ' '
                })

                info.products.map((productsInfo, index) => {
                    let dataObj = {}
                    dataObj.barcode = productsInfo[0]
                    dataObj.name = productsInfo[1]
                    dataObj.costPrice = productsInfo[2]
                    dataObj.quantity = productsInfo[3]
                    dataObj.amount = productsInfo[4]


                    mainData.push(dataObj)
                })

                mainData.push({
                    barcode: ' ',
                    name: ' ',
                    costPrice: ' ',
                    quantity: ' ',
                    amount: ' '
                })

                mainData.push({
                    barcode: 'vat: ' + info.vat,
                    name: ' ',
                    costPrice: '-Discount: ' + info.discount,
                    quantity: ' ',
                    amount: 'Subtotal: ' + info.subtotal
                })
                mainData.push({
                    barcode: '-Exchange Amount : ',
                    name: ' ',
                    costPrice: ' ',
                    quantity: ' ',
                    amount: info.exchangeAmount
                })
                mainData.push({
                    barcode: 'Paid Amount : ',
                    name: ' ',
                    costPrice: ' ',
                    quantity: info.totalQuantity,
                    amount: info.totalAmount
                })
                mainData.push({
                    barcode: ' ',
                    name: ' ',
                    costPrice: ' ',
                    quantity: ' ',
                    amount: ' '
                })
                mainData.push({
                    barcode: 'Exchanged By Product Details: ',
                    name: ' ',
                    costPrice: ' ',
                    quantity: ' ',
                    amount: ' '
                })

                info.exchangedByProducts.map((productsInfo, index) => {
                    let dataObj = {}
                    dataObj.barcode = productsInfo[0]
                    dataObj.name = productsInfo[1]
                    dataObj.costPrice = productsInfo[2]
                    dataObj.quantity = productsInfo[3]
                    dataObj.amount = productsInfo[4]

                    mainData.push(dataObj)
                })

                mainData.push({
                    barcode: ' ',
                    name: ' ',
                    costPrice: ' ',
                    quantity: ' ',
                    amount: ' '
                })
                mainData.push({
                    barcode: 'Total: ',
                    name: ' ',
                    costPrice: ' ',
                    quantity: info.exchangedByTotalQuantity,
                    amount: info.exchangedByTotalAmount
                })
            })
        } else {
            reportData.map((info) => {

                mainData.push({
                    barcode: ' ',
                    name: ' ',
                    costPrice: ' ',
                    quantity: ' ',
                    amount: ' '
                })
                mainData.push({
                    barcode: 'Receipt No: ' + info.orderID,
                    name: ' ',
                    costPrice: 'User Name: ' + info.admin,
                    quantity: ' ',
                    amount: 'Date: ' + info.date
                })

                mainData.push({
                    barcode: ' ',
                    name: ' ',
                    costPrice: ' ',
                    quantity: ' ',
                    amount: ' '
                })

                mainData.push({
                    barcode: 'Refund Product Details: ',
                    name: ' ',
                    costPrice: ' ',
                    quantity: ' ',
                    amount: ' '
                })

                info.products.map((productsInfo, index) => {
                    let dataObj = {}

                    dataObj.barcode = productsInfo[0]
                    dataObj.name = productsInfo[1]
                    dataObj.costPrice = productsInfo[2]
                    dataObj.quantity = productsInfo[3]
                    dataObj.amount = productsInfo[4]

                    mainData.push(dataObj)

                })
                mainData.push({
                    barcode: ' ',
                    name: ' ',
                    costPrice: ' ',
                    quantity: ' ',
                    amount: ' '
                })
                mainData.push({
                    barcode: 'vat: ' + info.vat,
                    name: ' ',
                    costPrice: '-Discount: ' + info.discount,
                    quantity: ' ',
                    amount: 'Subtotal: ' + info.subtotal
                })
                mainData.push({
                    barcode: 'Paid Amount : ',
                    name: ' ',
                    costPrice: ' ',
                    quantity: info.totalQuantity,
                    amount: info.totalAmount
                })

            })
        }
        process.send({
            mainData,
            grandTotalQuantity,
            grandTotalAmount,
            exchangedByGrandTotalQuantity,
            exchangedByGrandTotalAmount
        });
    } else {
        process.send({
            reportData,
            grandTotalQuantity,
            grandTotalAmount,
            exchangedByGrandTotalQuantity,
            exchangedByGrandTotalAmount
        });
    }
});