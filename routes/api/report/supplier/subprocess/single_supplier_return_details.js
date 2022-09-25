var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");
const Supplier = require('../../../../../models/Supplier');
const ReturnFromSupplier = require('../../../../../models/Tracking/Transaction/ReturnToSupplier');
const Branch = require('../../../../../models/Branch');

process.on('message', async (msg) => {
    let { from, to, branch, type, supplier } = msg

    from = new Date(from)
    to = new Date(to)

    let branchWiseReceiving = []
    let supplierInformations
    let branches

    let grandTotalQuantity = 0
    let grandTotalAmount = 0
    let grandTotalSellAmount = 0

    if(branch == 'all'){
        branches = await Branch.find().select("_id name address serialNo phone")
    }else{
        branches = await Branch.find({_id : branch}).select("_id name address serialNo phone")
    }

    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    let branchArray = branches.map( async(branchInfo) => {
        let allSupplierInfo = []
        let supplierRecevingData = await ReturnFromSupplier.find({
            supplier: supplier,
            branch: branchInfo._id,
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
    
        supplierInformations = await Supplier.findById(supplier);
        if(supplierInfoDataList.length > 0){
            allSupplierInfo.push({
                supplier: supplierInformations.name,
                data: supplierInfoDataList,
                supplierTotalQuantity: (type == 'pdf') ? supplierTotalQuantity.toFixed(2) : supplierTotalQuantity,
                supplierTotalAmount: (type == 'pdf') ? supplierTotalAmount.toFixed(2) : supplierTotalAmount,
                supplierTotalSellAmount: (type == 'pdf') ? supplierTotalSellAmount.toFixed(2) : supplierTotalSellAmount,
                totalGP: (type == 'pdf') ? (((supplierTotalSellAmount - supplierTotalAmount) / supplierTotalSellAmount) * 100).toFixed(2) : (((supplierTotalSellAmount - supplierTotalAmount) / supplierTotalSellAmount) * 100)
            })
        }

        branchWiseReceiving.push({
            branch_name : branchInfo.name,
            branch_phone : branchInfo.phone,
            branch_serialNo : branchInfo.serialNo,
            branch_address : branchInfo.address,
            allSupplierData : allSupplierInfo
        })
    })
    await Promise.all(branchArray)


    if (type == 'excel') {
        let mainData = []
        branchWiseReceiving.map((supplierInfo) => {
            mainData.push({
                supplier: 'Branch : ' + supplierInfo.branch_name,
                receiveNo: 'Branch Code: ' + supplierInfo.branch_serialNo,
                date: 'Phone : ' + supplierInfo.branch_phone,
                barcode: 'Address : ' + supplierInfo.branch_address,
                productName: ' ',
                unitCost: ' ',
                unitSell: ' ',
                receiceQTY: ' ',
                costAmount: ' ',
                sellAmount: ' ',
                gp: ' '
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
            supplierInfo.allSupplierData.map((info) => {
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
                        sellAmount: productsInfo[5],
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
                        costAmount: productsInfo[4],
                        sellAmount: productsInfo[5],
                        gp: productsInfo[6]
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
            branchWiseReceiving,
            grandTotalQuantity,
            grandTotalAmount,
            grandTotalSellAmount
        });
    }
});