var mongoConnection = require('../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");
const OrderForPos = require('../../../../models/OrderForPos');
const PosOrderExchange = require('../../../../models/PosOrderExchange');
const PosOrderRefund = require('../../../../models/PosOrderRefund');
const Admin = require('../../../../models/admin/Admin');

process.on('message', async (msg) => {
    let { from, to, branch, type } = msg

    from = new Date(from)
    to = new Date(to)

    let allSellerSellsInfo = []
    let adminDetails = []
    let adminIndex = null

    let grandTotal = 0

    let dataInfo;

    
    let condition = {
        branch: branch,
        create: {
            $gte: isodate(from),
            $lte: isodate(to)
        }
    }
    let orderListItems = await OrderForPos.find(condition).select('payment orderType orderID total_bill').populate('admin', ['name'])
    let refundOrderItems = await PosOrderRefund.find(condition).select('orderType serialNo total_bill').populate('admin', ['name'])
    let exchangeOrderItems = await PosOrderExchange.find(condition).select('orderType serialNo payment').populate('admin', ['name'])

    orderListItems.map((orderInfo) => {
        adminIndex = adminDetails.findIndex((adminData) => adminData.name == orderInfo.admin.name)
        if(adminIndex == -1){
            adminDetails.push({
                name : orderInfo.admin.name,
                id : orderInfo.admin._id
            })
        }
    })
    refundOrderItems.map((refundInfo) => {
        adminIndex = adminDetails.findIndex((adminData) => adminData.name == refundInfo.admin.name)
        if(adminIndex == -1){
            adminDetails.push({
                name : refundInfo.admin.name,
                id : refundInfo.admin._id
            })
        }
    })
    exchangeOrderItems.map((exchangeInfo) => {
        adminIndex = adminDetails.findIndex((adminData) => adminData.name == exchangeInfo.admin.name)
        if(adminIndex == -1){
            adminDetails.push({
                name : exchangeInfo.admin.name,
                id : exchangeInfo.admin._id
            })
        }
    })
    let finalArray = await adminDetails.map(async (adminInfo, index_main) => {

        let takeAllThePayments = {}
        takeAllThePayments.payments = {}
        takeAllThePayments.exchange = {}

        takeAllThePayments.name = adminInfo.name
        takeAllThePayments.total = 0

        let dueTotalPayment = 0

        let parentArray = await orderListItems.map(async (paymentInfo, index) => {
            if(paymentInfo.admin.name == adminInfo.name){
                let childArray = await paymentInfo.payment.map(payment => {
                    let paymentMethodIndex = (payment.method + "" + ((payment.type == null || payment.type == '') ? "" : "_" + payment.type).trim()).split(" ").join("_")
                    if (takeAllThePayments.payments[paymentMethodIndex] == null) {
                        takeAllThePayments.payments[paymentMethodIndex] = 0
                    }
                    if (payment.amount == null) {
                        payment.amount = 0
                    }
                    takeAllThePayments.payments[paymentMethodIndex] = takeAllThePayments.payments[paymentMethodIndex] + Number(payment.amount.toFixed(2))
                    takeAllThePayments.total += Number(payment.amount.toFixed(2))
                })
                await Promise.all(childArray)
    
                dueTotalPayment += paymentInfo.total_bill
            }
        })
        await Promise.all(parentArray)

        let parentExchangeArray = await exchangeOrderItems.map(async (paymentInfo, index) => {
            if(paymentInfo.admin.name == adminInfo.name){
                let childExchangeArray = await paymentInfo.payment.map(payment => {
                    let paymentMethodIndex = (payment.method + "" + ((payment.type == null || payment.type == '') ? "" : "_" + payment.type).trim()).split(" ").join("_")
                    if (takeAllThePayments.exchange[paymentMethodIndex] == null) {
                        takeAllThePayments.exchange[paymentMethodIndex] = 0
                    }
                    takeAllThePayments.exchange[paymentMethodIndex] = Number(takeAllThePayments.exchange[paymentMethodIndex]) + Number(payment.amount.toFixed(2))
                    takeAllThePayments.total += Number(payment.amount.toFixed(2))
                })

                await Promise.all(childExchangeArray)
            }    

        })

        await Promise.all(parentExchangeArray)

        let refundTotal = 0
        let refundparentArray = await refundOrderItems.map(orderInfo => {
            if(orderInfo.admin.name == adminInfo.name){
                refundTotal += orderInfo.total_bill
                takeAllThePayments.total -= Number(orderInfo.total_bill.toFixed(2))
            }
        })

        await Promise.all(refundparentArray)

        takeAllThePayments.refund = { cash: refundTotal }

        for (const key in takeAllThePayments.exchange) {
            if (takeAllThePayments.payments.hasOwnProperty(key)) {
                takeAllThePayments.payments[key] += takeAllThePayments.exchange[key];
            } else {
                takeAllThePayments.payments[key] = takeAllThePayments.exchange[key];
            }
            dueTotalPayment += takeAllThePayments.exchange[key]
        }

        for (const key in takeAllThePayments.refund) {
            if (takeAllThePayments.payments.hasOwnProperty(key)) {
                takeAllThePayments.payments[key] -= takeAllThePayments.refund[key];
            } else {
                takeAllThePayments.payments[key] = -takeAllThePayments.refund[key];
            }
            dueTotalPayment -= takeAllThePayments.refund[key]
        }

        delete takeAllThePayments["exchange"];
        delete takeAllThePayments["refund"];

        takeAllThePayments.payments = Object.entries(takeAllThePayments.payments)

        data = {
            result: takeAllThePayments,
            index: index_main
        }
        dataInfo = data
        if (dataInfo.result.total != 0) {
            allSellerSellsInfo.push(dataInfo.result)
        }

        grandTotal += Number(dataInfo.result.total)

    })

    await Promise.all(finalArray);

    if (type == 'excel') {
        let mainData = []

        allSellerSellsInfo.map((info) => {
            info.payments.map((productsInfo, index) => {
                let dataObj = {}
                dataObj.paymentMethod = productsInfo[0]
                dataObj.amount = productsInfo[1]

                if (index == 0) {
                    dataObj.userName = info.name
                }
                mainData.push(dataObj)
            })
            mainData.push({
                userName: ' ',
                paymentMethod: ' ',
                amount: ' '
            })
            mainData.push({
                userName: 'Logon Name Wise Total: ',
                paymentMethod: ' ',
                amount: info.total
            })

            mainData.push({
                userName: 'Cash Register Name Wise Total: ',
                paymentMethod: ' ',
                amount: info.total
            })
            mainData.push({
                userName: ' ',
                paymentMethod: ' ',
                amount: ' '
            })
        })
        process.send({
            mainData,
            grandTotal
        });
    } else {
        process.send({
            allSellerSellsInfo,
            grandTotal
        });
    }
});