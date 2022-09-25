var mongoConnection = require('../../../../../../config/connectMongo')
mongoConnection()
const Product = require('../../../../../../models/WarehouseProduct');
const Brand = require('../../../../../../models/BrandName');
const Inventory = require('../../../../../../models/WarehouseInventory');

process.on('message', async (msg) => {
    const { condition, type } = msg

    let brands = await Brand.find(condition).select('_id serialNo name')

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

    let brandParentArray = brands.map(async (brand, index) => {
        let productFindCondition = {
            brand: brand._id
        }
        let brandWiseProductList = await Product.find(productFindCondition)

        let categoryWiseData = {
            _id: brand._id,
            serial: brand.serialNo,
            name: brand.name.trim(),
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

        let categoryWiseProductChildOne = brandWiseProductList.map(async (productInfo, index) => {
            let brandWiseInventoryProduct = await Inventory.find({ product: productInfo._id })

            if (brandWiseInventoryProduct.length !== 0) {

                let currentStock = productInfo.quantity
                let inventoryStock = brandWiseInventoryProduct[0].stock_quantity
                let difference = (inventoryStock - productInfo.quantity)

                if (difference >= 0) {
                    categoryWiseData.products.push([
                        productInfo.barcode,
                        productInfo.name,
                        (type == 'pdf') ? productInfo.quantity.toFixed(2) : productInfo.quantity,
                        (type == 'pdf') ? (productInfo.quantity * productInfo.price.purchase).toFixed(2) : (productInfo.quantity * productInfo.price.purchase),
                        (type == 'pdf') ? (productInfo.quantity * productInfo.price.sell).toFixed(2) : (productInfo.quantity * productInfo.price.sell),
                        (type == 'pdf') ? inventoryStock.toFixed(2) : inventoryStock,
                        (type == 'pdf') ? difference.toFixed(2) : difference,
                        (type == 'pdf') ? (difference * productInfo.price.purchase).toFixed(2) : (difference * productInfo.price.purchase),
                        (type == 'pdf') ? (difference * productInfo.price.sell).toFixed(2) : (difference * productInfo.price.sell),
                        (type == 'pdf') ? productInfo.price.purchase.toFixed(2) : productInfo.price.purchase,
                        (type == 'pdf') ? productInfo.price.sell.toFixed(2) : productInfo.price.sell
                    ])
                } else {
                    categoryWiseData.products.push([
                        productInfo.barcode,
                        productInfo.name,
                        (type == 'pdf') ? productInfo.quantity.toFixed(2) : productInfo.quantity,
                        (type == 'pdf') ? (productInfo.quantity * productInfo.price.purchase).toFixed(2) : (productInfo.quantity * productInfo.price.purchase),
                        (type == 'pdf') ? (productInfo.quantity * productInfo.price.sell).toFixed(2) : (productInfo.quantity * productInfo.price.sell),
                        (type == 'pdf') ? inventoryStock.toFixed(2) : inventoryStock,
                        (type == 'pdf') ? difference.toFixed(2) : difference,
                        (type == 'pdf') ? (difference * productInfo.price.purchase).toFixed(2) : (difference * productInfo.price.purchase),
                        (type == 'pdf') ? (difference * productInfo.price.sell).toFixed(2) : (difference * productInfo.price.sell),
                        (type == 'pdf') ? productInfo.price.purchase.toFixed(2) : productInfo.price.purchase,
                        (type == 'pdf') ? productInfo.price.sell.toFixed(2) : productInfo.price.sell,
                        'negative'
                    ])
                }
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

        categoryWiseData.quantity = (type == 'pdf') ? categoryWiseData.quantity.toFixed(2) : categoryWiseData.quantity
        categoryWiseData.cost = (type == 'pdf') ? categoryWiseData.cost.toFixed(2) : categoryWiseData.cost
        categoryWiseData.sell = (type == 'pdf') ? categoryWiseData.sell.toFixed(2) : categoryWiseData.sell
        categoryWiseData.inventory_quantity = (type == 'pdf') ? categoryWiseData.inventory_quantity.toFixed(2) : categoryWiseData.inventory_quantity
        categoryWiseData.diff_unit = (type == 'pdf') ? categoryWiseData.diff_unit.toFixed(2) : categoryWiseData.diff_unit
        categoryWiseData.diff_unit_cost_amount = (type == 'pdf') ? categoryWiseData.diff_unit_cost_amount.toFixed(2) : categoryWiseData.diff_unit_cost_amount
        categoryWiseData.diff_unit_sell_amount = (type == 'pdf') ? categoryWiseData.diff_unit_sell_amount.toFixed(2) : categoryWiseData.diff_unit_sell_amount
        allCategoryData.push(categoryWiseData)
    })

    await Promise.all(brandParentArray)

    if (type == 'excel') {
        let mainData = []
        allCategoryData.map((info) => {
            if (info.products.length != 0) {
                info.products.map((productsInfo, index) => {
                    let dataObj = {}

                    dataObj.barcode = productsInfo[0]
                    dataObj.productName = productsInfo[1]
                    dataObj.quantity = productsInfo[2]
                    dataObj.costAmount = productsInfo[3]
                    dataObj.sellAmount = productsInfo[4]
                    dataObj.inventoryStock = productsInfo[5]
                    dataObj.difference = productsInfo[6]
                    dataObj.diffUnitCostAmt = productsInfo[7]
                    dataObj.diffUnitSellAmt = productsInfo[8]
                    dataObj.costPrice = productsInfo[9]
                    dataObj.sellPrice = productsInfo[10]

                    if (index == 0) {
                        dataObj.supplier = info.name
                    }
                    mainData.push(dataObj)
                })
            } else {
                let dataObj = {}
                dataObj.supplier = info.name
                dataObj.barcode = ' '
                mainData.push(dataObj)
            }
            mainData.push({
                supplier: ' ',
                barcode: ' ',
                productName: ' ',
                quantity: ' ',
                costAmount: ' ',
                sellAmount: ' ',
                inventoryStock: ' ',
                difference: ' ',
                diffUnitCostAmt: ' ',
                diffUnitSellAmt: ' ',
                costPrice: ' ',
                sellPrice: ' '
            })

            mainData.push({
                supplier: 'Subtotal: ',
                productName: ' ',
                barcode: ' ',
                quantity: info.quantity,
                costAmount: info.cost,
                sellAmount: info.sell,
                inventoryStock: info.inventory_quantity,
                difference: info.diff_unit,
                diffUnitCostAmt: info.diff_unit_cost_amount,
                diffUnitSellAmt: info.diff_unit_sell_amount,
                costPrice: ' ',
                sellPrice: ' '
            })

            mainData.push({
                supplier: ' ',
                barcode: ' ',
                productName: ' ',
                quantity: ' ',
                costAmount: ' ',
                sellAmount: ' ',
                inventoryStock: ' ',
                difference: ' ',
                diffUnitCostAmt: ' ',
                diffUnitSellAmt: ' ',
                costPrice: ' ',
                sellPrice: ' '
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