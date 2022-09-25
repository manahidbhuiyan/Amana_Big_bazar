const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

var pdf = require("pdf-creator-node");
var fs = require('fs');
var path = require('path');

const config = require('config');

const auth = require('../../../middleware/admin/auth');

const ProductReconciliation = require('../../../models/Tracking/WarehouseProduct/productReconciliation');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');


// @route GET api/order
// @description Get all the orders
// @access Private
router.post('/print', [
    auth,
    [
        check('download_id', 'Requisition id is required').not().isEmpty(),
    ]
], async (req, res) => {
    try {
        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'warehouse product reconciliation')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to warehouse product reconciliation'
                    }
                ]
            })
        }

        let {
            download_id
        } = req.body



        let productDisposal = await ProductReconciliation.findById(download_id).populate('admin', 'name')

        let allProducts = []
        let totalQuantity = 0
        productDisposal.products.map((productInfo, index) => {
            let reconciliationQty = (productInfo.reconciliation - productInfo.stock)
            totalQuantity += reconciliationQty
            allProducts.push({
                serial: index + 1,
                barcode: productInfo.barcode,
                name: productInfo.name,
                previous_stock: productInfo.stock,
                stock: productInfo.reconciliation,
                reconciliation: reconciliationQty
            })
        })

        let allDataInfo = {}
        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        let priceMarkDateFormat = new Date(productDisposal.create)

        let hours = priceMarkDateFormat.getHours();
        let minutes = priceMarkDateFormat.getMinutes();
        let ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        minutes = minutes < 10 ? '0' + minutes : minutes;
        let priceMarkTime = hours + ':' + minutes + ' ' + ampm;

        let today = new Date();
        hours = today.getHours();
        minutes = today.getMinutes();
        ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        minutes = minutes < 10 ? '0' + minutes : minutes;
        let createTime = hours + ':' + minutes + ' ' + ampm;

        allDataInfo.priceMarkDate = priceMarkDateFormat.getDate() + '-' + (priceMarkDateFormat.getMonth() + 1) + '-' + priceMarkDateFormat.getFullYear()
        allDataInfo.priceMarkTime = priceMarkTime
        allDataInfo.reason = productDisposal.reason
        allDataInfo.remarks = productDisposal.remarks
        allDataInfo.totalQuantity = totalQuantity
        allDataInfo.serialNo = productDisposal.serialNo
        allDataInfo.branchName = config.get('warehouse').name
        allDataInfo.branchAddress = config.get('warehouse').address
        allDataInfo.postedBy = productDisposal.admin.name
        allDataInfo.products = allProducts
        allDataInfo.branchPhone = config.get('warehouse').phone
        allDataInfo.branchId = config.get('warehouse').code
        allDataInfo.companyName = config.get('company').full_name
        allDataInfo.companyLogo = config.get('company').company_logo
        allDataInfo.createTime = createTime
        allDataInfo.today = ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear()


        var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'reports', 'reconciliation', 'single_reconciliation_report.html'), 'utf8');

        var options = {
            format: "A4",
            orientation: "portrait",
            border: "5mm",
            footer: {
                height: "2mm",
                contents: {
                    default: '<span style="color: #444; text-align: center">page - {{page}} </span>', // fallback value
                }
            }
        }

        var document = {
            html: html,
            data: allDataInfo,
            path: "./public/reports/reconciliation_report.pdf"
        };

        pdf.create(document, options)
            .then(data => {
                const file = data.filename;
                console.log(file)
                return res.status(200).json({
                    auth: true,
                    fileLink: '/reports/reconciliation_report.pdf'
                })
            })
            .catch(error => {
                console.error(error)
            });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router