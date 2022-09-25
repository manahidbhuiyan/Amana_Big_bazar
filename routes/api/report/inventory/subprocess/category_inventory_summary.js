var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
const Product = require('../../../../../models/Product');
const Category = require('../../../../../models/Category');
const Inventory = require('../../../../../models/Inventory');

process.on('message', async (msg) => {
    const { branch, condition, type } = msg
    let categories = await Category.find(condition).select('_id serialNo name')

    //for grand total
    let totalQuantity = 0;
    let totalCostAmount = 0;
    let totalSellAmount = 0;
    let totalInventoryQuantity = 0;
    let totalDiffUnit = 0;
    let totalDiffUnitCostAmount = 0;
    let totalDiffUnitSellAmount = 0;

    // let totalDiscountAmount = 0;

    let allCategoryData = []

    let categoryParentArray = categories.map(async (category, index) => {
        let productFindCondition = {
            branch: branch,
            category: category._id
        }
        let categoryWiseProductList = await Product.find(productFindCondition)
        let categoryWiseData = {
            _id: category._id,
            serial: category.serialNo,
            name: category.name.trim(),
            // for invdividual product
            products: [],
            //for subtotal
            quantity: 0,
            inventory_quantity: 0,
            cost: 0,
            sell: 0,
            diff_unit: 0,
            diff_unit_cost_amount: 0,
            diff_unit_sell_amount: 0,
        }

        let categoryWiseProductChildOne = categoryWiseProductList.map(async (productInfo, index) => {

            let categoryWiseInventoryProduct = await Inventory.find({ product: productInfo._id })

            if (categoryWiseInventoryProduct.length !== 0) {

                let currentStock = productInfo.quantity
                let inventoryStock = categoryWiseInventoryProduct[0].stock_quantity
                let difference = (inventoryStock - productInfo.quantity)

                categoryWiseData.products.push([
                    productInfo.serialNo,
                    productInfo.name,
                    (type == 'pdf') ? productInfo.quantity.toFixed(2) : productInfo.quantity,
                    (type == 'pdf') ? (productInfo.quantity * productInfo.price.purchase).toFixed(2) : (productInfo.quantity * productInfo.price.purchase),
                    (type == 'pdf') ? (productInfo.quantity * productInfo.price.sell).toFixed(2) : (productInfo.quantity * productInfo.price.sell),
                    (type == 'pdf') ? inventoryStock.toFixed(2) : inventoryStock,
                    (type == 'pdf') ? difference.toFixed(2) : difference,
                    (type == 'pdf') ? (difference * productInfo.price.purchase).toFixed(2) : (difference * productInfo.price.purchase),
                    (type == 'pdf') ? (difference * productInfo.price.sell).toFixed(2) : (difference * productInfo.price.sell)
                ])

                categoryWiseData.quantity += currentStock
                totalQuantity += currentStock

                categoryWiseData.cost += (currentStock * productInfo.price.purchase)
                totalCostAmount += (currentStock * productInfo.price.purchase)

                categoryWiseData.sell += (currentStock * productInfo.price.sell)
                totalSellAmount += (currentStock * productInfo.price.sell)

                categoryWiseData.inventory_quantity += inventoryStock
                totalInventoryQuantity += inventoryStock

                categoryWiseData.diff_unit += difference
                totalDiffUnit += difference

                categoryWiseData.diff_unit_cost_amount += (difference * productInfo.price.purchase)
                totalDiffUnitCostAmount += (difference * productInfo.price.purchase)

                categoryWiseData.diff_unit_sell_amount += (difference * productInfo.price.sell)
                totalDiffUnitSellAmount += (difference * productInfo.price.sell)
            }
        })
        await Promise.all(categoryWiseProductChildOne)

        if (categoryWiseData.diff_unit < 0) {
            categoryWiseData.negative = true
        }
        categoryWiseData.quantity = (type == 'pdf') ? categoryWiseData.quantity.toFixed(2) : categoryWiseData.quantity
        categoryWiseData.cost = (type == 'pdf') ? categoryWiseData.cost.toFixed(2) : categoryWiseData.cost
        categoryWiseData.sell = (type == 'pdf') ? categoryWiseData.sell.toFixed(2) : categoryWiseData.sell
        categoryWiseData.inventory_quantity = (type == 'pdf') ? categoryWiseData.inventory_quantity.toFixed(2) : categoryWiseData.inventory_quantity
        categoryWiseData.diff_unit = (type == 'pdf') ? categoryWiseData.diff_unit.toFixed(2) : categoryWiseData.diff_unit
        categoryWiseData.diff_unit_cost_amount = (type == 'pdf') ? categoryWiseData.diff_unit_cost_amount.toFixed(2) : categoryWiseData.diff_unit_cost_amount
        categoryWiseData.diff_unit_sell_amount = (type == 'pdf') ? categoryWiseData.diff_unit_sell_amount.toFixed(2) : categoryWiseData.diff_unit_sell_amount
        allCategoryData.push(categoryWiseData)
    })

    await Promise.all(categoryParentArray)

    if (type == 'excel') {
        let mainData = []

        allCategoryData.map((info) => {
            let dataObj = {}

            dataObj.supplier = info.name
            dataObj.supplierCode = info.serial
            dataObj.subTotalQty = info.quantity
            dataObj.subtotalcost = info.cost
            dataObj.subtotalsell = info.sell
            dataObj.subtotalInventoryStock = info.inventory_quantity
            dataObj.subtotalDiffUnit = info.diff_unit
            dataObj.subtotalDiffUnitCostAmt = info.diff_unit_cost_amount
            dataObj.subtotalDiffUnitSellAmt = info.diff_unit_sell_amount

            mainData.push(dataObj)

            mainData.push({
                supplier: ' ',
                supplierCode: ' ',
                subTotalQty: ' ',
                subtotalcost: ' ',
                subtotalsell: ' ',
                subtotalInventoryStock: ' ',
                subtotalDiffUnit: ' ',
                subtotalDiffUnitCostAmt: ' ',
                subtotalDiffUnitSellAmt: ' '
            })

        })

        process.send({
            mainData,
            totalCostAmount,
            totalSellAmount,
            totalQuantity,
            totalInventoryQuantity,
            totalDiffUnit,
            totalDiffUnitCostAmount,
            totalDiffUnitSellAmount
        });
    } else {
        process.send({
            allCategoryData,
            totalCostAmount,
            totalSellAmount,
            totalQuantity,
            totalInventoryQuantity,
            totalDiffUnit,
            totalDiffUnitCostAmount,
            totalDiffUnitSellAmount
        });
    }
});