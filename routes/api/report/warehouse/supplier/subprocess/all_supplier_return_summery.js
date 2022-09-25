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

        let childArray = await supplierRecevingData.map(async (returnInfo, index) => {
            let creatreDate = new Date(returnInfo.create)
            let singleReturnInfo = []
            let subtotalSell = 0

            let grandChild = await returnInfo.products.map((productInfo, index) => {
                let totalSell = (productInfo.price.sell * productInfo.quantity)
                subtotalSell += totalSell
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

        supplierGP = (((supplierTotalSellAmount - supplierTotalAmount) / supplierTotalSellAmount) * 100)
        grandTotalAmount += supplierTotalAmount
        grandTotalQuantity += supplierTotalQuantity
        grandTotalSellAmount += supplierTotalSellAmount

        if (supplierInfoDataList.length > 0) {
            allSupplierInfo.push({
                supplier: supplierInfo.name,
                data: supplierInfoDataList,
                "supplierTotalQuantity": (type == 'pdf') ? supplierTotalQuantity.toFixed(2) : supplierTotalQuantity,
                "supplierTotalAmount": (type == 'pdf') ? supplierTotalAmount.toFixed(2) : supplierTotalAmount,
                supplierTotalSellAmount: (type == 'pdf') ? supplierTotalSellAmount.toFixed(2) : supplierTotalSellAmount,
                supplierGP: (type == 'pdf') ? supplierGP.toFixed(2) : supplierGP
            })

        }

    })

    await Promise.all(finalArray);

    if (type == 'excel') {
        let mainData = []
        allSupplierInfo.map((info) => {
            info.data.map((productsInfo, index) => {
                let length = info.data.length
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

                if (index == length - 1) {
                    dataObj.subtotalQty = info.supplierTotalQuantity
                    dataObj.totalCost = info.supplierTotalAmount
                    dataObj.totalSell = info.supplierTotalSellAmount
                    dataObj.totalGp = info.supplierGP
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
                productToatalCost: info.supplierTotalAmount,
                productToatalSell: info.supplierTotalSellAmount,
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