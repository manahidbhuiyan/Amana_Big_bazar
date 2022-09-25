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

const Branch = require('../../../../models/Branch');

const adminAuth = require('../../../../middleware/admin/auth');

const {
    getAdminRoleChecking
} = require('../../../../lib/helpers');

// @route GET /api/report/brand/stock/details/report?branch=..........
// @description Get brand wise details stock report pdf
// @access Private
router.post('/daily/stock', [
    adminAuth,
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
            branch
        } = req.body

        from = new Date(from)
        from.setHours(0)
        from.setMinutes(0);
        from.setSeconds(0);

        to = new Date(to)
        to.setHours(23)
        to.setMinutes(59);
        to.setSeconds(59);

        let condition = {
            create : {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        }

        if(branch !== 'all'){
            condition.branch = branch  
        }

        const child = fork(path.join(__dirname, "subprocess", "daily_stock.js"));

        const msg = {
            from,
            to,
            condition,
            type: 'pdf'
        }

        child.send(msg)

        child.on('message', async (response) => {
            const {
                allDailyStockData,
                grandtotalQuantity,
                grandtotalSellAmount,
                grandtotalCostAmount,
                grandtotalGp
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
                title: branch !== 'all' ? "Single Branch Daily Stock Report" :  "All Branch Daily Stock Report",       
                fromDate: ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
                toDate: ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
                today: ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
                createTime,
                company_name : config.get('company').full_name,
                company_logo : config.get('company').company_logo,
                data: allDailyStockData,
                totalEarnAmount: grandtotalSellAmount.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1}),
                totalCostAmount: grandtotalCostAmount.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1}),
                totalQuantity: grandtotalQuantity.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1}),
                totalGp: grandtotalGp.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1})
            }

            // res.json(reportFullDataset)

            var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'reports', 'stock', 'daily_stock_report.html'), 'utf8');

            var options = {
                format: "A4",
                orientation: "landscape",
                border: "10mm",
                header: {
                    height: "8mm",
                    contents: {
                        first: ' ',
                        default: `
                        <table cellspacing=0 cellpadding=0 width="510px" style="margin: 0 auto;"
                        class="table-border">
                        <tr>
                            <th style="font-size: 8px; text-align: left; width: 40% ;padding-left: 3px">Date</th>
                            <th style="font-size: 8px; text-align: left; width: 15%">Quantity</th>
                            <th style="font-size: 8px; text-align: right;">Cost Amount</th>
                            <th style="font-size: 8px; text-align: right;">Sell Amount</th>
                            <th style="font-size: 8px; text-align: right;">GP(%)</th>
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
                path: branch !== 'all' ? "./public/reports/single_branch_daily_stock_report.pdf" : "./public/reports/all_branch_daily_stock_report.pdf"
            };

            pdf.create(document, options)
                .then(data => {
                    const file = data.filename;
                    return res.status(200).json({
                        auth: true,
                        fileLink: branch !== 'all' ? '/reports/single_branch_daily_stock_report.pdf' : '/reports/all_branch_daily_stock_report.pdf'
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

// @route GET /api/report/brand/stock/details/:adminID/:brand/:zero_stock?branch=..........
// @description Get brand wise details stock report excel
// @access Private
router.get('/brand/stock/details/:adminID/:brand/:zero_stock', async (req, res) => {
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

        let brand = req.params.brand
        let zero_stock = req.params.zero_stock

        let condition = {
            branch: {
                $in: req.query.branch
            }
        }

        if (brand != "all") {
            condition._id = brand
        }

        const child = fork(path.join(__dirname, "subprocess", "brand_stock_details.js"));

        const msg = {
            branch: req.query.branch,
            condition,
            type: 'excel',
            zero_stock
        }

        child.send(msg)
        child.on('message', async (response) => {
            const {
                mainData,
                grandtotalQuantity,
                grandtotalSellAmount,
                grandtotalCostAmount,
                grandtotalGp
            } = response

            let branch = await Branch.findById(req.query.branch).select('_id serialNo name address');

            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

            var today = new Date()

            let reportFullDataset = {
                currentDate: ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
                branch_id: branch.serialNo,
                branch_name: branch.name.trim(),
                branch_address: branch.address,
                data: mainData,
                totalEarnAmount: totalSellAmount.toFixed(2),
                totalCostAmount: totalCostAmount.toFixed(2),
                totalQuantity: totalQuantity.toFixed(2),
                totalGp: totalGp.toFixed(2)
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
                    width: 150, // <- width in pixels
                    cellStyle: styles.text_left
                },
                productName: { // <- the key should match the actual data key
                    displayName: 'Product Name', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 300 // <- width in pixels
                },
                category: { // <- the key should match the actual data key
                    displayName: 'Brand', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                quantity: { // <- the key should match the actual data key
                    displayName: 'Quantity', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 150 // <- width in pixels
                },
                cost_price: { // <- the key should match the actual data key
                    displayName: 'Cost Price', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 150 // <- width in pixels
                },
                sell_price: { // <- the key should match the actual data key
                    displayName: 'Sell Price', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 150 // <- width in pixels
                },
                total_cost_price: { // <- the key should match the actual data key
                    displayName: 'Cost Amount', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 150 // <- width in pixels
                },
                total_sell_price: { // <- the key should match the actual data key
                    displayName: 'Sell Amount', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 150 // <- width in pixels
                },
                gp: { // <- the key should match the actual data key
                    displayName: 'GP(%)', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 150 // <- width in pixels
                }
            }


            const heading = [
                [{ value: 'Stock Details Report By Brand At Date: ' + reportFullDataset.currentDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Code: ' + reportFullDataset.branch_id, style: styles.shop_info }],
                [{ value: 'Shop Name: ' + reportFullDataset.branch_name, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.branch_address, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                [''],
                ['Grand Total:', ' ', ' ',
                    reportFullDataset.totalQuantity,
                    ' ', ' ',
                    reportFullDataset.totalCostAmount,
                    reportFullDataset.totalEarnAmount,
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
                        name: 'Stock Details Report By Brand At Date: ' + reportFullDataset.currentDate, // <- Specify sheet name (optional)
                        heading: heading,
                        merges: merges,
                        specification: specification, // <- Report specification
                        data: reportFullDataset.data // <-- Report data
                    }
                ]
            );

            // You can then return this straight
            res.attachment('brand_wise_stock_details.xlsx'); // This is sails.js specific (in general you need to set headers)
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