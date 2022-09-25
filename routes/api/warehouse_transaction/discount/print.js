const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

var pdf = require("pdf-creator-node");
var fs = require('fs');
var path = require('path');

const auth = require('../../../../middleware/admin/auth');

const ProductDiscount = require('../../../../models/Tracking/Transaction/ProductDiscount');

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


        let productDiscount = await ProductDiscount.findById(download_id).populate('admin', 'name').populate('branch', 'name address')

        let allProducts = []
        productDiscount.products.map((productInfo, index)=>{
            allProducts.push({
                serial: index + 1,
                barcode: productInfo.barcode,
                name: productInfo.name,
                stock: productInfo.stock,
                previous_discount: productInfo.previous_discount,
                discount: productInfo.discount
            })
        })

        let allDataInfo = {}

        let priceMarkDateFormat= new Date(productDiscount.create)

        let hours = priceMarkDateFormat.getHours();
        let minutes = priceMarkDateFormat.getMinutes();
        let ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        minutes = minutes < 10 ? '0'+minutes : minutes;
        let priceMarkTime = hours + ':' + minutes + ' ' + ampm;

        allDataInfo.priceMarkDate = priceMarkDateFormat.getDate()+'-' + (priceMarkDateFormat.getMonth()+1) + '-'+priceMarkDateFormat.getFullYear()
        allDataInfo.priceMarkTime = priceMarkTime
        allDataInfo.reason = productDiscount.reason
        allDataInfo.remarks = productDiscount.remarks
        allDataInfo.serialNo = productDiscount.serialNo
        allDataInfo.branchName = productDiscount.branch.name
        allDataInfo.branchAddress = productDiscount.branch.address
        allDataInfo.postedBy = productDiscount.admin.name
        allDataInfo.products = allProducts
        allDataInfo.branchPhone = config.get('warehouse').phone
        allDataInfo.branchId = config.get('warehouse').code


        var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'reports', 'price_mark', 'discount_report.html'), 'utf8');

                        var options = {
                            format: "A4",
                            orientation: "portrait",
                            border: "5mm"
                        }
                
                        var document = {
                            html: html,
                            data: allDataInfo,
                            path: "./public/reports/discount_report.pdf"
                        };
                
                        pdf.create(document, options)
                            .then(data => {
                                const file = data.filename;
                                console.log(file)
                                return res.status(200).json({
                                    auth: true,
                                    fileLink: '/reports/discount_report.pdf' 
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