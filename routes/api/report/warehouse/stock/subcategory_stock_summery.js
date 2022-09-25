const express = require('express');
const router = express.Router();
const { fork } = require('child_process')
const {
    check,
    validationResult
} = require('express-validator');

const config = require('config');
const jwt = require('jsonwebtoken');
const excel = require('node-excel-export');

var pdf = require("pdf-creator-node");
var fs = require('fs');
var path = require('path');

const adminAuth = require('../../../../../middleware/admin/auth');

const {
    getAdminRoleChecking
} = require('../../../../../lib/helpers');

// @route GET api/report/subcategory/stock/summery/report
// @description Get subategories stock report summery pdf
// @access Private
router.post('/subcategory/stock/summery/report', [
    adminAuth,
    [
        check('subcategory', 'Subcategory is required').not().isEmpty(),
    ]
], async (req, res) => {
    try {
        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'warehouse report')

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

        let condition = {
        }

        if(subcategory!="all"){
            condition._id = subcategory
        }

        const child = fork(path.join(__dirname, "subprocess", "subcategory_stock_summery.js"));

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
                totalGp
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
                title: "summery stock report by subcategory",
                headers: ["Subcategory Code", "Subcategory Name"],
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
                totalGp: totalGp.toFixed(2)
            }

            var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', '..', 'reports', 'stock', 'current_stock_report_summery.html'), 'utf8');

            var options = {
                format: "A4",
                orientation: "portrait",
                border: "10mm",
                header: {
                    height: "8mm",
                    contents: {
                        first: ' ',
                        default: `
                        <table cellspacing=0 cellpadding=0 width="700px" style="margin: 0 auto;"
                        class="table-border">
                        <tr>
                            <th style="font-size: 10px; text-align: left; width: 18% ;padding-left: 3px">Subcategory Code</th>
                            <th style="font-size: 10px; text-align: left; width: 30%">Subcategory Name</th>
                            <th style="font-size: 10px; text-align: right;">Quantity</th>
                            <th style="font-size: 10px; text-align: right;">Cost Amt</th>
                            <th style="font-size: 10px; text-align: right;">Sales Amount</th>
                            <th style="font-size: 10px; text-align: right;">Gp(%)</th>
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
                path: "./public/reports/warehouse_subcategory_stock_report_summery.pdf"
            };

            pdf.create(document, options)
                .then(data => {
                    const file = data.filename;
                    return res.status(200).json({
                        auth: true,
                        fileLink: '/reports/warehouse_subcategory_stock_report_summery.pdf'
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


// @route GET /api/report/subcategory/stock/summary/:adminID/:subcategory?branch=..........
// @description Get subcategory wise summary stock report excel
// @access Private
router.get('/subcategory/stock/summary/:adminID/:subcategory', async (req, res) => {
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

        let condition = {

        }

        if (subcategory != "all") {
            condition._id = subcategory
        }
        const child = fork(path.join(__dirname, "subprocess", "subcategory_stock_summery.js"));

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
                totalGp
            } = response

            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            var today = new Date()

            let reportFullDataset = {
                currentDate: ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
                branch_id: config.get('warehouse').serialNo,
                branch_name: config.get('warehouse').name,
                branch_address: config.get('warehouse').address,
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
                serial: { // <- the key should match the actual data key
                    displayName: 'Serial', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200, // <- width in pixels
                    cellStyle: styles.text_left
                },
                name: { // <- the key should match the actual data key
                    displayName: 'SubCategory Name', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 300 // <- width in pixels
                },
                quantity: { // <- the key should match the actual data key
                    displayName: 'Quantity', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
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
                gpValue: { // <- the key should match the actual data key
                    displayName: 'GP(%)', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                }
            }


            const heading = [
                [{ value: 'Warehouse Stock Summary Report By SubCategory At Date: ' + reportFullDataset.currentDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Code: ' + reportFullDataset.branch_id, style: styles.shop_info }],
                [{ value: 'Shop Name: ' + reportFullDataset.branch_name, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.branch_address, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                [''],
                ['Grand Total:', ' ',
                    reportFullDataset.totalQuantity,
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
                        name: 'Warehouse Stock Summary Report By SubCategory At Date: ' + reportFullDataset.currentDate, // <- Specify sheet name (optional)
                        heading: heading,
                        merges: merges,
                        specification: specification, // <- Report specification
                        data: reportFullDataset.data // <-- Report data
                    }
                ]
            );

            // You can then return this straight
            res.attachment('warehouse_subcategory_wise_stock_summary.xlsx'); // This is sails.js specific (in general you need to set headers)
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