const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const config = require('config');

const bwipjs = require('bwip-js');

var pdf = require("pdf-creator-node");
var fs = require('fs');
var path = require('path');

const auth = require('../../../../middleware/admin/auth');

const ReturnToSupplier = require('../../../../models/Tracking/WarehouseTransaction/ReturnToSupplier');

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


        let supplierReturnData = await ReturnToSupplier.findById(download_id).populate('supplier', '_id name contact').populate('admin', 'name')

        let allProducts = []
        let totalSealValue = 0
        supplierReturnData.products.map((productInfo, index)=>{
            totalSealValue += (productInfo.price.sell * productInfo.quantity)
            allProducts.push({
                serial: index + 1,
                barcode: productInfo.barcode,
                name: productInfo.name,
                stock: productInfo.stock,
                sell: productInfo.price.sell,
                quantity: productInfo.quantity,
                purchase: productInfo.price.purchase,
                total: productInfo.total
            })
        })

        let allDataInfo = {}

        let chalanDateFormat= new Date(supplierReturnData.chalan_date)
        let returnDateFormat= new Date(supplierReturnData.create)

        allDataInfo.chalanDate = chalanDateFormat.getDate()+'-' + (chalanDateFormat.getMonth()+1) + '-'+chalanDateFormat.getFullYear()
        allDataInfo.returnDate = returnDateFormat.getDate()+'-' + (returnDateFormat.getMonth()+1) + '-'+returnDateFormat.getFullYear()
        allDataInfo.purpose = supplierReturnData.purpose
        allDataInfo.remarks = supplierReturnData.remarks
        allDataInfo.totalSealValue = totalSealValue
        allDataInfo.totalQuantity = supplierReturnData.totalQuantity
        allDataInfo.totalCostAmount = supplierReturnData.totalAmount
        allDataInfo.serialNo = supplierReturnData.serialNo
        allDataInfo.branchName = config.get('warehouse').name
        allDataInfo.branchAddress = config.get('warehouse').address
        allDataInfo.supplierName = supplierReturnData.supplier.name
        allDataInfo.supplierAddress = supplierReturnData.supplier.contact.address
        allDataInfo.postedBy = supplierReturnData.admin.name
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
        allDataInfo.branch_phone = config.get('warehouse').phone
        allDataInfo.branch_serial = config.get('warehouse').code


        var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'reports', 'supplier', 'supplier_return.html'), 'utf8');

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
            path: "./public/reports/warehouse_supplier_return.pdf"
        };

        pdf.create(document, options)
            .then(data => {
                const file = data.filename;
                console.log(file)
                return res.status(200).json({
                    auth: true,
                    fileLink: '/reports/warehouse_supplier_return.pdf' 
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