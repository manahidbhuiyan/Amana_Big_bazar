var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()

const Product = require('../../../../../models/Product');
const SubCategory = require('../../../../../models/SubCategory');
const supplier = require('../../../../../models/Supplier');
const admin = require('../../../../../models/admin/Admin');
const PriceMarkUpDown = require('../../../../../models/Tracking/Transaction/PriceMarkUpDown');


process.on('message', async (msg) => {
    const { branch, condition, type } = msg

    let allDataItems = [];
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    let productOperations = await PriceMarkUpDown.find(condition).sort({ create: 'desc' }).populate('admin', 'name')

    let productOperationsArray = productOperations.map(async singleOperation => {
        let allDataProductsItems = []
        let purchasePriceAvg = 0
        let salePriceAvg = 0
        let productOperationChildArray = singleOperation.products.map(async productInfo => {

            let productSupplier = await Product.findOne({
                barcode: productInfo.barcode,
                branch: branch
            }).populate('subcategory', 'name').populate('supplier', 'name').select('id expireDate')

            if (productSupplier !== null) {
                allDataProductsItems.push([
                    productSupplier.subcategory.name,
                    productInfo.barcode,
                    productInfo.name,
                    (type == 'pdf') ? productInfo.price.previous_purchase.toFixed(2) : productInfo.price.previous_purchase,
                    (type == 'pdf') ? productInfo.price.purchase.toFixed(2) : productInfo.price.purchase,
                    (type == 'pdf') ? (((productInfo.price.purchase - productInfo.price.previous_purchase) / productInfo.price.previous_purchase) * 100).toFixed(2) : (((productInfo.price.purchase - productInfo.price.previous_purchase) / productInfo.price.previous_purchase) * 100),
                    (type == 'pdf') ? productInfo.price.previous_sell.toFixed(2) : productInfo.price.previous_sell,
                    (type == 'pdf') ? productInfo.price.sell.toFixed(2) : productInfo.price.sell,
                    (type == 'pdf') ? (((productInfo.price.sell - productInfo.price.previous_sell) / productInfo.price.previous_sell) * 100).toFixed(2) : (((productInfo.price.sell - productInfo.price.previous_sell) / productInfo.price.previous_sell) * 100),
                    productSupplier.supplier != null ? productSupplier.supplier.name : ''
                ])
            }
            purchasePriceAvg += ((productInfo.price.purchase - productInfo.price.previous_purchase) / productInfo.price.previous_purchase) * 100
            salePriceAvg += ((productInfo.price.sell - productInfo.price.previous_sell) / productInfo.price.previous_sell) * 100
        })

        await Promise.all(productOperationChildArray)
        allDataItems.push({
            serialNo: singleOperation.serialNo,
            admin: singleOperation.admin.name,
            create: ("0" + singleOperation.create.getDate()).slice(-2) + ' ' + months[singleOperation.create.getMonth()] + ', ' + singleOperation.create.getUTCFullYear() + ' ' + singleOperation.create.getHours() + ':' + singleOperation.create.getMinutes(),
            products: allDataProductsItems,
            purchasePriceAvg: (type == 'pdf') ? (purchasePriceAvg / singleOperation.products.length).toFixed(2) : (purchasePriceAvg / singleOperation.products.length),
            salePriceAvg: (type == 'pdf') ? (salePriceAvg / singleOperation.products.length).toFixed(2) : (salePriceAvg / singleOperation.products.length)
        })
    })

    await Promise.all(productOperationsArray)

    if (type == 'excel') {
        let mainData = []

        allDataItems.map((info) => {
            let length = info.products.length
            info.products.map((productsInfo, index) => {
                let dataObj = {}

                dataObj.subcategory = productsInfo[0]
                dataObj.barcode = productsInfo[1]
                dataObj.name = productsInfo[2]
                dataObj.old_cost = productsInfo[3]
                dataObj.new_cost = productsInfo[4]
                dataObj.change_cost = productsInfo[5]
                dataObj.old_sale = productsInfo[6]
                dataObj.new_sale = productsInfo[7]
                dataObj.change_sale = productsInfo[8]
                dataObj.supplier = productsInfo[9]

                if (index == 0) {
                    dataObj.priceMarkId = String(info.serialNo)
                    dataObj.admin = info.admin
                    dataObj.dateTime = info.create
                } else {
                    dataObj.priceMarkId = ' '
                }

                if (index == length - 1) {
                    dataObj.changeCostTotal = info.purchasePriceAvg
                    dataObj.changeSaleTotal = info.salePriceAvg
                }

                mainData.push(dataObj)

            })

            mainData.push({
                priceMarkId: ' ',
                admin: ' ',
                dateTime: ' ',
                subcategory: ' ',
                barcode: ' ',
                name: ' ',
                old_cost: ' ',
                new_cost: ' ',
                change_cost: ' ',
                old_sale: ' ',
                new_sale: ' ',
                change_sale: ' ',
                supplier: ' '
            })

            mainData.push({
                priceMarkId: 'Average: ',
                admin: ' ',
                dateTime: ' ',
                subcategory: ' ',
                barcode: ' ',
                name: ' ',
                old_cost: ' ',
                new_cost: ' ',
                change_cost: info.purchasePriceAvg,
                old_sale: ' ',
                new_sale: ' ',
                change_sale: info.salePriceAvg,
                supplier: ' '
            })

            mainData.push({
                priceMarkId: ' ',
                admin: ' ',
                dateTime: ' ',
                subcategory: ' ',
                barcode: ' ',
                name: ' ',
                old_cost: ' ',
                new_cost: ' ',
                change_cost: ' ',
                old_sale: ' ',
                new_sale: ' ',
                change_sale: ' ',
                supplier: ' '
            })
        })

        process.send({
            mainData
        });
    } else {
        process.send({
            allDataItems
        });
    }

});