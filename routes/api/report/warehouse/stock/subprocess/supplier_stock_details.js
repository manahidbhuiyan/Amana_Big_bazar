var mongoConnection = require('../../../../../../config/connectMongo')
mongoConnection()
const Product = require('../../../../../../models/WarehouseProduct');
const Supplier = require('../../../../../../models/Supplier');

process.on('message', async (msg) => {
    const { condition, zero_stock, type } = msg

    let suppliers = await Supplier.find(condition).select('_id serialNo name')


    let totalQuantity = 0;
    let totalCostAmount = 0;
    let totalSellAmount = 0;

    let allCategoryData = []

    let mainSupplierArray = suppliers.map(async (category, index) => {

        let productFindCondition = {
            supplier: category._id
        }

        if (zero_stock == true) {
            productFindCondition.quantity = 0
        }

        let categoryWiseProductList = await Product.find(productFindCondition)

        let categoryWiseData = {
            _id: category._id,
            serial: category.serialNo,
            name: category.name.trim(),
            products: [],
            quantity: 0,
            cost: 0,
            sell: 0,
            gpValue: 0
        }

        let childArrayList = categoryWiseProductList.map((productInfo, index) => {

            let CostAmount = productInfo.quantity * productInfo.price.purchase
            let SellAmount = productInfo.quantity * productInfo.price.sell
            let gp = 0
            if (SellAmount != 0) {
                gp = ((SellAmount - CostAmount) / SellAmount) * 100
            }

            categoryWiseData.products.push([
                productInfo.barcode,
                productInfo.name,
                (type == 'pdf') ? productInfo.quantity.toFixed(2) : productInfo.quantity,
                (type == 'pdf') ? (productInfo.price.purchase).toFixed(2) : (productInfo.price.purchase),
                (type == 'pdf') ? (productInfo.price.sell).toFixed(2) : (productInfo.price.sell),
                (type == 'pdf') ? (productInfo.quantity * productInfo.price.purchase).toFixed(2) : (productInfo.quantity * productInfo.price.purchase),
                (type == 'pdf') ? (productInfo.quantity * productInfo.price.sell).toFixed(2) : (productInfo.quantity * productInfo.price.sell),
                (type == 'pdf') ? gp.toFixed(2) : gp
            ])

            categoryWiseData.serial = productInfo.serialNo
            categoryWiseData.quantity += productInfo.quantity
            totalQuantity += productInfo.quantity
            categoryWiseData.cost += (productInfo.quantity * productInfo.price.purchase)
            totalCostAmount += (productInfo.quantity * productInfo.price.purchase)
            categoryWiseData.sell += (productInfo.quantity * productInfo.price.sell)
            totalSellAmount += (productInfo.quantity * productInfo.price.sell)
        })

        await Promise.all(childArrayList)

        if (categoryWiseData.sell != 0) {
            categoryWiseData.gpValue = (((categoryWiseData.sell - categoryWiseData.cost) / categoryWiseData.sell) * 100)
        }
        categoryWiseData.quantity = (type == 'pdf') ? categoryWiseData.quantity.toFixed(2) : categoryWiseData.quantity
        categoryWiseData.cost = (type == 'pdf') ? categoryWiseData.cost.toFixed(2) : categoryWiseData.cost
        categoryWiseData.sell = (type == 'pdf') ? categoryWiseData.sell.toFixed(2) : categoryWiseData.sell
        categoryWiseData.gpValue = (type == 'pdf') ? categoryWiseData.gpValue.toFixed(2) : categoryWiseData.gpValue
        allCategoryData.push(categoryWiseData)
    })
    await Promise.all(mainSupplierArray)

    let totalGp = 0
    if (totalSellAmount != 0) {
        totalGp = (((totalSellAmount - totalCostAmount) / totalSellAmount) * 100)
    }

    if (type == 'excel') {
        let mainData = []

        allCategoryData.map((info) => {
            if (info.products.length != 0) {
                info.products.map((productsInfo, index) => {
                    let dataObj = {}
                    dataObj.barcode = productsInfo[0]
                    dataObj.productName = productsInfo[1]
                    dataObj.quantity = productsInfo[2]
                    dataObj.cost_price = productsInfo[3]
                    dataObj.sell_price = productsInfo[4]
                    dataObj.total_cost_price = productsInfo[5]
                    dataObj.total_sell_price = productsInfo[6]
                    dataObj.gp = productsInfo[7]

                    if (index == 0) {
                        dataObj.category = info.name
                    }

                    mainData.push(dataObj)
                })
            } else {
                let dataObj = {}
                dataObj.category = info.name
                dataObj.barcode = ' '
                mainData.push(dataObj)
            }
            mainData.push({
                barcode: ' ',
                productName: ' ',
                brand: ' ',
                quantity: ' ',
                cost_price: ' ',
                sell_price: ' ',
                total_cost_price: ' ',
                total_sell_price: ' ',
                gp: ' '
            })

            mainData.push({
                barcode: 'Subtotal: ',
                productName: ' ',
                brand: ' ',
                quantity: info.quantity,
                cost_price: ' ',
                sell_price: ' ',
                total_cost_price: info.cost,
                total_sell_price: info.sell,
                gp: info.gpValue
            })

            mainData.push({
                barcode: ' ',
                productName: ' ',
                brand: ' ',
                quantity: ' ',
                cost_price: ' ',
                sell_price: ' ',
                total_cost_price: ' ',
                total_sell_price: ' ',
                gp: ' '
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