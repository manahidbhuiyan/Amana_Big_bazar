var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");

const OrderForPos = require('../../../../../models/OrderForPos');

process.on('message', async (msg) => {
    let { from, to, branch, card, type } = msg

    from = new Date(from)
    to = new Date(to)

    let posOrderData = await OrderForPos.find({
        branch: branch,
        create: {
            $gte: isodate(from),
            $lte: isodate(to)
        }
    }).select('payment orderID create')

    let totalDiscountAmount = 0;
    let totalAmount = 0;
    let reportInfo = []
    let posOrderArray = posOrderData.map(async (orderInfo) => {
        let paymentArray = orderInfo.payment.map((paymentInfo) => {
            let index = ((orderInfo.create).toISOString()).indexOf("T")
            let createDate = ((orderInfo.create).toISOString()).substring(0, index)

            if (paymentInfo.discount !== 0) {
                if (card != 'all') {
                    if (paymentInfo.type == card) {
                        reportInfo.push({
                            orderNo: orderInfo.orderID,
                            cardName: paymentInfo.type,
                            date: createDate,
                            cardPayment: type == 'pdf' ? paymentInfo.amount.toFixed(2) : paymentInfo.amount,
                            cardDiscount: type == 'pdf' ? paymentInfo.discount.toFixed(2) : paymentInfo.discount
                        })
                        totalDiscountAmount += paymentInfo.discount
                        totalAmount += paymentInfo.amount
                    }
                } else {
                    reportInfo.push({
                        orderNo: orderInfo.orderID,
                        cardName: paymentInfo.type,
                        date: createDate,
                        cardPayment: type == 'pdf' ? paymentInfo.amount.toFixed(2) : paymentInfo.amount,
                        cardDiscount: type == 'pdf' ? paymentInfo.discount.toFixed(2) : paymentInfo.discount
                    })
                    totalDiscountAmount += paymentInfo.discount
                    totalAmount += paymentInfo.amount
                }
            }
        })
        await Promise.all(paymentArray)
    })
    await Promise.all(posOrderArray)


    process.send({
        reportInfo,
        totalAmount,
        totalDiscountAmount
    });

});










