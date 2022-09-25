const express = require('express');
const router = express.Router();
const { fork } = require('child_process');
const {
    check,
    validationResult
} = require('express-validator');


const excel = require('node-excel-export');
const config = require('config')
const jwt = require('jsonwebtoken');

var pdf = require("pdf-creator-node");
var fs = require('fs');
var path = require('path');

const auth = require('../../../../middleware/admin/auth');

const {
    getAdminRoleChecking
} = require('../../../../lib/helpers');


// @route GET api/report/single/product-wise/analysis?branch=..........
// @description Get single product name wise analysis report pdf
// @access Private
router.post('/single/product-wise/analysis', [
    auth,
    [
        check('from', 'From date is required').not().isEmpty(),
        check('to', 'To date is required').not().isEmpty(),
        check('name', 'name is required').not().isEmpty()
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

        let {from, to, name} = req.body

        const child = fork(path.join(__dirname, "subprocess", "name_wise_analysis.js"));

        const msg = {
            from,
            to,
            name,
            type: 'pdf',
            branch: req.query.branch,
        }
        child.send(msg)

        child.on('message', async (response) => {
            const {
                allDataInfo
            } = response

            var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'reports', 'analysis', 'product_name_wise_sales_analysis.html'), 'utf8');

            var options = {
                format: "A4",
                orientation: "landscape",
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
                path: "./public/reports/product_name_wise_sales_analysis.pdf"
            };

            pdf.create(document, options)
                .then(data => {
                    const file = data.filename;
                    return res.status(200).json({
                        auth: true,
                        fileLink: '/reports/product_name_wise_sales_analysis.pdf',
                        filename: 'product_name_wise_sales_analysis'
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

// @route GET api/report/single/product-wise/analysis/:adminID/:from/:to/:name?branch=..........
// @description Get single product name wise analysis report excel
// @access Private
router.get('/single/product-wise/analysis/:adminID/:from/:to/:name', [
    [
        check('from', 'From date is required').not().isEmpty(),
        check('to', 'To date is required').not().isEmpty(),
        check('name', 'Product Name id is required').not().isEmpty()
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
        let name = req.params.name

        const child = fork(path.join(__dirname, "subprocess", "name_wise_analysis.js"));

        const msg = {
            from,
            to,
            name,
            type: 'excel',
            branch: req.query.branch,
        }
        child.send(msg)

        child.on('message', async (response) => {
            const {
                grandTotal,
                allDataInfo,
                allDataInfoArray
            } = response

            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

            let reportFullDataset = {
                fromDate: ("0" + new Date(from).getDate()).slice(-2) + ' ' + months[new Date(from).getMonth()] + ', ' + new Date(from).getUTCFullYear(),
                toDate: ("0" + new Date(to).getDate()).slice(-2) + ' ' + months[new Date(to).getMonth()] + ', ' + new Date(to).getUTCFullYear(),
                shopCode: allDataInfo.branchNo,
                shopName: allDataInfo.branchName,
                shopAddress: allDataInfo.branchAddress,
                grandTotal,
                data: allDataInfoArray
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
                }
            };

            //Here you specify the export structure
            const specification = {
                barcode: { // <- the key should match the actual data key
                    displayName: 'BarCode', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                name: { // <- the key should match the actual data key
                    displayName: 'Item Description', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 300 // <- width in pixels
                },
                cost_price: { // <- the key should match the actual data key
                    displayName: 'Cost Price', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                sell_price: { // <- the key should match the actual data key
                    displayName: 'Sell Price', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                receiveDate: { // <- the key should match the actual data key
                    displayName: 'Receive Date', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                receiveTime: { // <- the key should match the actual data key
                    displayName: 'Receive Time', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                receiveQty: { // <- the key should match the actual data key
                    displayName: 'Receive Quantity', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                supplier: { // <- the key should match the actual data key
                    displayName: 'Supplier', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                returnDate: { // <- the key should match the actual data key
                    displayName: 'Return Date', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                returnTime: { // <- the key should match the actual data key
                    displayName: 'Return Time', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                returnQty: { // <- the key should match the actual data key
                    displayName: 'Return Qty', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                sellQty: { // <- the key should match the actual data key
                    displayName: 'Sell Quantity', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                stockQty: { // <- the key should match the actual data key
                    displayName: 'Stock Quantity', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                }
            }

            const heading = [
                [{ value: 'Product name wise analysis from : ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Code: ' + reportFullDataset.shopCode, style: styles.shop_info }],
                [{ value: 'Shop Name: ' + reportFullDataset.shopName, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.shopAddress, style: styles.shop_info }],
                [''],
                ['Grand Total:', ' ', ' ', ' ', ' ', ' ',
                    grandTotal.totalReceiveQuantity,
                    ' ', ' ', ' ',
                    grandTotal.totalReturnQuantity,
                    grandTotal.totalSellQuantity,
                    grandTotal.totalStockQuantity,

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
                        name: 'Product Name wise analysis From: ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                        heading: heading,
                        merges: merges,
                        specification: specification, // <- Report specification
                        data: reportFullDataset.data // <-- Report data
                    }
                ]
            );

            // You can then return this straight
            res.attachment('product_name_wise_analysis.xlsx'); // This is sails.js specific (in general you need to set headers)
            return res.send(report);
        })
        child.on('close', (code) => {
            child.kill()
            console.log(`child process exited with code ${code}`);
        });
        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        // from = new Date(from)
        // to = new Date(to)
        // to.setHours(to.getHours() + 23)
        // to.setMinutes(to.getMinutes() + 59);
        // to.setSeconds(to.getSeconds() + 59);

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router