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

const Branch = require('../../../../models/Branch');
const adminAuth = require('../../../../middleware/admin/auth');

const {
    getAdminRoleChecking
} = require('../../../../lib/helpers');


// @route GET /api/report/brand/inventory/details/report?branch=..........
// @description Get brand wise details inventory report pdf
// @access Private
router.post('/brand/inventory/details/report', [
    adminAuth,
    [
        check('brand', 'Brand is required').not().isEmpty(),
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

        let { brand } = req.body

        let condition = {
            branch: {
                $in: req.query.branch
            }
        }

        if(brand!="all"){
            condition._id = brand
        }
        const child = fork(path.join(__dirname, "subprocess", "brand_inventory_details.js"));

        const msg = {
            branch: req.query.branch,
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

            let branch = await Branch.findById(req.query.branch).select('_id serialNo name address phone');
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
                title: "detail inventory report by brand",
                headers: ["Product Barcode", "Product Name"],
                currentDate: ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
                createTime,
                branch_phone : branch.phone,
                company_name : config.get('company').full_name,
                company_logo : config.get('company').company_logo,
                branch_id: branch.serialNo,
                branch_name: branch.name.trim(),
                branch_address: branch.address,
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

            var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'reports', 'inventory', 'inventory_report_details.html'), 'utf8');

            var options = {
                format: "A4",
                orientation: "landscape",
                border: "10mm",
                header: {
                    height: "8mm",
                    contents: {
                        first: ' ',
                        default: `
                        <table cellspacing=0 cellpadding=0 width="780px" style="margin: 0 auto;"
                        class="table-border">
                        <tr>
                            <th style="font-size: 10px; text-align: left; width: 12% ;padding-left: 3px">Barcode</th>
                            <th style="font-size: 10px; text-align: left; width: 25%">Product Name</th>
                            <th style="font-size: 10px; text-align: right;">Quantity</th>
                            <th style="font-size: 10px; text-align: center;">Inv.Qty</th>
                            <th style="font-size: 10px; text-align: left;">C.Price</th>
                            <th style="font-size: 10px; text-align: left;">S.Price</th>
                            <th style="font-size: 10px; text-align: left;">Total CP</th>
                            <th style="font-size: 10px; text-align: center;">Total SP</th>
                            <th style="font-size: 10px; text-align: right;">D.Unit</th>
                            <th style="font-size: 10px; text-align: right;">D.Unit CP</th>
                            <th style="font-size: 10px; text-align: right;">D.Unit SP</th>
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
                path: "./public/reports/brand_inventory_report_details.pdf"
            };

            pdf.create(document, options)
                .then(data => {
                    const file = data.filename;
                    return res.status(200).json({
                        auth: true,
                        fileLink: '/reports/brand_inventory_report_details.pdf'
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

// @route GET /api/report/brand/inventory/details/report/:adminID/:brand?branch=..........
// @description Get brand wise details inventory report excel
// @access Private
router.get('/brand/inventory/details/report/:adminID/:brand', [
    [
        check('brand', 'Brand id is required').not().isEmpty()
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

        let brand = req.params.brand

        let condition = {
            branch: {
                $in: req.query.branch
            }
        }

        if (brand != "all") {
            condition._id = brand
        }
        const child = fork(path.join(__dirname, "subprocess", "brand_inventory_details.js"));

        const msg = {
            branch: req.query.branch,
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

            let branchInfo = await Branch.findById(req.query.branch).select('_id serialNo name address');
            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
            var today = new Date()

            let reportFullDataset = {
                currentDate: ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
                shopName: branchInfo.name.trim(),
                shopAddress: branchInfo.address,
                shopCode: branchInfo.serialNo,
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
                supplier: { // <- the key should match the actual data key
                    displayName: 'Brand', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                barcode: { // <- the key should match the actual data key
                    displayName: 'BarCode', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                productName: { // <- the key should match the actual data key
                    displayName: 'Product Name', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 300 // <- width in pixels
                },
                quantity: { // <- the key should match the actual data key
                    displayName: 'Quantity', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                inventoryStock: { // <- the key should match the actual data key
                    displayName: 'Inventory Stock', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                costPrice: { // <- the key should match the actual data key
                    displayName: 'Cost Price', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                sellPrice: { // <- the key should match the actual data key
                    displayName: 'Sell Price', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
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
                },
                difference: { // <- the key should match the actual data key
                    displayName: 'Difference', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200, // <- width in pixels
                    cellStyle: function (value, row) {
                        return (value < 0) ? styles.redColor : ' '
                    }
                },
                diffUnitCostAmt: { // <- the key should match the actual data key
                    displayName: 'Diff Unit Cost Amount', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200, // <- width in pixels
                    cellStyle: function (value, row) {
                        return (value < 0) ? styles.redColor : ' '
                    }
                },
                diffUnitSellAmt: { // <- the key should match the actual data key
                    displayName: 'Diff Unit Sell Amount', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200, // <- width in pixels
                    cellStyle: function (value, row) {
                        return (value < 0) ? styles.redColor : ' '
                    }
                }

            }

            const heading = [
                [{ value: 'Brand wise Inventory Stock Details On Date : ' + reportFullDataset.currentDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Code: ' + reportFullDataset.shopCode, style: styles.shop_info }],
                [{ value: 'Shop Name: ' + reportFullDataset.shopName, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.shopAddress, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                ['Grand Total:', ' ', ' ',
                    reportFullDataset.totalQuantity,
                    reportFullDataset.totalInventoryQuantity,
                    ' ', ' ',
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
                        name: 'Brand wise Inventory Stock Details On Date: ' + reportFullDataset.currentDate, // <- Specify sheet name (optional)
                        heading: heading,
                        merges: merges,
                        specification: specification, // <- Report specification
                        data: reportFullDataset.data // <-- Report data
                    }
                ]
            );

            // You can then return this straight
            res.attachment('brand_wise_inventory_stock_details.xlsx'); // This is sails.js specific (in general you need to set headers)
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