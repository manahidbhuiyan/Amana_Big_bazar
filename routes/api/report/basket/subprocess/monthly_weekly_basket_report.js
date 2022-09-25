var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");
const OrderForPos = require('../../../../../models/OrderForPos');
const PosOrderExchange = require('../../../../../models/PosOrderExchange');
const PosOrderRefund = require('../../../../../models/PosOrderRefund');
const Category = require('../../../../../models/Category');

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

    let categories = await Category.find({
        branch: {
            $in: branch
        }
    }).select('_id name serialNo').sort({ serialNo: 1 })

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

    let reportDataFinal = []


    let grandPrevMonthEarnAmount = 0;
    let grandPrevMonthCustomer = 0;
    let grandCurrentMonthEarnAmount = 0;
    let grandCurrentMonthCustomer = 0;
    let grandPrevMonthBasket = 0;
    let grandCurrentMonthBasket = 0;
    let grandDifference = 0;

    let categoryParentArray = categories.map(async (category, index) => {
        let prevMonthcustomerPhone = []
        let currentMonthcustomerPhone = []
        let prevMonthEarnAmount = 0;
        let prevMonthCustomer = 0;
        let currentMonthEarnAmount = 0;
        let currentMonthCustomer = 0;
        let prevMonthBasket = 0;
        let currentMonthBasket = 0;

        //  Previous month calculation

        let prevMonthOrderListParentArray = orderListItemsPrevMonth.map(async (item, index) => {
            let prevMonthOrderListChildArray = item.products.map(async product => {
                if (product.category.toString() == category._id.toString()) {
                    if (item.customer.phone != undefined && item.customer.name != undefined) {
                        if ((prevMonthcustomerPhone.includes(item.customer.phone))) {
                            prevMonthEarnAmount += (product.price * product.quantity)
                        } else {
                            prevMonthcustomerPhone.push(item.customer.phone)
                            prevMonthCustomer += 1
                            prevMonthEarnAmount += (product.price * product.quantity)
                        }
                    }
                }
            })
            await Promise.all(prevMonthOrderListChildArray)

        })

        await Promise.all(prevMonthOrderListParentArray)


        let prevMonthExchangeListParentArray = exchangeListItemsPrevMonth.map(async (item, index) => {
            let prevMonthExchangeListChildOneArray = item.products.map(async product => {
                if (product.category.toString() == category._id.toString()) {
                    if (item.customer.phone != undefined && item.customer.name != undefined) {
                        if ((prevMonthcustomerPhone.includes(item.customer.phone))) {
                            prevMonthEarnAmount += (product.price * product.quantity)
                        } else {
                            prevMonthcustomerPhone.push(item.customer.phone)
                            prevMonthCustomer += 1
                            prevMonthEarnAmount += (product.price * product.quantity)
                        }
                    }
                }
            })
            await Promise.all(prevMonthExchangeListChildOneArray)


            let prevMonthExchangeListChildTwoArray = item.exchangedBy.map(async product => {
                if (product.category.toString() == category._id.toString()) {
                    if (item.customer.phone != undefined && item.customer.name != undefined) {
                        if ((prevMonthcustomerPhone.includes(item.customer.phone))) {
                            prevMonthEarnAmount -= (product.price * product.quantity)
                        } else {
                            prevMonthcustomerPhone.push(item.customer.phone)
                            prevMonthCustomer += 1
                            prevMonthEarnAmount -= (product.price * product.quantity)
                        }
                    }
                }
            })
            await Promise.all(prevMonthExchangeListChildTwoArray)
        })

        await Promise.all(prevMonthExchangeListParentArray)


        let prevMonthRefundListParentArray = refundListItemsPrevMonth.map(async (item, index) => {

            let prevMonthRefundListChildOneArray = item.products.map(async product => {
                if (product.category.toString() == category._id.toString()) {
                    if (item.customer.phone != undefined && item.customer.name != undefined) {
                        if ((prevMonthcustomerPhone.includes(item.customer.phone))) {
                            prevMonthEarnAmount -= (product.price * product.quantity)
                        } else {
                            prevMonthcustomerPhone.push(item.customer.phone)
                            prevMonthCustomer += 1
                            prevMonthEarnAmount -= (product.price * product.quantity)
                        }
                    }
                }
            })
            await Promise.all(prevMonthRefundListChildOneArray)

        })
        await Promise.all(prevMonthRefundListParentArray)



        // // Current Month Calculation

        let currentMonthOrderListParentArray = orderListItemsCurrentMonth.map(async (item, index) => {
            let currentMonthOrderListChildArray = item.products.map(async product => {
                if (product.category.toString() == category._id.toString()) {
                    if (item.customer.phone != undefined && item.customer.name != undefined) {
                        if ((prevMonthcustomerPhone.includes(item.customer.phone))) {
                            currentMonthEarnAmount += (product.price * product.quantity)
                        } else {
                            currentMonthcustomerPhone.push(item.customer.phone)
                            currentMonthCustomer += 1
                            currentMonthEarnAmount += (product.price * product.quantity)
                        }
                    }
                }
            })
            await Promise.all(currentMonthOrderListChildArray)

        })

        await Promise.all(currentMonthOrderListParentArray)


        let currentMonthExchangeListParentArray = exchangeListItemsCurrentMonth.map(async (item, index) => {
            let currentMonthExchangeListChildOneArray = item.products.map(async product => {
                if (product.category.toString() == category._id.toString()) {
                    if (item.customer.phone != undefined && item.customer.name != undefined) {
                        if ((prevMonthcustomerPhone.includes(item.customer.phone))) {
                            currentMonthEarnAmount += (product.price * product.quantity)
                        } else {
                            currentMonthcustomerPhone.push(item.customer.phone)
                            currentMonthCustomer += 1
                            currentMonthEarnAmount += (product.price * product.quantity)
                        }
                    }
                }
            })
            await Promise.all(currentMonthExchangeListChildOneArray)


            let currentMonthExchangeListChildTwoArray = item.exchangedBy.map(async product => {
                if (product.category.toString() == category._id.toString()) {
                    if (item.customer.phone != undefined && item.customer.name != undefined) {
                        if ((prevMonthcustomerPhone.includes(item.customer.phone))) {
                            currentMonthEarnAmount -= (product.price * product.quantity)
                        } else {
                            currentMonthcustomerPhone.push(item.customer.phone)
                            currentMonthCustomer += 1
                            currentMonthEarnAmount -= (product.price * product.quantity)
                        }
                    }
                }
            })
            await Promise.all(currentMonthExchangeListChildTwoArray)
        })

        await Promise.all(currentMonthExchangeListParentArray)


        let currentMonthRefundListParentArray = refundListItemsCurrentMonth.map(async (item, index) => {

            let currentMonthRefundListChildOneArray = item.products.map(async product => {
                if (product.category.toString() == category._id.toString()) {
                    if (item.customer.phone != undefined && item.customer.name != undefined) {
                        if ((prevMonthcustomerPhone.includes(item.customer.phone))) {
                            currentMonthEarnAmount -= (product.price * product.quantity)
                        } else {
                            currentMonthcustomerPhone.push(item.customer.phone)
                            currentMonthCustomer += 1
                            currentMonthEarnAmount -= (product.price * product.quantity)
                        }
                    }
                }
            })
            await Promise.all(currentMonthRefundListChildOneArray)

        })
        await Promise.all(currentMonthRefundListParentArray)



        //Final Calculation
        if (prevMonthCustomer !== 0) {
            prevMonthBasket = (prevMonthEarnAmount / prevMonthCustomer);
        } else {
            prevMonthBasket = prevMonthBasket
        }
        if (currentMonthCustomer !== 0) {
            currentMonthBasket = (currentMonthEarnAmount / currentMonthCustomer);
        } else {
            currentMonthBasket = currentMonthBasket
        }

        let differerce = (currentMonthBasket - prevMonthBasket)

        grandPrevMonthEarnAmount += prevMonthEarnAmount
        grandPrevMonthCustomer += prevMonthCustomer
        grandCurrentMonthEarnAmount += currentMonthEarnAmount
        grandCurrentMonthCustomer += currentMonthCustomer
        grandPrevMonthBasket += prevMonthBasket
        grandCurrentMonthBasket += currentMonthBasket
        grandDifference += differerce

        if (differerce < 0) {
            reportDataFinal.push({
                name: category.name,
                prevMonthEarn: type == 'pdf' ? prevMonthEarnAmount.toFixed(2) : prevMonthEarnAmount,
                prevMonthFF: type == 'pdf' ? prevMonthCustomer.toFixed(2) : prevMonthCustomer,
                currentMonthEarn: type == 'pdf' ? currentMonthEarnAmount.toFixed(2) : currentMonthEarnAmount,
                currentMonthFF: type == 'pdf' ? currentMonthCustomer.toFixed(2) : currentMonthCustomer,
                prevMonthBasket: type == 'pdf' ? (prevMonthBasket).toFixed(2) : prevMonthBasket,
                currentMonthBasket: type == 'pdf' ? currentMonthBasket.toFixed(2) : currentMonthBasket,
                differerce: type == 'pdf' ? differerce.toFixed(2) : differerce,
                negative: true
            })
        } else {
            reportDataFinal.push({
                name: category.name,
                prevMonthEarn: type == 'pdf' ? prevMonthEarnAmount.toFixed(2) : prevMonthEarnAmount,
                prevMonthFF: type == 'pdf' ? prevMonthCustomer.toFixed(2) : prevMonthCustomer,
                currentMonthEarn: type == 'pdf' ? currentMonthEarnAmount.toFixed(2) : currentMonthEarnAmount,
                currentMonthFF: type == 'pdf' ? currentMonthCustomer.toFixed(2) : currentMonthCustomer,
                prevMonthBasket: type == 'pdf' ? (prevMonthBasket).toFixed(2) : prevMonthBasket,
                currentMonthBasket: type == 'pdf' ? currentMonthBasket.toFixed(2) : currentMonthBasket,
                differerce: type == 'pdf' ? differerce.toFixed(2) : differerce,
                differerce: differerce.toFixed(2)
            })
        }
    })
    await Promise.all(categoryParentArray)

    process.send({
        reportDataFinal,
        grandPrevMonthEarnAmount,
        grandPrevMonthCustomer,
        grandCurrentMonthEarnAmount,
        grandCurrentMonthCustomer,
        grandPrevMonthBasket,
        grandCurrentMonthBasket,
        grandDifference
    });

});