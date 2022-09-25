var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");
const OrderForPos = require('../../../../../models/OrderForPos');
const PosOrderExchange = require('../../../../../models/PosOrderExchange');
const PosOrderRefund = require('../../../../../models/PosOrderRefund');

process.on('message', async (msg) => {
    let { from, to, branch, methods, type } = msg

    from = new Date(from)
    to = new Date(to)

    let allPaymentList = []
    let grantTotalAmount = 0

    let totalProductNoCondition = {
        branch: branch,
        create: {
            $gte: isodate(from),
            $lte: isodate(to)
        }
    }

    let refundOrderItems = await PosOrderRefund.find(totalProductNoCondition).select('orderType serialNo total_bill').select("serialNo total_bill")
    let exchangeOrderItems = await PosOrderExchange.find(totalProductNoCondition).select('orderType serialNo payment').select("serialNo total_bill exchange_amount payment")

    let grantTotalOrderNo = 0

    let parentArray = await methods.map(async methodName => {
        let singlePaymentTypeData = []
        let totalAmount = 0

        let totalSlipNo = 0

        let posOrderPaymentCondition = {}

        if (type) {
            posOrderPaymentCondition = {
                branch: branch,
                "payment.method": methodName,
                "payment.type": type,
                create: {
                    $gte: isodate(from),
                    $lte: isodate(to)
                }
            }
        } else {
            posOrderPaymentCondition = {
                branch: branch,
                "payment.method": methodName,
                create: {
                    $gte: isodate(from),
                    $lte: isodate(to)
                }
            }
        }

        let posOrderList = await OrderForPos.find(posOrderPaymentCondition).select("_id orderID payment orderType")

        let childArray = posOrderList.map(posOrderInfo => {
            for (let i = 0; i < posOrderInfo.payment.length; i++) {
                if (posOrderInfo.payment[i].method == methodName) {
                    if (type) {
                        if (type == posOrderInfo.payment[i].type) {
                            totalSlipNo += 1
                            totalAmount += posOrderInfo.payment[i].amount
                            singlePaymentTypeData.push([posOrderInfo.orderID, posOrderInfo.orderType, posOrderInfo.payment[i].amount !== null ? posOrderInfo.payment[i].amount.toFixed(2) : 0])
                            //break;
                        }
                    } else {
                        totalSlipNo += 1
                        totalAmount += posOrderInfo.payment[i].amount
                        singlePaymentTypeData.push([posOrderInfo.orderID, posOrderInfo.orderType, posOrderInfo.payment[i].amount !== null ? posOrderInfo.payment[i].amount.toFixed(2) : 0])
                        //break;
                    }

                }
            }
        })

        await Promise.all(childArray)

        if (methodName == "cash") {
            let refundTotal = 0
            let refundparentArray = await refundOrderItems.map(orderInfo => {
                totalSlipNo += 1
                singlePaymentTypeData.push([orderInfo.serialNo, 'refund', -orderInfo.total_bill])
                refundTotal += orderInfo.total_bill
            })

            await Promise.all(refundparentArray)

            totalAmount -= refundTotal
        }


        let childExchangeArray = exchangeOrderItems.map(posOrderInfo => {
            for (let i = 0; i < posOrderInfo.payment.length; i++) {
                if (posOrderInfo.payment[i].method == methodName) {
                    if (type) {
                        if (type == posOrderInfo.payment[i].type) {
                            totalSlipNo += 1
                            totalAmount += posOrderInfo.payment[i].amount
                            singlePaymentTypeData.push([posOrderInfo.serialNo, 'exchange', posOrderInfo.payment[i].amount.toFixed(2)])
                            //break;
                        }
                    } else {
                        totalSlipNo += 1
                        totalAmount += posOrderInfo.payment[i].amount
                        singlePaymentTypeData.push([posOrderInfo.serialNo, 'exchange', posOrderInfo.payment[i].amount.toFixed(2)])
                        //break;
                    }

                }
            }
        })

        await Promise.all(childExchangeArray)

        let typeInfo = ''
        if (type) {
            typeInfo = "(" + type + ")"
        }

        grantTotalAmount += totalAmount
        grantTotalOrderNo += totalSlipNo

        allPaymentList.push({
            paymentType: methodName,
            typeInfo: typeInfo,
            totalAmount: totalAmount.toFixed(2),
            paymentNo: totalSlipNo,
            avgPayment: (totalAmount / (totalSlipNo == 0 ? 1 : totalSlipNo)).toFixed(2),
            data: singlePaymentTypeData
        })

    })

    await Promise.all(parentArray)

    process.send({
        allPaymentList,
        grantTotalAmount,
        grantTotalOrderNo
    });
});