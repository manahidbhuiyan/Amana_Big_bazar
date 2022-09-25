var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");

const OrderForPos = require('../../../../../models/OrderForPos');
const Lookup = require('../../../../../models/Backoffice/Lookup');

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
    }).select('payment')

    let paymentMethods = await Lookup.find({
        discount_percentage: {
            $gte: 0
        }

    }).select('title')

    let grandTotalDiscountAmount = 0;
    let grandTotalAmount = 0;
    let reportInfo = []

    let cardArray = paymentMethods.map(async (cardInfo) => {
        let totalDiscountAmount = 0;
        let totalAmount = 0;
        let posOrderArray = posOrderData.map(async (orderInfo, index) => {
            let paymentArray = orderInfo.payment.map(async (paymentInfo) => {
                if (paymentInfo.discount != 0) {
                    if (cardInfo.title == paymentInfo.type) {
                        totalDiscountAmount += paymentInfo.discount
                        totalAmount += paymentInfo.amount
                    }
                }

            })
            await Promise.all(paymentArray)
        })
        await Promise.all(posOrderArray)

        reportInfo.push({
            cardName: cardInfo.title,
            totalDiscountAmount: (type == 'pdf') ? totalDiscountAmount.toFixed(2) : totalDiscountAmount,
            totalAmount: (type == 'pdf') ? totalAmount.toFixed(2) : totalAmount
        })
        grandTotalDiscountAmount += totalDiscountAmount
        grandTotalAmount += totalAmount
    })
    await Promise.all(cardArray)


    process.send({
        reportInfo,
        grandTotalAmount,
        grandTotalDiscountAmount
    });

});










