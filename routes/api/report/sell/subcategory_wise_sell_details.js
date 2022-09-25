const express = require('express');
const router = express.Router();
const { fork } = require('child_process');
const {
    check,
    validationResult
} = require('express-validator');

const config = require('config');
const jwt = require('jsonwebtoken');
const excel = require('node-excel-export');

var isodate = require("isodate");

var pdf = require("pdf-creator-node");
var fs = require('fs');
var path = require('path');

const Product = require('../../../../models/Product');
const OrderForPos = require('../../../../models/OrderForPos');
const PosOrderExchange = require('../../../../models/PosOrderExchange');
const PosOrderRefund = require('../../../../models/PosOrderRefund');
const Branch = require('../../../../models/Branch');
const SubCategory = require('../../../../models/SubCategory');
const auth = require('../../../../middleware/user/auth');
const adminAuth = require('../../../../middleware/admin/auth');

const {
    getAdminRoleChecking
} = require('../../../../lib/helpers');

const Admin = require('../../../../models/admin/Admin');

// @route GET api/report/subcategory/sell/details?branch=..........
// @description Get sinlge subcategory wise sell report pdf 
// @access Private
router.post('/subcategory/sell/details', [
    adminAuth,
    [
        check('from', 'From date is required').not().isEmpty(),
        check('to', 'To date is required').not().isEmpty(),
        check('subcategory', 'SubCategory id is required').not().isEmpty()
    ]
], async (req, res) => {
    try {
        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

        const user = await Admin.findById(req.admin.id).select('-password').select('-forgot');

        if (!user) {
            return res.status(400).send({
                errors: [{
                    msg: 'Invailid user.'
                }]
            })
        }
        let {
            from,
            to,
            subcategory
        } = req.body

        from = new Date(from)
        from.setHours(0)
        from.setMinutes (0);
        from.setSeconds (0);
        
        to = new Date(to)
        to.setHours(23)
        to.setMinutes (59);
        to.setSeconds (59);

        const child = fork(path.join(__dirname, "subprocess", "subcategory_wise_sell_details.js"));

        const msg = {
            from,
            to,
            branch: req.query.branch,
            subcategory,
            type: 'pdf'
        }
        child.send(msg)

        child.on('message', async (response) => {
            const {
                sellList,
                totalSupplierQuantity,
                totalSupplierCostAmount,
                totalSupplierEarnAmount,
                totalGp,
                subcategories
            } = response

            let branch = await Branch.findById(req.query.branch).select('_id name address serialNo phone');
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
                branch_name: branch.name,
                branch_address: branch.address,
                supplier_name: subcategories[0].name,
                supplier_serialNo: subcategories[0].serialNo,
                data: sellList,
                totalSupplierQuantity: totalSupplierQuantity.toFixed(2),
                totalSupplierCostAmount: totalSupplierCostAmount.toFixed(2),
                totalSupplierEarnAmount: totalSupplierEarnAmount.toFixed(2),
                totalGp: totalGp.toFixed(2)
            }

            var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'reports', 'sell', 'subcategory_wise_sell_details.html'), 'utf8');

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
                            <th style="font-size: 7px; text-align: left; width: 15%; padding-left: 3px">Bar Code</th>
                            <th style="font-size: 7px; text-align: left; width: 30%;">Product</th>
                            <th style="font-size: 7px; text-align: right;">Cost Price</th>
                            <th style="font-size: 7px; text-align: right;">Sales Price</th>
                            <th style="font-size: 7px; text-align: right;">Sold Qty</th>
                            <th style="font-size: 7px; text-align: right;">Sales Cost</th>
                            <th style="font-size: 7px; text-align: right;">Sales Amount</th>
                            <th style="font-size: 7px; text-align: right;">GP(%)</th>
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
                path: "./public/reports/subcategory_wise_sell_details.pdf"
            };

            pdf.create(document, options)
                .then(data => {
                    const file = data.filename;
                    return res.status(200).json({
                        auth: true,
                        fileLink: '/reports/subcategory_wise_sell_details.pdf'
                    })
                })
                .catch(error => {
                    console.error(error)
                });
        })

        child.on('close', (code) => {
            child.kill()
            console.log(`child process exited with code ${code}`);
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/report/subcategory/sell/:adminID/:from/:to/:subcategory?branch=..........
// @description Get single subcategory wise sell report excel 
// @access Private
router.get('/subcategory/sell/:adminID/:from/:to/:subcategory', [
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
        let subcategory = req.params.subcategory

        from = new Date(from)
        to = new Date(to)
        to.setHours(to.getHours() + 23)
        to.setMinutes(to.getMinutes() + 59);
        to.setSeconds(to.getSeconds() + 59);

        const child = fork(path.join(__dirname, "subprocess", "subcategory_wise_sell_details.js"));

        const msg = {
            from,
            to,
            branch: req.query.branch,
            subcategory,
            type: 'excel'
        }
        child.send(msg)

        child.on('message', async (response) => {
            const {
                sellList,
                totalSupplierQuantity,
                totalSupplierCostAmount,
                totalSupplierEarnAmount,
                totalGp,
                subcategories
            } = response

            let branch = await Branch.findById(req.query.branch).select('_id name address serialNo');
            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

            let reportFullDataset = {
                fromDate: ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
                toDate: ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
                branch_id: branch.serialNo,
                branch_name: branch.name,
                branch_address: branch.address,
                supplier_name: subcategories[0].name,
                supplier_serialNo: subcategories[0].serialNo,
                data: sellList,
                totalSupplierQuantity: totalSupplierQuantity,
                totalSupplierCostAmount: totalSupplierCostAmount,
                totalSupplierEarnAmount: totalSupplierEarnAmount,
                totalGp: totalGp
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
                barcode: { // <- the key should match the actual data key
                    displayName: 'BarCode', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200, // <- width in pixels
                    cellStyle: styles.text_left
                },
                name: { // <- the key should match the actual data key
                    displayName: 'Product', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 300 // <- width in pixels
                },
                purchase_price: { // <- the key should match the actual data key
                    displayName: 'Cost Price', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                sell_price: { // <- the key should match the actual data key
                    displayName: 'Sell Price', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                quantity: { // <- the key should match the actual data key
                    displayName: 'Sold Quantity', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                purchaseCost: { // <- the key should match the actual data key
                    displayName: 'Sales cost', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                sellCost: { // <- the key should match the actual data key
                    displayName: 'Sales Amount', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                gp: { // <- the key should match the actual data key
                    displayName: 'GP(%)', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                }

            }


            const heading = [
                [{ value: 'SubCategory wise Sell Details from : ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Code: ' + reportFullDataset.branch_id, style: styles.shop_info }],
                [{ value: 'Shop Name: ' + reportFullDataset.branch_name, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.branch_address, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                [{ value: 'SubCategory Code: ' + reportFullDataset.supplier_serialNo, style: styles.shop_info }],
                [{ value: 'SubCategory Name: ' + reportFullDataset.supplier_name, style: styles.shop_info }],
                [''],
                ['Grand Total:', ' ', ' ', ' ',
                    reportFullDataset.totalSupplierQuantity,
                    reportFullDataset.totalSupplierCostAmount,
                    reportFullDataset.totalSupplierEarnAmount,
                    reportFullDataset.totalGp
                ],
            ];

            const merges = [
                { start: { row: 1, column: 1 }, end: { row: 1, column: 7 } }
            ]

            // Create the excel report.
            // This function will return Buffer
            const report = excel.buildExport(
                [ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
                    {
                        name: 'SubCategory wise Sell Details From: ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                        heading: heading,
                        merges: merges,
                        specification: specification, // <- Report specification
                        data: reportFullDataset.data // <-- Report data
                    }
                ]
            );

            // You can then return this straight
            res.attachment('subcategory_wise_sell_details.xlsx'); // This is sails.js specific (in general you need to set headers)
            return res.send(report);
        })

        child.on('close', (code) => {
            child.kill()
            console.log(`child process exited with code ${code}`);
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router