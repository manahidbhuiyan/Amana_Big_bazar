const express = require('express');
const router = express.Router();
const { fork } = require('child_process')
const {
    check,
    validationResult
} = require('express-validator');

const config = require('config');
const excel = require('node-excel-export');
const jwt = require('jsonwebtoken');


var pdf = require("pdf-creator-node");
var fs = require('fs');
var path = require('path');

const adminAuth = require('../../../../../middleware/admin/auth');

const {
    getAdminRoleChecking
} = require('../../../../../lib/helpers');


// @route GET api/report/subcategory/inventory/summary/report
// @description Get subcategory inventory report summary pdf
// @access Private
router.post('/subcategory/inventory/summary/report', [
    adminAuth,
    [
        check('subcategory', 'SubCategory is required').not().isEmpty(),
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

        let { subcategory } = req.body

        let condition = {}

        if (subcategory != "all") {
            condition._id = subcategory
        }
        const child = fork(path.join(__dirname, "subprocess", "subcategory_inventory_summary.js"));

        const msg = {
            condition,
            type: 'pdf'
        }

        child.send(msg)

        child.on('message', async (response) => {
            const {
                allCategoryData,
                totalCostAmount,
                totalSellAmount,
                totalQuantity,
                totalInventoryQuantity,
                totalDiffUnit,
                totalDiffUnitCostAmount,
                totalDiffUnitSellAmount
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
                title: "warehouse inventory report Summary by subcategory",
                headers: ["SubCategory Code", "SubCategory Name"],
                currentDate: ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
                createTime,
                company_name : config.get('company').full_name,
                company_logo : config.get('company').company_logo,
                branch_id: config.get('warehouse').code,
                branch_phone: config.get('warehouse').phone,
                branch_name: config.get('warehouse').name,
                branch_address: config.get('warehouse').address,
                data: allCategoryData.sort( function (a,b) {
                    return a.name.localeCompare(b.name)
                }),
                totalEarnAmount: totalSellAmount.toFixed(2),
                totalCostAmount: totalCostAmount.toFixed(2),
                totalQuantity: totalQuantity.toFixed(2),
                totalInventoryQuantity: totalInventoryQuantity.toFixed(2),
                totalDiffUnit: totalDiffUnit.toFixed(2),
                totalDiffUnitCostAmount: totalDiffUnitCostAmount.toFixed(2),
                totalDiffUnitSellAmount: totalDiffUnitSellAmount.toFixed(2)
            }

            // res.json(reportFullDataset)

            var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', '..', 'reports', 'inventory', 'inventory_report_summary.html'), 'utf8');

            var options = {
                format: "A4",
                orientation: "landscape",
                border: "10mm",
                header: {
                    height: "8mm",
                    contents: {
                        first: ' ',
                        default: `
                        <table cellspacing=0 cellpadding=0 width="700px" style="margin: 0 auto;"
                        class="table-border">
                        <tr>
                            <th style="font-size: 10px; text-align: left; width: 12% ;padding-left: 3px">Subcategory Code</th>
                            <th style="font-size: 10px; text-align: left; width: 30%">Subcategory Name</th>
                            <th style="font-size: 10px; text-align: right;">Quantity</th>
                            <th style="font-size: 10px; text-align: right;">Inventory Qty</th>
                            <th style="font-size: 10px; text-align: right;">Cost Price</th>
                            <th style="font-size: 10px; text-align: right;">Sales Price</th>
                            <th style="font-size: 10px; text-align: right;">Diff Unit</th>
                            <th style="font-size: 10px; text-align: right;">Diff Unit CP</th>
                            <th style="font-size: 10px; text-align: right;">Diff Unit SP</th>
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
                path: "./public/reports/warehouse_subcategory_inventory_report_summary.pdf"
            };

            pdf.create(document, options)
                .then(data => {
                    const file = data.filename;
                    return res.status(200).json({
                        auth: true,
                        fileLink: '/reports/warehouse_subcategory_inventory_report_summary.pdf'
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

module.exports = router


// @route GET api/report/subcategory/inventory/summary/report/:adminID/:subcategory
// @description Get subcategory inventory report summary excel
// @access Private
router.get('/subcategory/inventory/summary/report/:adminID/:subcategory', [
    [
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

        let subcategory = req.params.subcategory

        let condition = {}

        if (subcategory != "all") {
            condition._id = subcategory
        }
        const child = fork(path.join(__dirname, "subprocess", "subcategory_inventory_summary.js"));

        const msg = {
            condition,
            type: 'excel'
        }

        child.send(msg)

        child.on('message', async (response) => {
            const {
                mainData,
                totalCostAmount,
                totalSellAmount,
                totalQuantity,
                totalInventoryQuantity,
                totalDiffUnit,
                totalDiffUnitCostAmount,
                totalDiffUnitSellAmount
            } = response

            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
            var today = new Date()

            let reportFullDataset = {
                currentDate: ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
                shopName: config.get('warehouse').name,
                shopAddress: config.get('warehouse').address,
                shopCode: config.get('warehouse').serialNo,
                data: mainData,
                totalQuantity: totalQuantity.toFixed(2),
                totalInventoryQuantity: totalInventoryQuantity.toFixed(2),
                totalCostAmount: totalCostAmount.toFixed(2),
                totalSellAmount: totalSellAmount.toFixed(2),
                totalDiffUnit: totalDiffUnit.toFixed(2),
                totalDiffUnitCostAmount: totalDiffUnitCostAmount.toFixed(2),
                totalDiffUnitSellAmount: totalDiffUnitSellAmount.toFixed(2),
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
                },
                redColor: {
                    font: {
                        color: {
                            rgb: 'ff0000'
                        }
                    }
                }
            };

            //Here you specify the export structure
            const specification = {
                supplierCode: { // <- the key should match the actual data key
                    displayName: 'SubCategory Code', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200, // <- width in pixels
                    cellStyle: styles.text_left
                },
                supplier: { // <- the key should match the actual data key
                    displayName: 'SubCategory Name', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                subTotalQty: { // <- the key should match the actual data key
                    displayName: 'Qunatity', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                subtotalInventoryStock: { // <- the key should match the actual data key
                    displayName: 'Inventory Stock', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                subtotalcost: { // <- the key should match the actual data key
                    displayName: 'Cost Amount', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                subtotalsell: { // <- the key should match the actual data key
                    displayName: 'Sell Amount', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                subtotalDiffUnit: { // <- the key should match the actual data key
                    displayName: 'Diff Unit', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100, // <- width in pixels
                    cellStyle: function (value, row) {
                        return (value < 0) ? styles.redColor : ' '
                    }
                },
                subtotalDiffUnitCostAmt: { // <- the key should match the actual data key
                    displayName: 'Diff Unit Cost Amt', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100, // <- width in pixels
                    cellStyle: function (value, row) {
                        return (value < 0) ? styles.redColor : ' '
                    }
                },
                subtotalDiffUnitSellAmt: { // <- the key should match the actual data key
                    displayName: 'Diff Unit Sell Amt', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100, // <- width in pixels
                    cellStyle: function (value, row) {
                        return (value < 0) ? styles.redColor : ' '
                    }
                }

            }

            const heading = [
                [{ value: 'SubCategory wise warehouse Inventory Stock Summary On Date : ' + reportFullDataset.currentDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Code: ' + reportFullDataset.shopCode, style: styles.shop_info }],
                [{ value: 'Shop Name: ' + reportFullDataset.shopName, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.shopAddress, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                ['Grand Total:', ' ',
                    reportFullDataset.totalQuantity,
                    reportFullDataset.totalInventoryQuantity,
                    reportFullDataset.totalCostAmount,
                    reportFullDataset.totalSellAmount,
                    reportFullDataset.totalDiffUnit,
                    reportFullDataset.totalDiffUnitCostAmount,
                    reportFullDataset.totalDiffUnitSellAmount
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
                        name: 'SubCategory wise warehouse Inventory Stock Summary On Date: ' + reportFullDataset.currentDate, // <- Specify sheet name (optional)
                        heading: heading,
                        merges: merges,
                        specification: specification, // <- Report specification
                        data: reportFullDataset.data // <-- Report data
                    }
                ]
            );

            // You can then return this straight
            res.attachment('subcategory_wise_warehouse_inventory_stock_summary.xlsx'); // This is sails.js specific (in general you need to set headers)
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