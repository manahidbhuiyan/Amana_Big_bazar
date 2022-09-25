var mongoConnection = require('../../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");
const Supplier = require('../../../../../../models/Supplier');
const ReceiveFromSupplier = require('../../../../../../models/Tracking/WarehouseTransaction/ReceiveFromSupplier');

process.on('message', async (msg) => {
    let { from, to, supplier, type } = msg

    from = new Date(from)
    to = new Date(to)

    let allSupplierInfo = []
    let grandTotalQuantity = 0
    let grandTotalAmount = 0
    let grandTotalDiscount = 0
    let grandTotalSellAmount = 0

    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    let supplierRecevingData = await ReceiveFromSupplier.find({
        supplier: supplier,
        create: {
            $gte: isodate(from),
            $lte: isodate(to)
        }
    }).select('_id serialNo chalan_no totalAmount totalQuantity applyDiscount create products').populate('supplier', 'name')

    let supplierInfoDataList = []
    let supplierTotalQuantity = 0
    let supplierTotalAmount = 0
    let supplierTotalDiscount = 0
    let supplierTotalSellAmount = 0

    let childArray = await supplierRecevingData.map(async (receivingInfo, index) => {
        let creatreDate = new Date(receivingInfo.create)
        let singleReceivingInfo = [[]]
        let subtotalSell = 0

        let grandChild = await receivingInfo.products.map((productInfo, index) => {
            let singleProductInfo = []
            let totalSell = (productInfo.product.price.sell * productInfo.product.quantity)
            let totalCost = productInfo.product.total
            subtotalSell += totalSell

            singleProductInfo.push(productInfo.product.barcode)
            singleProductInfo.push(productInfo.product.name)
            singleProductInfo.push((type == 'pdf') ? productInfo.product.price.purchase.toFixed(2) : productInfo.product.price.purchase)
            singleProductInfo.push((type == 'pdf') ? productInfo.product.price.sell.toFixed(2) : productInfo.product.price.sell)
            singleProductInfo.push((type == 'pdf') ? productInfo.product.quantity.toFixed(2) : productInfo.product.quantity)
            singleProductInfo.push((type == 'pdf') ? totalCost.toFixed(2) : totalCost)
            singleProductInfo.push((type == 'pdf') ? totalSell.toFixed(2) : totalSell)
            singleProductInfo.push((type == 'pdf') ? (((totalSell - totalCost) / totalSell) * 100).toFixed(2) : (((totalSell - totalCost) / totalSell) * 100))
            singleReceivingInfo[0].push(singleProductInfo)
        })

        await Promise.all(grandChild);
        singleReceivingInfo.push(receivingInfo.serialNo)
        singleReceivingInfo.push(("0" + creatreDate.getDate()).slice(-2) + ' ' + months[creatreDate.getMonth()] + ', ' + creatreDate.getUTCFullYear())
        singleReceivingInfo.push((type == 'pdf') ? receivingInfo.totalQuantity.toFixed(2) : receivingInfo.totalQuantity)
        singleReceivingInfo.push((type == 'pdf') ? (receivingInfo.totalAmount + receivingInfo.applyDiscount).toFixed(2) : (receivingInfo.totalAmount + receivingInfo.applyDiscount))
        singleReceivingInfo.push((type == 'pdf') ? receivingInfo.applyDiscount.toFixed(2) : receivingInfo.applyDiscount)
        singleReceivingInfo.push((type == 'pdf') ? receivingInfo.totalAmount.toFixed(2) : receivingInfo.totalAmount)
        singleReceivingInfo.push((type == 'pdf') ? subtotalSell.toFixed(2) : subtotalSell)
        singleReceivingInfo.push((type == 'pdf') ? (((subtotalSell - receivingInfo.totalAmount) / subtotalSell) * 100).toFixed(2) : (((subtotalSell - receivingInfo.totalAmount) / subtotalSell) * 100))
        supplierInfoDataList.push(singleReceivingInfo)
        supplierTotalQuantity += receivingInfo.totalQuantity
        supplierTotalDiscount += receivingInfo.applyDiscount
        supplierTotalAmount += receivingInfo.totalAmount
        supplierTotalSellAmount += subtotalSell
    })

    await Promise.all(childArray);

    grandTotalAmount += supplierTotalAmount
    grandTotalQuantity += supplierTotalQuantity
    grandTotalDiscount += supplierTotalDiscount
    grandTotalSellAmount += supplierTotalSellAmount

    let supplierInformations = await Supplier.findById(supplier);

    allSupplierInfo.push({
        supplier: supplierInformations.name,
        data: supplierInfoDataList,
        supplierTotalQuantity: (type == 'pdf') ? supplierTotalQuantity.toFixed(2) : supplierTotalQuantity,
        supplierTotalDiscount: (type == 'pdf') ? supplierTotalDiscount.toFixed(2) : supplierTotalDiscount,
        supplierTotalAmount: (type == 'pdf') ? supplierTotalAmount.toFixed(2) : supplierTotalAmount,
        supplierTotalSellAmount: (type == 'pdf') ? supplierTotalSellAmount.toFixed(2) : supplierTotalSellAmount,
        totalGP: (type == 'pdf') ? (((supplierTotalSellAmount - supplierTotalAmount) / supplierTotalSellAmount) * 100).toFixed(2) : (((supplierTotalSellAmount - supplierTotalAmount) / supplierTotalSellAmount) * 100)
    })

    if (type == 'excel') {
        let mainData = []

        allSupplierInfo.map((info) => {

            info.data.map((productsInfo) => {
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
                    barcode: 'Supplier:  ' + info.supplier,
                    productName: ' ',
                    unitCost: 'Receiving No:  ' + productsInfo[1],
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
                productsInfo[0].map((productdDetais) => {

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
                    sellAmount: productsInfo[7],
                    gp: ' '
                })
                mainData.push({
                    barcode: '-Discount: ',
                    productName: ' ',
                    unitCost: ' ',
                    unitSell: ' ',
                    receiceQTY: ' ',
                    costAmount: productsInfo[5],
                    sellAmount: ' ',
                    gp: ' '
                })
                mainData.push({
                    barcode: 'Total: ',
                    productName: ' ',
                    unitCost: ' ',
                    unitSell: ' ',
                    receiceQTY: productsInfo[3],
                    costAmount: productsInfo[6],
                    sellAmount: productsInfo[7],
                    gp: productsInfo[8]
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
            grandTotalAmount,
            grandTotalQuantity,
            grandTotalDiscount,
            grandTotalSellAmount,
            supplierInformations
        });
    } else {
        process.send({
            allSupplierInfo,
            grandTotalQuantity,
            grandTotalAmount,
            grandTotalDiscount,
            grandTotalSellAmount
        });
    }
});