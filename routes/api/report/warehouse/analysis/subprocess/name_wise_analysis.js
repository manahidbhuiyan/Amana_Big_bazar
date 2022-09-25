var mongoConnection = require('../../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");
const config = require('config');
// const OrderForPos = require('../../../../../../models/OrderForPos');
// const PosOrderExchange = require('../../../../../../models/PosOrderExchange');
// const PosOrderRefund = require('../../../../../../models/PosOrderRefund');
const ReceiveFromSupplier = require('../../../../../../models/Tracking/WarehouseTransaction/ReceiveFromSupplier');
const ReturnToSupplier = require('../../../../../../models/Tracking/WarehouseTransaction/ReturnToSupplier');
const SupplyToBranch = require('../../../../../../models/Tracking/WarehouseSupply/RequisitionWiseSupply');
const ReturnFromBranch = require('../../../../../../models/Tracking/WarehouseSupply/ReturnSupplierWise')
const admin = require('../../../../../../models/admin/Admin');
const supplier = require('../../../../../../models/Supplier');
const Product = require('../../../../../../models/WarehouseProduct');

process.on('message', async (msg) => {
    let {
        from,
        to,
        name,
        type
    } = msg

    // from = new Date(from)
    // to = new Date(to)

    let productList = await Product.find({
        name: {
            $regex: name,
            $options: "i"
        }
    }).select('barcode name quantity price')

    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    let productAnalysisList = []
    let totalReceiveQuantity = 0
    let totalReturnQuantity = 0
    let totalSellQuantity = 0
    let totalStockQuantity = 0
    let totalReturnFromBranchQuantity = 0
    let totalGpAvg = 0

    let productLoopArray = productList.map(async productInfo => {
        from = new Date(from)
        from.setHours(0)
        from.setMinutes(0);
        from.setSeconds(0);

        to = new Date(to)
        to.setHours(23)
        to.setMinutes(59);
        to.setSeconds(59);

        let supplierRecevingData = await ReceiveFromSupplier.find({
            "products.product.barcode": productInfo.barcode,
            create: {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        }).select('products create').populate('supplier', 'name')

        let receiveDate = '-'
        let receiveTime = '-'
        let returnDate = '-'
        let returnTime = '-'
        let supplier = '-'
        let totalQuantityReceived = 0
        let totalQuantityReturn = 0
        let totalSellProduct = 0
        let totalReturnFromBranch = 0

        let productReceivingInfoArray = supplierRecevingData.map(async (productList, index) => {
            receiveDate = ("0" + productList.create.getDate()).slice(-2) + ' ' + months[productList.create.getMonth()] + ', ' + productList.create.getUTCFullYear()

            let receiveCreate = new Date(productList.create)

            let hours = receiveCreate.getHours();
            let minutes = receiveCreate.getMinutes();
            let ampm = hours >= 12 ? 'pm' : 'am';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            minutes = minutes < 10 ? '0' + minutes : minutes;
            receiveTime = hours + ':' + minutes + ' ' + ampm;

            if (productList.supplier !== null) {
                supplier = productList.supplier.name
            }

            let productRecevingChildArray = productList.products.map(async (productReceivingInfo, index) => {
                if (productReceivingInfo.product.barcode == productInfo.barcode) {
                    totalQuantityReceived += productReceivingInfo.product.quantity
                }
            })
            await Promise.all(productRecevingChildArray)
        })

        await Promise.all(productReceivingInfoArray)

        let productSupplyData = await SupplyToBranch.find({
            "products.product.barcode": productInfo.barcode,
            create: {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        }).populate('supplier', '_id name contact').populate('admin', 'name')


        let productSellParentArray = productSupplyData.map(async productDataInfo => {
            let productSellChildArray = productDataInfo.products.map(sellProduct => {
                if (sellProduct.product.barcode == productInfo.barcode) {
                    totalSellProduct += Number(sellProduct.product.quantity)
                }
            })
            await Promise.all(productSellChildArray)
        })

        await Promise.all(productSellParentArray)


        let branchReturnData = await ReturnFromBranch.find({
            "products.product.barcode": productInfo.barcode,
            create: {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        })

        let productRefundParentArray = branchReturnData.map(async productRefundDataInfo => {
            let productRefundChildArray = productRefundDataInfo.products.map(refundProduct => {
                if (refundProduct.product.barcode == productInfo.barcode) {
                    totalReturnFromBranch += Number(refundProduct.product.quantity)
                }
            })
            await Promise.all(productRefundChildArray)
        })

        await Promise.all(productRefundParentArray)

        let productReturn = await ReturnToSupplier.find({
            "products.barcode": productInfo.barcode,
            create: {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        }).select('products create')

        let productReturnParentArray = productReturn.map(async productReturnInfo => {
            returnDate = ("0" + productReturnInfo.create.getDate()).slice(-2) + ' ' + months[productReturnInfo.create.getMonth()] + ', ' + productReturnInfo.create.getUTCFullYear()

            let returnCreate = new Date(productReturnInfo.create)

            let hours = returnCreate.getHours();
            let minutes = returnCreate.getMinutes();
            let ampm = hours >= 12 ? 'pm' : 'am';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            minutes = minutes < 10 ? '0' + minutes : minutes;
            returnTime = hours + ':' + minutes + ' ' + ampm;


            let productReturnChildArray = productReturnInfo.products.map(returnProduct => {
                if (returnProduct.barcode == productInfo.barcode) {
                    totalQuantityReturn += Number(returnProduct.quantity)
                }
            })
            await Promise.all(productReturnChildArray)
        })

        await Promise.all(productReturnParentArray)

        let gpValue = totalSellProduct > 0 ? (((productInfo.price.sell * totalSellProduct) - (productInfo.price.purchase * totalSellProduct)) / (productInfo.price.sell * totalSellProduct)) * 100 : 0

        totalReceiveQuantity += totalQuantityReceived
        totalReturnQuantity += totalQuantityReturn
        totalSellQuantity += totalSellProduct
        totalStockQuantity += (productInfo.quantity)
        totalReturnFromBranchQuantity += totalReturnFromBranch
        totalGpAvg += gpValue

        productAnalysisList.push(
            [
                productInfo.barcode,
                productInfo.name,
                (type == 'pdf') ? productInfo.price.purchase.toFixed(2) : productInfo.price.purchase,
                (type == 'pdf') ? productInfo.price.sell.toFixed(2) : productInfo.price.sell,
                receiveDate,
                receiveTime,
                (type == 'pdf') ? totalQuantityReceived.toFixed(2) : totalQuantityReceived,
                supplier,
                returnDate,
                returnTime,
                (type == 'pdf') ? totalQuantityReturn.toFixed(2) : totalQuantityReturn,
                (type == 'pdf') ? totalSellProduct.toFixed(2) : totalSellProduct,
                (type == 'pdf') ? totalReturnFromBranch.toFixed(2) : totalReturnFromBranch,
                (type == 'pdf') ? (productInfo.quantity).toFixed(2) : (productInfo.quantity)
            ]
        )

    })

    await Promise.all(productLoopArray)
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let allDataInfo = {}

    allDataInfo.name = name
    allDataInfo.totalReceiveQuantity = (type == 'pdf') ? totalReceiveQuantity.toFixed(2) : totalReceiveQuantity
    allDataInfo.totalReturnQuantity = (type == 'pdf') ? totalReturnQuantity.toFixed(2) : totalReturnQuantity
    allDataInfo.totalSellQuantity = (type == 'pdf') ? totalSellQuantity.toFixed(2) : totalSellQuantity
    allDataInfo.totalStockQuantity = (type == 'pdf') ? totalStockQuantity.toFixed(2) : totalStockQuantity
    allDataInfo.totalReturnFromBranchQuantity = (type == 'pdf') ? totalReturnFromBranchQuantity.toFixed(2) : totalReturnFromBranchQuantity
    allDataInfo.fromDate = from.getDate() + '-' + (from.getMonth() + 1) + '-' + from.getFullYear()
    allDataInfo.toDate = to.getDate() + '-' + (to.getMonth() + 1) + '-' + to.getFullYear()

    allDataInfo.totalGpAvg = (type == 'pdf') ? (totalGpAvg / productAnalysisList.length).toFixed(2) : (totalGpAvg / productAnalysisList.length)

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
    allDataInfo.branchName = config.get('warehouse').name
    allDataInfo.branchAddress = config.get('warehouse').address
    allDataInfo.branchPhone = config.get('warehouse').phone
    allDataInfo.branchNo = config.get('warehouse').code

    allDataInfo.products = productAnalysisList

    if (type == 'excel') {
        let grandTotal = {
            totalReceiveQuantity: allDataInfo.totalReceiveQuantity,
            totalSellQuantity: allDataInfo.totalSellQuantity,
            totalStockQuantity: allDataInfo.totalStockQuantity,
            totalReturnQuantity: allDataInfo.totalReturnQuantity,
            totalBranchReturnQuantity: allDataInfo.totalReturnFromBranchQuantity,
        }
        let allDataInfoArray = []

        allDataInfo.products.map((item) => {
            allDataInfoArray.push({
                barcode: item[0],
                name: item[1],
                cost_price: item[2],
                sell_price: item[3],
                receiveDate: item[4],
                receiveTime: item[5],
                receiveQty: item[6],
                supplier: item[7],
                returnDate: item[8],
                returnTime: item[9],
                returnQty: item[10],
                sellQty: item[11],
                branchReturnQty: item[12],
                stockQty: item[13]
            })

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