var mongoConnection = require('../../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");
const Supplier = require('../../../../../../models/Supplier');
const SupplyToBranch = require('../../../../../../models/Tracking/WarehouseSupply/RequisitionWiseSupply');

process.on('message', async (msg) => {
    let { from, to, branch, type } = msg

    from = new Date(from)
    to = new Date(to)

    let supplierOfBranch = await Supplier.find({
        branch: {
            $in: branch
        }
    }).select("_id name")

    let allSupplierInfo = []
    let grandTotalQuantity = 0
    let grandTotalAmount = 0
    let grandTotalDiscount = 0

    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    let finalArray = await supplierOfBranch.map(async (supplierInfo, index) => {
        let supplierRecevingData = await SupplyToBranch.find({
            branch: branch,
            supplier: supplierInfo._id,
            create: {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        }).select('_id serialNo chalan_no totalAmount totalQuantity applyDiscount create products')

        let supplierInfoDataList = []
        let supplierTotalQuantity = 0
        let supplierTotalAmount = 0
        let supplierTotalDiscount = 0

        let childArray = await supplierRecevingData.map(async (receivingInfo, index) => {
            let creatreDate = new Date(receivingInfo.create)
            let singleReceivingInfo = [[]]

            let grandChild = await receivingInfo.products.map((productInfo, index) => {
                let singleProductInfo = []
                singleProductInfo.push(productInfo.product.barcode)
                singleProductInfo.push(productInfo.product.name)
                singleProductInfo.push((type == 'pdf') ? productInfo.product.price.purchase.toFixed(2) : productInfo.product.price.purchase)
                singleProductInfo.push((type == 'pdf') ? productInfo.product.quantity.toFixed(2) : productInfo.product.quantity)
                singleProductInfo.push((type == 'pdf') ? productInfo.product.total.toFixed(2) : productInfo.product.total)
                singleReceivingInfo[0].push(singleProductInfo)
            })

            await Promise.all(grandChild);
            receivingInfo.applyDiscount = 0
            singleReceivingInfo.push(receivingInfo.serialNo)
            singleReceivingInfo.push(("0" + creatreDate.getDate()).slice(-2) + ' ' + months[creatreDate.getMonth()] + ', ' + creatreDate.getUTCFullYear())
            singleReceivingInfo.push((type == 'pdf') ? receivingInfo.totalQuantity.toFixed(2) : receivingInfo.totalQuantity)
            singleReceivingInfo.push((type == 'pdf') ? (receivingInfo.totalAmount + receivingInfo.applyDiscount).toFixed(2) : (receivingInfo.totalAmount + receivingInfo.applyDiscount))
            singleReceivingInfo.push((type == 'pdf') ? receivingInfo.applyDiscount.toFixed(2) : receivingInfo.applyDiscount)
            singleReceivingInfo.push((type == 'pdf') ? receivingInfo.totalAmount.toFixed(2) : receivingInfo.totalAmount)
            supplierInfoDataList.push(singleReceivingInfo)
            supplierTotalQuantity += receivingInfo.totalQuantity
            supplierTotalDiscount += receivingInfo.applyDiscount
            supplierTotalAmount += receivingInfo.totalAmount
        })

        await Promise.all(childArray);

        grandTotalAmount += supplierTotalAmount
        grandTotalQuantity += supplierTotalQuantity
        grandTotalDiscount += supplierTotalDiscount

        if (supplierInfoDataList.length > 0) {
            allSupplierInfo.push({
                supplier: supplierInfo != null ? supplierInfo.name : '',
                data: supplierInfoDataList,
                supplierTotalQuantity: (type == 'pdf') ? supplierTotalQuantity.toFixed(2) : supplierTotalQuantity,
                supplierTotalDiscount: (type == 'pdf') ? supplierTotalDiscount.toFixed(2) : supplierTotalDiscount,
                supplierTotalAmount: (type == 'pdf') ? supplierTotalAmount.toFixed(2) : supplierTotalAmount
            })
        }
    })

    await Promise.all(finalArray);

    if (type == 'excel') {
        let mainData = []

        allSupplierInfo.map((info) => {

            info.data.map((productsInfo) => {
                mainData.push({
                    barcode: ' ',
                    productName: ' ',
                    unitCost: ' ',
                    receiceQTY: ' ',
                    costAmount: ' '
                })

                mainData.push({
                    barcode: 'Supplier:  ' + info.supplier,
                    productName: ' ',
                    unitCost: 'Return No:  ' + productsInfo[1],
                    receiceQTY: 'Date: ' + productsInfo[2],
                    costAmount: ' '
                })
                mainData.push({
                    barcode: ' ',
                    productName: ' ',
                    unitCost: ' ',
                    receiceQTY: ' ',
                    costAmount: ' '
                })
                productsInfo[0].map((productdDetais) => {

                    let dataObj = {}

                    dataObj.barcode = productdDetais[0]
                    dataObj.productName = productdDetais[1]
                    dataObj.unitCost = productdDetais[2]
                    dataObj.receiceQTY = productdDetais[3]
                    dataObj.costAmount = productdDetais[4]

                    mainData.push(dataObj)

                })
                mainData.push({
                    barcode: ' ',
                    productName: ' ',
                    unitCost: ' ',
                    receiceQTY: ' ',
                    costAmount: ' '
                })

                mainData.push({
                    barcode: 'Subtotal: ',
                    productName: ' ',
                    unitCost: ' ',
                    receiceQTY: productsInfo[3],
                    costAmount: productsInfo[6]
                })
                mainData.push({
                    barcode: '-Discount: ',
                    productName: ' ',
                    unitCost: ' ',
                    receiceQTY: ' ',
                    costAmount: productsInfo[5]
                })
                mainData.push({
                    barcode: 'Total: ',
                    productName: ' ',
                    unitCost: ' ',
                    receiceQTY: productsInfo[3],
                    costAmount: productsInfo[6]
                })

                mainData.push({
                    barcode: ' ',
                    productName: ' ',
                    unitCost: ' ',
                    receiceQTY: ' ',
                    costAmount: ' '
                })

            })
        })
        process.send({
            mainData,
            grandTotalAmount,
            grandTotalQuantity,
            grandTotalDiscount
        });
    } else {
        process.send({
            allSupplierInfo,
            grandTotalQuantity,
            grandTotalAmount,
            grandTotalDiscount
        });
    }

});