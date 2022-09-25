var mongoConnection = require('../../../../../../config/connectMongo')
mongoConnection()
const Order = require('../../../../../../models/Order');
const SubCategory = require('../../../../../../models/SubCategory');
const Product = require('../../../../../../models/Product');
var isodate = require("isodate");

process.on('message', async (msg) => {
    let { from, to, branch, type } = msg

    from = new Date(from)
    to = new Date(to)

    let categories = await SubCategory.find({
        branch: {
            $in: branch
        }
    }).select('_id name serialNo')


    let reportData = []

    let totalSubCategoryEarnAmount = 0;
    let totalSubCategoryCostAmount = 0;
    let totalProfitAmount = 0;
    let totalDiscountAmount = 0;
    let totalGp = 0;
    let totalSoldQuantity = 0;

    let categoryParentArray = categories.map(async (category, index) => {
        let categoryEarnAmount = 0;
        let categoryCostAmount = 0;
        let orderQty = 0;
        let gpValue = 0;
        let orderListItems = await Order.find({
            branch: branch,
            "products.subcategory":  category._id,
            create: {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        }).populate('products.product', 'name price')
        // console.log("orderListItems",orderListItems)

        let orderListParentArray = orderListItems.map(async (item, index) => {
            let orderListChildOneArray = item.products.map(async product => {
                if (product.subcategory.toString() == category._id.toString()) {
                    categoryEarnAmount += (product.price * product.quantity)
                    totalDiscountAmount += (product.discount * product.quantity)
                    categoryCostAmount += (product.purchase_price * product.quantity)
                    orderQty += product.quantity
                }
            })
            await Promise.all(orderListChildOneArray)
        })
        await Promise.all(orderListParentArray)


        totalSubCategoryEarnAmount += categoryEarnAmount
        totalSubCategoryCostAmount += categoryCostAmount
        totalProfitAmount += (categoryEarnAmount - categoryCostAmount)

        if (categoryEarnAmount != 0) {
            gpValue = (((categoryEarnAmount - categoryCostAmount) / categoryEarnAmount) * 100)
        }
        let quantity = orderQty
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

    if (totalSubCategoryEarnAmount != 0) {
        totalGp = (((totalSubCategoryEarnAmount - totalSubCategoryCostAmount) / totalSubCategoryEarnAmount) * 100)
    }

    process.send({
        reportData,
        totalSubCategoryEarnAmount,
        totalSubCategoryCostAmount,
        totalProfitAmount,
        totalDiscountAmount,
        totalSoldQuantity,
        totalGp
    });
});