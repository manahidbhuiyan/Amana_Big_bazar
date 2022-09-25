var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");
const Supplier = require('../../../../../models/Supplier');
const ReceiveFromSupplier = require('../../../../../models/Tracking/Transaction/ReceiveFromSupplier');
const Branch = require('../../../../../models/Branch');

process.on('message', async (msg) => {
    let { from, to, branch, receivingPlace, type } = msg

    from = new Date(from)
    to = new Date(to)
    let supplierOfBranch
    let branches
    let branchWiseReceiving = []
    let allSupplierInfo = []
    
    if(branch != 'all'){
        supplierOfBranch = await Supplier.find({
            branch: {
                $in: branch
            }
        }).select("_id name")
    }else{
        supplierOfBranch = await Supplier.find().select("_id name")
    }

    if(branch == 'all'){
        branches = await Branch.find().select("_id name address serialNo phone")
    }else{
        branches = await Branch.find({_id : branch}).select("_id name address serialNo phone")
    }

    let grandTotalQuantity = 0
    let grandTotalAmount = 0
    let grandTotalDiscount = 0
    let grandTotalSellAmount = 0

    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    let branchArray = branches.map( async(branchInfo) => {
        let finalArray = await supplierOfBranch.map(async (supplierInfo, index) => {
            allSupplierInfo = []
            let condition = {
                supplier: supplierInfo._id,
                branch : branchInfo._id,
                create: {
                    $gte: isodate(from),
                    $lte: isodate(to)
                }
            }
            if(receivingPlace == 'fromWarehouse'){
                condition.fromWarehouse = true
            }
            if(receivingPlace == 'fromOutsideWarehouse'){
                condition.fromWarehouse = false
            }
            let supplierRecevingData = await ReceiveFromSupplier.find(condition).select('_id serialNo chalan_no totalAmount totalQuantity applyDiscount create products fromWarehouse')
    
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
                    if(productInfo.product != null){
                        singleProductInfo.push(productInfo.product.barcode)
                        singleProductInfo.push(productInfo.product.name)
                        singleProductInfo.push(((type == 'pdf') && productInfo.product.price.purchase) ? productInfo.product.price.purchase.toFixed(2) : productInfo.product.price.purchase)
                        singleProductInfo.push((type == 'pdf') ? productInfo.product.price.sell.toFixed(2) : productInfo.product.price.sell)
                        singleProductInfo.push((type == 'pdf') ? ((productInfo.product.quantity != null) ? productInfo.product.quantity.toFixed(2) : '0.00') : productInfo.product.quantity)
                        singleProductInfo.push((type == 'pdf') ? totalCost.toFixed(2) : totalCost)
                        singleProductInfo.push((type == 'pdf') ? totalSell.toFixed(2) : totalSell)
                        singleProductInfo.push((type == 'pdf') ? (((totalSell - totalCost) / totalSell) * 100).toFixed(2) : (((totalSell - totalCost) / totalSell) * 100))
                    }
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
                singleReceivingInfo.push(receivingInfo.fromWarehouse)
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
    
            if (supplierInfoDataList.length > 0) {
                allSupplierInfo.push({
                    supplier: supplierInfo.name,
                    data: supplierInfoDataList,
                    supplierTotalQuantity: (type == 'pdf') ? supplierTotalQuantity.toFixed(2) : supplierTotalQuantity,
                    supplierTotalDiscount: (type == 'pdf') ? supplierTotalDiscount.toFixed(2) : supplierTotalDiscount,
                    supplierTotalAmount: (type == 'pdf') ? supplierTotalAmount.toFixed(2) : supplierTotalAmount,
                    supplierTotalSellAmount: (type == 'pdf') ? supplierTotalSellAmount.toFixed(2) : supplierTotalSellAmount,
                    totalGP: (type == 'pdf') ? (((supplierTotalSellAmount - supplierTotalAmount) / supplierTotalSellAmount) * 100).toFixed(2) : (((supplierTotalSellAmount - supplierTotalAmount) / supplierTotalSellAmount) * 100)
                })
            }
        })
        await Promise.all(finalArray);
        branchWiseReceiving.push({
            branch_name : branchInfo.name,
            branch_phone : branchInfo.phone,
            branch_serialNo : branchInfo.serialNo,
            branch_address : branchInfo.address,
            allSupplierData : allSupplierInfo
        })
    })
    await Promise.all(branchArray);
    

    if (type == 'excel') {
        let mainData = []

        branchWiseReceiving.map((supplierInfo) => {
            mainData.push({
                supplier: 'Branch : ' + supplierInfo.branch_name ,
                receiveNo: 'Branch Code : ' + supplierInfo.branch_serialNo,
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
            supplierInfo.allSupplierData.map((info) => {
                info.data.map((productsInfo, index1) => {
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
                            dataObj.fromWarehouse = productsInfo[9] ? "Yes" : "No"
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
        })
        process.send({
            mainData,
            grandTotalAmount,
            grandTotalQuantity,
            grandTotalDiscount,
            grandTotalSellAmount
        });
    } else {
        process.send({
            branchWiseReceiving,
            grandTotalQuantity,
            grandTotalAmount,
            grandTotalDiscount,
            grandTotalSellAmount
        });
    }
});