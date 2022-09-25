var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");

const OrderForPos = require('../../../../../models/OrderForPos');
const PosOrderExchange = require('../../../../../models/PosOrderExchange');
const PosOrderRefund = require('../../../../../models/PosOrderRefund');
const Supplier = require('../../../../../models/Supplier');

process.on('message', async (msg) => {
    let { from, to, branch, condition, type } = msg

    from = new Date(from)
    to = new Date(to)


    let categories = await Supplier.find(condition).select('_id name serialNo')

    let orderListItems = await OrderForPos.find({
        branch: branch,
        create: {
            $gte: isodate(from),
            $lte: isodate(to)
        }
    })

    let exchangeListItems = await PosOrderExchange.find({
        branch: branch,
        create: {
            $gte: isodate(from),
            $lte: isodate(to)
        }
    })

    let refundListItems = await PosOrderRefund.find({
        branch: branch,
        create: {
            $gte: isodate(from),
            $lte: isodate(to)
        }
    })

    let reportData = []

    let totalCategoryEarnAmount = 0;
    let totalSoldQuantity = 0;
    let totalDiscountAmount = 0;

    let categoryParentArray = categories.map(async (category, index) => {
        let categoryEarnAmount = 0;
        let categoryDiscountAmount = 0;
        let orderQty = 0;
        let exchangeQty = 0;
        let exchangedByQty = 0;
        let refundQty = 0;
        let orderListParentArray = orderListItems.map(async (item, index) => {
            let orderListChildOneArray = item.products.map(async product => {
                if (product.supplier.toString() == category._id.toString()) {
                    categoryEarnAmount += (product.price * product.quantity)
                    categoryDiscountAmount += (product.discount * product.quantity)
                    orderQty += product.quantity
                }
            })

            await Promise.all(orderListChildOneArray)
        })

        await Promise.all(orderListParentArray)


        let exchangeListParentArray = exchangeListItems.map(async (item, index) => {
            let exchangeListChildOneArray = item.products.map(async product => {
                if (product.supplier.toString() == category._id.toString()) {
                    categoryEarnAmount += (product.price * product.quantity)
                    categoryDiscountAmount += (product.discount * product.quantity)
                    exchangeQty += product.quantity
                }
            })
            await Promise.all(exchangeListChildOneArray)

            let exchangeListChildTwoArray = item.exchangedBy.map(async product => {
                if (product.supplier.toString() == category._id.toString()) {
                    categoryEarnAmount -= (product.price * product.quantity)
                    categoryDiscountAmount -= (product.discount * product.quantity)
                    exchangedByQty += product.quantity
                }
            })
            await Promise.all(exchangeListChildTwoArray)
        })

        await Promise.all(exchangeListParentArray)


        let refundListParentArray = refundListItems.map(async (item, index) => {
            let refundListChildOneArray = item.products.map(async product => {
                if (product.supplier.toString() == category._id.toString()) {
                    categoryEarnAmount -= (product.price * product.quantity)
                    categoryDiscountAmount -= (product.discount * product.quantity)
                    refundQty += product.quantity
                }
            })
            await Promise.all(refundListChildOneArray)
        })
        await Promise.all(refundListParentArray)


        totalCategoryEarnAmount += categoryEarnAmount
        totalDiscountAmount += categoryDiscountAmount
        totalSoldQuantity += ((orderQty + exchangeQty) - (exchangedByQty + refundQty))

        reportData.push({
            _id: category._id,
            serial: category.serialNo,
            name: category.name,
            earn: (type == 'pdf') ? categoryEarnAmount.toFixed(2) : categoryEarnAmount,
            discount: (type == 'pdf') ? categoryDiscountAmount.toFixed(2) : categoryDiscountAmount,
            quantity: (type == 'pdf') ? ((orderQty + exchangeQty) - (exchangedByQty + refundQty)).toFixed(2) : ((orderQty + exchangeQty) - (exchangedByQty + refundQty))
        })

    })
    await Promise.all(categoryParentArray)

    process.send({
        reportData,
        totalCategoryEarnAmount,
        totalDiscountAmount,
        totalSoldQuantity
    });

});










