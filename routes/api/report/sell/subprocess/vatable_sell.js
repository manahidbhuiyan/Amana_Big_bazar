var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
const OrderForPos = require('../../../../../models/OrderForPos');
const PosOrderExchange = require('../../../../../models/PosOrderExchange');
const PosOrderRefund = require('../../../../../models/PosOrderRefund');
var isodate = require("isodate");

process.on('message', async (msg) => {
    let { from, to, branch, type } = msg

    from = new Date(from)
    to = new Date(to)

    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    var dateRangeList = [];
    for (var d = from; d <= to; d.setDate(d.getDate() + 1)) {
        dateRangeList.push(new Date(d));
    }

    let totalVatAmount = 0
    let orderListArray = []

    let parentArray = await dateRangeList.map(async dateInfo => {
        let fromRange = dateInfo
        let toRange = new Date(dateInfo)
        toRange.setHours(toRange.getHours() + 23)
        toRange.setMinutes(toRange.getMinutes() + 59);
        toRange.setSeconds(toRange.getSeconds() + 59);


        let orderListItems = await OrderForPos.find({
            branch: branch,
            create: {
                $gte: isodate(fromRange),
                $lte: isodate(toRange)
            }
        }).select('_id orderID products total_bill vat create sub_total_bill')

        let exchangeListItems = await PosOrderExchange.find({
            branch: branch,
            create: {
                $gte: isodate(fromRange),
                $lte: isodate(toRange)
            }
        }).select('_id serialNo products total_bill exchange_amount vat exchangedBy create sub_total_bill')

        let refundListItems = await PosOrderRefund.find({
            branch: branch,
            create: {
                $gte: isodate(fromRange),
                $lte: isodate(toRange)
            }
        }).select('_id serialNo products total_bill vat create sub_total_bill')

        let salesAmount = 0
        let nonVatableSales = 0
        let vatableSales = 0
        let totalVat = 0
        let childArray = orderListItems.map(async orderInfo => {
            let gradChildArray = orderInfo.products.map(productInfo => {
                if (productInfo.vat == 0 || productInfo.vat == null) {
                    nonVatableSales += (productInfo.price * productInfo.quantity)
                } else {
                    vatableSales += (productInfo.price * productInfo.quantity)
                    totalVat += ((productInfo.price * productInfo.quantity) * (productInfo.vat / 100))
                }
                //salesAmount += (productInfo.price * productInfo.quantity)
            })

            await Promise.all(gradChildArray)

            salesAmount += orderInfo.sub_total_bill

        })

        await Promise.all(childArray)

        let childreRefundArray = refundListItems.map(async orderInfo => {
            let gradChildRefundArray = orderInfo.products.map(productInfo => {
                if (productInfo.vat == 0 || productInfo.vat == null) {
                    nonVatableSales -= (productInfo.price * productInfo.quantity)
                } else {
                    vatableSales -= (productInfo.price * productInfo.quantity)
                    totalVat -= ((productInfo.price * productInfo.quantity) * (productInfo.vat / 100))
                }
                //salesAmount -= (productInfo.price * productInfo.quantity)
            })

            await Promise.all(gradChildRefundArray)

            salesAmount -= orderInfo.sub_total_bill

        })

        await Promise.all(childreRefundArray)


        let childreExchangeArray = exchangeListItems.map(async orderInfo => {
            let gradChildExchangeArray = orderInfo.products.map(productInfo => {
                if (productInfo.vat == 0 || productInfo.vat == null) {
                    nonVatableSales += (productInfo.price * productInfo.quantity)
                } else {
                    vatableSales += (productInfo.price * productInfo.quantity)
                    totalVat += ((productInfo.price * productInfo.quantity) * (productInfo.vat / 100))
                }
                //salesAmount += (productInfo.price * productInfo.quantity)
            })

            await Promise.all(gradChildExchangeArray)

            salesAmount += orderInfo.sub_total_bill

            let gradChildExchangeTwoArray = orderInfo.exchangedBy.map(productInfo => {
                if (productInfo.vat == 0 || productInfo.vat == null) {
                    nonVatableSales -= (productInfo.price * productInfo.quantity)
                } else {
                    vatableSales -= (productInfo.price * productInfo.quantity)
                    totalVat -= ((productInfo.price * productInfo.quantity) * (productInfo.vat / 100))
                }
                salesAmount -= (productInfo.price * productInfo.quantity)
            })

            await Promise.all(gradChildExchangeTwoArray)

        })

        await Promise.all(childreExchangeArray)

        totalVatAmount += totalVat

        orderListArray.push({
            dateInfo: fromRange,
            date: ("0" + fromRange.getDate()).slice(-2) + ' ' + months[fromRange.getMonth()] + ', ' + fromRange.getUTCFullYear(),
            salesAmount: (type == 'pdf') ? (salesAmount + totalVat).toFixed(2) : (salesAmount + totalVat),
            nonVatableSales: (type == 'pdf') ? nonVatableSales.toFixed(2) : nonVatableSales,
            vatableSales: (type == 'pdf') ? (vatableSales + totalVat).toFixed(2) : (vatableSales + totalVat),
            totalVat: (type == 'pdf') ? totalVat.toFixed(2) : totalVat,
        })


    })

    await Promise.all(parentArray)

    process.send({
        orderListArray,
        totalVatAmount,
    });
});