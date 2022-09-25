
var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");

const OrderForPos = require('../../../../../models/OrderForPos');
const PosOrderExchange = require('../../../../../models/PosOrderExchange');
const PosOrderRefund = require('../../../../../models/PosOrderRefund');

process.on('message', async (msg) => {
    let {
        prevMonthFrom,
        prevMonthTo,
        currentMonthFrom,
        currentMonthTo,
        branch,
        type
    } = msg

    prevMonthFrom = new Date(prevMonthFrom)
    prevMonthTo = new Date(prevMonthTo)
    currentMonthFrom = new Date(currentMonthFrom)
    currentMonthTo = new Date(currentMonthTo)

    // Previous Month Data
    let orderListItemsPrevMonth = await OrderForPos.find({
        branch: branch,
        create: {
            $gte: isodate(prevMonthFrom),
            $lte: isodate(prevMonthTo)
        }
    })


    let exchangeListItemsPrevMonth = await PosOrderExchange.find({
        branch: branch,
        create: {
            $gte: isodate(prevMonthFrom),
            $lte: isodate(prevMonthTo)
        }
    })

    let refundListItemsPrevMonth = await PosOrderRefund.find({
        branch: branch,
        create: {
            $gte: isodate(prevMonthFrom),
            $lte: isodate(prevMonthTo)
        }
    })


    //Current Month Data

    let orderListItemsCurrentMonth = await OrderForPos.find({
        branch: branch,
        create: {
            $gte: isodate(currentMonthFrom),
            $lte: isodate(currentMonthTo)
        }
    })


    let exchangeListItemsCurrentMonth = await PosOrderExchange.find({
        branch: branch,
        create: {
            $gte: isodate(currentMonthFrom),
            $lte: isodate(currentMonthTo)
        }
    })

    let refundListItemsCurrentMonth = await PosOrderRefund.find({
        branch: branch,
        create: {
            $gte: isodate(currentMonthFrom),
            $lte: isodate(currentMonthTo)
        }
    })

    let reportDataPrevMonth = []
    let reportDataCurrentMonth = []
    let reportDataFinal = []


    let grandprevMonthTotal = 0;
    let grandCurrentMonthTotal = 0;
    let grandDifference = 0;

    let customerIndex = 0

    //  Previous month calculation

    let prevMonthOrderListParentArray = orderListItemsPrevMonth.map(async (item, index) => {
        let prevMonthOrderListChildArray = item.products.map(async product => {
            if (item.customer.phone != undefined && item.customer.name != undefined) {
                customerIndex = reportDataPrevMonth.findIndex(phone => phone.number === item.customer.phone)
                if (customerIndex == -1) {
                    reportDataPrevMonth.push({
                        name: item.customer.name,
                        number: item.customer.phone,
                        total: (product.price * product.quantity)
                    })
                } else {
                    reportDataPrevMonth[customerIndex].total += (product.price * product.quantity)
                }
            }

        })
        await Promise.all(prevMonthOrderListChildArray)

    })

    await Promise.all(prevMonthOrderListParentArray)


    let prevMonthExchangeListParentArray = exchangeListItemsPrevMonth.map(async (item, index) => {
        let prevMonthExchangeListChildOneArray = item.products.map(async product => {
            if (item.customer.phone != undefined && item.customer.name != undefined) {
                customerIndex = reportDataPrevMonth.findIndex(phone => phone.number === item.customer.phone)
                if (customerIndex == -1) {
                    reportDataPrevMonth.push({
                        name: item.customer.name,
                        number: item.customer.phone,
                        total: (product.price * product.quantity)
                    })
                } else {
                    reportDataPrevMonth[customerIndex].total += (product.price * product.quantity)
                }
            }
        })
        await Promise.all(prevMonthExchangeListChildOneArray)


        let prevMonthExchangeListChildTwoArray = item.exchangedBy.map(async product => {
            if (item.customer.phone != undefined && item.customer.name != undefined) {
                customerIndex = reportDataPrevMonth.findIndex(phone => phone.number === item.customer.phone)
                if (customerIndex == -1) {
                    reportDataPrevMonth.push({
                        name: item.customer.name,
                        number: item.customer.phone,
                        total: (product.price * product.quantity)
                    })
                } else {
                    reportDataPrevMonth[customerIndex].total -= (product.price * product.quantity)
                }
            }
        })
        await Promise.all(prevMonthExchangeListChildTwoArray)
    })

    await Promise.all(prevMonthExchangeListParentArray)


    let prevMonthRefundListParentArray = refundListItemsPrevMonth.map(async (item, index) => {

        let prevMonthRefundListChildOneArray = item.products.map(async product => {
            if (item.customer.phone != undefined && item.customer.name != undefined) {
                customerIndex = reportDataPrevMonth.findIndex(phone => phone.number === item.customer.phone)
                if (customerIndex == -1) {
                    reportDataPrevMonth.push({
                        name: item.customer.name,
                        number: item.customer.phone,
                        total: (product.price * product.quantity)
                    })
                } else {
                    reportDataPrevMonth[customerIndex].total -= (product.price * product.quantity)
                }
            }
        })
        await Promise.all(prevMonthRefundListChildOneArray)

    })
    await Promise.all(prevMonthRefundListParentArray)



    // Current Month Calculation

    let currentMonthOrderListParentArray = orderListItemsCurrentMonth.map(async (item, index) => {
        let currentMonthOrderListChildArray = item.products.map(async product => {
            if (item.customer.phone != undefined && item.customer.name != undefined) {
                customerIndex = reportDataCurrentMonth.findIndex(phone => phone.number === item.customer.phone)
                if (customerIndex == -1) {
                    reportDataCurrentMonth.push({
                        name: item.customer.name,
                        number: item.customer.phone,
                        total: (product.price * product.quantity)
                    })
                } else {
                    reportDataCurrentMonth[customerIndex].total += (product.price * product.quantity)
                }
            }

        })
        await Promise.all(currentMonthOrderListChildArray)

    })

    await Promise.all(currentMonthOrderListParentArray)


    let currentMonthExchangeListParentArray = exchangeListItemsCurrentMonth.map(async (item, index) => {
        let currentMonthExchangeListChildOneArray = item.products.map(async product => {
            if (item.customer.phone != undefined && item.customer.name != undefined) {
                customerIndex = reportDataCurrentMonth.findIndex(phone => phone.number === item.customer.phone)
                if (customerIndex == -1) {
                    reportDataCurrentMonth.push({
                        name: item.customer.name,
                        number: item.customer.phone,
                        total: (product.price * product.quantity)
                    })
                } else {
                    reportDataCurrentMonth[customerIndex].total += (product.price * product.quantity)
                }
            }
        })
        await Promise.all(currentMonthExchangeListChildOneArray)


        let currentMonthExchangeListChildTwoArray = item.exchangedBy.map(async product => {
            if (item.customer.phone != undefined && item.customer.name != undefined) {
                customerIndex = reportDataCurrentMonth.findIndex(phone => phone.number === item.customer.phone)
                if (customerIndex == -1) {
                    reportDataCurrentMonth.push({
                        name: item.customer.name,
                        number: item.customer.phone,
                        total: (product.price * product.quantity)
                    })
                } else {
                    reportDataCurrentMonth[customerIndex].total -= (product.price * product.quantity)
                }
            }
        })
        await Promise.all(currentMonthExchangeListChildTwoArray)
    })

    await Promise.all(currentMonthExchangeListParentArray)


    let currentMonthRefundListParentArray = refundListItemsCurrentMonth.map(async (item, index) => {

        let currentMonthRefundListChildOneArray = item.products.map(async product => {
            if (item.customer.phone != undefined && item.customer.name != undefined) {
                customerIndex = reportDataCurrentMonth.findIndex(phone => phone.number === item.customer.phone)
                if (customerIndex == -1) {
                    reportDataCurrentMonth.push({
                        name: item.customer.name,
                        number: item.customer.phone,
                        total: (product.price * product.quantity)
                    })
                } else {
                    reportDataCurrentMonth[customerIndex].total -= (product.price * product.quantity)
                }
            }
        })
        await Promise.all(currentMonthRefundListChildOneArray)

    })
    await Promise.all(currentMonthRefundListParentArray)



    //Final Calculation

    let reportDataPrevMonthArray = reportDataPrevMonth.map(async (prevData) => {
        reportDataFinal.push({
            name: prevData.name,
            number: prevData.number,
            prevMonthTotal: prevData.total,
            currentMonthTotal: 0,
            difference: -(prevData.total)
        })
    })

    await Promise.all(reportDataPrevMonthArray)


    let reportDataCurrentMonthArray = reportDataCurrentMonth.map(async (currentData) => {
        let reportDataFinalArray = reportDataFinal.map(async (finalData) => {
            if (finalData.number === currentData.number) {
                finalData.currentMonthTotal = (currentData.total)
                finalData.difference = (currentData.total - finalData.prevMonthTotal)
                finalData.prevMonthTotal = (finalData.prevMonthTotal)
            } else {
                customerIndex = reportDataFinal.findIndex(phone => phone.number === currentData.number)
                if (customerIndex == -1) {
                    reportDataFinal.push({
                        name: currentData.name,
                        number: currentData.number,
                        prevMonthTotal: 0,
                        currentMonthTotal: (currentData.total),
                        difference: (currentData.total)
                    })
                }

            }
        })
        await Promise.all(reportDataFinalArray)
    })
    await Promise.all(reportDataCurrentMonthArray)

    reportDataFinal.map((fixedData, index) => {
        grandprevMonthTotal += fixedData.prevMonthTotal
        fixedData.prevMonthTotal = (type == 'pdf') ? (fixedData.prevMonthTotal).toFixed(2) : (fixedData.prevMonthTotal)
        grandCurrentMonthTotal += fixedData.currentMonthTotal
        fixedData.currentMonthTotal = (type == 'pdf') ? (fixedData.currentMonthTotal).toFixed(2) : (fixedData.currentMonthTotal)
        grandDifference += fixedData.difference
        if (fixedData.difference < 0) {
            reportDataFinal[index].negative = true
        }
        fixedData.difference = (type == 'pdf') ? (fixedData.difference).toFixed(2) : (fixedData.difference)
    })

    process.send({
        reportDataFinal,
        grandprevMonthTotal,
        grandCurrentMonthTotal,
        grandDifference
    });
});