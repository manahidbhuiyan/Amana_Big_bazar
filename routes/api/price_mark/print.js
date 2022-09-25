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

const PriceMarkUpDown = require('../../../models/Tracking/Transaction/PriceMarkUpDown');

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

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'price mark')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to price mark up-down'
                    }
                ]
            })
        }

        let {
            download_id
        } = req.body


        let priceMarkUpdown = await PriceMarkUpDown.findById(download_id).populate('admin', 'name').populate('branch', 'name address serialNo phone')

        let allProducts = []
        let totalCostValue = 0
        let totalQuantity = 0

        priceMarkUpdown.products.map((productInfo, index) => {
            totalCostValue += ((Math.abs(productInfo.price.previous_sell - productInfo.price.sell)) * productInfo.stock)
            totalQuantity += productInfo.stock
            if (productInfo.second_price.purchase > 0 && productInfo.second_price.sell > 0) {
                totalQuantity += productInfo.second_stock
                totalCostValue += ((Math.abs(productInfo.second_price.previous_sell - productInfo.second_price.sell)) * productInfo.second_stock)
                allProducts.push({
                    serial: index + 1,
                    barcode: productInfo.barcode,
                    name: productInfo.name,
                    stock: productInfo.stock,
                    duel_stock: productInfo.second_stock,
                    pre_sell: productInfo.price.previous_sell,
                    sell: productInfo.price.sell,
                    duel_pre_sell: productInfo.second_price.previous_sell,
                    duel_sell: productInfo.second_price.sell,
                    quantity: productInfo.quantity,
                    purchase: productInfo.price.purchase,
                    pre_purchase: productInfo.price.previous_purchase,
                    duel_purchase: productInfo.second_price.purchase,
                    duel_pre_purchase: productInfo.second_price.previous_purchase,
                    total: ((Math.abs(productInfo.price.previous_sell - productInfo.price.sell)) * productInfo.stock),
                    duel_total: ((Math.abs(productInfo.second_price.previous_sell - productInfo.second_price.sell)) * productInfo.second_stock),
                    isDuel: true
                })
            } else {
                allProducts.push({
                    serial: index + 1,
                    barcode: productInfo.barcode,
                    name: productInfo.name,
                    stock: productInfo.stock,
                    pre_sell: productInfo.price.previous_sell,
                    sell: productInfo.price.sell,
                    quantity: productInfo.quantity,
                    purchase: productInfo.price.purchase,
                    pre_purchase: productInfo.price.previous_purchase,
                    total: ((Math.abs(productInfo.price.previous_sell - productInfo.price.sell)) * productInfo.stock),
                    isDuel: false
                })
            }

        })

        let allDataInfo = {}
        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        let priceMarkDateFormat = new Date(priceMarkUpdown.create)

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
        allDataInfo.reason = priceMarkUpdown.reason
        allDataInfo.remarks = priceMarkUpdown.remarks
        allDataInfo.totalCostValue = totalCostValue
        allDataInfo.totalQuantity = totalQuantity
        allDataInfo.serialNo = priceMarkUpdown.serialNo
        allDataInfo.branchName = priceMarkUpdown.branch.name
        allDataInfo.branchAddress = priceMarkUpdown.branch.address
        allDataInfo.postedBy = priceMarkUpdown.admin.name
        allDataInfo.products = allProducts
        allDataInfo.branchPhone = priceMarkUpdown.branch.phone
        allDataInfo.branchId = priceMarkUpdown.branch.serialNo
        allDataInfo.companyName = config.get('company').full_name
        allDataInfo.companyLogo = config.get('company').company_logo
        allDataInfo.createTime = createTime
        allDataInfo.today = ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear()


        var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'reports', 'price_mark', 'price_mark_updown.html'), 'utf8');

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
            path: "./public/reports/price_mark_status.pdf"
        };

        pdf.create(document, options)
            .then(data => {
                const file = data.filename;
                console.log(file)
                return res.status(200).json({
                    auth: true,
                    fileLink: '/reports/price_mark_status.pdf'
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