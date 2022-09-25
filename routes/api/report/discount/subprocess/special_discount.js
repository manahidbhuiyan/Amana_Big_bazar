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
    }).select('customer create orderID specialDiscountAmount')


    let totalDiscountAmount = 0;
    let reportInfo = []
    let posOrderArray = posOrderData.map(async (orderInfo) => {

        let index = ((orderInfo.create).toISOString()).indexOf("T")
        let createDate = ((orderInfo.create).toISOString()).substring(0, index)
        if (orderInfo.specialDiscountAmount != 0) {
            reportInfo.push({
                orderNo: orderInfo.orderID,
                customerName: orderInfo.customer.name,
                date: createDate,
                specialDiscountAmount: (type == 'pdf') ? orderInfo.specialDiscountAmount.toFixed(2) : orderInfo.specialDiscountAmount
            })
            totalDiscountAmount += orderInfo.specialDiscountAmount
        }
    })

    await Promise.all(posOrderArray)

    process.send({
        reportInfo,
        totalDiscountAmount
    });

});










