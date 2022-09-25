var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");
const config = require('config');
const OrderForPos = require('../../../../../models/OrderForPos');
const PosOrderExchange = require('../../../../../models/PosOrderExchange');
const PosOrderRefund = require('../../../../../models/PosOrderRefund');
const ReceiveFromSupplier = require('../../../../../models/Tracking/Transaction/ReceiveFromSupplier');
const ReturnToSupplier = require('../../../../../models/Tracking/Transaction/ReturnToSupplier');
const admin = require('../../../../../models/admin/Admin');
const supplier = require('../../../../../models/Supplier');
const Product = require('../../../../../models/Product');
const Branch = require('../../../../../models/Branch');

process.on('message', async (msg) => {
    let {
        from,
        to,
        name,
        type,
        branch
    } = msg

    from = new Date(from)
    to = new Date(to)
    
    let productList = await Product.find({
        name: name,
        branch: branch
    }).select('barcode name quantity price')
    

    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    let productAnalysisList = []
    let totalReceiveQuantity = 0
    let totalReturnQuantity = 0
    let totalSellQuantity = 0
    let totalStockQuantity = 0
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
            branch: branch,
            create: {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        }).select('products create').populate('supplier', 'name')
        

        let receiveDate = ''
        let receiveTime = ''
        let returnDate = ''
        let returnTime = ''
        let supplier = ''
        let totalQuantityReceived = 0
        let totalQuantityReturn = 0
        let totalSellProduct = 0

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

        let productSellData = await OrderForPos.find({
            branch: branch,
            "products.code": productInfo.barcode,
            create: {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        }).select('products')

        let productSellParentArray = productSellData.map(async productDataInfo => {
            let productSellChildArray = productDataInfo.products.map(sellProduct => {
                if (sellProduct.code == productInfo.barcode) {
                    totalSellProduct += Number(sellProduct.quantity)
                }
            })
            await Promise.all(productSellChildArray)
        })

        await Promise.all(productSellParentArray)


        let productRefundData = await PosOrderRefund.find({
            branch: branch,
            "products.code": productInfo.barcode,
            create: {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        }).select('products')

        let productRefundParentArray = productRefundData.map(async productRefundDataInfo => {
            let productRefundChildArray = productRefundDataInfo.products.map(refundProduct => {
                if (refundProduct.code == productInfo.barcode) {
                    totalSellProduct -= Number(refundProduct.quantity)
                }
            })
            await Promise.all(productRefundChildArray)
        })

        await Promise.all(productRefundParentArray)

        let productExchange = await PosOrderExchange.find({
            branch: branch,
            "products.code": productInfo.barcode,
            create: {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        }).select('products')

        let productExchangeParentArray = productExchange.map(async productExchangeInfo => {
            let productExchangeChildArray = productExchangeInfo.products.map(exchangeProduct => {
                if (exchangeProduct.code == productInfo.barcode) {
                    totalSellProduct += Number(exchangeProduct.quantity)
                }
            })
            await Promise.all(productExchangeChildArray)
        })

        await Promise.all(productExchangeParentArray)


        let productExchangedBy = await PosOrderExchange.find({
            branch: branch,
            "exchangedBy.code": productInfo.barcode,
            create: {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        }).select('exchangedBy')



        let productExchangedByParentArray = productExchangedBy.map(async productExchangedByInfo => {
            let productExchangedByChildArray = productExchangedByInfo.exchangedBy.map(exchangedByProduct => {
                if (exchangedByProduct.code == productInfo.barcode) {
                    totalSellProduct -= Number(exchangedByProduct.quantity)
                }
            })
            await Promise.all(productExchangedByChildArray)
        })

        await Promise.all(productExchangedByParentArray)


        let productReturn = await ReturnToSupplier.find({
            branch: branch,
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
        totalStockQuantity += productInfo.quantity
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
                (type == 'pdf') ? productInfo.quantity.toFixed(2) : productInfo.quantity
            ]
        )

    })

    await Promise.all(productLoopArray)

    let allDataInfo = {}

    allDataInfo.name = name
    allDataInfo.totalReceiveQuantity = (type == 'pdf') ? totalReceiveQuantity.toFixed(2) : totalReceiveQuantity
    allDataInfo.totalReturnQuantity = (type == 'pdf') ? totalReturnQuantity.toFixed(2) : totalReturnQuantity
    allDataInfo.totalSellQuantity = (type == 'pdf') ? totalSellQuantity.toFixed(2) : totalSellQuantity
    allDataInfo.totalStockQuantity = (type == 'pdf') ? totalStockQuantity.toFixed(2) : totalStockQuantity
    allDataInfo.fromDate = from.getDate() + '-' + (from.getMonth() + 1) + '-' + from.getFullYear()
    allDataInfo.toDate = to.getDate() + '-' + (to.getMonth() + 1) + '-' + to.getFullYear()

    allDataInfo.totalGpAvg = (type == 'pdf') ? (totalGpAvg / productAnalysisList.length).toFixed(2) : (totalGpAvg / productAnalysisList.length)

    let branchInfo = await Branch.findById(branch).select('_id serialNo name address serialNo phone');


    allDataInfo.branchNo = branchInfo.serialNo
    allDataInfo.branchName = branchInfo.name.trim()
    allDataInfo.branchAddress = branchInfo.address
    allDataInfo.branchPhone = branchInfo.phone

    allDataInfo.products = productAnalysisList
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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

    if (type == 'excel') {
        let grandTotal = {
            totalReceiveQuantity: allDataInfo.totalReceiveQuantity,
            totalSellQuantity: allDataInfo.totalSellQuantity,
            totalStockQuantity: allDataInfo.totalStockQuantity,
            totalReturnQuantity: allDataInfo.totalReturnQuantity,
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
                stockQty: item[12]
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