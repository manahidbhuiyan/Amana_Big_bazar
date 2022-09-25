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
        let singleRequisitionInfo = []
        let subtotalSell = 0


        let grandChild = await requisitionInfo.products.map((productInfo, index) => {
            let totalSell = (productInfo.product.price.sell * productInfo.product.quantity)
            subtotalSell += totalSell
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
    supplierGP = (((supplierTotalSellAmount - supplierTotalAmount) / supplierTotalSellAmount) * 100)
    grandTotalAmount += supplierTotalAmount
    grandTotalQuantity += supplierTotalQuantity
    grandTotalSellAmount += supplierTotalSellAmount

    let supplierInformations = await Supplier.findById(supplier);

    allSupplierInfo.push({
        supplier: supplierInformations.name,
        fromSupplier: supplierInfoDataList[6],
        data: supplierInfoDataList,
        "supplierTotalQuantity": (type == 'pdf') ? supplierTotalQuantity.toFixed(2) : supplierTotalQuantity,
        "supplierTotalAmount": (type == 'pdf') ? supplierTotalAmount.toFixed(2) : supplierTotalAmount,
        supplierTotalSellAmount: (type == 'pdf') ? supplierTotalSellAmount.toFixed(2) : supplierTotalSellAmount,
    })
    
    if (type == 'excel') {
        let mainData = []
        allSupplierInfo.map((info) => {
            info.data.map((productsInfo, index) => {
                let dataObj = {}
                dataObj.receiceQTY = productsInfo[2]
                dataObj.productToatalCost = productsInfo[3]
                dataObj.date = productsInfo[1]
                dataObj.receiveNo = productsInfo[0]
                dataObj.productToatalSell = productsInfo[4]
                dataObj.gp = productsInfo[5]

                if (index == 0) {
                    dataObj.supplier = info.supplier
                }

                mainData.push(dataObj)
            })

            mainData.push({
                supplier: ' ',
                receiveNo: ' ',
                date: ' ',
                receiceQTY: ' ',
                productToatalCost: ' ',
                productToatalSell: ' ',
                gp: ' '
            })

            mainData.push({
                supplier: 'Subtotal: ',
                receiveNo: ' ',
                date: ' ',
                receiceQTY: info.supplierTotalQuantity,
                productToatalCost: info.supplierSubtotal,
                productToatalSell: info.supplierTotalSellAmount,
                gp: ' '
            })
            mainData.push({
                supplier: '-Discount: ',
                receiveNo: ' ',
                date: ' ',
                receiceQTY: ' ',
                productToatalCost: info.supplierTotalDiscount,
                productToatalSell: ' ',
                gp: ' '
            })
            mainData.push({
                supplier: 'Total: ',
                receiveNo: ' ',
                date: ' ',
                receiceQTY: info.supplierTotalQuantity,
                productToatalCost: info.supplierTotalAmount,
                productToatalSell: info.supplierTotalSellAmount,
                gp: info.supplierGP
            })

            mainData.push({
                supplier: ' ',
                receiveNo: ' ',
                date: ' ',
                receiceQTY: ' ',
                productToatalCost: ' ',
                productToatalSell: ' ',
                gp: ' '
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