var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
const Product = require('../../../../../models/Product');
const supplier = require('../../../../../models/Supplier');
const admin = require('../../../../../models/admin/Admin');
const ProductDisposal = require('../../../../../models/Tracking/Transaction/ProductDisposal');

process.on('message', async (msg) => {
    const { branch, condition, type } = msg

    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    let productOperations = await ProductDisposal.find(condition).sort({ create: 'desc' }).populate('admin', 'name')


    let allDataItems = [];

    let grandTotalQuantity = 0
    let grandTotalCostAmount = 0
    let grandTotalSaleAmount = 0

    let productOperationsArray = productOperations.map(async singleOperation => {

        let allDataProductsItems = []
        let totalQuantity = 0
        let totalCostAmount = 0
        let totalSaleAmount = 0
        let productOperationChildArray = singleOperation.products.map(async productInfo => {

            let productSupplier = await Product.findOne({
                _id: productInfo._id,
                branch: branch
            }).populate('supplier', 'name').select('id expireDate')

            if (productSupplier !== null && productSupplier.supplier !== null) {
                allDataProductsItems.push([
                    productInfo.name,
                    productSupplier.supplier.name,
                    productSupplier.expireDate == null ? '-' : (("0" + productSupplier.expireDate.getDate()).slice(-2) + ' ' + months[productSupplier.expireDate.getMonth()] + ', ' + productSupplier.expireDate.getUTCFullYear()),
                    productInfo.price.purchase,
                    productInfo.price.sell,
                    (type == 'pdf') ? (productInfo.disposal).toFixed(2) : (productInfo.disposal),
                    (type == 'pdf') ? (productInfo.price.purchase * productInfo.disposal).toFixed(2) : (productInfo.price.purchase * productInfo.disposal),
                    (type == 'pdf') ? (productInfo.price.sell * productInfo.disposal).toFixed(2) : (productInfo.price.sell * productInfo.disposal)
                ])
            }
            totalQuantity += productInfo.disposal
            totalCostAmount += productInfo.price.purchase * productInfo.disposal
            totalSaleAmount += productInfo.price.sell * productInfo.disposal
        })

        await Promise.all(productOperationChildArray)
        allDataItems.push({
            serialNo: singleOperation.serialNo,
            admin: singleOperation.admin.name,
            create: ("0" + singleOperation.create.getDate()).slice(-2) + ' ' + months[singleOperation.create.getMonth()] + ', ' + singleOperation.create.getUTCFullYear() + ' ' + singleOperation.create.getHours() + ':' + singleOperation.create.getMinutes(),
            products: allDataProductsItems,
            totalQuantity: (type == 'pdf') ? totalQuantity.toFixed(2) : totalQuantity,
            totalCostAmount: (type == 'pdf') ? totalCostAmount.toFixed(2) : totalCostAmount,
            totalSaleAmount: (type == 'pdf') ? totalSaleAmount.toFixed(2) : totalSaleAmount
        })

        grandTotalQuantity += totalQuantity
        grandTotalCostAmount += totalCostAmount
        grandTotalSaleAmount += totalSaleAmount
    })

    await Promise.all(productOperationsArray)

    if (type == 'excel') {
        let mainData = []

        allDataItems.map((info) => {
            info.products.map((productsInfo, index) => {
                let dataObj = {}

                dataObj.name = productsInfo[0]
                dataObj.supplierName = productsInfo[1]
                dataObj.expireDate = productsInfo[2]
                dataObj.cost_price = productsInfo[3]
                dataObj.sell_price = productsInfo[4]
                dataObj.disposeQuantity = productsInfo[5]
                dataObj.cost_amount = productsInfo[6]
                dataObj.sell_amount = productsInfo[7]


                if (index == 0) {
                    dataObj.disposeId = info.serialNo
                    dataObj.admin = info.admin
                    dataObj.dateTime = info.create
                } else {
                    dataObj.disposeId = ' '
                }

                mainData.push(dataObj)

            })

            mainData.push({
                disposeId: ' ',
                admin: ' ',
                dateTime: ' ',
                name: ' ',
                supplierName: ' ',
                expireDate: ' ',
                cost_price: ' ',
                sell_price: ' ',
                disposeQuantity: ' ',
                cost_amount: ' ',
                sell_amount: ' '
            })

            mainData.push({
                disposeId: 'Dispose Id Wise Total: ',
                admin: ' ',
                dateTime: ' ',
                name: ' ',
                supplierName: ' ',
                expireDate: ' ',
                cost_price: ' ',
                sell_price: ' ',
                disposeQuantity: info.totalQuantity,
                cost_amount: info.totalCostAmount,
                sell_amount: info.totalSaleAmount
            })

            mainData.push({
                disposeId: ' ',
                admin: ' ',
                dateTime: ' ',
                name: ' ',
                supplierName: ' ',
                expireDate: ' ',
                cost_price: ' ',
                sell_price: ' ',
                disposeQuantity: ' ',
                cost_amount: ' ',
                sell_amount: ' '
            })
        })
        process.send({
            mainData,
            grandTotalQuantity,
            grandTotalCostAmount,
            grandTotalSaleAmount
        });
    } else {
        process.send({
            allDataItems,
            grandTotalQuantity,
            grandTotalCostAmount,
            grandTotalSaleAmount
        });
    }
});