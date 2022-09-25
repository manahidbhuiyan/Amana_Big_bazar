var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");
const Supplier = require('../../../../../models/Supplier');
const RequisitionToSupplier = require('../../../../../models/Tracking/Transaction/RequisitionToSupplier');

process.on('message', async (msg) => {
    let { from, to, branch, type, supplier } = msg

    from = new Date(from)
    to = new Date(to)

    let allSupplierInfo = []
    let grandTotalQuantity = 0
    let grandTotalAmount = 0
    let grandTotalSellAmount = 0

    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    let condition = {
        supplier: supplier,
        branch: branch,
        create: {
            $gte: isodate(from),
            $lte: isodate(to)
        }
    }


    let supplierRequisitionData = await RequisitionToSupplier.find(condition).select('_id serialNo totalAmount totalQuantity create products').populate('supplier', 'name')

    let supplierInfoDataList = []
    let supplierTotalQuantity = 0
    let supplierTotalAmount = 0
    let supplierTotalSellAmount = 0

    let childArray = await supplierRequisitionData.map(async (requisitionInfo, index) => {
        let creatreDate = new Date(requisitionInfo.products[0].requisition_date)
        let expDeliveryDate = new Date(requisitionInfo.products[0].expected_delivery)
        let singleRequisitionInfo = [[]]
        let subtotalSell = 0

        let grandChild = await requisitionInfo.products.map((productInfo, index) => {
            let singleProductInfo = []
            let totalSell = (productInfo.product.price.sell * productInfo.product.quantity)
            let totalCost = productInfo.product.total
            subtotalSell += totalSell

            singleProductInfo.push(productInfo.product.barcode)
            singleProductInfo.push(productInfo.product.name)
            singleProductInfo.push((type == 'pdf') ? ((productInfo.product.stock != null) ? productInfo.product.stock.toFixed(2) : '0.00') : productInfo.product.stock)
            singleProductInfo.push((type == 'pdf') ? ((productInfo.product.quantity != null) ? productInfo.product.quantity.toFixed(2) : '0.00') : productInfo.product.quantity)
            singleProductInfo.push((type == 'pdf') ? productInfo.product.price.purchase.toFixed(2) : productInfo.product.price.purchase)
            singleProductInfo.push((type == 'pdf') ? productInfo.product.price.sell.toFixed(2) : productInfo.product.price.sell)
            singleProductInfo.push((type == 'pdf') ? totalCost.toFixed(2) : totalCost)
            singleProductInfo.push((type == 'pdf') ? totalSell.toFixed(2) : totalSell)
            singleRequisitionInfo[0].push(singleProductInfo)
        })

        await Promise.all(grandChild);
        singleRequisitionInfo.push(requisitionInfo.serialNo)
        singleRequisitionInfo.push(("0" + creatreDate.getDate()).slice(-2) + ' ' + months[creatreDate.getMonth()] + ', ' + creatreDate.getUTCFullYear())
        singleRequisitionInfo.push((type == 'pdf') ? requisitionInfo.totalQuantity.toFixed(2) : requisitionInfo.totalQuantity)
        singleRequisitionInfo.push((type == 'pdf') ? requisitionInfo.totalAmount.toFixed(2) : requisitionInfo.totalAmount)
        singleRequisitionInfo.push((type == 'pdf') ? subtotalSell.toFixed(2) : subtotalSell)
        singleRequisitionInfo.push(("0" + expDeliveryDate.getDate()).slice(-2) + ' ' + months[expDeliveryDate.getMonth()] + ', ' + expDeliveryDate.getUTCFullYear())
        supplierInfoDataList.push(singleRequisitionInfo)
        supplierTotalQuantity += requisitionInfo.totalQuantity
        supplierTotalAmount += requisitionInfo.totalAmount
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
        supplierTotalSellAmount: (type == 'pdf') ? supplierTotalSellAmount.toFixed(2) : supplierTotalSellAmount
    })

    if (type == 'excel') {
        let mainData = []

        allSupplierInfo.map((info) => {

            info.data.map((productsInfo, index1) => {
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

                    if (index == 0) {
                        dataObj.date = productsInfo[2]
                        dataObj.receiveNo = productsInfo[1]
                    } else {
                        dataObj.receiveNo = ' '
                    }

                    if (index1 == 0 && index == 0) {
                        dataObj.supplier = info.supplier
                    }

                    mainData.push(dataObj)

                })

                mainData.push({
                    supplier: ' ',
                    receiveNo: ' ',
                    date: ' ',
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
                    supplier: 'Subtotal: ',
                    receiveNo: ' ',
                    date: ' ',
                    barcode: ' ',
                    productName: ' ',
                    unitCost: ' ',
                    unitSell: ' ',
                    receiceQTY: productsInfo[3],
                    costAmount: productsInfo[4],
                    sellAmount: productsInfo[7],
                    gp: ' '
                })
                mainData.push({
                    supplier: '-Discount: ',
                    receiveNo: ' ',
                    date: ' ',
                    barcode: ' ',
                    productName: ' ',
                    unitCost: ' ',
                    unitSell: ' ',
                    receiceQTY: ' ',
                    costAmount: productsInfo[5],
                    sellAmount: ' ',
                    gp: ' '
                })
                mainData.push({
                    supplier: 'Total: ',
                    receiveNo: ' ',
                    date: ' ',
                    barcode: ' ',
                    productName: ' ',
                    unitCost: ' ',
                    unitSell: ' ',
                    receiceQTY: productsInfo[3],
                    costAmount: productsInfo[6],
                    sellAmount: productsInfo[7],
                    gp: productsInfo[8]
                })
                mainData.push({
                    supplier: ' ',
                    receiveNo: ' ',
                    date: ' ',
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
            grandTotalDiscount,
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