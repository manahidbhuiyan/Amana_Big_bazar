const express = require('express');
const router = express.Router();


const {
    check,
    validationResult
} = require('express-validator');

const config = require('config')

var isodate = require("isodate");

var pdf = require("pdf-creator-node");
var fs = require('fs');
var path = require('path');

const OrderForPos = require('../../../models/OrderForPos');
const SalesPerson = require('../../../models/SalesPerson');
const Branch = require('../../../models/Branch');

const adminAuth = require('../../../middleware/admin/auth');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');

// @route GET api/order
// @description Get all the orders
// @access Private
router.post('/sales-person-wise-sell', [
    adminAuth,
    [
        check('from', 'From date is required').not().isEmpty(),
        check('to', 'To date is required').not().isEmpty(),
        check('sales_person', 'sales person is required').not().isEmpty(),
    ]
], async (req, res) => {
    try {
        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'report')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to report'
                    }
                ]
            })
        }

        let {
            from,
            to,
            sales_person
        } = req.body

        from = new Date(from)
        from.setHours(0)
        from.setMinutes (0);
        from.setSeconds (0);
        
        to = new Date(to)
        to.setHours(23)
        to.setMinutes (59);
        to.setSeconds (59);

        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        let salesPerson = await SalesPerson.findById(sales_person)

        let orderListItems = await OrderForPos.find({
            branch: req.query.branch,
            salesPerson: sales_person,
            create: {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        }).populate('admin', ['name'])

        let ordersDetails = []

        let reportTotalQuantityPrice = 0
        let reportGrandTotalQuantity = 0
        let reportTotalBillGrandTotal = 0
        let reportTotalVat = 0
        let reportTotalProductDiscount = 0
        let reportTotalOtherDiscount = 0

        let orderParentArray = orderListItems.map((order, index)=>{
            let productListDataList = []
            let totalQuantity = 0
            let productDiscount = 0
            
            order.products.map((productInfo,index)=>{
                let productListData = []
                productListData[0] = productInfo.code
                productListData[1] = productInfo.name
                productListData[2] = productInfo.price.toFixed(2)
                productListData[3] = productInfo.quantity.toFixed(2)
                productListData[4] = (productInfo.quantity*productInfo.price*(productInfo.vat/100)).toFixed(2) + " ("+productInfo.vat+"%)"
                productListData[5] = (productInfo.discount*productInfo.quantity).toFixed(2)
                productListData[6] = productInfo.subtotal.toFixed(2)
                productListDataList.push(productListData)
                totalQuantity += productInfo.quantity
                reportTotalQuantityPrice += (productInfo.quantity*productInfo.price)
                productDiscount += (productInfo.discount*productInfo.quantity)
            })

            let create = new Date(order.create)

            ordersDetails.push({
                orderType: order.orderType,
                orderID: order.orderID,
                createDate: ("0" + create.getDate()).slice(-2) + ' ' + months[create.getMonth()] + ', ' + create.getUTCFullYear(),
                soldBy: order.admin.name,
                products: productListDataList,
                productDetails: order,
                totalBill: order.total_bill.toFixed(2),
                totalQuantity: totalQuantity.toFixed(2),
                totalVat: order.vat.toFixed(2) 
            })

            reportGrandTotalQuantity += totalQuantity
            reportTotalVat += order.vat 
            reportTotalProductDiscount += productDiscount
            reportTotalOtherDiscount += order.discount.others
            reportTotalBillGrandTotal += order.total_bill          
        })

        await Promise.all(orderParentArray)

        //return res.json(ordersDetails)

        let branch = await Branch.findById(req.query.branch).select('_id name address serialNo phone');
        let today = new Date();
        let hours = today.getHours();
        let minutes = today.getMinutes();
        let ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        minutes = minutes < 10 ? '0' + minutes : minutes;
        let createTime = hours + ':' + minutes + ' ' + ampm;

        let reportFullDataset = {
            fromDate: ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
            toDate: ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
            today: ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
            createTime,
            branch_phone : branch.phone,
            company_name : config.get('company').full_name,
            company_logo : config.get('company').company_logo,
            branch_id: branch.serialNo,
            branch_name: branch.name.trim(),
            branch_address: branch.address.trim(),
            sales_person_no: salesPerson.personID,
            sales_person_name: salesPerson.name,
            sales_person_contact: salesPerson.phone,
            reportTotalQuantityPrice: reportGrandTotalQuantity.toFixed(2),
            reportTotalVat: reportTotalVat.toFixed(2),
            reportTotalProductDiscount: reportTotalProductDiscount.toFixed(2),
            reportTotalOtherDiscount: reportTotalOtherDiscount.toFixed(2),
            reportTotal: reportTotalBillGrandTotal.toFixed(2),
            data: ordersDetails,
            totalSlip: ordersDetails.length  
        }

        //return res.json(reportFullDataset)

        var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'reports', 'sales_person_wise_sell.html'), 'utf8');

        var options = {
            format: "A4",
            orientation: "portrait",
            border: "10mm",
            header: {
                height: "8mm",
                contents: {
                    first: ' ',
                    default: `
                    <table cellspacing=0 cellpadding=0 width="510px" style="margin: 0 auto;"
                    class="table-border">
                    <tr>
                        <th style="font-size: 7px; text-align: left; width: 20%;">Department Code</th>
                        <th style="font-size: 7px; text-align: left; width: 30%;">Department Name</th>
                        <th style="font-size: 7px; text-align: right;">Ext. Net Sales</th>
                        <th style="font-size: 7px; text-align: right;">Cost Amt</th>
                        <th style="font-size: 7px; text-align: right;">Ext. Profit/Loss</th>
                    </tr>
                    </table>`
                }
            },
            footer: {
                height: "2mm",
                contents: {
                    default: '<span style="color: #444; text-align: center">page - {{page}} </span>', // fallback value
                }
            }
        }

        var document = {
            html: html,
            data: reportFullDataset,
            path: "./public/reports/sales_person_wise_sell.pdf"
        };

        pdf.create(document, options)
            .then(data => {
                const file = data.filename;
                return res.status(200).json({
                    auth: true,
                    fileLink: '/reports/sales_person_wise_sell.pdf' 
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