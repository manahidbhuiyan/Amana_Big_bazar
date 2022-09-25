var isodate = require("isodate");

var pdf = require("pdf-creator-node");
var fs = require('fs');
var path = require('path');

const ReceiveFromSupplier = require('../../models/Tracking/Transaction/ReceiveFromSupplier');
const ReturnToSupplier = require('../../models/Tracking/Transaction/ReturnToSupplier');
const ProductDisposal = require('../../models/Tracking/Transaction/ProductDisposal');
const Branch = require('../../models/Branch');
const Supplier = require('../../models/Supplier');
const OrderForPos = require('../../models/OrderForPos');
const PosOrderExchange = require('../../models/PosOrderExchange');
const PosOrderRefund = require('../../models/PosOrderRefund');

const Product = require('../../models/Product');


const getListOFNotMatchedStock = async (from, to, supplier, branchID) =>{ 
 try{
    from = new Date(from)
    to = new Date(to)
    to.setHours(to.getHours() + 23)
    to.setMinutes ( to.getMinutes() + 59 );
    to.setSeconds ( to.getSeconds() + 59 );


    let supplierRecevingData = await ReceiveFromSupplier.find({
        supplier,
        branch: branchID,
        create: {
            $gte: isodate(from),
            $lte: isodate(to)
        }
    }).populate('supplier', '_id name contact').populate('admin', 'name').populate('branch', 'name address')

    

    let allProducts = []
    let searchProductIndex = []
    let totalSealValue = 0
    let totalFreeQuantity = 0
    let totalQuantity = 0
    let totalAmount = 0

    let totalSoldQuantity = 0
    let totalSoldCostAmount = 0
    let totalSoldEarnAmount = 0
    let totalStockQuantity = 0
    let totalStockCostQuantity = 0
    let totalReturnQuantity = 0
    let totalReturnCostQuantity = 0
    let totalDisposalQuantity = 0
    let totalDisposalCostQuantity = 0
    let totalProfit = 0



    let supplierRecevingParentArray = supplierRecevingData.map(async(productList, index)=>{
        let supplierRecevingChildArray = productList.products.map(async(productInfo, index)=>{
            if(searchProductIndex.includes(productInfo.product.barcode)){
                var productIndex = searchProductIndex.indexOf(productInfo.product.barcode);
                var previousQuantity = Number(allProducts[productIndex].quantity);
                totalSealValue += (productInfo.product.price.sell * productInfo.product.quantity)
                allProducts[productIndex].quantity = (Number(allProducts[productIndex].quantity) + productInfo.product.quantity).toFixed(2)
                allProducts[productIndex].stock = (Number(productInfo.product.stock)+productInfo.product.quantity).toFixed(2)
                allProducts[productIndex].free = (Number(allProducts[productIndex].free) + productInfo.product.free).toFixed(2)
                allProducts[productIndex].sell = (((Number(allProducts[productIndex].sell)*previousQuantity) + (Number(productInfo.product.price.sell)*productInfo.product.quantity))/Number(allProducts[productIndex].quantity)).toFixed(2) 
                allProducts[productIndex].purchase = (((Number(allProducts[productIndex].purchase)*previousQuantity) + (productInfo.product.price.purchase*productInfo.product.quantity))/Number(allProducts[productIndex].quantity)).toFixed(2)  
                allProducts[productIndex].total = (Number(allProducts[productIndex].quantity) * Number(allProducts[productIndex].purchase)).toFixed(2) 
                
                totalAmount += productInfo.product.total
                totalQuantity += productInfo.product.quantity
                totalFreeQuantity += productInfo.product.free
            }else{
                let totalSellProduct = 0
                let totalCostAmount = 0
                let totalSellAmount = 0

                let productSellData = await OrderForPos.find({
                    branch: branchID,
                    "products.code": productInfo.product.barcode,
                    create: {
                        $gte: isodate(from),
                        $lte: isodate(to)
                    }
                }).populate('supplier', '_id name contact').populate('admin', 'name').populate('branch', 'name address')

                let productSellParentArray = productSellData.map(async productDataInfo=>{
                    let productSellChildArray = productDataInfo.products.map(sellProduct=>{
                        if(sellProduct.code == productInfo.product.barcode){
                            totalSellProduct += Number(sellProduct.quantity)
                            totalCostAmount += (sellProduct.quantity*sellProduct.purchase_price)
                            totalSellAmount += (sellProduct.quantity*sellProduct.price)
                        }
                    })
                    await Promise.all(productSellChildArray)
                })

               await Promise.all(productSellParentArray)


            let productRefundData = await PosOrderRefund.find({
                branch: branchID,
                "products.code": productInfo.product.barcode,
                create: {
                    $gte: isodate(from),
                    $lte: isodate(to)
                }
            })

            let productRefundParentArray = productRefundData.map(async productRefundDataInfo=>{
                let productRefundChildArray = productRefundDataInfo.products.map(refundProduct=>{
                    if(refundProduct.code == productInfo.product.barcode){
                        totalSellProduct -= Number(refundProduct.quantity)
                        totalCostAmount -= (refundProduct.quantity*refundProduct.purchase_price)
                        totalSellAmount -= (refundProduct.quantity*refundProduct.price)
                    }
                })
                await Promise.all(productRefundChildArray)
            })

           await Promise.all(productRefundParentArray)

        let productExchange = await PosOrderExchange.find({
            branch: branchID,
            "products.code": productInfo.product.barcode,
            create: {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        })

        let productExchangeParentArray = productExchange.map(async productExchangeInfo=>{
            let productExchangeChildArray = productExchangeInfo.products.map(exchangeProduct=>{
                if(exchangeProduct.code == productInfo.product.barcode){
                    totalSellProduct += Number(exchangeProduct.quantity)
                    totalCostAmount += (exchangeProduct.quantity*exchangeProduct.purchase_price)
                    totalSellAmount += (exchangeProduct.quantity*exchangeProduct.price)
                }
            })
            await Promise.all(productExchangeChildArray)
        })

       await Promise.all(productExchangeParentArray)

       
       let productExchangedBy = await PosOrderExchange.find({
        branch: branchID,
        "exchangedBy.code": productInfo.product.barcode,
        create: {
            $gte: isodate(from),
            $lte: isodate(to)
        }
    })



       let productExchangedByParentArray = productExchangedBy.map(async productExchangedByInfo=>{
        let productExchangedByChildArray = productExchangedByInfo.exchangedBy.map(exchangedByProduct=>{
                if(exchangedByProduct.code == productInfo.product.barcode){
                    totalSellProduct -= Number(exchangedByProduct.quantity)
                    totalCostAmount -= (exchangedByProduct.quantity*exchangedByProduct.purchase_price)
                    totalSellAmount -= (exchangedByProduct.quantity*exchangedByProduct.price)
                }
            })
            await Promise.all(productExchangedByChildArray)
        })

       await Promise.all(productExchangedByParentArray)



       


                let totalReturnedProduct = 0
                let totalReturnedAmount = 0
                let supplierReturnData = await ReturnToSupplier.find({
                    supplier,
                    branch: branchID,
                    "products.barcode": productInfo.product.barcode,
                    create: {
                        $gte: isodate(from),
                        $lte: isodate(to)
                    }
                }).populate('supplier', '_id name contact').populate('admin', 'name').populate('branch', 'name address')

                let supplierReturnParentArray = supplierReturnData.map(supplierReturnInfo=>{
                    supplierReturnInfo.products.map(returnProduct=>{
                        if(returnProduct.barcode == productInfo.product.barcode){
                            totalReturnedProduct += Number(returnProduct.quantity)
                            totalReturnedAmount += (returnProduct.quantity*returnProduct.price.purchase)
                        }
                    })
                })

               await Promise.all(supplierReturnParentArray)

                //console.log(totalReturnedProduct)

                let totalDisposedProduct = 0
                let totalDisposedAmount = 0
                let supplierDisposalData = await ProductDisposal.find({
                    branch: branchID,
                    "products.barcode": productInfo.product.barcode,
                    create: {
                        $gte: isodate(from),
                        $lte: isodate(to)
                    }
                }).populate('admin', 'name').populate('branch', 'name address')

                let supplierDisposalParentArray = supplierDisposalData.map(supplierDisposalInfo=>{
                    supplierDisposalInfo.products.map(disposalProduct=>{
                        if(disposalProduct.barcode == productInfo.product.barcode){
                            totalDisposedProduct += Number(disposalProduct.disposal)
                            totalDisposedAmount += (disposalProduct.disposal*productInfo.product.price.purchase)
                        }
                    })
                })

                await Promise.all(supplierDisposalParentArray)

                //console.log(totalDisposedProduct)

                totalSealValue += (productInfo.product.price.sell * productInfo.product.quantity)
                
                let gpValue = totalSellAmount>0?(((totalSellAmount-totalCostAmount)/totalSellProduct)*(100/(totalCostAmount/totalSellProduct))):0
                totalQuantity += productInfo.product.quantity
                
                let currentStockAmount = (productInfo.product.stock+productInfo.product.quantity)-totalSellProduct-totalReturnedProduct-totalDisposedProduct

                let productInfoQuantity = await Product.findById(productInfo.product._id).select('quantity')

                if(currentStockAmount != productInfoQuantity.quantity){
                    allProducts.push({
                        serial: allProducts.length + 1,
                        barcode: productInfo.product.barcode,
                        name: productInfo.product.name,
                        stock: (productInfo.product.stock+productInfo.product.quantity).toFixed(2),
                        stockCost: ((productInfo.product.stock+productInfo.product.quantity)*productInfo.product.price.purchase).toFixed(2),
                        sell: (productInfo.product.price.sell).toFixed(2),
                        quantity: (productInfo.product.quantity).toFixed(2),
                        purchase: (productInfo.product.price.purchase).toFixed(2),
                        purchaseCost: (productInfo.product.quantity * productInfo.product.price.purchase).toFixed(2),
                        stockQuantity: ((productInfo.product.stock+productInfo.product.quantity)-totalSellProduct-totalReturnedProduct-totalDisposedProduct).toFixed(2),
                        stockCostAmount: (((productInfo.product.stock+productInfo.product.quantity)-totalSellProduct-totalDisposedProduct-totalReturnedProduct)*productInfo.product.price.purchase).toFixed(2),
                        free: (productInfo.product.free).toFixed(2),
                        total: (productInfo.product.total).toFixed(2),
                        total_sell_no: totalSellProduct.toFixed(2),
                        total_cost_amount: totalCostAmount.toFixed(2),
                        total_sell_amount: totalSellAmount.toFixed(2),
                        total_return_no: totalReturnedProduct.toFixed(2),
                        total_return_amount: totalReturnedAmount.toFixed(2),
                        total_disposal_no: totalDisposedProduct.toFixed(2),
                        total_disposal_amount: totalDisposedAmount.toFixed(2),
                        gp: gpValue.toFixed(2)
                    })
                }

                totalAmount += productInfo.product.total
                totalFreeQuantity += productInfo.product.free
                searchProductIndex.push(productInfo.product.barcode)

                totalSoldQuantity += totalSellProduct
                totalSoldCostAmount += totalCostAmount
                totalSoldEarnAmount += totalSellAmount
                totalStockQuantity += ((productInfo.product.stock+productInfo.product.quantity)-totalSellProduct-totalDisposedProduct-totalReturnedProduct)
                totalStockCostQuantity += (((productInfo.product.stock+productInfo.product.quantity)-totalSellProduct-totalDisposedProduct-totalReturnedProduct)*productInfo.product.price.purchase) 
                totalReturnQuantity += totalReturnedProduct
                totalReturnCostQuantity += totalReturnedAmount
                totalDisposalQuantity += totalDisposedProduct
                totalDisposalCostQuantity += totalDisposedAmount 
                totalProfit += gpValue
            }
        })
        await Promise.all(supplierRecevingChildArray)
    })

    await Promise.all(supplierRecevingParentArray)

    

    let allDataInfo = {}

    allDataInfo.totalSealValue = totalSealValue.toFixed(2)
    allDataInfo.totalQuantity = totalQuantity.toFixed(2)
    allDataInfo.fromDate = from.getDate()+'-' + (from.getMonth()+1) + '-'+from.getFullYear()
    allDataInfo.toDate = to.getDate()+'-' + (to.getMonth()+1) + '-'+to.getFullYear()
    
    allDataInfo.totalCostAmount = totalAmount.toFixed(2)
    allDataInfo.totalSoldQuantity = totalSoldQuantity.toFixed(2)
    allDataInfo.totalSoldCostAmount = totalSoldCostAmount.toFixed(2)
    allDataInfo.totalSoldEarnAmount = totalSoldEarnAmount.toFixed(2)
    allDataInfo.totalStockQuantity = totalStockQuantity.toFixed(2)
    allDataInfo.totalStockCostQuantity = totalStockCostQuantity.toFixed(2)
    allDataInfo.totalReturnQuantity = totalReturnQuantity.toFixed(2)
    allDataInfo.totalReturnCostQuantity = totalReturnCostQuantity.toFixed(2)
    allDataInfo.totalDisposalQuantity = totalDisposalQuantity.toFixed(2)
    allDataInfo.totalDisposalCostQuantity = totalDisposalCostQuantity.toFixed(2)
    allDataInfo.totalProfit = (totalProfit/allProducts.length).toFixed(2)
    
    let branch = await Branch.findById(branchID).select('_id serialNo name address serialNo');
    let supplierInfo = await Supplier.findById(supplier).select('_id serialNo name contact');


    allDataInfo.branchNo = branch.serialNo
    allDataInfo.branchName = branch.name.trim()
    allDataInfo.branchAddress = branch.address
    allDataInfo.supplierNo = supplierInfo.serialNo
    allDataInfo.supplierName = supplierInfo.name
    allDataInfo.supplierAddress = supplierInfo.contact.address

    // if(supplierRecevingData.requisitionID){
    //     let requisitionToSupplierData = await RequisitionToSupplier.findById(supplierRecevingData.requisitionID).select('_id').populate('admin', 'name')
    //     allDataInfo.postedBy = requisitionToSupplierData.admin.name
    // }else{
    //     allDataInfo.postedBy = supplierRecevingData.admin.name
    // }

    // allDataInfo.receivedBy = supplierRecevingData[].admin.name
    allDataInfo.totalFreeQuantity = totalFreeQuantity.toFixed(2)
    
    allDataInfo.products = allProducts

    var html = fs.readFileSync(path.join(__dirname, '..', '..', 'reports', 'analysis', 'supplier_wise_analysis.html'), 'utf8');

                    var options = {
                        format: "A4",
                        orientation: "landscape",
                        border: "5mm"
                    }
            
                    var document = {
                        html: html,
                        data: allDataInfo,
                        path: "./public/reports/stock_checkup/supplier_wise_analysis"+supplier+".pdf"
                    };
            
                    pdf.create(document, options)
                        .then(data => {
                            const file = data.filename;
                            console.log(file)
                        })
                        .catch(error => {
                            console.error(error)
                        });
} catch (err) {
    console.error(err);
}
}

module.exports = getListOFNotMatchedStock