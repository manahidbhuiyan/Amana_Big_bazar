const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const config = require('config')
const jwt = require('jsonwebtoken');
const excel = require('node-excel-export');

var isodate = require("isodate");

var pdf = require("pdf-creator-node");
var fs = require('fs');
var path = require('path');

const ReceiveFromSupplier = require('../../../models/Tracking/Transaction/ReceiveFromSupplier');
const OrderFromPOS = require('../../../models/OrderForPos');
const Supplier = require('../../../models/Supplier');
const Branch = require('../../../models/Branch');

const auth = require('../../../middleware/user/auth');
const adminAuth = require('../../../middleware/admin/auth');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');

const Admin = require('../../../models/admin/Admin');

// @route GET api/order
// @description Get all the orders
// @access Private
router.post('/supplier/period-wise/stock/report', [
    adminAuth,
    [
        check('from', 'From date is required').not().isEmpty(),
        check('to', 'To date is required').not().isEmpty(),
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

        let {from, to} = req.body

        from = new Date(from)
        from.setHours(0)
        from.setMinutes (0);
        from.setSeconds (0);
        
        to = new Date(to)
        to.setHours(23)
        to.setMinutes (59);
        to.setSeconds (59);


        let suppliers = await Supplier.find({
            branch: {
                $in: req.query.branch
            }
        }).select('_id name serialNo')
        


        let reportData = []


        let totalQuantity = 0;
        let totalAllQuantity = 0;
        let totalCostAmount = 0;
        let totalAllCostAmount = 0;
        let totalSellAmount = 0;
        let totalAllSellAmount = 0;
        // let totalDiscountAmount = 0;

        let allCategoryData = []

        await suppliers.map(async (supplier, index) => {

            let categoryWiseProductList = await ReceiveFromSupplier.find({
                branch: req.query.branch,
                supplier: supplier._id,
                create: {
                    $gte: isodate(from),
                    $lte: isodate(to)
                }
            })

            if(categoryWiseProductList.length>0){
                let totalQuantity = 0
                let totalCostAmount = 0
                let totalSellAmount = 0

                let chain = Promise.resolve();

                for (let i=0; i<categoryWiseProductList.length; i++) {
                    totalQuantity += categoryWiseProductList[i].totalQuantity
                    totalAllQuantity += categoryWiseProductList[i].totalQuantity
                    totalCostAmount += categoryWiseProductList[i].totalAmount 
                    totalAllCostAmount += categoryWiseProductList[i].totalAmount 
                    let productList = categoryWiseProductList[i].products
                    for (let i=0; i<productList.length; i++) {
                        chain = chain.then(()=>{
                            totalSellAmount += (productList[i].product.quantity*productList[i].product.price.sell)
                            totalAllSellAmount += (productList[i].product.quantity*productList[i].product.price.sell)
                        })
                    }
                }

                chain.then(()=>{ 
                    allCategoryData.push({
                        _id: supplier._id,
                        serial: supplier.serialNo,
                        name: supplier.name,
                        quantity: totalQuantity.toFixed(2),
                        costAmount: totalCostAmount.toFixed(2),
                        sellAmount: totalSellAmount.toFixed(2)
                    })
                })

            }


            if(suppliers.length == (index+1)){
                let branch = await Branch.findById(req.query.branch).select('_id name address phone serialNo');

                var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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
                    branch_address: branch.address,
                    data: allCategoryData,
                    totalEarnAmount: totalAllSellAmount.toFixed(2),
                    totalCostAmount: totalAllCostAmount.toFixed(2),
                    totalQuantity: totalAllQuantity.toFixed(2),
                }

                var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'reports', 'stock', 'category_period_wise_sell_report_supplier.html'), 'utf8');

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
                                <th style="font-size: 7px; text-align: left; width: 15%;">Supplier Code</th>
                                <th style="font-size: 7px; text-align: left; width: 45%;">Supplier Name</th>
                                <th style="font-size: 7px; text-align: right;">Quantity</th>
                                <th style="font-size: 7px; text-align: right;">Cost Amt</th>
                                <th style="font-size: 7px; text-align: right;">Sales Amount</th>
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
                    path: "./public/reports/category_period_wise_sell_report_supplier.pdf"
                };

                pdf.create(document, options)
                    .then(data => {
                        const file = data.filename;
                        return res.status(200).json({
                            auth: true,
                            fileLink: '/reports/category_period_wise_sell_report_supplier.pdf' 
                        })
                    })
                    .catch(error => {
                        console.error(error)
                });
            }
           
        })

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/order
// @description Get all the orders
// @access Private
router.get('/supplier/period-wise/stock/report/:adminID/:from/:to', [
    [
        check('from', 'From date is required').not().isEmpty(),
        check('to', 'To date is required').not().isEmpty()
    ]
], async (req, res) => {
    try {
        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

        const token = req.params.adminID;
        let adminInformation = null;

        if (!token) {
            return res.status(401).json({
                msg: 'No token, authorization denied'
            });
        }

        // Verify token
        try {
            const decode = jwt.verify(token, config.get('jwtSecrect'));

            adminInformation = decode.admin;
        } catch (err) {
            return res.status(401).json({
                msg: 'Authorization not valid'
            });
        }

        const adminRoles = await getAdminRoleChecking(adminInformation.id, 'report')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to report'
                    }
                ]
            })
        }

        let from = req.params.from
        let to = req.params.to

        from = new Date(from)
        to = new Date(to)
        to.setHours(23)
        to.setMinutes(59);
        to.setSeconds(59);


        let suppliers = await Supplier.find({
            branch: {
                $in: req.query.branch
            }
        }).select('_id name serialNo')



        let reportData = []


        let totalQuantity = 0;
        let totalAllQuantity = 0;
        let totalCostAmount = 0;
        let totalAllCostAmount = 0;
        let totalSellAmount = 0;
        let totalAllSellAmount = 0;
        // let totalDiscountAmount = 0;

        let allCategoryData = []

        await suppliers.map(async (supplier, index) => {

            let categoryWiseProductList = await ReceiveFromSupplier.find({
                branch: req.query.branch,
                supplier: supplier._id,
                create: {
                    $gte: isodate(from),
                    $lte: isodate(to)
                }
            })

            if (categoryWiseProductList.length > 0) {
                let totalQuantity = 0
                let totalCostAmount = 0
                let totalSellAmount = 0

                let chain = Promise.resolve();

                for (let i = 0; i < categoryWiseProductList.length; i++) {
                    totalQuantity += categoryWiseProductList[i].totalQuantity
                    totalAllQuantity += categoryWiseProductList[i].totalQuantity
                    totalCostAmount += categoryWiseProductList[i].totalAmount
                    totalAllCostAmount += categoryWiseProductList[i].totalAmount
                    let productList = categoryWiseProductList[i].products
                    for (let i = 0; i < productList.length; i++) {
                        chain = chain.then(() => {
                            totalSellAmount += (productList[i].product.quantity * productList[i].product.price.sell)
                            totalAllSellAmount += (productList[i].product.quantity * productList[i].product.price.sell)
                        })
                    }
                }

                chain.then(() => {
                    allCategoryData.push({
                        _id: supplier._id,
                        serial: supplier.serialNo,
                        name: supplier.name,
                        quantity: totalQuantity,
                        costAmount: totalCostAmount,
                        sellAmount: totalSellAmount
                    })
                })

            }


            if (suppliers.length == (index + 1)) {
                let branch = await Branch.findById(req.query.branch).select('_id name address');

                var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

                let reportFullDataset = {
                    fromDate: ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
                    toDate: ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
                    branch_id: branch._id,
                    branch_name: branch.name.trim(),
                    branch_address: branch.address,
                    data: allCategoryData,
                    totalEarnAmount: totalAllSellAmount,
                    totalCostAmount: totalAllCostAmount,
                    totalQuantity: totalAllQuantity,
                }

                // return res.json(reportFullDataset.data)

                const styles = {
                    headerDark: {
                        fill: {
                            fgColor: {
                                rgb: 'FF000000'
                            }
                        },
                        font: {
                            color: {
                                rgb: 'FFFFFFFF'
                            },
                            sz: 14,
                            bold: true
                        }
                    },
                    cellPink: {
                        fill: {
                            fgColor: {
                                rgb: 'FFFFCCFF'
                            }
                        }
                    },
                    shop_info: {
                        color: {
                            rgb: '000000'
                        },
                        sz: 12,
                        bold: true
                    },
                    cell_border: {
                        border: {
                            bottom: {
                                style: 'dotted',
                                color: {
                                    rgb: '789564'
                                }
                            }
                        }
                    },
                    cellGreen: {
                        fill: {
                            fgColor: {
                                rgb: 'FF00FF00'
                            }
                        }
                    },
                    text_left: {
                        alignment: {
                            vertical: 'left',
                            horizontal: 'left'
                        }
                    }
                };

                //Here you specify the export structure
                const specification = {
                    serial: { // <- the key should match the actual data key
                        displayName: 'Supplier Code', // <- Here you specify the column header
                        headerStyle: styles.headerDark, // <- Header style
                        width: 200, // <- width in pixels
                        cellStyle: styles.text_left
                    },
                    name: { // <- the key should match the actual data key
                        displayName: 'Supplier Name', // <- Here you specify the column header
                        headerStyle: styles.headerDark, // <- Header style
                        width: 300 // <- width in pixels
                    },
                    quantity: { // <- the key should match the actual data key
                        displayName: 'Qunatity', // <- Here you specify the column header
                        headerStyle: styles.headerDark, // <- Header style
                        width: 300 // <- width in pixels
                    },
                    costAmount: { // <- the key should match the actual data key
                        displayName: 'Cost Amount', // <- Here you specify the column header
                        headerStyle: styles.headerDark, // <- Header style
                        width: 200 // <- width in pixels
                    },

                    sellAmount: { // <- the key should match the actual data key
                        displayName: 'Sell Amount', // <- Here you specify the column header
                        headerStyle: styles.headerDark, // <- Header style
                        width: 200 // <- width in pixels
                    }
                }

                const heading = [
                    [{ value: 'Period wise supplier stock from : ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                    [''], // <-- It can be only values
                    [{ value: 'Shop Code: ' + reportFullDataset.branch_id, style: styles.shop_info }],
                    [{ value: 'Shop Name: ' + reportFullDataset.branch_name, style: styles.shop_info }],
                    [{ value: 'Shop Address: ' + reportFullDataset.branch_address, style: styles.shop_info }],
                    [{ value: '', style: styles.cell_border }],
                    [''],
                    ['Grand Total:', ' ',
                        reportFullDataset.totalQuantity,
                        reportFullDataset.totalCostAmount,
                        reportFullDataset.totalEarnAmount
                    ]

                ];

                const merges = [
                    { start: { row: 1, column: 1 }, end: { row: 1, column: 7 } }
                ]

                // Create the excel report.
                // This function will return Buffer
                const report = excel.buildExport(
                    [ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
                        {
                            name: 'Period wise supplier stock from : ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                            heading: heading,
                            merges: merges,
                            specification: specification, // <- Report specification
                            data: reportFullDataset.data // <-- Report data
                        }
                    ]
                );

                // You can then return this straight
                res.attachment('period_wise_supplier_stock_report.xlsx'); // This is sails.js specific (in general you need to set headers)
                return res.send(report);

            }

        })

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router