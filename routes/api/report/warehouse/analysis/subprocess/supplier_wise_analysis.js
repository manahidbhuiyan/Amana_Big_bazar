var mongoConnection = require('../../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");
const config = require('config');
// const OrderForPos = require('../../../../../../models/OrderForPos');
// const PosOrderExchange = require('../../../../../../models/PosOrderExchange');
// const PosOrderRefund = require('../../../../../../models/PosOrderRefund');
const Supplier = require('../../../../../../models/Supplier');
const ReceiveFromSupplier = require('../../../../../../models/Tracking/WarehouseTransaction/ReceiveFromSupplier');
const ReturnToSupplier = require('../../../../../../models/Tracking/WarehouseTransaction/ReturnToSupplier');
const ProductDisposal = require('../../../../../../models/Tracking/WarehouseTransaction/ProductDisposal');
const SupplyToBranch = require('../../../../../../models/Tracking/WarehouseSupply/RequisitionWiseSupply');
const ReturnFromBranch = require('../../../../../../models/Tracking/WarehouseSupply/ReturnSupplierWise')
const admin = require('../../../../../../models/admin/Admin');
const Product = require('../../../../../../models/WarehouseProduct');
const Branch = require('../../../../../../models/Branch');

process.on('message', async (msg) => {
    let {
        from,
        to,
        supplier,
        branch,
        type
    } = msg

    from = new Date(from)
    to = new Date(to)

    let supplierRecevingData = await ReceiveFromSupplier.find({
        supplier,
        create: {
            $gte: isodate(from),
            $lte: isodate(to)
        }
    }).populate('supplier', '_id name contact').populate('admin', 'name').populate('products.product._id', 'name price')

    let branchInfo = await Branch.findById(branch).select('name');


    let allProducts = []
    let allProductBarcodes = []
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
    let totalReturnFromBranchQuantity = 0
    let totalProfit = 0



    let supplierRecevingParentArray = supplierRecevingData.map(async (productList, index) => {
        let supplierRecevingChildArray = productList.products.map(async (productInfo, index) => {
            if (searchProductIndex.includes(productInfo.product.barcode)) {
                var productIndex = searchProductIndex.indexOf(productInfo.product.barcode);
                var previousQuantity = Number(allProducts[productIndex].quantity);
                totalSealValue += (productInfo.product._id.price.sell * productInfo.product.quantity)
                allProducts[productIndex].quantity = (type == 'pdf') ? (Number(allProducts[productIndex].quantity) + productInfo.product.quantity).toFixed(2) : (Number(allProducts[productIndex].quantity) + productInfo.product.quantity)

                allProducts[productIndex].stock = (type == 'pdf') ? (Number(productInfo.product.stock) + productInfo.product.quantity).toFixed(2) : (Number(productInfo.product.stock) + productInfo.product.quantity)

                allProducts[productIndex].free = (type == 'pdf') ? (Number(allProducts[productIndex].free) + productInfo.product.free).toFixed(2) : (Number(allProducts[productIndex].free) + productInfo.product.free)
                allProducts[productIndex].sell = (type == 'pdf') ? (((Number(allProducts[productIndex].sell) * previousQuantity) + (Number(productInfo.product._id.price.sell) * productInfo.product.quantity)) / Number(allProducts[productIndex].quantity)).toFixed(2) : (((Number(allProducts[productIndex].sell) * previousQuantity) + (Number(productInfo.product._id.price.sell) * productInfo.product.quantity)) / Number(allProducts[productIndex].quantity))

                allProducts[productIndex].purchase = (type == 'pdf') ? (((Number(allProducts[productIndex].purchase) * previousQuantity) + (productInfo.product._id.price.purchase * productInfo.product.quantity)) / Number(allProducts[productIndex].quantity)).toFixed(2) : (((Number(allProducts[productIndex].purchase) * previousQuantity) + (productInfo.product._id.price.purchase * productInfo.product.quantity)) / Number(allProducts[productIndex].quantity))

                allProducts[productIndex].total = (type == 'pdf') ? (Number(allProducts[productIndex].quantity) * Number(allProducts[productIndex].purchase)).toFixed(2) : (Number(allProducts[productIndex].quantity) * Number(allProducts[productIndex].purchase))

                totalAmount += productInfo.product.total
                totalQuantity += productInfo.product.quantity
                totalFreeQuantity += productInfo.product.free
            } else {
                let totalSellProduct = 0
                let totalReturnFromBranch = 0
                let totalCostAmount = 0
                let totalSellAmount = 0

                let productSupplyData = await SupplyToBranch.find({
                    "products.product.barcode": productInfo.product.barcode,
                    branch: branch,
                    create: {
                        $gte: isodate(from),
                        $lte: isodate(to)
                    }
                }).populate('supplier', '_id name contact').populate('admin', 'name').populate('products.product._id', 'name price')


                let productSellParentArray = productSupplyData.map(async productDataInfo => {
                    let productSellChildArray = productDataInfo.products.map(sellProduct => {
                        if (sellProduct.product.barcode == productInfo.product.barcode) {
                            totalSellProduct += Number(sellProduct.product.quantity)
                            totalCostAmount += (Number(sellProduct.product.quantity) * sellProduct.product._id.price.purchase)
                            totalSellAmount += (Number(sellProduct.product.quantity) * sellProduct.product._id.price.sell)
                        }
                    })
                    await Promise.all(productSellChildArray)
                })

                await Promise.all(productSellParentArray)


                let branchReturnData = await ReturnFromBranch.find({
                    "products.product.barcode": productInfo.product.barcode,
                    branch: branch,
                    create: {
                        $gte: isodate(from),
                        $lte: isodate(to)
                    }
                }).populate('products.product._id', 'name price')

                let productRefundParentArray = branchReturnData.map(async productRefundDataInfo => {
                    let productRefundChildArray = productRefundDataInfo.products.map(refundProduct => {
                        if (refundProduct.product.barcode == productInfo.product.barcode) {
                            totalReturnFromBranch += Number(refundProduct.product.quantity)
                        }
                    })
                    await Promise.all(productRefundChildArray)
                })

                await Promise.all(productRefundParentArray)


                let totalReturnedProduct = 0
                let totalReturnedAmount = 0
                let supplierReturnData = await ReturnToSupplier.find({
                    supplier,
                    "products.barcode": productInfo.product.barcode,
                    create: {
                        $gte: isodate(from),
                        $lte: isodate(to)
                    }
                }).populate('supplier', '_id name contact').populate('admin', 'name').populate('products._id', 'name price')

                let supplierReturnParentArray = supplierReturnData.map(supplierReturnInfo => {
                    supplierReturnInfo.products.map(returnProduct => {
                        if (returnProduct.barcode == productInfo.product.barcode) {
                            totalReturnedProduct += Number(returnProduct.quantity)
                            totalReturnedAmount += (Number(returnProduct.quantity) * returnProduct._id.price.purchase)
                        }
                    })
                })

                await Promise.all(supplierReturnParentArray)


                let totalDisposedProduct = 0
                let totalDisposedAmount = 0
                let supplierDisposalData = await ProductDisposal.find({
                    "products.barcode": productInfo.product.barcode,
                    create: {
                        $gte: isodate(from),
                        $lte: isodate(to)
                    }
                }).populate('admin', 'name').populate('products._id', 'name price')

                let supplierDisposalParentArray = supplierDisposalData.map(supplierDisposalInfo => {
                    supplierDisposalInfo.products.map(disposalProduct => {
                        if (disposalProduct.barcode == productInfo.product.barcode) {
                            totalDisposedProduct += Number(disposalProduct.disposal)
                            totalDisposedAmount += (Number(disposalProduct.disposal) * productInfo.product._id.price.purchase)
                        }
                    })
                })
                await Promise.all(supplierDisposalParentArray)

                totalSealValue += (productInfo.product._id.price.sell * productInfo.product.quantity)

                let gpValue = totalSellAmount > 0 ? (((totalSellAmount - totalCostAmount) / totalSellProduct) * (100 / (totalCostAmount / totalSellProduct))) : 0



                if (allProductBarcodes.includes(productInfo.product.barcode)) {
                    let barcodeIndex = allProductBarcodes.indexOf(productInfo.product.barcode)
                    allProducts[barcodeIndex].quantity = (type == 'pdf') ? (Number(allProducts[barcodeIndex].quantity) + productInfo.product.quantity).toFixed(2) : (Number(allProducts[barcodeIndex].quantity) + productInfo.product.quantity)

                    allProducts[barcodeIndex].purchaseCost = (type == 'pdf') ? (Number(allProducts[barcodeIndex].purchaseCost) + (productInfo.product.quantity * productInfo.product._id.price.purchase)).toFixed(2) : (Number(allProducts[barcodeIndex].purchaseCost) + (productInfo.product.quantity * productInfo.product._id.price.purchase))

                    allProducts[barcodeIndex].stockQuantity = (type == 'pdf') ? (Number(allProducts[barcodeIndex].stockQuantity) + productInfo.product.quantity).toFixed(2) : (Number(allProducts[barcodeIndex].stockQuantity) + productInfo.product.quantity)
                    allProducts[barcodeIndex].stockCostAmount = (type == 'pdf') ? (Number(allProducts[barcodeIndex].stockQuantity) * productInfo.product._id.price.purchase).toFixed(2) : (Number(allProducts[barcodeIndex].stockQuantity) * productInfo.product._id.price.purchase)
                } else {
                    allProducts.push({
                        serial: allProducts.length + 1,
                        barcode: productInfo.product.barcode,
                        name: productInfo.product.name,
                        stock: (type == 'pdf') ? (productInfo.product.stock + productInfo.product.quantity).toFixed(2) : (productInfo.product.stock + productInfo.product.quantity),
                        stockCost: (type == 'pdf') ? ((productInfo.product.stock + productInfo.product.quantity) * productInfo.product._id.price.purchase).toFixed(2) : ((productInfo.product.stock + productInfo.product.quantity) * productInfo.product._id.price.purchase),
                        sell: (type == 'pdf') ? (productInfo.product._id.price.sell).toFixed(2) : (productInfo.product._id.price.sell),
                        quantity: (type == 'pdf') ? (productInfo.product.quantity).toFixed(2) : (productInfo.product.quantity),
                        purchase: (type == 'pdf') ? (productInfo.product._id.price.purchase).toFixed(2) : (productInfo.product._id.price.purchase),
                        purchaseCost: (type == 'pdf') ? (productInfo.product.quantity * productInfo.product._id.price.purchase).toFixed(2) : (productInfo.product.quantity * productInfo.product._id.price.purchase),
                        stockQuantity: (type == 'pdf') ? ((productInfo.product.stock + productInfo.product.quantity) - totalSellProduct - totalReturnedProduct - totalDisposedProduct + totalReturnFromBranch).toFixed(2) : ((productInfo.product.stock + productInfo.product.quantity) - totalSellProduct - totalReturnedProduct - totalDisposedProduct + totalReturnFromBranch),

                        stockCostAmount: (type == 'pdf') ? (((productInfo.product.stock + productInfo.product.quantity) - totalSellProduct - totalDisposedProduct - totalReturnedProduct) * productInfo.product._id.price.purchase).toFixed(2) : (((productInfo.product.stock + productInfo.product.quantity) - totalSellProduct - totalDisposedProduct - totalReturnedProduct) * productInfo.product._id.price.purchase),
                        free: (type == 'pdf') ? (productInfo.product.free).toFixed(2) : (productInfo.product.free),
                        total: (type == 'pdf') ? (productInfo.product.total).toFixed(2) : (productInfo.product.total),
                        total_sell_no: (type == 'pdf') ? totalSellProduct.toFixed(2) : totalSellProduct,
                        total_cost_amount: (type == 'pdf') ? totalCostAmount.toFixed(2) : totalCostAmount,
                        total_sell_amount: (type == 'pdf') ? totalSellAmount.toFixed(2) : totalSellAmount,
                        total_return_no: (type == 'pdf') ? totalReturnedProduct.toFixed(2) : totalReturnedProduct,
                        total_return_amount: (type == 'pdf') ? totalReturnedAmount.toFixed(2) : totalReturnedAmount,
                        total_disposal_no: (type == 'pdf') ? totalDisposedProduct.toFixed(2) : totalDisposedProduct,
                        total_disposal_amount: (type == 'pdf') ? totalDisposedAmount.toFixed(2) : totalDisposedAmount,
                        totalReturnFromBranch: (type == 'pdf') ? totalReturnFromBranch.toFixed(2) : totalReturnFromBranch,
                        gp: (type == 'pdf') ? gpValue.toFixed(2) : gpValue
                    })
                    allProductBarcodes.push(productInfo.product.barcode);
                }
                searchProductIndex.push(productInfo.product.barcode)
            }
        })
        await Promise.all(supplierRecevingChildArray)
    })

    await Promise.all(supplierRecevingParentArray)


    let gradTotalCalculationArray = allProducts.map(productInfo => {
        totalQuantity += Number(productInfo.quantity)
        totalAmount += Number(productInfo.purchaseCost)
        totalSoldQuantity += Number(productInfo.total_sell_no)
        totalSoldCostAmount += Number(productInfo.total_cost_amount)
        totalSoldEarnAmount += Number(productInfo.total_sell_amount)
        totalStockQuantity += Number(productInfo.stockQuantity)
        totalStockCostQuantity += Number(productInfo.stockCostAmount)
        totalReturnQuantity += Number(productInfo.total_return_no)
        totalReturnCostQuantity += Number(productInfo.total_return_amount)
        totalDisposalQuantity += Number(productInfo.total_disposal_no)
        totalDisposalCostQuantity += Number(productInfo.total_disposal_amount)
        totalReturnFromBranchQuantity += Number(productInfo.totalReturnFromBranch)
        totalProfit += Number(productInfo.gp)
    })

    await Promise.all(gradTotalCalculationArray)

    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let allDataInfo = {}

    allDataInfo.totalSealValue = (type == 'pdf') ? totalSealValue.toFixed(2) : totalSealValue
    allDataInfo.totalQuantity = (type == 'pdf') ? totalQuantity.toFixed(2) : totalQuantity
    allDataInfo.fromDate = new Date(from).getDate() + '-' + (new Date(from).getMonth() + 1) + '-' + new Date(from).getFullYear()
    allDataInfo.toDate = new Date(to).getDate() + '-' + (new Date(to).getMonth() + 1) + '-' + new Date(to).getFullYear()

    allDataInfo.totalCostAmount = (type == 'pdf') ? totalAmount.toFixed(2) : totalAmount
    allDataInfo.totalSoldQuantity = (type == 'pdf') ? totalSoldQuantity.toFixed(2) : totalSoldQuantity
    allDataInfo.totalSoldCostAmount = (type == 'pdf') ? totalSoldCostAmount.toFixed(2) : totalSoldCostAmount
    allDataInfo.totalSoldEarnAmount = (type == 'pdf') ? totalSoldEarnAmount.toFixed(2) : totalSoldEarnAmount
    allDataInfo.totalStockQuantity = (type == 'pdf') ? totalStockQuantity.toFixed(2) : totalStockQuantity
    allDataInfo.totalStockCostQuantity = (type == 'pdf') ? totalStockCostQuantity.toFixed(2) : totalStockCostQuantity
    allDataInfo.totalReturnQuantity = (type == 'pdf') ? totalReturnQuantity.toFixed(2) : totalReturnQuantity
    allDataInfo.totalReturnCostQuantity = (type == 'pdf') ? totalReturnCostQuantity.toFixed(2) : totalReturnCostQuantity
    allDataInfo.totalDisposalQuantity = (type == 'pdf') ? totalDisposalQuantity.toFixed(2) : totalDisposalQuantity
    allDataInfo.totalDisposalCostQuantity = (type == 'pdf') ? totalDisposalCostQuantity.toFixed(2) : totalDisposalCostQuantity
    allDataInfo.totalReturnFromBranchQuantity = (type == 'pdf') ? totalReturnFromBranchQuantity.toFixed(2) : totalReturnFromBranchQuantity
    allDataInfo.totalProfit = (type == 'pdf') ? (totalProfit / allProducts.length).toFixed(2) : (totalProfit / allProducts.length)

    let supplierInfo = await Supplier.findById(supplier).select('_id serialNo name contact');
    let today = new Date();
    let hours = today.getHours();
    let minutes = today.getMinutes();
    let ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0' + minutes : minutes;
    let createTime = hours + ':' + minutes + ' ' + ampm;

    allDataInfo.branchName = config.get('warehouse').name
    allDataInfo.branchAddress = config.get('warehouse').address
    allDataInfo.branchPhone = config.get('warehouse').phone
    allDataInfo.branchNo = config.get('warehouse').code
    allDataInfo.supplierNo = supplierInfo.serialNo
    allDataInfo.supplierName = supplierInfo.name
    allDataInfo.supplierAddress = supplierInfo.contact.address
    allDataInfo.today = ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear()
    allDataInfo.createTime = createTime
    allDataInfo.company_name = config.get('company').full_name
    allDataInfo.company_logo = config.get('company').company_logo
    allDataInfo.totalFreeQuantity = (type == 'pdf') ? totalFreeQuantity.toFixed(2) : totalFreeQuantity
    allDataInfo.supplyBranch = branchInfo.name

    allDataInfo.products = allProducts

    if (type == 'excel') {
        let grandTotal = {
            totalQuantity: allDataInfo.totalQuantity,
            totalCostAmount: allDataInfo.totalCostAmount,
            totalSoldQuantity: allDataInfo.totalSoldQuantity,
            totalSoldCostAmount: allDataInfo.totalSoldCostAmount,
            totalSoldEarnAmount: allDataInfo.totalSoldEarnAmount,
            totalStockQuantity: allDataInfo.totalStockQuantity,
            totalStockCostQuantity: allDataInfo.totalStockCostQuantity,
            totalReturnQuantity: allDataInfo.totalReturnQuantity,
            totalReturnCostQuantity: allDataInfo.totalReturnCostQuantity,
            totalDisposalQuantity: allDataInfo.totalDisposalQuantity,
            totalDisposalCostQuantity: allDataInfo.totalDisposalCostQuantity,
            totalReturnFromBranchQuantity : allDataInfo.totalReturnFromBranchQuantity,
            totalProfit: allDataInfo.totalProfit
        }
        let allDataInfoArray = []

        allDataInfo.products.map((item) => {
            allDataInfoArray.push(item)
        })

        process.send({
            grandTotal,
            allDataInfo,
            allDataInfoArray
        });
    } else {
        process.send({
            allDataInfo
        });
    }
});