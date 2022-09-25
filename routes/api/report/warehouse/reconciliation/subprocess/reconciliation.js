var mongoConnection = require('../../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");

const ProductReconciliation = require('../../../../../../models/Tracking/WarehouseProduct/productReconciliation');
const admin = require('../../../../../../models/admin/Admin');

process.on('message', async (msg) => {
    let { from, to, type } = msg

    from = new Date(from)
    to = new Date(to)

    let reconcilProducts = await ProductReconciliation.find({
        create: {
            $gte: isodate(from),
            $lte: isodate(to)
        }
    }).populate('admin', 'name')

    let allReconciliationData = []
    let totalReconcilProduct = 0
    let totalCurrentStock = 0
    let reconcilProductsArray = reconcilProducts.map(async (reconcilData) => {

        let reconciliationData = {
            serialNo: reconcilData.serialNo,
            reason: reconcilData.reason,
            remarks: reconcilData.remarks,
            admin: reconcilData.admin.name,
            products: [],
            subtotalReconcilProduct: 0,
            subtotalCurrentStock: 0
        }
        let reconcilProductsChildArray = reconcilData.products.map(async (productInfo, index) => {
            let reconciliationQty = (productInfo.reconciliation - productInfo.stock)
            reconciliationData.products.push({
                serial: index + 1,
                barcode: productInfo.barcode,
                name: productInfo.name,
                previous_stock: productInfo.stock,
                stock: productInfo.reconciliation,
                reconciliation: reconciliationQty
            })
            reconciliationData.subtotalReconcilProduct += reconciliationQty
            totalReconcilProduct += reconciliationQty
            reconciliationData.subtotalCurrentStock += productInfo.reconciliation
            totalCurrentStock += productInfo.reconciliation
        })
        await Promise.all(reconcilProductsChildArray)

        let reconciliationDateFormat = new Date(reconcilData.create)

        let hours = reconciliationDateFormat.getHours();
        let minutes = reconciliationDateFormat.getMinutes();
        let ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        minutes = minutes < 10 ? '0' + minutes : minutes;
        let reconciliationTime = hours + ':' + minutes + ' ' + ampm;

        reconciliationData.date = reconciliationDateFormat.getDate() + '-' + (reconciliationDateFormat.getMonth() + 1) + '-' + reconciliationDateFormat.getFullYear()
        reconciliationData.time = reconciliationTime

        allReconciliationData.push(reconciliationData)
    })
    await Promise.all(reconcilProductsArray)

    if (type == 'excel') {
        let mainData = []

        allReconciliationData.map((info) => {
            mainData.push({
                serial: ' ',
                barcode: ' ',
                name: ' ',
                previous_stock: ' ',
                stock: ' ',
                reconciliation: ' '
            })
            mainData.push({
                serial: 'Reconciliation No: ' + info.serialNo,
                barcode: 'Date: ' + info.date,
                name: 'Time: ' + info.time,
                previous_stock: 'Reconciliation By: ' + info.admin,
                stock: 'Remarks: ' + info.remarks,
                reconciliation: ' '
            })

            mainData.push({
                serial: ' ',
                barcode: ' ',
                name: ' ',
                previous_stock: ' ',
                stock: ' ',
                reconciliation: ' '
            })
            info.products.map((productsInfo) => {
                let dataObj = {}

                dataObj.serial = productsInfo.serial
                dataObj.barcode = productsInfo.barcode
                dataObj.name = productsInfo.name
                dataObj.previous_stock = productsInfo.previous_stock
                dataObj.stock = productsInfo.stock
                dataObj.reconciliation = productsInfo.reconciliation

                mainData.push(dataObj)

            })

            mainData.push({
                serial: ' ',
                barcode: ' ',
                name: ' ',
                previous_stock: ' ',
                stock: ' ',
                reconciliation: ' '
            })

            mainData.push({
                serial: 'Total ',
                barcode: ' ',
                name: ' ',
                previous_stock: ' ',
                stock: info.subtotalCurrentStock,
                reconciliation: info.subtotalReconcilProduct
            })

            mainData.push({
                serial: ' ',
                barcode: ' ',
                name: ' ',
                previous_stock: ' ',
                stock: ' ',
                reconciliation: ' '
            })
        })
        process.send({
            mainData,
            totalReconcilProduct,
            totalCurrentStock
        });
    } else {
        process.send({
            allReconciliationData,
            totalReconcilProduct,
            totalCurrentStock
        });
    }
});