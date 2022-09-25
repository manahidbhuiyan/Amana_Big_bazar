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

const auth = require('../../../../../middleware/admin/auth');

const {
    getAdminRoleChecking
} = require('../../../../../lib/helpers');



// @route GET api/report/single/supplier/analysis
// @description Get supplier wise analysis report pdf
// @access Private
router.post('/single/supplier/analysis', [
    auth,
    [
        check('from', 'From date is required').not().isEmpty(),
        check('to', 'To date is required').not().isEmpty(),
        check('supplier', 'Supplier id is required').not().isEmpty()
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

        let {from, to, supplier, branch} = req.body

        from = new Date(from)
        from.setHours(0)
        from.setMinutes (0);
        from.setSeconds (0);
        
        to = new Date(to)
        to.setHours(23)
        to.setMinutes (59);
        to.setSeconds (59);

        const child = fork(path.join(__dirname, "subprocess", "supplier_wise_analysis.js"));

        const msg = {
            from,
            to,
            supplier,
            branch,
            type: 'pdf'
        }
        child.send(msg)

        child.on('message', async (response) => {
            const {
                allDataInfo
            } = response

            var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..','..', 'reports', 'warehouse', 'analysis', 'supplier_wise_analysis.html'), 'utf8');

            var options = {
                format: "A4",
                orientation: "landscape",
                border: "5mm",
                header: {
                    height: "8mm",
                    contents: {
                        first: ' ',
                        default: `
                        <table cellspacing=0 cellpadding=0 width="780px" style="margin: 0 auto;"
                        class="table-border">
                        <tr>
                            <th style="font-size: 8px; text-align: left; width: 9% ;padding-left: 3px">Barcode</th>
                            <th style="font-size: 8px; text-align: left; width: 13%">Item Description</th>
                            <th style="font-size: 8px; text-align: right;">Avg cost</th>
                            <th style="font-size: 8px; text-align: right;">S.Price</th>
                            <th style="font-size: 8px; text-align: right;">Rec.Qty</th>
                            <th style="font-size: 8px; text-align: right;">Rec.Amt</th>
                            <th style="font-size: 8px; text-align: right;">S.Qty</th>
                            <th style="font-size: 8px; text-align: right;">S.Amt</th>
                            <th style="font-size: 8px; text-align: right;">B.R.Qty</th>
                            <th style="font-size: 8px; text-align: right;">ST.Qty</th>
                            <th style="font-size: 8px; text-align: right;">ST.Amt</th>
                            <th style="font-size: 8px; text-align: right;">Ret.Qty</th>
                            <th style="font-size: 8px; text-align: right;">Ret.Amt</th>
                            <th style="font-size: 8px; text-align: right;">D.Qty</th>
                            <th style="font-size: 8px; text-align: right;">D.Amt</th>
                            <th style="font-size: 8px; text-align: right;">Gp(%)</th>
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
                data: allDataInfo,
                path: "./public/reports/supplier_wise_analysis.pdf"
            };

            pdf.create(document, options)
                .then(data => {
                    const file = data.filename;
                    return res.status(200).json({
                        auth: true,
                        fileLink: '/reports/supplier_wise_analysis.pdf',
                        filename: 'supplier_wise_analysis'
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

// @route GET api/report/single/supplier/analysis/:adminID/:from/:to/:supplier
// @description Get supplier wise analysis report excel
// @access Private
router.get('/single/supplier/analysis/:adminID/:from/:to/:supplier', [
    [
        check('from', 'From date is required').not().isEmpty(),
        check('to', 'To date is required').not().isEmpty(),
        check('supplier', 'Supplier id is required').not().isEmpty()
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
        let supplier = req.params.supplier

        from = new Date(from)
        to = new Date(to)
        to.setHours(to.getHours() + 23)
        to.setMinutes(to.getMinutes() + 59);
        to.setSeconds(to.getSeconds() + 59);


        const child = fork(path.join(__dirname, "subprocess", "supplier_wise_analysis.js"));

        const msg = {
            from,
            to,
            supplier,
            type: 'excel'
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
                fromDate: ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
                toDate: ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
                supplierCode: allDataInfo.supplierNo,
                shopName: config.get('warehouse').name,
                shopAddress: config.get('warehouse').address,
                supplierName: allDataInfo.supplierName,
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
                purchase: { // <- the key should match the actual data key
                    displayName: 'Cost Price', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                sell: { // <- the key should match the actual data key
                    displayName: 'Sell Price', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                quantity: { // <- the key should match the actual data key
                    displayName: 'Receive Quantity', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                total: { // <- the key should match the actual data key
                    displayName: 'Receive Amount', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                total_sell_no: { // <- the key should match the actual data key
                    displayName: 'Sold Quantity', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                total_cost_amount: { // <- the key should match the actual data key
                    displayName: 'Sold Cost Amount', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                total_sell_amount: { // <- the key should match the actual data key
                    displayName: 'Sold Amount', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                stockQuantity: { // <- the key should match the actual data key
                    displayName: 'Stock Quantity', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                stockCostAmount: { // <- the key should match the actual data key
                    displayName: 'Stock Amount', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                total_return_no: { // <- the key should match the actual data key
                    displayName: 'Return Quantity', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                total_return_amount: { // <- the key should match the actual data key
                    displayName: 'Return Amount', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                total_disposal_no: { // <- the key should match the actual data key
                    displayName: 'Disposal Quantity', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                total_disposal_amount: {
                    displayName: 'Disposal Amount', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                gp: {
                    displayName: 'Gross Profit(%)', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                }

            }
            const heading = [
                [{ value: 'Supplier wise analysis from : ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Name: ' + reportFullDataset.shopName, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.shopAddress, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [{ value: 'Supplier Code: ' + reportFullDataset.supplierCode, style: styles.shop_info }],
                [{ value: 'Supplier Name: ' + reportFullDataset.supplierName, style: styles.shop_info }],
                [''],
                [''],
                ['Grand Total:', ' ', ' ', ' ',
                    grandTotal.totalQuantity,
                    grandTotal.totalCostAmount,
                    grandTotal.totalSoldQuantity,
                    grandTotal.totalSoldCostAmount,
                    grandTotal.totalSoldEarnAmount,
                    grandTotal.totalStockQuantity,
                    grandTotal.totalStockCostQuantity,
                    grandTotal.totalReturnQuantity,
                    grandTotal.totalReturnCostQuantity,
                    grandTotal.totalDisposalQuantity,
                    grandTotal.totalDisposalCostQuantity,
                    grandTotal.totalProfit
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
                        name: 'Suppler wise analysis From: ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                        heading: heading,
                        merges: merges,
                        specification: specification, // <- Report specification
                        data: reportFullDataset.data // <-- Report data
                    }
                ]
            );

            // You can then return this straight
            res.attachment('Supplier_wise_analysis.xlsx'); // This is sails.js specific (in general you need to set headers)
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