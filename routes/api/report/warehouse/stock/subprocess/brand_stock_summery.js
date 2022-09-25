var mongoConnection = require('../../../../../../config/connectMongo')
mongoConnection()
const Product = require('../../../../../../models/WarehouseProduct');
const Brand = require('../../../../../../models/BrandName');

process.on('message', async (msg) => {
    const { condition, type } = msg

    let brands = await Brand.find(condition).select('_id serialNo name')

    let totalQuantity = 0;
    let totalCostAmount = 0;
    let totalSellAmount = 0;

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
            quantity: 0,
            cost: 0,
            sell: 0,
            gpValue: 0
        }

        let categoryWiseProductChildOne = brandWiseProductList.map(async (productInfo, index) => {

            let currentStock = productInfo.quantity

            categoryWiseData.quantity += currentStock
            totalQuantity += currentStock
            categoryWiseData.cost += (currentStock * productInfo.price.purchase)
            totalCostAmount += (currentStock * productInfo.price.purchase)
            categoryWiseData.sell += (currentStock * productInfo.price.sell)
            totalSellAmount += (currentStock * productInfo.price.sell)
        })

        await Promise.all(categoryWiseProductChildOne)

        if (categoryWiseData.sell != 0) {
            categoryWiseData.gpValue = (((categoryWiseData.sell - categoryWiseData.cost) / categoryWiseData.sell) * 100)
        }

        categoryWiseData.quantity = (type == 'pdf') ? categoryWiseData.quantity.toFixed(2) : categoryWiseData.quantity
        categoryWiseData.cost = (type == 'pdf') ? categoryWiseData.cost.toFixed(2) : categoryWiseData.cost
        categoryWiseData.sell = (type == 'pdf') ? categoryWiseData.sell.toFixed(2) : categoryWiseData.sell
        categoryWiseData.gpValue = (type == 'pdf') ? categoryWiseData.gpValue.toFixed(2) : categoryWiseData.gpValue
        allCategoryData.push(categoryWiseData)
    })

    await Promise.all(brandParentArray)

    let totalGp = 0
    if (totalSellAmount != 0) {
        totalGp = (((totalSellAmount - totalCostAmount) / totalSellAmount) * 100)
    }

    if (type == 'excel') {
        let mainData = []

        allCategoryData.map((info) => {
            let dataObj = {}
            dataObj.serial = info.serial
            dataObj.name = info.name
            dataObj.quantity = info.quantity
            dataObj.cost_price = info.cost
            dataObj.sell_price = info.sell
            dataObj.gpValue = info.gpValue

            mainData.push(dataObj)

            mainData.push({
                serial: ' ',
                name: ' ',
                brand: ' ',
                quantity: ' ',
                cost_price: ' ',
                sell_price: ' ',
                gpValue: ' '
            })
        })

        process.send({
            mainData,
            totalCostAmount,
            totalSellAmount,
            totalQuantity,
            totalGp
        });
    } else {
        process.send({
            allCategoryData,
            totalCostAmount,
            totalSellAmount,
            totalQuantity,
            totalGp
        });
    }

});