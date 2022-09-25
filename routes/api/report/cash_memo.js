const express = require('express');
const router = express.Router();
const { fork } = require('child_process')

const {
    check,
    validationResult
} = require('express-validator');

const config = require('config')
const jwt = require('jsonwebtoken');
const excel = require('node-excel-export');


var pdf = require("pdf-creator-node");
var fs = require('fs');
var path = require('path');


const Branch = require('../../../models/Branch');
const adminAuth = require('../../../middleware/admin/auth');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');


// @route GET api/report/cash-memo?branch=..........
// @description Get all the cash memo report pdf
// @access Private
router.post('/cash-memo', [
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

        let {
            from,
            to
        } = req.body

        from = new Date(from)
        from.setHours(0)
        from.setMinutes (0);
        from.setSeconds (0);

        to = new Date(to)
        to.setHours(23)
        to.setMinutes (59);
        to.setSeconds(59);

        let branch = await Branch.findById(req.query.branch).select('_id name address serialNo phone');

        const child = fork(path.join(__dirname, "subprocess", "cash_memo.js"));

        const msg = {
            from,
            to,
            branch: req.query.branch,
            type: 'pdf'
        }

        child.send(msg)

        child.on('message', async (response) => {
            const {
                ordersDetails,
                reportGrandTotalQuantity,
                reportTotalBillGrandTotal,
                reportTotalVat,
                reportTotalProductDiscount,
                reportTotalOtherDiscount
            } = response

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
                branch_id: branch.serialNo,
                branch_name: branch.name.trim(),
                branch_address: branch.address.trim(),
                branch_phone : branch.phone,
                company_name : config.get('company').full_name,
                company_logo : config.get('company').company_logo,
                reportTotalQuantityPrice: reportGrandTotalQuantity.toFixed(2),
                reportTotalVat: reportTotalVat.toFixed(2),
                reportTotalProductDiscount: reportTotalProductDiscount.toFixed(2),
                reportTotalOtherDiscount: reportTotalOtherDiscount.toFixed(2),
                reportTotal: reportTotalBillGrandTotal.toFixed(2),
                data: ordersDetails,
                totalSlip: ordersDetails.length
            }

            //return res.json(reportFullDataset)

            var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'reports', 'cash_memo.html'), 'utf8');

            var options = {
                format: "A4",
                orientation: "portrait",
                border: "10mm",
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
                path: "./public/reports/cash_memo.pdf"
            };

            pdf.create(document, options)
                .then(data => {
                    const file = data.filename;
                    return res.status(200).json({
                        auth: true,
                        fileLink: '/reports/cash_memo.pdf'
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


// @route GET api/report/cash-memo/:adminID/:from/:to?branch=..........
// @description Get all the cash-memo report excel
// @access Private
router.get('/cash-memo/:adminID/:from/:to', async (req, res) => {
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

        let condition = {}

        if (req.query.branch !== undefined) {
            condition.branch = req.query.branch
        }


        from = new Date(from)
        from.setHours(0)
        from.setMinutes(0);
        from.setSeconds(0);

        to = new Date(to)
        to.setHours(23)
        to.setMinutes(59)
        to.setSeconds(59)

        const child = fork(path.join(__dirname, "subprocess", "cash_memo.js"));

        const msg = {
            from,
            to,
            branch: req.query.branch,
            type: 'excel'
        }

        child.send(msg)

        child.on('message', async (response) => {
            const {
                mainData,
                ordersDetails,
                reportGrandTotalQuantity,
                reportTotalBillGrandTotal,
                reportTotalVat,
                reportTotalProductDiscount,
                reportTotalOtherDiscount
            } = response

            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            let branch = await Branch.findById(req.query.branch).select('_id serialNo name address');

            var today = new Date()

            let reportFullDataset = {
                currentDate: ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
                fromDate: ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
                toDate: ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
                branch_id: branch.serialNo,
                branch_name: branch.name.trim(),
                branch_address: branch.address,
                data: mainData,
                reportTotalQuantityPrice: reportGrandTotalQuantity,
                reportTotalVat: reportTotalVat,
                reportTotalProductDiscount: reportTotalProductDiscount,
                reportTotalOtherDiscount: reportTotalOtherDiscount,
                reportTotal: reportTotalBillGrandTotal,
                totalSlip: ordersDetails.length
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
                    displayName: 'Barcode', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 150 // <- width in pixels
                },
                name: { // <- the key should match the actual data key
                    displayName: 'Product Name', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                price: { // <- the key should match the actual data key
                    displayName: 'Unit Price', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 150 // <- width in pixels
                },
                quantity: { // <- the key should match the actual data key
                    displayName: 'Quantity', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 150 // <- width in pixels
                },
                tax: { // <- the key should match the actual data key
                    displayName: 'Tax', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 150 // <- width in pixels
                },
                productDiscount: { // <- the key should match the actual data key
                    displayName: 'Product Discount', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                total: { // <- the key should match the actual data key
                    displayName: 'total', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                }
            }


            const heading = [
                [{ value: 'Cash memo report date wise from: ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Code: ' + reportFullDataset.branch_id, style: styles.shop_info }],
                [{ value: 'Shop Name: ' + reportFullDataset.branch_name, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.branch_address, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                [''],
                [{ value: 'Grand Total Quantity: ' + reportFullDataset.reportTotalQuantityPrice, style: styles.shop_info }],
                [{ value: 'Grand Total Tax: ' + reportFullDataset.reportTotalVat, style: styles.shop_info }],
                [{ value: 'Grand Total Product Discount: ' + reportFullDataset.reportTotalProductDiscount, style: styles.shop_info }],
                [{ value: 'Grand Total Other Discount: ' + reportFullDataset.reportTotalOtherDiscount, style: styles.shop_info }],
                [{ value: 'Grand Total Bill: ' + reportFullDataset.reportTotal, style: styles.shop_info }],
                [{ value: 'Total Receipt: ' + reportFullDataset.totalSlip, style: styles.shop_info }],
                ['']
            ];

            const merges = [
                { start: { row: 1, column: 1 }, end: { row: 1, column: 7 } }
            ]

            // Create the excel report.
            // This function will return Buffer
            const report = excel.buildExport(
                [ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
                    {
                        name: 'Cash memo report date wise from: ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                        heading: heading,
                        merges: merges,
                        specification: specification, // <- Report specification
                        data: reportFullDataset.data // <-- Report data
                    }
                ]
            );

            // You can then return this straight
            res.attachment('cash_memo_report_date_wise.xlsx'); // This is sails.js specific (in general you need to set headers)
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