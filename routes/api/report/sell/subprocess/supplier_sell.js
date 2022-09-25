var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
const OrderForPos = require('../../../../../models/OrderForPos');
const PosOrderExchange = require('../../../../../models/PosOrderExchange');
const PosOrderRefund = require('../../../../../models/PosOrderRefund');
const Supplier = require('../../../../../models/Supplier');
const Product = require('../../../../../models/Product');
var isodate = require("isodate");

process.on('message', async (msg) => {
    let { from, to, branch, type } = msg

    from = new Date(from)
    to = new Date(to)
    
    let categories = await Supplier.find({
        branch: {
            $in: branch
        }
    }).select('_id name serialNo')

    let reportData = []


    let totalSupplierEarnAmount = 0;
    let totalSupplierCostAmount = 0;
    let totalProfitAmount = 0;
    let totalDiscountAmount = 0;
    let totalGp = 0;
    let totalSoldQuantity = 0;

    let categoryParentArray = categories.map(async (category, index) => {
        let categoryEarnAmount = 0;
        let categoryCostAmount = 0;
        let orderQty = 0;
        let exchangeQty = 0;
        let exchangedByQty = 0;
        let refundQty = 0;
        let gpValue = 0;
        
        let orderListItems = await OrderForPos.find({
            branch: branch,
            "products.supplier":  category._id,
            create: {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        }).populate('products.product', 'name price')

        let exchangeListItems = await PosOrderExchange.find({
            branch: branch,
            create: {
                    $gte: isodate(from),
                    $lte: isodate(to)
            },
            $or: [
                {"products.supplier":  category._id},
                {"exchangedBy.supplier":  category._id},
            ]
        }).populate('products.product', 'name price').populate('exchangedBy.product', 'name price')

        let refundListItems = await PosOrderRefund.find({
            branch: branch,
            "products.supplier":  category._id,
            create: {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        }).populate('products.product', 'name price')

        let orderListParentArray = orderListItems.map(async (item, index) => {
            let orderListChildOneArray = item.products.map(async product => {
                if (product.supplier.toString() == category._id.toString()) {
                    categoryEarnAmount += (product.product.price.sell * product.quantity)
                    totalDiscountAmount += (product.discount * product.quantity)
                    categoryCostAmount += (product.product.price.purchase * product.quantity)
                    orderQty += product.quantity
                }
            })

            await Promise.all(orderListChildOneArray)
        })

        await Promise.all(orderListParentArray)


        let exchangeListParentArray = exchangeListItems.map(async (item, index) => {
            let exchangeListChildOneArray = item.products.map(async product => {
                if (product.supplier.toString() == category._id.toString()) {
                    categoryEarnAmount += (product.product.price.sell * product.quantity)
                    totalDiscountAmount += (product.discount * product.quantity)
                    categoryCostAmount += (product.product.price.purchase * product.quantity)
                    exchangeQty += product.quantity
                }
            })
            await Promise.all(exchangeListChildOneArray)

            let exchangeListChildTwoArray = item.exchangedBy.map(async product => {
                if (product.supplier.toString() == category._id.toString()) {
                    categoryEarnAmount -= (product.product.price.sell * product.quantity)
                    totalDiscountAmount -= (product.discount * product.quantity)
                    categoryCostAmount -= (product.product.price.purchase * product.quantity)
                    exchangedByQty += product.quantity
                }
            })
            await Promise.all(exchangeListChildTwoArray)
        })

        await Promise.all(exchangeListParentArray)


        let refundListParentArray = refundListItems.map(async (item, index) => {
            let refundListChildOneArray = item.products.map(async product => {
                if (product.supplier.toString() == category._id.toString()) {
                    categoryEarnAmount -= (product.product.price.sell * product.quantity)
                    totalDiscountAmount -= (product.discount * product.quantity)
                    categoryCostAmount -= (product.product.price.purchase * product.quantity)
                    refundQty += product.quantity
                }
            })
            await Promise.all(refundListChildOneArray)
        })
        await Promise.all(refundListParentArray)


        totalSupplierEarnAmount += categoryEarnAmount
        totalSupplierCostAmount += categoryCostAmount
        totalProfitAmount += (categoryEarnAmount - categoryCostAmount)

        if (categoryEarnAmount != 0) {
            gpValue = (((categoryEarnAmount - categoryCostAmount) / categoryEarnAmount) * 100)
        }
        let quantity = ((orderQty + exchangeQty) - (exchangedByQty + refundQty))
        totalSoldQuantity += quantity

        reportData.push({
            _id: category._id,
            serial: category.serialNo,
            name: category.name,
            earn: (type == 'pdf') ? categoryEarnAmount.toFixed(2) : categoryEarnAmount,
            cost: (type == 'pdf') ? categoryCostAmount.toFixed(2) : categoryCostAmount,
            profit: (type == 'pdf') ? (categoryEarnAmount - categoryCostAmount).toFixed(2) : (categoryEarnAmount - categoryCostAmount),
            gp: (type == 'pdf') ? gpValue.toFixed(2) : gpValue,
            quantity: (type == 'pdf') ? quantity.toFixed(2) : quantity
        })

    })

    await Promise.all(categoryParentArray)

    if (totalSupplierEarnAmount != 0) {
        totalGp = (((totalSupplierEarnAmount - totalSupplierCostAmount) / totalSupplierEarnAmount) * 100)
    }

    process.send({
        reportData,
        totalSupplierEarnAmount,
        totalSupplierCostAmount,
        totalProfitAmount,
        totalDiscountAmount,
        totalSoldQuantity,
        totalGp
    });
});