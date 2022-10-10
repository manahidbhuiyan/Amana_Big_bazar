var mongoConnection = require('../../../../../../config/connectMongo')
mongoConnection()
const Order = require('../../../../../../models/Order');
const Category = require('../../../../../../models/Category');
const Product = require('../../../../../../models/Product');
const Branch = require('../../../../../../models/Branch')
var isodate = require("isodate");

process.on('message', async (msg) => {
    let { from, to, branch, category, type } = msg

    from = new Date(from)
    to = new Date(to)
    let categoriesOfBranch
    let branches
    let branchWiseSellDetails = []

    if (branch !== 'all'){
        categoriesOfBranch = await Category.find({
            _id: category,
            branch: {
                $in: branch
            }
        }).select('_id name serialNo')
        branches = await Branch.find({_id : branch}).select("name phone address serialNo")
    } else{
        // _id: category ,
            categoriesOfBranch = await Category.find({
                _id: category,
            }).select('_id name serialNo')
        branches = await Branch.find().select('name phone address serialNo')
    }

    let sellList = []
    let productBarcodes = []
    let datetime = []
    let totalSupplierEarnAmount = 0;
    let totalSupplierCostAmount = 0;
    let totalSupplierQuantity = 0;
    let totalGp = 0;
    let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    let branchArray = branches.map(async (branchInfo) =>{
        allCategoryInfo = []
        let categoryParentArray = await categoriesOfBranch.map(async (categoryInfo, index) => {
            let orderListItems = await Order.find({
                branch: branchInfo._id,
                "products.category": categoryInfo._id,
                create: {
                    $gte: isodate(from),
                    $lte: isodate(to)
                }
            }).populate('products.product', 'name price')

        let orderListParentArray = orderListItems.map(async (item, index) => {

            let orderListChildOneArray = item.products.map(async product => {
                if (product.category == categoryInfo._id) {
                    if (productBarcodes.includes(product.code)) {
                        sellList[productBarcodes.indexOf(product.code)].quantity += product.quantity
                        sellList[productBarcodes.indexOf(product.code)].purchaseCost += (product.purchase_price * product.quantity)
                        sellList[productBarcodes.indexOf(product.code)].sellCost += (product.price * product.quantity)
                    } else {
                        productBarcodes.push(product.code)
                        sellList.push({
                            datetime: ("0" + product.date.getDate()).slice(-2) + ' ' + months[product.date.getMonth()] + ', ' + product.date.getUTCFullYear() + '  ' + product.date.toLocaleTimeString(),
                            barcode: product.code,
                            name: product.name,
                            category_code: categoryInfo._id,
                            category_name: categoryInfo.name,
                            branch_serialNo : branchInfo.serialNo,
                            branch_id : branchInfo._id,
                            purchase_price: product.purchase_price,
                            sell_price: product.price.toFixed(2),
                            quantity: product.quantity,
                            purchaseCost: product.purchase_price * product.quantity,
                            sellCost: product.price * product.quantity
                        })
                    }
                }
            })
            await Promise.all(orderListChildOneArray)
        })
        await Promise.all(orderListParentArray)

            let rearrangeSellListArray = sellList.map((sellInfo, index) => {
                totalSupplierEarnAmount += sellInfo.sellCost
                totalSupplierCostAmount += sellInfo.purchaseCost
                totalSupplierQuantity += sellInfo.quantity

                sellList[index].purchase_price = (type == 'pdf') ? sellInfo.purchase_price : sellInfo.purchase_price
                sellList[index].sell_price = (type == 'pdf') ? sellInfo.sell_price : sellInfo.sell_price
                sellList[index].quantity = (type == 'pdf') ? sellInfo.quantity : sellInfo.quantity
                sellList[index].purchaseCost = (type == 'pdf') ? sellInfo.purchaseCost : sellInfo.purchaseCost
                sellList[index].sellCost = (type == 'pdf') ? sellInfo.sellCost : sellInfo.sellCost
                sellList[index].gp = (type == 'pdf') ? (((sellInfo.sellCost - sellInfo.purchaseCost) / sellInfo.sellCost) * 100).toFixed(2) : (((sellInfo.sellCost - sellInfo.purchaseCost) / sellInfo.sellCost) * 100)
            })
            await Promise.all(rearrangeSellListArray)
    })
        await Promise.all(categoryParentArray)
        branchWiseSellDetails.push({
            branch_name : branchInfo.name,
            branch_phone : branchInfo.phone,
            branch_serialNo : branchInfo.serialNo,
            branch_address : branchInfo.address,
            allCategoryData :   sellList = sellList.filter(data => data.branch_serialNo === branchInfo.serialNo && data.branch_id === branchInfo._id ),
        })


        if (totalSupplierEarnAmount != 0) {
            totalGp = (((totalSupplierEarnAmount - totalSupplierCostAmount) / totalSupplierEarnAmount) * 100)
        }
    })
    await Promise.all(branchArray)

    process.send({
        branchWiseSellDetails,
        sellList,
        totalSupplierQuantity,
        totalSupplierCostAmount,
        totalSupplierEarnAmount,
        totalGp,
        categoriesOfBranch
    });
});