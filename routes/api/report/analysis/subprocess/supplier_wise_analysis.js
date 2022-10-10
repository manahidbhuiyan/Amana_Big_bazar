var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");
const config = require('config');
const OrderForPos = require('../../../../../models/OrderForPos');
const PosOrderExchange = require('../../../../../models/PosOrderExchange');
const PosOrderRefund = require('../../../../../models/PosOrderRefund');
const Supplier = require('../../../../../models/Supplier');
const ReceiveFromSupplier = require('../../../../../models/Tracking/Transaction/ReceiveFromSupplier');
const ReturnToSupplier = require('../../../../../models/Tracking/Transaction/ReturnToSupplier');
const ProductDisposal = require('../../../../../models/Tracking/Transaction/ProductDisposal');
const admin = require('../../../../../models/admin/Admin');
const Product = require('../../../../../models/Product');
const Branch = require('../../../../../models/Branch');


process.on('message', async (msg) => {
    let {
        from, to, supplier, type, branch
    } = msg

    from = new Date(from)
    to = new Date(to)

    let supplierWiseProducts = await Product.find({supplier})

    // supplier wise sell products list start

    const supplierParentArray = supplierWiseProducts.map(async (productInfo) => {
        let productSellData = await OrderForPos.find({
            branch: branch,
            "products.code": productInfo.barcode,
            "products.product": productInfo._id,
            create: {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        }).populate('supplier', '_id name contact').populate('admin', 'name').populate('branch', 'name address').populate('products.product', 'name price')

        let totalSellProduct = 0
        let totalCostAmount = 0
        let totalSellAmount = 0

        // supplier wise sell productInfo list start -----------

        let productSellParentArray = productSellData.map(async (productSellInfo) => {

            // sell products list start -----------

            let productSellChildArray = productSellInfo.products.map(async (sellProduct) => {
                // console.log("sellProduct",sellProduct)
                // console.log("sellProduct.product._id",sellProduct.product._id)
                // console.log("productInfo id",productInfo._id)
                if (sellProduct.product._id == productInfo._id) {
                    totalSellProduct += sellProduct.quantity
                    totalCostAmount += (sellProduct.quantity) * sellProduct.product.price.purchase
                    totalSellAmount += (sellProduct.quantity) * sellProduct.product.price.sell
                } else {
                    totalSellProduct += sellProduct.quantity
                    totalCostAmount += (sellProduct.quantity) * sellProduct.product.price.purchase
                    totalSellAmount += (sellProduct.quantity) * sellProduct.product.price.sell
                }
                // console.log("sellProduct",sellProduct)
                // console.log("totalSellProduct",totalSellProduct)
                // console.log("totalCostAmount",totalCostAmount)
                // console.log("totalSellAmount",totalSellAmount)
            })
            await Promise.all(productSellChildArray)
            // sell products list stop -----------

            // exchange products list start

            let exchangeListItems = await PosOrderExchange.find({
                branch: branch,
                "products.code": productInfo.barcode,
                "products.product": productInfo._id,
                create: {
                    $gte: isodate(from),
                    $lte: isodate(to)
                }
            }).populate('products.product', 'name price').populate('exchangedBy.product', 'name price')
            console.log("initials items  totalSellProduct",totalSellProduct)
            console.log("initials items  totalCostAmount",totalCostAmount)
            console.log("initials items  totalSellAmount",totalSellAmount)
            let exchangeListParentArray = exchangeListItems.map(async (exchangeItemInfo) =>{
                // console.log("exchangeItemInfo",exchangeItemInfo)
                let exchangeListChildOneArray = exchangeItemInfo.products.map(async (exchangeItems)=>{
                    // console.log("exchangeItems",exchangeItems)
                    if (exchangeItems.code == productInfo.barcode) {
                        totalSellProduct += Number(exchangeItems.quantity)
                        totalCostAmount += (Number(exchangeItems.quantity) * exchangeItems.purchase_price)
                        totalSellAmount += (Number(exchangeItems.quantity) * exchangeItems.price)
                        console.log("exchange items name",exchangeItems.name)
                        console.log("exchange items  totalSellProduct",totalSellProduct)
                        console.log("exchange items  totalCostAmount",totalCostAmount)
                        console.log("exchange items  totalSellAmount",totalSellAmount)
                    }

                })
                await Promise.all(exchangeListChildOneArray)
            })
            await Promise.all(exchangeListParentArray)

            let exchangeListParentArrayTwo = exchangeListItems.map(async (exchangeItemInfo) =>{
                let exchangeListChildTwoArray = exchangeItemInfo.exchangedBy.map(async (exchangeByItems)=>{
                    console.log("exchangeByItems code",exchangeByItems.code)
                    console.log("productInfo barcode",productInfo.barcode)

                        totalSellProduct -= Number(exchangeByItems.quantity)
                        totalCostAmount -= (Number(exchangeByItems.quantity) * exchangeByItems.purchase_price)
                        totalSellAmount -= (Number(exchangeByItems.quantity) * exchangeByItems.price)

                    console.log("exchange by item name",exchangeByItems.name)
                    console.log("exchange by totalSellProduct",totalSellProduct)
                    console.log("exchange by totalCostAmount",totalCostAmount)
                    console.log("exchange by totalSellAmount",totalSellAmount)
                })
                await Promise.all(exchangeListChildTwoArray)
            })
            await Promise.all(exchangeListParentArrayTwo)



            // exchange products list stop

            // refund productInfo list start -----------
            let productRefund = await PosOrderRefund.find({
                branch: branch, "products.code": productInfo.barcode, "products.product": productInfo._id, create: {
                    $gte: isodate(from), $lte: isodate(to)
                }
            }).populate('products.product', 'name price')

            const productRefundParentArray = productRefund.map(async (refundProductInfo) => {

                //    refund products list start -----------

                const productRefundChildArray = refundProductInfo.products.map(async (refaundProduct) => {
                    // console.log("refaundProduct",refaundProduct)
                    if (refaundProduct.product._id != productInfo._id) {
                        totalSellProduct -= Number(refaundProduct.quantity)
                        totalCostAmount -= (Number(refaundProduct.quantity) * refaundProduct.product.price.purchase)
                        totalSellAmount -= (Number(refaundProduct.quantity) * refaundProduct.product.price.sell)
                    }
                    // console.log("refaundProduct.product")
                })
                await Promise.all(productRefundChildArray)
                //    refund products list stop -----------
            })
            await Promise.all(productRefundParentArray)
            //    refund productInfo list stop -----------

        })
        await Promise.all(productSellParentArray)

        // supplier wise sell productInfo list stop -----------

        // supplier wise productInfo receive from Supplier list start -----------

        let totalReceivingProduct = 0
        let totalReceivingAmount = 0

        let supplierReceivingData = await ReceiveFromSupplier.find({
            branch: branch,
            "products.product.barcode":productInfo.barcode,
            "products.product._id":productInfo._id,
            create: {
                $gte: isodate(from), $lte: isodate(to)
            }
        }).populate('supplier','_id name contact').populate('admin','name').populate('branch','name address').populate('products.product._id')
        // console.log("supplierReceivingData",supplierReceivingData)

        let seupplierReceiveParentArray = await supplierReceivingData.map(async (supplierReceiveInfo) =>{
            let supplierReceiveChildArray = await supplierReceiveInfo.products.map(async (receiveProduct)=>{
                // console.log("receiveProduct",receiveProduct)
                if (receiveProduct.product.barcode == productInfo.barcode){
                    totalReceivingProduct += Number(receiveProduct.product.quantity),
                    totalReceivingAmount  += (Number(receiveProduct.product.quantity) * receiveProduct.product.price.purchase)
                }
                // console.log("totalReceivingProduct",totalReceivingProduct)
                // console.log("totalReceivingAmount",totalReceivingAmount)
            })
            await Promise.all(supplierReceiveChildArray)
        })
        await Promise.all(seupplierReceiveParentArray)


        // supplier wise productInfo receive from Supplier list stop -----------

        // supplier wise productInfo return To Supplier list start -----------

        let totalReturnedProduct = 0
        let totalReturnedAmount = 0
        let supplierReturnData = await ReturnToSupplier.find({
            branch: branch,
            "products.barcode": productInfo.barcode,
            "products._id": productInfo._id,
            create: {
                $gte: isodate(from), $lte: isodate(to)
            }
        }).populate('supplier', '_id name contact').populate('admin', 'name').populate('branch', 'name address').populate('products._id', 'name price')

        let supplierReturnParentArray = supplierReturnData.map(async(supplierReturnInfo) => {
            // console.log("supplierReturnInfo",supplierReturnInfo)
            let supplierReturnChildArray = supplierReturnInfo.products.map(async(returnProduct) => {
                if (returnProduct.barcode == productInfo.barcode) {
                    totalReturnedProduct += Number(returnProduct.quantity)
                    totalReturnedAmount += (Number(returnProduct.quantity) * returnProduct.price.purchase)
                }
            })
            await Promise.all(supplierReturnChildArray)
        })

        await Promise.all(supplierReturnParentArray)

        // supplier wise productInfo return To Supplier list start -----------
        // supplier wise productInfo disposal product list start -----------

        let totalDisposalProduct = 0
        let totalDisposalAmount = 0
        // console.log("disposal area start")
        let disposalProductsData = await ProductDisposal.find({
            branch: branch,
            "products.barcode": productInfo.barcode,
            "products._id": productInfo._id,
            create: {
                $gte: isodate(from), $lte: isodate(to)
            }
        }).populate('supplier', '_id name contact').populate('admin', 'name').populate('branch', 'name address').populate('products._id', 'name price')
        // console.log("disposalProductsData",disposalProductsData)
        let disposalProductsParentArray = disposalProductsData.map(async(disposalProductInfo) => {
            // console.log("disposalProductInfo",disposalProductInfo)
            let disposalProductsChildArray = disposalProductInfo.products.map(async(disposalProduct) => {
                if (disposalProduct.barcode == productInfo.barcode) {
                    totalDisposalProduct += Number(disposalProduct.disposal)
                    totalDisposalAmount += (Number(disposalProduct.disposal) * disposalProduct.price.purchase)
                }
                // console.log("totalDisposalProduct",totalDisposalProduct)
                // console.log("totalDisposalAmount",totalDisposalAmount)
            })
            await Promise.all(disposalProductsChildArray)
        })

        await Promise.all(disposalProductsParentArray)

        // supplier wise productInfo return To Supplier list start -----------

    })
    await Promise.all(supplierParentArray)

    //    supplier wise sell products list start -----------


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


    // if (type == 'excel') {
    //     let grandTotal = {
    //         totalQuantity: allDataInfo.totalQuantity,
    //         totalCostAmount: allDataInfo.totalCostAmount,
    //         totalSoldQuantity: allDataInfo.totalSoldQuantity,
    //         totalSoldCostAmount: allDataInfo.totalSoldCostAmount,
    //         totalSoldEarnAmount: allDataInfo.totalSoldEarnAmount,
    //         totalStockQuantity: allDataInfo.totalStockQuantity,
    //         totalStockCostQuantity: allDataInfo.totalStockCostQuantity,
    //         totalReturnQuantity: allDataInfo.totalReturnQuantity,
    //         totalReturnCostQuantity: allDataInfo.totalReturnCostQuantity,
    //         totalDisposalQuantity: allDataInfo.totalDisposalQuantity,
    //         totalDisposalCostQuantity: allDataInfo.totalDisposalCostQuantity,
    //         totalProfit: allDataInfo.totalProfit
    //     }
    //     let allDataInfoArray = []

    //     allDataInfo.products.map((item) => {
    //         allDataInfoArray.push(item)
    //     })

    //     process.send({
    //         grandTotal,
    //         allDataInfo,
    //         allDataInfoArray
    //     });
    // } else {
    //     process.send({
    //         allDataInfo
    //     });
    // }
});