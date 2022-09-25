var mongoConnection = require('../../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");
const Supplier = require('../../../../../../models/Supplier');
const SupplyToBranch = require('../../../../../../models/Tracking/WarehouseSupply/RequisitionWiseSupply');

process.on('message', async (msg) => {
    let { from, to, branch, supplier, type } = msg

    from = new Date(from)
    to = new Date(to)

    let allSupplierInfo = []
    let grandTotalQuantity = 0
    let grandTotalAmount = 0
    let grandTotalDiscount = 0

    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];


    let supplierRecevingData = await SupplyToBranch.find({
        branch: branch,
        supplier: supplier,
        create: {
            $gte: isodate(from),
            $lte: isodate(to)
        }
    }).select('_id serialNo chalan_no totalAmount totalQuantity applyDiscount create').populate('supplier', 'name')

    let supplierInfoDataList = []
    let supplierTotalQuantity = 0
    let supplierTotalAmount = 0
    let supplierTotalDiscount = 0

    let childArray = await supplierRecevingData.map((receivingInfo, index) => {
        let creatreDate = new Date(receivingInfo.create)
        let singleReceivingInfo = []
        receivingInfo.applyDiscount = 0
        singleReceivingInfo.push(receivingInfo.serialNo)
        singleReceivingInfo.push(("0" + creatreDate.getDate()).slice(-2) + ' ' + months[creatreDate.getMonth()] + ', ' + creatreDate.getUTCFullYear())
        singleReceivingInfo.push((type == 'pdf') ? receivingInfo.totalQuantity.toFixed(2) : receivingInfo.totalQuantity)
        singleReceivingInfo.push((type == 'pdf') ? (receivingInfo.totalAmount + receivingInfo.applyDiscount).toFixed(2) : (receivingInfo.totalAmount + receivingInfo.applyDiscount))
        supplierInfoDataList.push(singleReceivingInfo)
        supplierTotalQuantity += receivingInfo.totalQuantity
        supplierTotalDiscount += receivingInfo.applyDiscount
        supplierTotalAmount += receivingInfo.totalAmount
    })

    await Promise.all(childArray);

    grandTotalAmount += supplierTotalAmount
    grandTotalQuantity += supplierTotalQuantity
    grandTotalDiscount += supplierTotalDiscount

    let supplierInformations = await Supplier.findById(supplier);

    allSupplierInfo.push({
        supplier: supplierInformations != null ? supplierInformations.name : '',
        data: supplierInfoDataList,
        "supplierTotalQuantity": (type == 'pdf') ? supplierTotalQuantity.toFixed(2) : supplierTotalQuantity,
        supplierTotalDiscount: (type == 'pdf') ? supplierTotalDiscount.toFixed(2) : supplierTotalDiscount,
        "supplierTotalAmount": (type == 'pdf') ? (supplierTotalAmount + supplierTotalDiscount).toFixed(2) : (supplierTotalAmount + supplierTotalDiscount)
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
                productToatalCost: ' '
            })

            mainData.push({
                supplier: 'Subtotal: ',
                receiveNo: ' ',
                date: ' ',
                receiceQTY: info.supplierTotalQuantity,
                productToatalCost: info.supplierTotalAmount
            })
            mainData.push({
                supplier: '-Discount: ',
                receiveNo: ' ',
                date: ' ',
                receiceQTY: ' ',
                productToatalCost: info.supplierTotalDiscount
            })
            mainData.push({
                supplier: 'Total: ',
                receiveNo: ' ',
                date: ' ',
                receiceQTY: info.supplierTotalQuantity,
                productToatalCost: info.supplierTotalAmount
            })

            mainData.push({
                supplier: ' ',
                receiveNo: ' ',
                date: ' ',
                receiceQTY: ' ',
                productToatalCost: ' '
            })
        })
        process.send({
            mainData,
            grandTotalQuantity,
            grandTotalAmount,
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