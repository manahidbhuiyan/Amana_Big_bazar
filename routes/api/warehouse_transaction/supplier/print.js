const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const bwipjs = require('bwip-js');

const config = require('config');

var pdf = require("pdf-creator-node");
var fs = require('fs');
var path = require('path');

const auth = require('../../../../middleware/admin/auth');

const RequisitionToSupplier = require('../../../../models/Tracking/WarehouseTransaction/RequisitionToSupplier');

const {
    getAdminRoleChecking
} = require('../../../../lib/helpers');


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

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'warehouse transaction')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to warehouse transaction'
                    }
                ]
            })
        }

        let {
            download_id
        } = req.body


        let supplierRequisitionData = await RequisitionToSupplier.findById(download_id).populate('supplier', '_id name contact').populate('admin', 'name')

        let allProducts = []
        let totalSealValue = 0
        supplierRequisitionData.products.map((productInfo, index)=>{
            totalSealValue += (productInfo.product.price.sell * productInfo.product.quantity)
            allProducts.push({
                serial: index + 1,
                barcode: productInfo.product.barcode,
                name: productInfo.product.name,
                stock: (productInfo.product.stock==null?0:productInfo.product.stock).toFixed(2),
                sell: (productInfo.product.price.sell).toFixed(2),
                quantity: (productInfo.product.quantity).toFixed(2),
                purchase: (productInfo.product.price.purchase).toFixed(2),
                total: (productInfo.product.total).toFixed(2)
            })
        })

        let allDataInfo = {}

        let requisitionDateFormat= new Date(supplierRequisitionData.products[0].requisition_date)
        let expectationDateFormat= new Date(supplierRequisitionData.products[0].expected_delivery)

        allDataInfo.requisition_date = requisitionDateFormat.getDate()+'-' + (requisitionDateFormat.getMonth()+1) + '-'+requisitionDateFormat.getFullYear()
        allDataInfo.expected_delivery = expectationDateFormat.getDate()+'-' + (expectationDateFormat.getMonth()+1) + '-'+expectationDateFormat.getFullYear()
        allDataInfo.purpose = supplierRequisitionData.products[0].purpose
        allDataInfo.remarks = supplierRequisitionData.products[0].remarks
        allDataInfo.totalSealValue = totalSealValue.toFixed(2)
        allDataInfo.totalQuantity = (supplierRequisitionData.totalQuantity).toFixed(2)
        allDataInfo.totalCostAmount = (supplierRequisitionData.totalAmount).toFixed(2)
        allDataInfo.serialNo = supplierRequisitionData.serialNo
        allDataInfo.branchName = config.get('warehouse').name
        allDataInfo.branchAddress = config.get('warehouse').address
        allDataInfo.branch_phone = config.get('warehouse').phone
        allDataInfo.branch_serial = config.get('warehouse').code
        allDataInfo.supplierName = supplierRequisitionData.supplier.name
        allDataInfo.supplierAddress = supplierRequisitionData.supplier.contact.address
        allDataInfo.postedBy = supplierRequisitionData.admin.name
        allDataInfo.products = allProducts

        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        let today = new Date();
        let hours = today.getHours();
        let minutes = today.getMinutes();
        let ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        minutes = minutes < 10 ? '0' + minutes : minutes;
        let createTime = hours + ':' + minutes + ' ' + ampm;

        allDataInfo.currentDate = ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear()
        allDataInfo.createTime = createTime
        allDataInfo.company_name = config.get('company').full_name
        allDataInfo.company_logo = config.get('company').company_logo


        var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'reports', 'supplier', 'supplier_request.html'), 'utf8');

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
            path: "./public/reports/warehouse_supplier_request.pdf"
        };

        pdf.create(document, options)
            .then(data => {
                const file = data.filename;
                console.log(file)
                return res.status(200).json({
                    auth: true,
                    fileLink: '/reports/warehouse_supplier_request.pdf' 
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