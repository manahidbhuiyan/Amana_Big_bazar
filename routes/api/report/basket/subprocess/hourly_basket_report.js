var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");
const OrderForPos = require('../../../../../models/OrderForPos');
const PosOrderExchange = require('../../../../../models/PosOrderExchange');
const PosOrderRefund = require('../../../../../models/PosOrderRefund');

process.on('message', async (msg) => {
    let {
        timeFrom,
        timeTo,
        branch,
        type
    } = msg

    timeFrom = new Date(timeFrom)
    timeTo = new Date(timeTo)

    //Divide Total Time range into smaller Time range
    let fromHour = timeFrom.getHours()
    let fromMin = timeFrom.getMinutes()
    let toHour = timeTo.getHours()
    let toMin = timeTo.getMinutes()
    let addHour = 1
    let timeRange = []

    function addHoursToDate(date, hours) {
        return new Date(new Date(date).setHours(date.getHours() + hours));
    }

    function addMinToDate(date, min) {
        return new Date(new Date(date).setMinutes(date.getMinutes() + min));
    }

    if (toMin > fromMin) {
        for (let i = fromHour; i <= toHour; i++) {
            if (addHour == 1 && i == toHour) {
                timeRange.push(timeFrom)
                timeRange.push(addMinToDate(timeRange[addHour - 1], (toMin - fromMin)))
            } else {
                if (i == toHour && !(toMin == fromMin) && addHour != 1) {
                    timeRange.push(addMinToDate(timeRange[addHour - 2], (toMin - fromMin)))
                } else {
                    timeRange.push(addHoursToDate(timeFrom, addHour))
                }
            }
            addHour += 1
        }
    } else if (toMin < fromMin) {
        for (let i = fromHour; i < toHour; i++) {
            if (i == toHour - 1) {
                timeRange.push(addMinToDate(timeRange[addHour - 2], (60 - (fromMin - toMin))))
            } else {
                timeRange.push(addHoursToDate(timeFrom, addHour))
            }
            addHour += 1
        }
    } else {
        for (let i = fromHour; i < toHour; i++) {
            if (addHour == 1 && i == toHour) {
                timeRange.push(timeFrom)
                timeRange.push(addMinToDate(timeRange[addHour - 1], (toMin - fromMin)))
            } else {
                if (i == toHour && !(toMin == fromMin) && addHour != 1) {
                    timeRange.push(addMinToDate(timeRange[addHour - 2], (toMin - fromMin)))
                } else {
                    timeRange.push(addHoursToDate(timeFrom, addHour))
                }
            }
            addHour += 1
        }
    }

    // create Final Time Range
    let finalTimeRange = []

    timeRange.map((time, index, arr) => {
        if (index == 0) {
            finalTimeRange.push({
                range: {
                    start: timeFrom,
                    end: time,
                    position: index
                }
            })
        } else {
            finalTimeRange.push({
                range: {
                    start: arr[index - 1],
                    end: time,
                    position: index
                }
            })
        }

    })

    let reportDataFinal = []


    let grandEarnAmount = 0;
    let grandCustomer = 0;
    let grandBasket = 0;

    let finalTimeRangeArray = finalTimeRange.map(async (timeRange, index) => {
        let customerPhone = []
        let earnAmount = 0;
        let customer = 0;
        let basket = 0;
        let startRanage = (timeRange.range.start.toLocaleTimeString('en-US')).replace(':00', '')
        let endRanage = (timeRange.range.end.toLocaleTimeString('en-US')).replace(':00', '')
        let position = timeRange.range.position

        let orderListItems = await OrderForPos.find({
            branch: branch,
            create: {
                $gte: isodate(timeRange.range.start),
                $lte: isodate(timeRange.range.end)
            }
        })

        let exchangeListItems = await PosOrderExchange.find({
            branch: branch,
            create: {
                $gte: isodate(timeRange.range.start),
                $lte: isodate(timeRange.range.end)
            }
        })

        let refundListItems = await PosOrderRefund.find({
            branch: branch,
            create: {
                $gte: isodate(timeRange.range.start),
                $lte: isodate(timeRange.range.end)
            }
        })

        //  Previous month calculation

        let orderListParentArray = orderListItems.map(async (item, index) => {

            let orderListChildArray = item.products.map(async product => {

                if (item.customer.phone != undefined && item.customer.name != undefined) {
                    if ((customerPhone.includes(item.customer.phone))) {
                        earnAmount += (product.price * product.quantity)
                    } else {
                        customerPhone.push(item.customer.phone)
                        customer += 1
                        earnAmount += (product.price * product.quantity)
                    }
                }

            })
            await Promise.all(orderListChildArray)

        })

        await Promise.all(orderListParentArray)


        let exchangeListParentArray = exchangeListItems.map(async (item, index) => {
            let exchangeListChildOneArray = item.products.map(async product => {

                if (item.customer.phone != undefined && item.customer.name != undefined) {
                    if ((customerPhone.includes(item.customer.phone))) {
                        earnAmount += (product.price * product.quantity)
                    } else {
                        customerPhone.push(item.customer.phone)
                        customer += 1
                        earnAmount += (product.price * product.quantity)
                    }
                }

            })
            await Promise.all(exchangeListChildOneArray)


            let exchangeListChildTwoArray = item.exchangedBy.map(async product => {

                if (item.customer.phone != undefined && item.customer.name != undefined) {
                    if ((customerPhone.includes(item.customer.phone))) {
                        earnAmount -= (product.price * product.quantity)
                    } else {
                        customerPhone.push(item.customer.phone)
                        customer += 1
                        earnAmount -= (product.price * product.quantity)
                    }
                }

            })
            await Promise.all(exchangeListChildTwoArray)
        })

        await Promise.all(exchangeListParentArray)


        let refundListParentArray = refundListItems.map(async (item, index) => {

            let refundListChildOneArray = item.products.map(async product => {

                if (item.customer.phone != undefined && item.customer.name != undefined) {
                    if ((customerPhone.includes(item.customer.phone))) {
                        earnAmount -= (product.price * product.quantity)
                    } else {
                        customerPhone.push(item.customer.phone)
                        customer += 1
                        earnAmount -= (product.price * product.quantity)
                    }
                }

            })
            await Promise.all(refundListChildOneArray)

        })
        await Promise.all(refundListParentArray)


        //Final Calculation
        if (customer !== 0) {
            basket = (earnAmount / customer);
        }


        grandEarnAmount += earnAmount
        grandCustomer += customer
        grandBasket += basket

        reportDataFinal.push({
            timeRange: startRanage + ' - ' + endRanage,
            basket: type == 'pdf' ? basket.toFixed(2) : basket,
            FF: type == 'pdf' ? customer.toFixed(2) : customer,
            sale: type == 'pdf' ? earnAmount.toFixed(2) : earnAmount,
            position: position
        })
    })
    await Promise.all(finalTimeRangeArray)

    reportDataFinal.sort(function (a, b) { return a.position - b.position })

    process.send({
        reportDataFinal,
        grandEarnAmount,
        grandCustomer,
        grandBasket
    });

});