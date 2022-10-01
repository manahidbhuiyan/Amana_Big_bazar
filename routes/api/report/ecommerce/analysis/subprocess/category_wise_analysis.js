// var mongoConnection = require('../../../../../../config/connectMongo')
// mongoConnection()
//
// var isodate = require("isodate")
// const config = require('config')
// const Order = require('../../../../../../models/Order')
// const category = require('../../../../../../models/Category')
// const ReceiveFromSupplier = require('../../../../../../models/Tracking/Transaction/ReceiveFromSupplier');
// const ReturnToSupplier = require('../../../../../../models/Tracking/Transaction/ReturnToSupplier');
// const ProductDisposal = require('../../../../../../models/Tracking/Transaction/ProductDisposal');
// const admin = require('../../../../../../models/admin/Admin');
// const Product = require('../../../../../../models/Product');
// const Branch = require('../../../../../../models/Branch');
//
// process.on('message', async (msg) =>{
//     let {
//         from,
//         to,
//         category,
//         type, branch
//     } = msg
//
//     from = new Date(from)
//     to = new Date(to)
//
//     let categoryWiseProducts = await Product.find({category})
//
//     let supplierRecevingDate = await ReceiveFromSupplier.find({
//         branch: branch,
//         create:{
//             $gte: isodate(from),
//             $lte: isodate(to)
//         }
//     }).populate('admin', 'name').populate('branch','name address').populate('products.product._id','name price')
//
//     let allProducts = []
//     let allProductBarcodes = []
//     let searchProductIndex = []
//     let totalSealValue = 0
//     let totalFreeQuantity = 0
//     let totalQuantity = 0
//     let totalAmount = 0
//
//     let totalSoldQuantity = 0
//     let totalSoldCostAmount = 0
//     let totalSoldEarnAmount = 0
//     let totalStockQuantity = 0
//     let totalStockCostQuantity = 0
//     let totalReturnQuantity = 0
//     let totalReturnCostQuantity = 0
//     let totalDisposalQuantity = 0
//     let totalDisposalCostQuantity = 0
//     let totalProfit = 0
//     let gpValue = 0
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
// })