const express = require('express');
const router = express.Router();
const { fork } = require('child_process');
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

const Branch = require('../../../../models/Branch');
const adminAuth = require('../../../../middleware/admin/auth');

const {
    getAdminRoleChecking
} = require('../../../../lib/helpers');

const Admin = require('../../../../models/admin/Admin');


// @route GET api/report/category/performance?branch=..........
// @description Get category wise performance report pdf
// @access Private
router.post('/category/performance', [
    adminAuth,
    [
        check('from', 'From date is required').not().isEmpty(),
        check('to', 'To date is required').not().isEmpty(),
        check('category', 'Category id is required').not().isEmpty()
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
            category,
            reqire_quantity,
            type
        } = req.body

        from = new Date(from)
        from.setHours(0)
        from.setMinutes (0);
        from.setSeconds (0);
        
        to = new Date(to)
        to.setHours(23)
        to.setMinutes (59);
        to.setSeconds(59);

        const child = fork(path.join(__dirname, "subprocess", "category_wise_performance.js"));

        const msg = {
            from,
            to,
            category,
            reqire_quantity,
            type,
            branch: req.query.branch,
            reportType: 'pdf'
        }

        child.send(msg)

        child.on('message', async (response) => {
            const {
                reportData,
                totalReqProductQuantity,
                totalReqProductCostAmount,
                totalReqProductSellAmount,
                totalSupplierEarnAmount,
                totalSupplierQuantity,
                totalSupplierCostAmount,
                categories
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
                title: "Category wise " + type + " Performance",
                subtitle: type + " " + reqire_quantity + " Items By Category",
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
                supplier_name: categories[0].name,
                supplier_serialNo: categories[0].serialNo,
                data: reportData,
                totalReqProductQuantity: totalReqProductQuantity.toFixed(2),
                totalReqProductCostAmount: totalReqProductCostAmount.toFixed(2),
                totalReqProductSellAmount: totalReqProductSellAmount.toFixed(2),
                totalSupplierEarnAmount: totalSupplierEarnAmount.toFixed(2),
                totalSupplierQuantity: totalSupplierQuantity.toFixed(2),
                totalSupplierCostAmount: totalSupplierCostAmount.toFixed(2),
                totalReqProductGp: (((totalReqProductSellAmount - totalReqProductCostAmount) / totalReqProductSellAmount) * 100).toFixed(2),
                totalSupplierGp: (((totalSupplierEarnAmount - totalSupplierCostAmount) / totalSupplierEarnAmount) * 100).toFixed(2),
            }

            var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'reports', 'performance', 'category_wise_performance.html'), 'utf8');

            var options = {
                format: "A4",
                orientation: "landscape",
                border: "5mm",
                header: {
                    height: "8mm",
                    contents: {
                        first: ' ',
                        default: `
                        <table cellspacing=0 cellpadding=0 width="690px" style="margin: 0 auto;"
                        class="table-border">
                        <tr>
                            <th style="font-size: 7px; text-align: left; width: 10%; padding-left: 3px">Bar Code</th>
                            <th style="font-size: 7px; text-align: left; width: 20%;">Product</th>
                            <th style="font-size: 7px; text-align: right;">Cost Price</th>
                            <th style="font-size: 7px; text-align: right;">Sales Price</th>
                            <th style="font-size: 7px; text-align: right;">Sold Qty</th>
                            <th style="font-size: 7px; text-align: right;">Qty(%) in Req Qty</th>
                            <th style="font-size: 7px; text-align: right;">Qty(%) in Total</th>
                            <th style="font-size: 7px; text-align: right;">Cost Amt</th>
                            <th style="font-size: 7px; text-align: right;">Sales Amt</th>
                            <th style="font-size: 7px; text-align: right;">Amt(%) in Req Qty</th>
                            <th style="font-size: 7px; text-align: right;">Amt(%) in Total</th>
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
                path: "./public/reports/category_wise_performance.pdf"
            };

            pdf.create(document, options)
                .then(data => {
                    const file = data.filename;
                    return res.status(200).json({
                        auth: true,
                        fileLink: '/reports/category_wise_performance.pdf',
                        filename: 'category_wise_performance'
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


// @route GET api/report/category/performance/:adminID/:from/:to/:category/:reqire_quantity/:type?branch=..........
// @description Get category wise performance report excel
// @access Private
router.get('/category/performance/:adminID/:from/:to/:category/:reqire_quantity/:type', [
    [
        check('from', 'From date is required').not().isEmpty(),
        check('to', 'To date is required').not().isEmpty(),
        check('category', 'Category id is required').not().isEmpty()
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
        let category = req.params.category
        let reqire_quantity = req.params.reqire_quantity
        let type = req.params.type

        from = new Date(from)
        to = new Date(to)
        to.setHours(to.getHours() + 23)
        to.setMinutes(to.getMinutes() + 59);
        to.setSeconds(to.getSeconds() + 59);

        const child = fork(path.join(__dirname, "subprocess", "category_wise_performance.js"));

        const msg = {
            from,
            to,
            category,
            reqire_quantity,
            type,
            branch: req.query.branch,
            reportType: 'excel'
        }
        child.send(msg)

        child.on('message', async (response) => {
            const {
                reportData,
                totalReqProductQuantity,
                totalReqProductCostAmount,
                totalReqProductSellAmount,
                totalSupplierEarnAmount,
                totalSupplierQuantity,
                totalSupplierCostAmount,
                categories
            } = response

            let branch = await Branch.findById(req.query.branch).select('_id serialNo name address');
            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

            let reportFullDataset = {
                fromDate: ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
                toDate: ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
                shopCode: branch.serialNo,
                supplierCode: categories[0].serialNo,
                shopName: branch.name,
                shopAddress: branch.address,
                supplierName: categories[0].name,
                data: reportData,
                totalReqProductQuantity: totalReqProductQuantity.toFixed(2),
                totalReqProductCostAmount: totalReqProductCostAmount.toFixed(2),
                totalReqProductSellAmount: totalReqProductSellAmount.toFixed(2),
                totalReqProductGp: (((totalReqProductSellAmount - totalReqProductCostAmount) / totalReqProductSellAmount) * 100).toFixed(2),
                totalSupplierEarnAmount: totalSupplierEarnAmount.toFixed(2),
                totalSupplierQuantity: totalSupplierQuantity.toFixed(2),
                totalSupplierCostAmount: totalSupplierCostAmount.toFixed(2),
                totalSupplierGp: (((totalSupplierEarnAmount - totalSupplierCostAmount) / totalSupplierEarnAmount) * 100).toFixed(2),
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
                    displayName: 'Product Name', // <- Here you specify the column header
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
                percentage_in_reqQuantinty: { // <- the key should match the actual data key
                    displayName: 'Qty(%) in Req Qty', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 300 // <- width in pixels
                },
                percentage_in_supplier_quantinty: { // <- the key should match the actual data key
                    displayName: 'Qty(%) in Supplier Qty', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 300 // <- width in pixels
                },
                purchaseCost: { // <- the key should match the actual data key
                    displayName: 'Cost Amount', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                sellCost: { // <- the key should match the actual data key
                    displayName: 'Sell Amount', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                percentage_in_req_cost_amt: { // <- the key should match the actual data key
                    displayName: 'Amt(%) in Req Qty', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 300 // <- width in pixels
                },
                percentage_in_supplier_cost_amt: { // <- the key should match the actual data key
                    displayName: 'Amt(%) in Supplier Qty', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 300 // <- width in pixels
                },
                gp: { // <- the key should match the actual data key
                    displayName: 'Gp(%)', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                }
            }


            const heading = [
                [{ value: 'Category wise performance from : ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Code: ' + reportFullDataset.shopCode, style: styles.shop_info }],
                [{ value: 'Shop Name: ' + reportFullDataset.shopName, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.shopAddress, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [{ value: 'Category Code: ' + reportFullDataset.supplierCode, style: styles.shop_info }],
                [{ value: 'Category Name: ' + reportFullDataset.supplierName, style: styles.shop_info }],
                [''],
                ['Total of Category:', ' ', ' ', ' ',
                    reportFullDataset.totalSupplierQuantity,
                    ' ', ' ',
                    reportFullDataset.totalSupplierCostAmount,
                    reportFullDataset.totalSupplierEarnAmount,
                    ' ', ' ',
                    reportFullDataset.totalSupplierGp
                ],
                [''],
                ['Total of Request Qty:', ' ', ' ', ' ',
                    reportFullDataset.totalReqProductQuantity,
                    ' ', ' ',
                    reportFullDataset.totalReqProductCostAmount,
                    reportFullDataset.totalReqProductSellAmount,
                    ' ', ' ',
                    reportFullDataset.totalReqProductGp
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
                        name: 'Category wise Performance From: ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                        heading: heading,
                        merges: merges,
                        specification: specification, // <- Report specification
                        data: reportFullDataset.data // <-- Report data
                    }
                ]
            );

            // You can then return this straight
            res.attachment('category_wise_performance.xlsx'); // This is sails.js specific (in general you need to set headers)
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