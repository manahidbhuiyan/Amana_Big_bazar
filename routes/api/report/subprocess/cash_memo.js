var mongoConnection = require('../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");
const OrderForPos = require('../../../../models/OrderForPos');
const PosOrderExchange = require('../../../../models/PosOrderExchange');
const PosOrderRefund = require('../../../../models/PosOrderRefund');
const admin = require('../../../../models/admin/Admin');

process.on('message', async (msg) => {
    let { from, to, branch, type } = msg

    from = new Date(from)
    to = new Date(to)

    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    let orderListItems = await OrderForPos.find({
        branch: branch,
        create: {
            $gte: isodate(from),
            $lte: isodate(to)
        }
    }).populate('admin', ['name'])

    let posOrderExchange = await PosOrderExchange.find({
        branch: branch,
        create: {
            $gte: isodate(from),
            $lte: isodate(to)
        }
    }).populate('admin', ['name'])

    let posOrderRefund = await PosOrderRefund.find({
        branch: branch,
        create: {
            $gte: isodate(from),
            $lte: isodate(to)
        }
    }).populate('admin', ['name'])

    let ordersDetails = []
    let reportTotalQuantityPrice = 0
    let reportGrandTotalQuantity = 0
    let reportTotalBillGrandTotal = 0
    let reportTotalVat = 0
    let reportTotalProductDiscount = 0
    let reportTotalOtherDiscount = 0

    let orderParentArray = orderListItems.map((order, index) => {
        let productListDataList = []
        let totalQuantity = 0
        let productDiscount = 0

        order.products.map((productInfo, index) => {
            let productListData = []
            productListData[0] = productInfo.code
            productListData[1] = productInfo.name
            productListData[2] = (type == 'pdf') ? productInfo.price.toFixed(2) : productInfo.price
            productListData[3] = (type == 'pdf') ? productInfo.quantity.toFixed(2) : productInfo.quantity
            productListData[4] = (type == 'pdf') ? (productInfo.quantity * productInfo.price * (productInfo.vat / 100)).toFixed(2) + " (" + productInfo.vat + "%)" : (productInfo.quantity * productInfo.price * (productInfo.vat / 100)) + " (" + productInfo.vat + "%)"
            productListData[5] = (type == 'pdf') ? (productInfo.discount * productInfo.quantity).toFixed(2) : (productInfo.discount * productInfo.quantity)
            productListData[6] = (type == 'pdf') ? productInfo.subtotal.toFixed(2) : productInfo.subtotal
            productListDataList.push(productListData)
            totalQuantity += productInfo.quantity
            reportTotalQuantityPrice += (productInfo.quantity * productInfo.price)
            productDiscount += (productInfo.discount * productInfo.quantity)
        })

        let create = new Date(order.create)

        let orderDateFormat = new Date(order.create)
        let hours = orderDateFormat.getHours();
        let minutes = orderDateFormat.getMinutes();
        let ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        minutes = minutes < 10 ? '0' + minutes : minutes;
        let orderTime = hours + ':' + minutes + ' ' + ampm;

        ordersDetails.push({
            orderType: order.orderType,
            orderID: order.orderID,
            createDate: ("0" + create.getDate()).slice(-2) + ' ' + months[create.getMonth()] + ', ' + create.getUTCFullYear(),
            soldBy: order.admin.name,
            products: productListDataList,
            productDetails: order,
            totalBill: (type == 'pdf') ? order.total_bill.toFixed(2) : order.total_bill,
            totalQuantity: (type == 'pdf') ? totalQuantity.toFixed(2) : totalQuantity,
            totalVat: (type == 'pdf') ? order.vat.toFixed(2) : order.vat,
            Time: orderTime
        })

        reportGrandTotalQuantity += totalQuantity
        reportTotalVat += order.vat
        reportTotalProductDiscount += productDiscount
        reportTotalOtherDiscount += order.discount.others
        reportTotalBillGrandTotal += order.total_bill
        console.log("reportTotalOtherDiscount",order.discount)
    })

    await Promise.all(orderParentArray)

    let exchangeParentArray = posOrderExchange.map(async (order, index) => {
        let productListDataList = []
        let totalQuantity = 0
        let productDiscount = 0

        order.products.map((productInfo, index) => {
            let productListData = []
            productListData[0] = productInfo.code
            productListData[1] = productInfo.name
            productListData[2] = (type == 'pdf') ? productInfo.price.toFixed(2) : productInfo.price
            productListData[3] = (type == 'pdf') ? productInfo.quantity.toFixed(2) : productInfo.quantity
            productListData[4] = (type == 'pdf') ? (productInfo.quantity * productInfo.price * (productInfo.vat / 100)).toFixed(2) + " (" + productInfo.vat + "%)" : (productInfo.quantity * productInfo.price * (productInfo.vat / 100)) + " (" + productInfo.vat + "%)"
            productListData[5] = (type == 'pdf') ? (productInfo.discount * productInfo.quantity).toFixed(2) : (productInfo.discount * productInfo.quantity)
            productListData[6] = (type == 'pdf') ? productInfo.subtotal.toFixed(2) : productInfo.subtotal
            productListDataList.push(productListData)
            totalQuantity += productInfo.quantity
            reportTotalQuantityPrice += (productInfo.quantity * productInfo.price)
            productDiscount += (productInfo.discount * productInfo.quantity)
        })

        let reduceVatAmount = 0
        let reduceQuantity = 0
        let vatParentArray = order.exchangedBy.map((productInfo, index) => {
            let productListData = []
            productListData[0] = productInfo.code
            productListData[1] = productInfo.name
            productListData[2] = (type == 'pdf') ? productInfo.price.toFixed(2) : productInfo.price
            productListData[3] = (type == 'pdf') ? -(productInfo.quantity).toFixed(2) : -(productInfo.quantity)
            productListData[4] = (type == 'pdf') ? -(productInfo.quantity * productInfo.price * (productInfo.vat / 100)).toFixed(2) + " (" + productInfo.vat + "%)" : -(productInfo.quantity * productInfo.price * (productInfo.vat / 100)) + " (" + productInfo.vat + "%)"
            productListData[5] = (type == 'pdf') ? -(productInfo.discount * productInfo.quantity).toFixed(2) : -(productInfo.discount * productInfo.quantity)
            productListData[6] = (type == 'pdf') ? -productInfo.subtotal.toFixed(2) : -productInfo.subtotal
            productListDataList.push(productListData)
            productDiscount -= (productInfo.discount * productInfo.quantity)
            reduceQuantity += productInfo.quantity
            reduceVatAmount = (productInfo.price * productInfo.quantity) * (productInfo.vat / 100)
        })
        await Promise.all(vatParentArray)

        let create = new Date(order.create)


        let exchangeDateFormat = new Date(order.create)

        let hours = exchangeDateFormat.getHours();
        let minutes = exchangeDateFormat.getMinutes();
        let ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        minutes = minutes < 10 ? '0' + minutes : minutes;
        let exchangeTime = hours + ':' + minutes + ' ' + ampm;

        ordersDetails.push({
            orderType: 'exchange',
            orderID: order.serialNo,
            createDate: ("0" + create.getDate()).slice(-2) + ' ' + months[create.getMonth()] + ', ' + create.getUTCFullYear(),
            soldBy: order.admin.name,
            products: productListDataList,
            productDetails: order,
            totalBill: (type == 'pdf') ? (order.total_bill - order.exchange_amount).toFixed(2) : (order.total_bill - order.exchange_amount),
            totalQuantity: (type == 'pdf') ? (totalQuantity - reduceQuantity).toFixed(2) : (totalQuantity - reduceQuantity),
            totalVat: (type == 'pdf') ? (order.vat - reduceVatAmount).toFixed(2) : (order.vat - reduceVatAmount),
            Time: exchangeTime
        })

        reportGrandTotalQuantity += (totalQuantity - reduceQuantity)
        reportTotalVat += (order.vat - reduceVatAmount)
        reportTotalProductDiscount += productDiscount
        reportTotalOtherDiscount += order.discount.others
        reportTotalBillGrandTotal += (order.total_bill - order.exchange_amount)
    })

    await Promise.all(exchangeParentArray)

    let refundParentArray = posOrderRefund.map((order, index) => {
        let productListDataList = []
        let totalQuantity = 0
        let productDiscount = 0

        order.products.map((productInfo, index) => {
            let productListData = []
            productListData[0] = productInfo.code
            productListData[1] = productInfo.name
            productListData[2] = (type == 'pdf') ? productInfo.price.toFixed(2) : productInfo.price
            productListData[3] = (type == 'pdf') ? productInfo.quantity.toFixed(2) : productInfo.quantity
            productListData[4] = (type == 'pdf') ? (-(productInfo.quantity * productInfo.price * (productInfo.vat / 100))).toFixed(2) + " (" + productInfo.vat + "%)" : (-(productInfo.quantity * productInfo.price * (productInfo.vat / 100))) + " (" + productInfo.vat + "%)"
            productListData[5] = (type == 'pdf') ? (-(productInfo.discount * productInfo.quantity)).toFixed(2) : (-(productInfo.discount * productInfo.quantity))
            productListData[6] = (type == 'pdf') ? (-productInfo.subtotal).toFixed(2) : (-productInfo.subtotal)
            productListDataList.push(productListData)
            totalQuantity += productInfo.quantity
            reportTotalQuantityPrice += (productInfo.quantity * productInfo.price)
            productDiscount += (productInfo.discount * productInfo.quantity)
        })

        let create = new Date(order.create)
        let refundDateFormat = new Date(order.create)
        let hours = refundDateFormat.getHours();
        let minutes = refundDateFormat.getMinutes();
        let ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        minutes = minutes < 10 ? '0' + minutes : minutes;
        let refundTime = hours + ':' + minutes + ' ' + ampm;

        ordersDetails.push({
            orderType: 'refund',
            orderID: order.serialNo,
            createDate: ("0" + create.getDate()).slice(-2) + ' ' + months[create.getMonth()] + ', ' + create.getUTCFullYear(),
            soldBy: order.admin.name,
            products: productListDataList,
            productDetails: order,
            totalBill: (type == 'pdf') ? (-order.total_bill).toFixed(2) : (-order.total_bill),
            totalQuantity: (type == 'pdf') ? (-totalQuantity).toFixed(2) : (-totalQuantity),
            totalVat: (type == 'pdf') ? (-order.vat).toFixed(2) : (-order.vat),
            Time: refundTime
        })

        reportGrandTotalQuantity -= totalQuantity
        reportTotalVat -= order.vat
        reportTotalProductDiscount -= productDiscount
        reportTotalOtherDiscount -= order.discount.others
        reportTotalBillGrandTotal -= order.total_bill
    })

    await Promise.all(refundParentArray)

    if (type == 'excel') {
        let mainData = []

        ordersDetails.map((info) => {
            mainData.push({
                barcode: ' ',
                name: ' ',
                price: ' ',
                quantity: ' ',
                tax: ' ',
                productDiscount: ' ',
                total: ' '
            })
            mainData.push({
                barcode: 'Receipt No:  ' + info.orderID,
                name: 'Order Type:  ' + info.orderType,
                price: 'Date: ' + info.createDate,
                quantity: 'Time:  ' + info.Time,
                tax: 'Slip Generated By: ' + info.soldBy,
                productDiscount: ' ',
                total: ' '
            })
            mainData.push({
                barcode: ' ',
                name: ' ',
                price: ' ',
                quantity: ' ',
                tax: ' ',
                productDiscount: ' ',
                total: ' '
            })
            info.products.map((productsInfo) => {
                let dataObj = {}

                dataObj.barcode = productsInfo[0]
                dataObj.name = productsInfo[1]
                dataObj.price = productsInfo[2]
                dataObj.quantity = productsInfo[3]
                dataObj.tax = productsInfo[4]
                dataObj.productDiscount = productsInfo[5]
                dataObj.total = productsInfo[6]

                mainData.push(dataObj)

            })

            mainData.push({
                barcode: ' ',
                name: ' ',
                price: ' ',
                quantity: ' ',
                tax: ' ',
                productDiscount: ' ',
                total: ' '
            })

            mainData.push({
                barcode: 'Paid Amount: ',
                name: ' ',
                price: ' ',
                quantity: ' ',
                tax: ' ',
                productDiscount: ' ',
                total: info.totalBill
            })

            mainData.push({
                barcode: 'Receipt Date Wise Total: ',
                name: ' ',
                price: ' ',
                quantity: info.totalQuantity,
                tax: ' ',
                productDiscount: info.totalVat,
                total: info.totalBill
            })

            mainData.push({
                barcode: ' ',
                name: ' ',
                price: ' ',
                quantity: ' ',
                tax: ' ',
                productDiscount: ' ',
                total: ' '
            })
        })
        process.send({
            mainData,
            ordersDetails,
            reportGrandTotalQuantity,
            reportTotalBillGrandTotal,
            reportTotalVat,
            reportTotalProductDiscount,
            reportTotalOtherDiscount
        });
    } else {
        process.send({
            ordersDetails,
            reportGrandTotalQuantity,
            reportTotalBillGrandTotal,
            reportTotalVat,
            reportTotalProductDiscount,
            reportTotalOtherDiscount
        });
    }
});