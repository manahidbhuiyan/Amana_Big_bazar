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
const Category = require("../../../../../models/Category");


process.on('message', async (msg) => {
    let {
        from, to, supplier, type, branch
    } = msg

    from = new Date(from)
    to = new Date(to)


    // let supplierInformation = await Supplier.find({
    //     _id: supplier,
    //     branch: {
    //         $in: branch
    //     }
    // }).select('_id name serialNo')

    // supplier wise sell products list start

    let sellProductList = []
    let productBarcodes = []

        let productSellData = await OrderForPos.find({
            branch: branch,
            "products.supplier" : supplier,
            create: {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        }).populate('supplier', '_id name contact').populate('admin', 'name').populate('branch', 'name address').populate('products.product', 'name price quantity')


        let totalSellProduct = 0
        let totalCostAmount = 0
        let totalSellAmount = 0


        let productSellParentArray = productSellData.map(async (productSellInfo) => {
            // sell products list start -----------
            let productSellChildArray = productSellInfo.products.map(async (sellProduct) => {
                // console.log("sellProduct",sellProduct)
                       if (productBarcodes.includes(sellProduct.code)) {
                           sellProductList[productBarcodes.indexOf(sellProduct.code)].totalSellProduct += sellProduct.quantity
                           sellProductList[productBarcodes.indexOf(sellProduct.code)].totalCostAmount += (sellProduct.purchase_price * sellProduct.quantity)
                           sellProductList[productBarcodes.indexOf(sellProduct.code)].totalSellAmount += (sellProduct.price * sellProduct.quantity)
                       } else {
                           productBarcodes.push(sellProduct.code)
                           sellProductList.push({
                               barcode: sellProduct.code,
                               name: sellProduct.name,
                               currentStock: sellProduct.product.quantity,
                               stockCost : Number(sellProduct.product.quantity * sellProduct.purchase_price),
                               purchase_price: sellProduct.purchase_price,
                               sell_price: sellProduct.price,
                               totalSellProduct: sellProduct.quantity,
                               totalCostAmount: sellProduct.purchase_price * sellProduct.quantity,
                               totalSellAmount: sellProduct.price * sellProduct.quantity,
                               totalReceivingProduct: 0,
                               totalReceivingAmount:  0,
                               totalReturnProduct: 0,
                               totalReturnAmount: 0,
                               totalDisposalProduct: 0,
                               totalDisposalAmount: 0,
                               gpValue: Number((sellProduct.price * sellProduct.quantity) > 0 ? ((((sellProduct.price * sellProduct.quantity) - (sellProduct.purchase_price * sellProduct.quantity)) / sellProduct.quantity) * (100 / (((sellProduct.purchase_price * sellProduct.quantity)) / (sellProduct.quantity)))).toFixed(2) : 0)
                           })
                       }

            })
            await Promise.all(productSellChildArray)
        })
        await Promise.all(productSellParentArray)

            // sell products list stop -----------
            // exchange products list start---------

            let exchangeListItems = await PosOrderExchange.find({
                branch: branch,
                "products.supplier": supplier,
                create: {
                    $gte: isodate(from),
                    $lte: isodate(to)
                }
            }).populate('products.product', 'name price quantity').populate('exchangedBy.product', 'name price quantity')

            let exchangeListParentArray = exchangeListItems.map(async (exchangeItemInfo) =>{

                let exchangeListChildOneArray = exchangeItemInfo.products.map(async (exchangeItems)=>{
                    // console.log("exchangeItems",exchangeItems)

                        if (productBarcodes.includes(exchangeItems.code)) {
                            // sellProductList[productBarcodes.indexOf(exchangeItems.code)].currentStock += Number(exchangeItems.quantity)
                            // sellProductList[productBarcodes.indexOf(exchangeItems.code)].stockCost += Number(exchangeItems.quantity * exchangeItems.purchase_price)
                            sellProductList[productBarcodes.indexOf(exchangeItems.code)].totalSellProduct += Number(exchangeItems.quantity)
                            sellProductList[productBarcodes.indexOf(exchangeItems.code)].totalCostAmount += Number((exchangeItems.quantity) * exchangeItems.purchase_price)
                            sellProductList[productBarcodes.indexOf(exchangeItems.code)].totalSellAmount += Number((exchangeItems.quantity) * exchangeItems.price)
                        } else {
                            productBarcodes.push(exchangeItems.code)
                            sellProductList.push({
                                barcode: exchangeItems.code,
                                name: exchangeItems.name,
                                currentStock: exchangeItems.product.quantity,
                                stockCost : exchangeItems.product.quantity * exchangeItems.purchase_price,
                                purchase_price: exchangeItems.purchase_price,
                                sell_price: exchangeItems.price,
                                totalSellProduct: exchangeItems.quantity,
                                totalCostAmount: Number((exchangeItems.quantity) * exchangeItems.purchase_price),
                                totalSellAmount: Number((exchangeItems.quantity) * exchangeItems.price),
                                totalReceivingProduct: 0,
                                totalReceivingAmount:  0,
                                totalReturnProduct: 0,
                                totalReturnAmount: 0,
                                totalDisposalProduct: 0,
                                totalDisposalAmount: 0,
                                gpValue: Number((exchangeItems.price * exchangeItems.quantity) > 0 ? ((((exchangeItems.price * exchangeItems.quantity) - (exchangeItems.purchase_price * exchangeItems.quantity)) / exchangeItems.quantity) * (100 / (((exchangeItems.purchase_price * exchangeItems.quantity)) / (exchangeItems.quantity)))).toFixed(2) : 0)


                                // barcode: exchangeItems.code,
                                // name: exchangeItems.name,
                                // purchase_price: exchangeItems.purchase_price,
                                // sell_price: exchangeItems.price,
                                // currentStock: 0,
                                // stockCost: 0,
                                // quantity: Number(exchangeItems.quantity),
                                // purchaseCost: (Number(exchangeItems.quantity) * exchangeItems.purchase_price),
                                // sellCost: (Number(exchangeItems.quantity) * exchangeItems.price)
                            })
                        }
                })
                await Promise.all(exchangeListChildOneArray)
            })
            await Promise.all(exchangeListParentArray)

            let exchangeListParentArrayTwo = exchangeListItems.map(async (exchangeItemInfo) =>{
                let exchangeListChildTwoArray = exchangeItemInfo.exchangedBy.map(async (exchangeByItems)=>{
                    // console.log("exchangeByItems",exchangeByItems)

                        if (productBarcodes.includes(exchangeByItems.code)) {
                            // sellProductList[productBarcodes.indexOf(exchangeByItems.code)].currentStock -= Number(exchangeByItems.quantity)
                            // sellProductList[productBarcodes.indexOf(exchangeByItems.code)].stockCost -= Number(exchangeByItems.quantity * exchangeByItems.purchase_price)
                            sellProductList[productBarcodes.indexOf(exchangeByItems.code)].totalSellProduct -= Number(exchangeByItems.quantity)
                            sellProductList[productBarcodes.indexOf(exchangeByItems.code)].totalCostAmount -= Number((exchangeByItems.quantity) * exchangeByItems.purchase_price)
                            sellProductList[productBarcodes.indexOf(exchangeByItems.code)].totalSellAmount -= Number((exchangeByItems.quantity) * exchangeByItems.price)
                        } else {
                            productBarcodes.push(exchangeByItems.code)
                            sellProductList.push({
                                barcode: exchangeByItems.code,
                                name: exchangeByItems.name,
                                purchase_price: exchangeByItems.purchase_price,
                                sell_price: exchangeByItems.price,
                                currentStock: exchangeByItems.product.quantity,
                                stockCost : exchangeByItems.product.quantity * exchangeByItems.purchase_price,
                                totalSellProduct: -Number(exchangeByItems.quantity),
                                totalCostAmount: -(Number(exchangeByItems.quantity) * exchangeByItems.purchase_price),
                                totalSellAmount: -(Number(exchangeByItems.quantity) * exchangeByItems.price),
                                totalReceivingProduct: 0,
                                totalReceivingAmount:  0,
                                totalReturnProduct: 0,
                                totalReturnAmount: 0,
                                totalDisposalProduct: 0,
                                totalDisposalAmount: 0,


                                // barcode: exchangeByItems.code,
                                // name: exchangeByItems.name,
                                // purchase_price: exchangeByItems.purchase_price,
                                // sell_price: exchangeByItems.price,
                                // currentStock: 0,
                                // stockCost: 0,
                                // quantity: -Number(exchangeByItems.quantity),
                                // purchaseCost: -(Number(exchangeByItems.quantity) * exchangeByItems.purchase_price),
                                // sellCost: -(Number(exchangeByItems.quantity) * exchangeByItems.price)
                            })
                        }

                })
                await Promise.all(exchangeListChildTwoArray)

            })
            await Promise.all(exchangeListParentArrayTwo)


            // exchange products list stop ------------

            // refund productInfo list start -----------

            let productRefund = await PosOrderRefund.find({
                branch: branch,
                "products.supplier" : supplier,
                create: {
                    $gte: isodate(from), $lte: isodate(to)
                }
            }).populate('products.product', 'name price quantity')

            const productRefundParentArray = productRefund.map(async (refundProductInfo) => {
                //    refund products list start -----------
                const productRefundChildArray = refundProductInfo.products.map(async (refaundProduct) => {
                        if (productBarcodes.includes(refaundProduct.code)) {
                            // sellProductList[productBarcodes.indexOf(refaundProduct.code)].currentStock -= Number(refaundProduct.quantity)
                            // sellProductList[productBarcodes.indexOf(refaundProduct.code)].stockCost -= Number(refaundProduct.quantity * refaundProduct.purchase_price)
                            sellProductList[productBarcodes.indexOf(refaundProduct.code)].totalSellProduct -= Number(refaundProduct.quantity)
                            sellProductList[productBarcodes.indexOf(refaundProduct.code)].totalCostAmount -= Number((refaundProduct.quantity) * refaundProduct.purchase_price)
                            sellProductList[productBarcodes.indexOf(refaundProduct.code)].totalSellAmount -= Number((refaundProduct.quantity) * refaundProduct.price)
                        }  else {
                            productBarcodes.push(refaundProduct.code)
                            sellProductList.push({
                                barcode: refaundProduct.code,
                                name: refaundProduct.name,
                                purchase_price: refaundProduct.purchase_price,
                                sell_price: refaundProduct.price,
                                currentStock: refaundProduct.product.quantity,
                                stockCost : refaundProduct.product.quantity * refaundProduct.purchase_price,
                                totalSellProduct: -Number(refaundProduct.quantity),
                                totalCostAmount: -Number((refaundProduct.quantity) * refaundProduct.purchase_price),
                                totalSellAmount: -Number((refaundProduct.quantity) * refaundProduct.price),
                                totalReceivingProduct: 0,
                                totalReceivingAmount:  0,
                                totalReturnProduct: 0,
                                totalReturnAmount: 0,
                                totalDisposalProduct: 0,
                                totalDisposalAmount: 0,

                            })
                        }

                })
                await Promise.all(productRefundChildArray)
                //    refund products list stop -----------
            })
            await Promise.all(productRefundParentArray)

        // supplier wise sell productInfo list stop -----------

        // supplier wise productInfo receive from Supplier list start -----------

        let supplierReceivingData = await ReceiveFromSupplier.find({
            branch: branch,
            supplier: supplier,
            create: {
                $gte: isodate(from), $lte: isodate(to)
            }
        }).populate('supplier', '_id name').populate('admin','name').populate('branch','name address').populate('products.product._id')
    // console.log("supplierReceivingData",supplierReceivingData)

            let totalReceivingProduct = 0
            let totalReceivingAmount = 0

        let seupplierReceiveParentArray = await supplierReceivingData.map(async (supplierReceiveInfo) =>{
            let supplierReceiveChildArray = await supplierReceiveInfo.products.map(async (receiveProduct)=>{

                // console.log("receiveProduct",receiveProduct)
                    if (productBarcodes.includes(receiveProduct.product.barcode)) {
                        // console.log("sellProductList[productBarcodes.indexOf(receiveProduct.product.barcode)].currentStock",sellProductList[productBarcodes.indexOf(receiveProduct.product.barcode)].currentStock)

                        // sellProductList[productBarcodes.indexOf(receiveProduct.product.barcode)].currentStock += Number(receiveProduct.product.quantity)
                        // sellProductList[productBarcodes.indexOf(receiveProduct.product.barcode)].stockCost += Number(receiveProduct.product.quantity * receiveProduct.product.price.purchase)
                        sellProductList[productBarcodes.indexOf(receiveProduct.product.barcode)].totalReceivingProduct += Number(receiveProduct.product.quantity)
                        sellProductList[productBarcodes.indexOf(receiveProduct.product.barcode)].totalReceivingAmount += Number((receiveProduct.product.quantity) * receiveProduct.product.price.purchase)
                    } else {
                        productBarcodes.push(receiveProduct.product.barcode)
                        sellProductList.push({
                            barcode: receiveProduct.product.barcode,
                            name: receiveProduct.product.name,
                            purchase_price: receiveProduct.product.price.purchase,
                            sell_price: receiveProduct.product.price.sell,
                            currentStock: receiveProduct.product.stock + receiveProduct.product.quantity ,
                            stockCost : Number((receiveProduct.product.stock + receiveProduct.product.quantity) * receiveProduct.product.price.purchase),
                            totalSellProduct: 0,
                            totalCostAmount: 0,
                            totalSellAmount: 0,
                            totalReceivingProduct : Number(receiveProduct.product.quantity),
                            totalReceivingAmount : Number((receiveProduct.product.quantity) * receiveProduct.product.price.purchase),
                            totalReturnProduct: 0,
                            totalReturnAmount: 0,
                            totalDisposalProduct: 0,
                            totalDisposalAmount: 0,
                        })
                    }
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
            supplier: supplier,
            create: {
                $gte: isodate(from), $lte: isodate(to)
            }
        }).populate('supplier', '_id name').populate('admin', 'name').populate('branch', 'name address').populate('products._id', 'name price')

        let supplierReturnParentArray = supplierReturnData.map(async(supplierReturnInfo) => {
            let supplierReturnChildArray = supplierReturnInfo.products.map(async(returnProduct) => {
                // console.log("returnProduct",returnProduct)
                // if (supplierReturnInfo.supplier._id.toString() == supplier._id.toString()) {
                    if (productBarcodes.includes(returnProduct.barcode) ) {
                        // sellProductList[productBarcodes.indexOf(returnProduct.barcode)].currentStock -= Number(returnProduct.quantity)
                        // sellProductList[productBarcodes.indexOf(returnProduct.barcode)].stockCost -= Number(returnProduct.stock * returnProduct.price.purchase)
                        sellProductList[productBarcodes.indexOf(returnProduct.barcode)].totalReturnProduct += Number(returnProduct.quantity)
                        sellProductList[productBarcodes.indexOf(returnProduct.barcode)].totalReturnAmount += ((Number(returnProduct.quantity) * returnProduct.price.purchase))
                    } else {
                        productBarcodes.push(returnProduct.barcode)
                        sellProductList.push({
                            barcode: returnProduct.barcode,
                            name: returnProduct.name,
                            purchase_price: returnProduct.price.purchase,
                            sell_price: returnProduct.price.sell,
                            currentStock: returnProduct.stock,
                            stockCost : returnProduct.stock * returnProduct.price.purchase,
                            quantity: Number(returnProduct.quantity),
                            purchaseCost: 0,
                            sellCost: 0,
                            totalSellProduct: 0,
                            totalCostAmount: 0,
                            totalSellAmount: 0,
                            totalReceivingProduct : 0,
                            totalReceivingAmount : 0,
                            totalReturnProduct: Number(returnProduct.quantity),
                            totalReturnAmount:  (Number(returnProduct.quantity) * returnProduct.price.purchase),
                            totalDisposalProduct: 0,
                            totalDisposalAmount: 0,
                        })
                    }
                // }
            })
            await Promise.all(supplierReturnChildArray)
        })

        await Promise.all(supplierReturnParentArray)


        // supplier wise productInfo return To Supplier list start -----------
        // supplier wise productInfo disposal product list start -----------

        // let totalDisposalProduct = 0
        // let totalDisposalAmount = 0
        // let disposalProductsData = await ProductDisposal.find({
        //     branch: branch,
        //     create: {
        //         $gte: isodate(from), $lte: isodate(to)
        //     }
        // }).populate('admin', 'name').populate('branch', 'name address').populate('products._id', 'name price supplier')

        //     let disposalProductsParentArray = disposalProductsData.map(async(disposalProductInfo) => {
        //
        //     let disposalProductsChildArray = disposalProductInfo.products.map(async(disposalProduct) => {
        //         // if (disposalProduct._id.supplier.toString() === supplier._id.toString()){
        //             if (productBarcodes.includes(disposalProduct.barcode) ) {
        //                 sellProductList[productBarcodes.indexOf(disposalProduct.barcode)].totalDisposalProduct += Number(disposalProduct.disposal)
        //                 sellProductList[productBarcodes.indexOf(disposalProduct.barcode)].totalDisposalAmount += ((Number(disposalProduct.disposal) * disposalProduct.purchase_price))
        //             } else {
        //                 productBarcodes.push(disposalProduct.barcode)
        //                 sellProductList.push({
        //                     barcode: disposalProduct.barcode,
        //                     name: disposalProduct.name,
        //                     purchase_price: disposalProduct.purchase_price,
        //                     sell_price: disposalProduct.price,
        //                     currentStock: disposalProduct.stock,
        //                     stockCost : disposalProduct.stock * disposalProduct.purchase_price,
        //                     quantity: Number(disposalProduct.disposal),
        //                     purchaseCost: 0,
        //                     sellCost: 0,
        //                     totalSellProduct: 0,
        //                     totalCostAmount: 0,
        //                     totalSellAmount: 0,
        //                     totalReceivingAmount : 0,
        //                     totalReturnProduct: 0,
        //                     totalReturnAmount:  0,
        //                     totalDisposalProduct: Number(disposalProduct.disposal),
        //                     totalDisposalAmount:  (Number(disposalProduct.disposal) * disposalProduct.price.purchase),
        //
        //                     // barcode: disposalProduct.barcode,
        //                     // name: disposalProduct.name,
        //                     // purchase_price: disposalProduct.purchase_price,
        //                     // sell_price: disposalProduct.price,
        //                     // totalDisposalProduct: Number(disposalProduct.disposal),
        //                     // totalDisposalAmount:  (Number(disposalProduct.disposal) * disposalProduct.price.purchase),
        //                 })
        //             }
        //         // }
        //     })
        //     await Promise.all(disposalProductsChildArray)
        // })
        // await Promise.all(disposalProductsParentArray)

        sellProductList.map((item) =>{
                item.currentStock = (type == 'pdf') ? (item.currentStock.toFixed(2)) : item.currentStock,
                item.stockCost = (type == 'pdf') ? (item.stockCost.toFixed(2)) : item.stockCost,
                item.purchase_price = (type == 'pdf') ? (item.purchase_price.toFixed(2)) : item.purchase_price,
                item.sell_price = (type == 'pdf') ? (item.sell_price.toFixed(2)) : item.sell_price,
                item.totalSellProduct = (type == 'pdf') ? (item.totalSellProduct.toFixed(2)) : item.totalSellProduct,
                item.totalCostAmount = (type == 'pdf') ? (item.totalCostAmount.toFixed(2)) : item.totalCostAmount,
                item.totalSellAmount = (type == 'pdf') ? (item.totalSellAmount.toFixed(2)) : item.totalSellAmount,
                item.totalReceivingProduct = (type == 'pdf') ? (item.totalReceivingProduct.toFixed(2)) : item.totalReceivingProduct,
                item.totalReceivingAmount = (type == 'pdf') ? (item.totalReceivingAmount.toFixed(2)) : item.totalReceivingAmount,
                item.totalReturnProduct = (type == 'pdf') ? (item.totalReturnProduct.toFixed(2)) : item.totalReturnProduct,
                item.totalReturnAmount = (type == 'pdf') ? (item.totalReturnAmount.toFixed(2)) : item.totalReturnAmount,
                item.totalDisposalProduct =(type == 'pdf') ? (item.totalDisposalProduct.toFixed(2)) : item.totalDisposalProduct,
                item.totalDisposalAmount = (type == 'pdf') ? (item.totalDisposalAmount.toFixed(2)) : item.totalDisposalAmount
    })

    sellProductList.map((finalItem) =>{
         finalItem.currentStock = Number(finalItem.currentStock)
         finalItem.stockCost = Number(finalItem.stockCost)
         finalItem.purchase_price = Number(finalItem.purchase_price)
         finalItem.sell_price = Number(finalItem.sell_price)
         finalItem.totalSellProduct = Number(finalItem.totalSellProduct)
         finalItem.totalCostAmount = Number(finalItem.totalCostAmount)
         finalItem.totalSellAmount = Number(finalItem.totalSellAmount)
         finalItem.totalReceivingProduct = Number(finalItem.totalReceivingProduct)
         finalItem.totalReceivingAmount = Number(finalItem.totalReceivingAmount)
         finalItem.totalReturnProduct = Number(finalItem.totalReturnProduct)
         finalItem.totalReturnAmount = Number(finalItem.totalReturnAmount)
         finalItem.totalDisposalProduct = Number(finalItem.totalDisposalProduct)
         finalItem.totalDisposalAmount = Number(finalItem.totalDisposalAmount)
    })

    //    supplier wise sell products list stop -----------

    let PurchaseAmount = 0
    let SellAmount = 0
    let totalSellValue = 0
    let totalSoldQuantity = 0
    let totalSoldCostAmount = 0
    let totalSoldEarnAmount = 0
    let totalStockQuantity = 0
    let totalStockCostQuantity = 0
    let totalReturnQuantity = 0
    let totalReceivingQuantity = 0
    let totalReceivingCostQuantity = 0
    let totalReturnCostQuantity = 0
    // let totalDisposalQuantity = 0
    // let totalDisposalCostQuantity = 0
    let totalProfit = 0



    let gradTotalCalculationArray = sellProductList.map((productItem) =>{
         PurchaseAmount += (productItem.purchase_price) ? Number((productItem.purchase_price).toFixed(2)) : Number((productItem.sell_price.purchase))
         SellAmount += (productItem.sell_price.sell) ? Number((productItem.sell_price.sell).toFixed(2)) : Number((productItem.sell_price))
         totalSoldQuantity += Number((productItem.totalSellProduct))
         totalSoldCostAmount += Number((productItem.totalCostAmount))
         totalSoldEarnAmount += Number((productItem.totalSellAmount))
         totalStockQuantity += Number((productItem.currentStock))
         totalStockCostQuantity += Number((productItem.stockCost))
         totalReceivingQuantity += Number((productItem.totalReceivingProduct))
         totalReceivingCostQuantity += Number((productItem.totalReceivingAmount))
         totalReturnQuantity += Number((productItem.totalReturnProduct))
         totalReturnCostQuantity += Number((productItem.totalReturnAmount))
        // totalDisposalQuantity += Number((productItem.totalDisposalProduct).toFixed(2))
        // totalDisposalCostQuantity += Number((productItem.totalDisposalAmount).toFixed(2))
         totalSellValue += Number((productItem.purchase_price * productItem.totalSellProduct ))
         totalProfit += Number(productItem.gpValue)
    })

    await Promise.all(gradTotalCalculationArray)

    let allDataInfo = {}

    allDataInfo.totalSellValue = (type == 'pdf') ? totalSellValue.toFixed(2) : totalSellValue
    // allDataInfo.totalProductQuantity = (type == 'pdf') ? totalProductQuantity.toFixed(2) : totalProductQuantity
    allDataInfo.fromDate = new Date(from).getDate() + '-' + (new Date(from).getMonth() + 1) + '-' + new Date(from).getFullYear()
    allDataInfo.toDate = new Date(to).getDate() + '-' + (new Date(to).getMonth() + 1) + '-' + new Date(to).getFullYear()

    // allDataInfo.totalPurchaseAmount = (type == 'pdf') ? totalPurchaseAmount.toFixed(2) : totalPurchaseAmount
    allDataInfo.totalSoldQuantity = (type == 'pdf') ? totalSoldQuantity.toFixed(2) : totalSoldQuantity
    allDataInfo.totalSoldCostAmount = (type == 'pdf') ? totalSoldCostAmount.toFixed(2) : totalSoldCostAmount
    allDataInfo.totalSoldEarnAmount = (type == 'pdf') ? totalSoldEarnAmount.toFixed(2) : totalSoldEarnAmount
    allDataInfo.totalStockQuantity = (type == 'pdf') ? totalStockQuantity.toFixed(2) : totalStockQuantity
    allDataInfo.totalStockCostQuantity = (type == 'pdf') ? totalStockCostQuantity.toFixed(2) : totalStockCostQuantity
    allDataInfo.totalReceivingQuantity = (type == 'pdf') ? totalReceivingQuantity.toFixed(2) : totalReceivingQuantity
    allDataInfo.totalReceivingCostQuantity = (type == 'pdf') ? totalReceivingCostQuantity.toFixed(2) : totalReceivingCostQuantity
    allDataInfo.totalReturnQuantity = (type == 'pdf') ? totalReturnQuantity.toFixed(2) : totalReturnQuantity
    allDataInfo.totalReturnCostQuantity = (type == 'pdf') ? totalReturnCostQuantity.toFixed(2) : totalReturnCostQuantity
    // allDataInfo.totalDisposalQuantity = (type == 'pdf') ? totalDisposalQuantity.toFixed(2) : totalDisposalQuantity
    // allDataInfo.totalDisposalCostQuantity = (type == 'pdf') ? totalDisposalCostQuantity.toFixed(2) : totalDisposalCostQuantity
    allDataInfo.totalProfit = (type == 'pdf') ? (totalProfit / sellProductList.length).toFixed(2) : (totalProfit / sellProductList.length)

    let branchInfo = await Branch.findById(branch).select('_id serialNo name address serialNo phone');
    let supplierInfo = await Supplier.findById(supplier).select('_id serialNo name contact');


    allDataInfo.branchNo = branchInfo.serialNo
    allDataInfo.branchName = branchInfo.name.trim()
    allDataInfo.branchAddress = branchInfo.address
    allDataInfo.branchPhone = branchInfo.phone
    allDataInfo.supplierNo = supplierInfo.serialNo
    allDataInfo.supplierName = supplierInfo.name
    allDataInfo.supplierAddress = supplierInfo.contact.address

    let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let today = new Date();
    let hours = today.getHours();
    let minutes = today.getMinutes();
    let ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0' + minutes : minutes;
    let createTime = hours + ':' + minutes + ' ' + ampm;

    allDataInfo.today = ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear()
    allDataInfo.createTime = createTime
    allDataInfo.company_name = config.get('company').full_name
    allDataInfo.company_logo = config.get('company').company_logo

    // allDataInfo.totalFreeQuantity = (type == 'pdf') ? totalFreeQuantity.toFixed(2) : totalFreeQuantity

    allDataInfo.products = sellProductList


    if (type == 'excel') {
        let grandTotal = {
            totalProductQuantity: allDataInfo.totalProductQuantity,
            totalPurchaseAmount: allDataInfo.totalPurchaseAmount,
            totalSoldQuantity: allDataInfo.totalSoldQuantity,
            totalSoldCostAmount: allDataInfo.totalSoldCostAmount,
            totalSoldEarnAmount: allDataInfo.totalSoldEarnAmount,
            totalStockQuantity: allDataInfo.totalStockQuantity,
            totalStockCostQuantity: allDataInfo.totalStockCostQuantity,
            totalReceivingQuantity: allDataInfo.totalReceivingQuantity,
            totalReceivingCostQuantity: allDataInfo.totalReceivingCostQuantity,
            totalReturnQuantity: allDataInfo.totalReturnQuantity,
            totalReturnCostQuantity: allDataInfo.totalReturnCostQuantity,
            totalDisposalQuantity: allDataInfo.totalDisposalQuantity,
            totalDisposalCostQuantity: allDataInfo.totalDisposalCostQuantity,
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