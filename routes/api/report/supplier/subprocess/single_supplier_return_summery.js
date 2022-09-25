var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");
const Supplier = require('../../../../../models/Supplier');
const ReturnToSupplier = require('../../../../../models/Tracking/Transaction/ReturnToSupplier');
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

    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    if(branch == 'all'){
        branches = await Branch.find().select("_id name address serialNo phone")
    }else{
        branches = await Branch.find({_id : branch}).select("_id name address serialNo phone")
    }

    let branchArray = branches.map( async(branchInfo) => {
        let allSupplierInfo = []
        let supplierReturnData = await ReturnToSupplier.find({
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
    
        let childArray = await supplierReturnData.map(async (receivingInfo, index) => {
            let creatreDate = new Date(receivingInfo.create)
            let singleReturnInfo = []
            let subtotalSell = 0
    
            let grandChild = await receivingInfo.products.map((productInfo, index) => {
                let totalSell = (productInfo.price.sell * productInfo.quantity)
                subtotalSell += totalSell
            })
            await Promise.all(grandChild);
            singleReturnInfo.push(receivingInfo.serialNo)
            singleReturnInfo.push(("0" + creatreDate.getDate()).slice(-2) + ' ' + months[creatreDate.getMonth()] + ', ' + creatreDate.getUTCFullYear())
            singleReturnInfo.push((type == 'pdf') ? receivingInfo.totalQuantity.toFixed(2) : receivingInfo.totalQuantity)
            singleReturnInfo.push((type == 'pdf') ? receivingInfo.totalAmount.toFixed(2) : receivingInfo.totalAmount)
            singleReturnInfo.push((type == 'pdf') ? subtotalSell.toFixed(2) : subtotalSell)
            singleReturnInfo.push((type == 'pdf') ? (((subtotalSell - receivingInfo.totalAmount) / subtotalSell) * 100).toFixed(2) : (((subtotalSell - receivingInfo.totalAmount) / subtotalSell) * 100))
            supplierInfoDataList.push(singleReturnInfo)
            supplierTotalQuantity += receivingInfo.totalQuantity
            supplierTotalAmount += receivingInfo.totalAmount
            supplierTotalSellAmount += subtotalSell
        })
    
        await Promise.all(childArray);
    
        supplierGP = (((supplierTotalSellAmount - supplierTotalAmount) / supplierTotalSellAmount) * 100)
        grandTotalAmount += supplierTotalAmount
        grandTotalQuantity += supplierTotalQuantity
        grandTotalSellAmount += supplierTotalSellAmount
    
        supplierInformations = await Supplier.findById(supplier);
    
        allSupplierInfo.push({
            supplier: supplierInformations.name,
            data: supplierInfoDataList,
            "supplierTotalQuantity": (type == 'pdf') ? supplierTotalQuantity.toFixed(2) : supplierTotalQuantity,
            "supplierTotalAmount": (type == 'pdf') ? supplierTotalAmount.toFixed(2) : supplierTotalAmount,
            supplierTotalSellAmount: (type == 'pdf') ? supplierTotalSellAmount.toFixed(2) : supplierTotalSellAmount,
            supplierGP: (type == 'pdf') ? supplierGP.toFixed(2) : supplierGP
        })

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
                receiceQTY: 'Address : ' + supplierInfo.branch_address,
                productToatalCost: ' ',
                productToatalSell: ' ',
                gp: ' '
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
            supplierInfo.allSupplierData.map((info) => {
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
        })
        process.send({
            mainData,
            grandTotalQuantity,
            grandTotalAmount,
            grandTotalSellAmount
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