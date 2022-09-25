var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");

const OrderForPos = require('../../../../../models/OrderForPos');

process.on('message', async (msg) => {
    let { from, to, branch, type } = msg

    from = new Date(from)
    to = new Date(to)

    let posOrderData = await OrderForPos.find({
        branch: branch,
        create: {
            $gte: isodate(from),
            $lte: isodate(to)
        }
    }).select('customer create orderID fractionalDiscount')


    let totalDiscountAmount = 0;
    let reportInfo = []
    let posOrderArray = posOrderData.map(async (orderInfo) => {

        let index = ((orderInfo.create).toISOString()).indexOf("T")
        let createDate = ((orderInfo.create).toISOString()).substring(0, index)
        if (orderInfo.fractionalDiscount != 0) {
            reportInfo.push({
                orderNo: orderInfo.orderID,
                customerName: orderInfo.customer.name,
                date: createDate,
                fractionalDiscount: (type == 'pdf') ? orderInfo.fractionalDiscount.toFixed(2) : orderInfo.fractionalDiscount
            })
            totalDiscountAmount += orderInfo.fractionalDiscount
        }
    })

    await Promise.all(posOrderArray)


    process.send({
        reportInfo,
        totalDiscountAmount
    });

});