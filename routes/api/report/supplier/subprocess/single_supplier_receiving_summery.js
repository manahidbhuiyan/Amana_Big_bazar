var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");
const Supplier = require('../../../../../models/Supplier');
const ReceiveFromSupplier = require('../../../../../models/Tracking/Transaction/ReceiveFromSupplier');
const Branch = require('../../../../../models/Branch');

process.on('message', async (msg) => {
    let { from, to, branch, type, supplier, receivingPlace } = msg

    from = new Date(from)
    to = new Date(to)
    let branchWiseReceiving = []
    let supplierInformations
    let branches

    if(branch == 'all'){
        branches = await Branch.find().select("_id name address serialNo phone")
    }else{
        branches = await Branch.find({_id : branch}).select("_id name address serialNo phone")
    }

    let grandTotalQuantity = 0
    let grandTotalAmount = 0
    let grandTotalDiscount = 0
    let grandTotalSellAmount = 0

    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let branchArray = branches.map( async(branchInfo) => {
        let allSupplierInfo = []
        let condition = {
            supplier: supplier,
            branch: branchInfo._id,
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
        let supplierRecevingData = await ReceiveFromSupplier.find(condition).select('_id serialNo chalan_no totalAmount totalQuantity applyDiscount create products fromWarehouse').populate('supplier', 'name')
    
        let supplierInfoDataList = []
        let supplierTotalQuantity = 0
        let supplierTotalAmount = 0
        let supplierTotalDiscount = 0
        let supplierTotalSellAmount = 0
    
        let childArray = await supplierRecevingData.map(async (receivingInfo, index) => {
            let creatreDate = new Date(receivingInfo.create)
            let singleReceivingInfo = []
            let subtotalSell = 0
    
    
            let grandChild = await receivingInfo.products.map((productInfo, index) => {
                let totalSell = (productInfo.product.price.sell * productInfo.product.quantity)
                subtotalSell += totalSell
            })
    
            await Promise.all(grandChild);
            singleReceivingInfo.push(receivingInfo.serialNo)
            singleReceivingInfo.push(("0" + creatreDate.getDate()).slice(-2) + ' ' + months[creatreDate.getMonth()] + ', ' + creatreDate.getUTCFullYear())
            singleReceivingInfo.push((type == 'pdf') ? receivingInfo.totalQuantity.toFixed(2) : receivingInfo.totalQuantity)
            singleReceivingInfo.push((type == 'pdf') ? (receivingInfo.totalAmount + receivingInfo.applyDiscount).toFixed(2) : (receivingInfo.totalAmount + receivingInfo.applyDiscount))
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
        supplierGP = (((supplierTotalSellAmount - supplierTotalAmount) / supplierTotalSellAmount) * 100)
        grandTotalAmount += supplierTotalAmount
        grandTotalQuantity += supplierTotalQuantity
        grandTotalDiscount += supplierTotalDiscount
        grandTotalSellAmount += supplierTotalSellAmount
    
        supplierInformations = await Supplier.findById(supplier);
        
        if (supplierInfoDataList.length > 0) {
            allSupplierInfo.push({
                supplier: supplierInformations.name,
                fromSupplier: supplierInfoDataList[6],
                data: supplierInfoDataList,
                "supplierTotalQuantity": (type == 'pdf') ? supplierTotalQuantity.toFixed(2) : supplierTotalQuantity,
                supplierSubtotal: (type == 'pdf') ? (supplierTotalAmount + supplierTotalDiscount).toFixed(2) : (supplierTotalAmount + supplierTotalDiscount),
                supplierTotalDiscount: (type == 'pdf') ? supplierTotalDiscount.toFixed(2) : supplierTotalDiscount,
                "supplierTotalAmount": (type == 'pdf') ? supplierTotalAmount.toFixed(2) : supplierTotalAmount,
                supplierTotalSellAmount: (type == 'pdf') ? supplierTotalSellAmount.toFixed(2) : supplierTotalSellAmount,
                supplierGP: (type == 'pdf') ? supplierGP.toFixed(2) : supplierGP
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
                receiveNo: 'Branch Code : ' + supplierInfo.branch_serialNo,
                date: 'Phone : ' + supplierInfo.branch_phone,
                receiceQTY: 'Address : ' + supplierInfo.branch_address,
                productToatalCost: ' ',
                productToatalSell: ' ',
                gp: ' '
            })
            supplierInfo.allSupplierData.map((info) => {
                mainData.push({
                    supplier: ' ',
                    receiveNo: ' ',
                    date: ' ',
                    receiceQTY: ' ',
                    productToatalCost: ' ',
                    productToatalSell: ' ',
                    gp: ' '
                })
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
                        dataObj.fromWarehouse = productsInfo[6] ? "Yes" : "No"
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
            branchWiseReceiving,
            grandTotalQuantity,
            grandTotalAmount,
            grandTotalDiscount,
            grandTotalSellAmount
        });
    }
});