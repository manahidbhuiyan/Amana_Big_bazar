var mongoConnection = require('../../../../../../config/connectMongo')
mongoConnection()
const Order = require('../../../../../../models/Order');
const Category = require('../../../../../../models/Category');
const Product = require('../../../../../../models/Product');
const Branch = require('../../../../../../models/Branch');
var isodate = require("isodate");

process.on('message', async (msg) => {
    let { from, to, branch, type } = msg
    from = new Date(from)
    to = new Date(to)
    let categoriesOfBranch
    let branches
    let branchWiseSell = []
    let allCategoryInfo = []


    if(branch !== "all"){
        categoriesOfBranch = await Category.find({
            branch: {
                $in: branch
            }
        }).select('_id name serialNo')
        branches = await Branch.find({_id : branch}).select("name phone address serialNo")
    }
    else{
        categoriesOfBranch = await Category.find()
        branches = await Branch.find().select('name phone address serialNo')
    }


    let totalCategoryEarnAmount = 0;
    let totalCategoryCostAmount = 0;
    let totalProfitAmount = 0;
    let totalDiscountAmount = 0;
    let totalGp = 0;
    let totalSoldQuantity = 0;
    let reportData = []

    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let branchArray = branches.map(async (branchInfo) => {
        allCategoryInfo = []
        let categoryParentArray = await categoriesOfBranch.map(async (categoryInfo, index) => {
            let orderListItems = await Order.find({
                "products.category": categoryInfo._id,
                branch: branchInfo._id,
                create: {
                    $gte: isodate(from),
                    $lte: isodate(to)
                }
            }).populate('products.product', 'name price')

            let categoryEarnAmount = 0;
            let categoryCostAmount = 0;
            let orderQty = 0;
            let gpValue = 0;

            let orderListParentArray = orderListItems.map(async (item, index) => {
                let orderListChildOneArray = item.products.map(async product => {
                    if (product.category.toString() == categoryInfo._id.toString()) {
                        categoryEarnAmount += (product.price * product.quantity)
                        totalDiscountAmount += (product.discount * product.quantity)
                        categoryCostAmount += (product.purchase_price * product.quantity)
                        orderQty += product.quantity
                    }
                })
                await Promise.all(orderListChildOneArray)
            })
            await Promise.all(orderListParentArray)

               totalCategoryEarnAmount += categoryEarnAmount
               totalCategoryCostAmount += categoryCostAmount
               totalProfitAmount += (categoryEarnAmount - categoryCostAmount)

               if (categoryEarnAmount != 0) {
                   gpValue = (((categoryEarnAmount - categoryCostAmount) / categoryEarnAmount) * 100)
               }
               let quantity = orderQty
               totalSoldQuantity += quantity

               if (totalCategoryEarnAmount != 0) {
                   totalGp = (((totalCategoryEarnAmount - totalCategoryCostAmount) / totalCategoryEarnAmount) * 100)
               }

            reportData.push({
                _id: categoryInfo._id,
                serial: categoryInfo.serialNo,
                branch_serialNo : branchInfo.serialNo,
                name: categoryInfo.name,
                earn: (type == 'pdf') ? categoryEarnAmount.toFixed(2) : categoryEarnAmount,
                cost: (type == 'pdf') ? categoryCostAmount.toFixed(2) : categoryCostAmount,
                profit: (type == 'pdf') ? (categoryEarnAmount - categoryCostAmount).toFixed(2) : (categoryEarnAmount - categoryCostAmount),
                gp: (type == 'pdf') ? gpValue.toFixed(2) : gpValue,
                quantity: (type == 'pdf') ? quantity.toFixed(2) : quantity
            })
        })
        await Promise.all(categoryParentArray)
        branchWiseSell.push({
            branch_name : branchInfo.name,
            branch_phone : branchInfo.phone,
            branch_serialNo : branchInfo.serialNo,
            branch_address : branchInfo.address,
            allCategoryData : reportData = reportData.filter(data => data.branch_serialNo === branchInfo.serialNo)
        })
        // console.log("branchWiseSell",branchWiseSell)
        // console.log("reportData",reportData)
        // console.log("totalSupplierQuantity",totalSoldQuantity)

    })

    await Promise.all(branchArray)
    process.send({
        branchWiseSell,
        // branch_name,
        reportData,
        totalCategoryEarnAmount,
        totalCategoryCostAmount,
        totalProfitAmount,
        totalDiscountAmount,
        totalSoldQuantity,
        totalGp
    });
});

