var mongoConnection = require('../../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");
const Supplier = require('../../../../../../models/Supplier');
const ReturnFromSupplier = require('../../../../../../models/Tracking/WarehouseTransaction/ReturnToSupplier');

process.on('message', async (msg) => {
    let { from, to, supplier, type } = msg

    from = new Date(from)
    to = new Date(to)

    let allSupplierInfo = []
    let grandTotalQuantity = 0
    let grandTotalAmount = 0
    let grandTotalSellAmount = 0

    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    let supplierRecevingData = await ReturnFromSupplier.find({
        supplier: supplier,
        create: {
            $gte: isodate(from),
            $lte: isodate(to)
        }
    }).select('_id serialNo totalAmount totalQuantity create products').populate('supplier', 'name')

    let supplierInfoDataList = []
    let supplierTotalQuantity = 0
    let supplierTotalAmount = 0
    let supplierTotalSellAmount = 0

    let childArray = await supplierRecevingData.map(async (returnInfo, index) => {
        let creatreDate = new Date(returnInfo.create)
        let singleReturnInfo = [[]]
        let subtotalSell = 0

        let grandChild = await returnInfo.products.map((productInfo, index) => {
            let singleProductInfo = []
            let totalSell = (productInfo.price.sell * productInfo.quantity)
            let totalCost = productInfo.total
            subtotalSell += totalSell
            singleProductInfo.push(productInfo.barcode)
            singleProductInfo.push(productInfo.name)
            singleProductInfo.push((type == 'pdf') ? productInfo.price.purchase.toFixed(2) : productInfo.price.purchase)
            singleProductInfo.push((type == 'pdf') ? productInfo.price.sell.toFixed(2) : productInfo.price.sell)
            singleProductInfo.push((type == 'pdf') ? productInfo.quantity.toFixed(2) : productInfo.quantity)
            singleProductInfo.push((type == 'pdf') ? totalCost.toFixed(2) : totalCost)
            singleProductInfo.push((type == 'pdf') ? totalSell.toFixed(2) : totalSell)
            singleProductInfo.push((type == 'pdf') ? (((totalSell - totalCost) / totalSell) * 100).toFixed(2) : (((totalSell - totalCost) / totalSell) * 100))
            singleReturnInfo[0].push(singleProductInfo)
        })

        await Promise.all(grandChild);
        singleReturnInfo.push(returnInfo.serialNo)
        singleReturnInfo.push(("0" + creatreDate.getDate()).slice(-2) + ' ' + months[creatreDate.getMonth()] + ', ' + creatreDate.getUTCFullYear())
        singleReturnInfo.push((type == 'pdf') ? returnInfo.totalQuantity.toFixed(2) : returnInfo.totalQuantity)
        singleReturnInfo.push((type == 'pdf') ? returnInfo.totalAmount.toFixed(2) : returnInfo.totalAmount)
        singleReturnInfo.push((type == 'pdf') ? subtotalSell.toFixed(2) : subtotalSell)
        singleReturnInfo.push((type == 'pdf') ? (((subtotalSell - returnInfo.totalAmount) / subtotalSell) * 100).toFixed(2) : (((subtotalSell - returnInfo.totalAmount) / subtotalSell) * 100))
        supplierInfoDataList.push(singleReturnInfo)
        supplierTotalQuantity += returnInfo.totalQuantity
        supplierTotalAmount += returnInfo.totalAmount
        supplierTotalSellAmount += subtotalSell
    })

    await Promise.all(childArray);

    grandTotalAmount += supplierTotalAmount
    grandTotalQuantity += supplierTotalQuantity
    grandTotalSellAmount += supplierTotalSellAmount

    let supplierInformations = await Supplier.findById(supplier);

    allSupplierInfo.push({
        supplier: supplierInformations.name,
        data: supplierInfoDataList,
        supplierTotalQuantity: (type == 'pdf') ? supplierTotalQuantity.toFixed(2) : supplierTotalQuantity,
        supplierTotalAmount: (type == 'pdf') ? supplierTotalAmount.toFixed(2) : supplierTotalAmount,
        supplierTotalSellAmount: (type == 'pdf') ? supplierTotalSellAmount.toFixed(2) : supplierTotalSellAmount,
        totalGP: (type == 'pdf') ? (((supplierTotalSellAmount - supplierTotalAmount) / supplierTotalSellAmount) * 100).toFixed(2) : (((supplierTotalSellAmount - supplierTotalAmount) / supplierTotalSellAmount) * 100)
    })

    if (type == 'excel') {
        let mainData = []

        allSupplierInfo.map((info) => {

            info.data.map((productsInfo, index1) => {
                mainData.push({
                    barcode: ' ',
                    productName: ' ',
                    unitCost: ' ',
                    unitSell: ' ',
                    receiceQTY: ' ',
                    costAmount: ' ',
                    sellAmount: ' ',
                    gp: ' '
                })
                mainData.push({
                    barcode: 'Supplier: ' + info.supplier,
                    productName: ' ',
                    unitCost: 'Return No: ' + productsInfo[1],
                    unitSell: ' ',
                    receiceQTY: 'Date: ' + productsInfo[2],
                    costAmount: ' ',
                    sellAmount: ' ',
                    gp: ' '
                })
                mainData.push({
                    barcode: ' ',
                    productName: ' ',
                    unitCost: ' ',
                    unitSell: ' ',
                    receiceQTY: ' ',
                    costAmount: ' ',
                    sellAmount: ' ',
                    gp: ' '
                })
                productsInfo[0].map((productdDetais, index) => {

                    let dataObj = {}

                    dataObj.barcode = productdDetais[0]
                    dataObj.productName = productdDetais[1]
                    dataObj.unitCost = productdDetais[2]
                    dataObj.unitSell = productdDetais[3]
                    dataObj.receiceQTY = productdDetais[4]
                    dataObj.costAmount = productdDetais[5]
                    dataObj.sellAmount = productdDetais[6]
                    dataObj.gp = productdDetais[7]

                    mainData.push(dataObj)

                })

                mainData.push({
                    barcode: ' ',
                    productName: ' ',
                    unitCost: ' ',
                    unitSell: ' ',
                    receiceQTY: ' ',
                    costAmount: ' ',
                    sellAmount: ' ',
                    gp: ' '
                })

                mainData.push({
                    barcode: 'Subtotal: ',
                    productName: ' ',
                    unitCost: ' ',
                    unitSell: ' ',
                    receiceQTY: productsInfo[3],
                    costAmount: productsInfo[4],
                    sellAmount: productsInfo[5],
                    gp: ' '
                })

                mainData.push({
                    barcode: 'Total: ',
                    productName: ' ',
                    unitCost: ' ',
                    unitSell: ' ',
                    receiceQTY: productsInfo[3],
                    costAmount: productsInfo[4],
                    sellAmount: productsInfo[5],
                    gp: productsInfo[6]
                })

                mainData.push({
                    barcode: ' ',
                    productName: ' ',
                    unitCost: ' ',
                    unitSell: ' ',
                    receiceQTY: ' ',
                    costAmount: ' ',
                    sellAmount: ' ',
                    gp: ' '
                })

            })
        })
        process.send({
            mainData,
            grandTotalQuantity,
            grandTotalAmount,
            grandTotalSellAmount,
            supplierInformations
        });
    } else {
        process.send({
            allSupplierInfo,
            grandTotalQuantity,
            grandTotalAmount,
            grandTotalSellAmount
        });
    }
});