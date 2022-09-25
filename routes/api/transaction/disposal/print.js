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

const auth = require('../../../../middleware/admin/auth');

const ProductDisposal = require('../../../../models/Tracking/Transaction/ProductDisposal');

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

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'transaction')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to transaction'
                    }
                ]
            })
        }

        let {
            download_id
        } = req.body



        let productDisposal = await ProductDisposal.findById(download_id).populate('admin', 'name').populate('branch', 'name address phone serialNo')

        let allProducts = []
        let totalQuantity = 0
        let grandTotal= 0
        productDisposal.products.map((productInfo, index)=>{
            totalQuantity += productInfo.disposal
            grandTotal += (productInfo.disposal * productInfo.price.purchase)
            allProducts.push({
                serial: index + 1,
                barcode: productInfo.barcode,
                name: productInfo.name,
                previous_stock: productInfo.stock.toFixed(2),
                stock: (productInfo.stock - productInfo.disposal).toFixed(2),
                disposal: productInfo.disposal.toFixed(2),
                purchase_price: productInfo.price.purchase.toFixed(2),
                subtotal: (productInfo.disposal * productInfo.price.purchase).toFixed(2),
            })
        })

        let allDataInfo = {}
        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        let priceMarkDateFormat= new Date(productDisposal.create)
        
        let hours = priceMarkDateFormat.getHours();
        let minutes = priceMarkDateFormat.getMinutes();
        let ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        minutes = minutes < 10 ? '0'+minutes : minutes;
        let priceMarkTime = hours + ':' + minutes + ' ' + ampm;

        let today = new Date();
        hours = today.getHours();
        minutes = today.getMinutes();
        ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        minutes = minutes < 10 ? '0' + minutes : minutes;
        let createTime = hours + ':' + minutes + ' ' + ampm;

        allDataInfo.priceMarkDate = priceMarkDateFormat.getDate()+'-' + (priceMarkDateFormat.getMonth()+1) + '-'+priceMarkDateFormat.getFullYear()
        allDataInfo.priceMarkTime = priceMarkTime
        allDataInfo.reason = productDisposal.reason
        allDataInfo.remarks = productDisposal.remarks
        allDataInfo.totalQuantity = totalQuantity.toFixed(2)
        allDataInfo.grandTotal = grandTotal.toFixed(2)
        allDataInfo.serialNo = productDisposal.serialNo
        allDataInfo.branchName = productDisposal.branch.name
        allDataInfo.branchAddress = productDisposal.branch.address
        allDataInfo.postedBy = productDisposal.admin.name
        allDataInfo.products = allProducts
        allDataInfo.branchPhone = productDisposal.branch.phone
        allDataInfo.branchId = productDisposal.branch.serialNo
        allDataInfo.companyName = config.get('company').full_name
        allDataInfo.companyLogo = config.get('company').company_logo
        allDataInfo.createTime = createTime
        allDataInfo.today = ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear()

        var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..','reports', 'price_mark', 'disposal_report.html'), 'utf8');

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
            path: "./public/reports/disposal_report.pdf"
        };

        pdf.create(document, options)
            .then(data => {
                const file = data.filename;
                console.log(file)
                return res.status(200).json({
                    auth: true,
                    fileLink: '/reports/disposal_report.pdf' 
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