var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
const Product = require('../../../../../models/Product');
const Supplier = require('../../../../../models/Supplier');

process.on('message', async (msg) => {
    const { branch, condition, type } = msg

    let suppliers = await Supplier.find(condition).select('_id serialNo name')

    let totalQuantity = 0;
    let totalreorderLevel = 0;
    let totalLessQunatity = 0;

    let allCategoryData = []

    let mainSupplierArray = suppliers.map(async (category, index) => {

        let productFindCondition = {
            branch: branch,
            supplier: category._id,
            reorderLevel: {
                $gt: 0
            },
            isAvailable: true
        }
        let categoryWiseProductList = await Product.find(productFindCondition)
        let categoryWiseData = {
            _id: category._id,
            serial: category.serialNo,
            name: category.name.trim(),
            products: [],
            quantity: 0,
            reorder_level: 0,
            less_quantity: 0,
        }

        let childArrayList = categoryWiseProductList.map((productInfo, index) => {
            if (productInfo.quantity < productInfo.reorderLevel) {
                categoryWiseData.products.push([
                    productInfo.barcode,
                    productInfo.name,
                    (type == 'pdf') ? (productInfo.price.purchase).toFixed(2) : (productInfo.price.purchase),
                    (type == 'pdf') ? (productInfo.price.sell).toFixed(2) : (productInfo.price.sell),
                    (type == 'pdf') ? productInfo.quantity.toFixed(2) : productInfo.quantity,
                    (type == 'pdf') ? productInfo.reorderLevel.toFixed(2) : productInfo.reorderLevel,
                    (type == 'pdf') ? (productInfo.reorderLevel - productInfo.quantity).toFixed(2) : (productInfo.reorderLevel - productInfo.quantity),
                ])

                categoryWiseData.serial = productInfo.serialNo
                categoryWiseData.quantity += productInfo.quantity
                totalQuantity += productInfo.quantity
                categoryWiseData.reorder_level += productInfo.reorderLevel
                totalreorderLevel += productInfo.reorderLevel
                categoryWiseData.less_quantity += (productInfo.reorderLevel - productInfo.quantity)
                totalLessQunatity += (productInfo.reorderLevel - productInfo.quantity)

            }

            if (categoryWiseProductList.length == (index + 1)) {
                categoryWiseData.quantity = (type == 'pdf') ? categoryWiseData.quantity.toFixed(2) : categoryWiseData.quantity
                categoryWiseData.reorder_level = (type == 'pdf') ? categoryWiseData.reorder_level.toFixed(2) : categoryWiseData.reorder_level
                categoryWiseData.less_quantity = (type == 'pdf') ? categoryWiseData.less_quantity.toFixed(2) : categoryWiseData.less_quantity
                allCategoryData.push(categoryWiseData)
            }

        })
        await Promise.all(childArrayList)
    })
    await Promise.all(mainSupplierArray)

    if (type == 'excel') {
        let mainData = []

        allCategoryData.map((info) => {
            info.products.map((productsInfo, index) => {
                let length = info.products.length
                let dataObj = {}

                dataObj.barcode = productsInfo[0]
                dataObj.productName = productsInfo[1]
                dataObj.unitCost = productsInfo[2]
                dataObj.unitSell = productsInfo[3]
                dataObj.quantity = productsInfo[4]
                dataObj.reorderLevel = productsInfo[5]
                dataObj.less_quantity = productsInfo[6]

                if (index == 0) {
                    dataObj.supplier = info.name
                }

                if (index == length - 1) {
                    dataObj.subTotalQty = info.quantity
                    dataObj.subtotalReorderLevel = info.reorder_level
                    dataObj.subtotalLessQuantity = info.less_quantity
                }
                mainData.push(dataObj)

            })

            mainData.push({
                supplier: ' ',
                barcode: ' ',
                productName: ' ',
                unitCost: ' ',
                unitSell: ' ',
                quantity: ' ',
                reorderLevel: ' ',
                less_quantity: ' '
            })

            mainData.push({
                supplier: 'Subtotal: ',
                barcode: ' ',
                productName: ' ',
                unitCost: ' ',
                unitSell: ' ',
                quantity: info.quantity,
                reorderLevel: info.reorder_level,
                less_quantity: info.less_quantity
            })

            mainData.push({
                supplier: ' ',
                barcode: ' ',
                productName: ' ',
                unitCost: ' ',
                unitSell: ' ',
                quantity: ' ',
                reorderLevel: ' ',
                less_quantity: ' '
            })
        })
        process.send({
            mainData,
            totalQuantity,
            totalreorderLevel,
            totalLessQunatity
        });
    } else {
        process.send({
            allCategoryData,
            totalQuantity,
            totalreorderLevel,
            totalLessQunatity
        });
    }
});