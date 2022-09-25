var mongoConnection = require('../../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");
const Supplier = require('../../../../../../models/Supplier');
const ReturnFromSupplier = require('../../../../../../models/Tracking/WarehouseTransaction/ReturnToSupplier');

process.on('message', async (msg) => {
    let { from, to, type } = msg

    from = new Date(from)
    to = new Date(to)

    let supplierOfBranch = await Supplier.find({
        warehouseSupplier: true,
        activeSupplier: true
    }).select("_id name")


    let allSupplierInfo = []
    let grandTotalQuantity = 0
    let grandTotalAmount = 0
    let grandTotalSellAmount = 0

    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    let finalArray = await supplierOfBranch.map(async (supplierInfo, index) => {
        let supplierRecevingData = await ReturnFromSupplier.find({
            supplier: supplierInfo._id,
            create: {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        }).select('_id serialNo totalAmount totalQuantity create products')

        let supplierInfoDataList = []
        let supplierTotalQuantity = 0
        let supplierTotalAmount = 0
        let supplierTotalSellAmount = 0

        let childArray = await supplierRecevingData.map(async (receivingInfo, index) => {
            let creatreDate = new Date(receivingInfo.create)
            let singleReceivingInfo = [[]]
            let subtotalSell = 0

            let grandChild = await receivingInfo.products.map((productInfo, index) => {
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
                singleReceivingInfo[0].push(singleProductInfo)
            })

            await Promise.all(grandChild);
            singleReceivingInfo.push(receivingInfo.serialNo)
            singleReceivingInfo.push(("0" + creatreDate.getDate()).slice(-2) + ' ' + months[creatreDate.getMonth()] + ', ' + creatreDate.getUTCFullYear())
            singleReceivingInfo.push((type == 'pdf') ? receivingInfo.totalQuantity.toFixed(2) : receivingInfo.totalQuantity)
            singleReceivingInfo.push((type == 'pdf') ? receivingInfo.totalAmount.toFixed(2) : receivingInfo.totalAmount)
            singleReceivingInfo.push((type == 'pdf') ? subtotalSell.toFixed(2) : subtotalSell)
            supplierInfoDataList.push(singleReceivingInfo)
            supplierTotalQuantity += receivingInfo.totalQuantity
            supplierTotalAmount += receivingInfo.totalAmount
            supplierTotalSellAmount += subtotalSell
        })

        await Promise.all(childArray);

        grandTotalAmount += supplierTotalAmount
        grandTotalQuantity += supplierTotalQuantity
        grandTotalSellAmount += supplierTotalSellAmount

        if (supplierInfoDataList.length > 0) {
            allSupplierInfo.push({
                supplier: supplierInfo.name,
                data: supplierInfoDataList,
                supplierTotalQuantity: (type == 'pdf') ? supplierTotalQuantity.toFixed(2) : supplierTotalQuantity,
                supplierTotalAmount: (type == 'pdf') ? supplierTotalAmount.toFixed(2) : supplierTotalAmount,
                supplierTotalSellAmount: (type == 'pdf') ? supplierTotalSellAmount.toFixed(2) : supplierTotalSellAmount,
                totalGP: (type == 'pdf') ? (((supplierTotalSellAmount - supplierTotalAmount) / supplierTotalSellAmount) * 100).toFixed(2) : (((supplierTotalSellAmount - supplierTotalAmount) / supplierTotalSellAmount) * 100)
            })
        }
    })

    await Promise.all(finalArray);

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
            grandTotalSellAmount
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