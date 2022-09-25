const express = require('express');
const router = express.Router();
const { fork } = require('child_process')
const {
    check,
    validationResult
} = require('express-validator');

const config = require('config')
const excel = require('node-excel-export');
const jwt = require('jsonwebtoken');


var pdf = require("pdf-creator-node");
var fs = require('fs');
var path = require('path');


const Branch = require('../../../../models/Branch');
const adminAuth = require('../../../../middleware/admin/auth');

const {
    getAdminRoleChecking
} = require('../../../../lib/helpers');


// @route GET api/report/category/over_stock/report?branch=..........
// @description Get category wise over stock report pdf
// @access Private
router.post('/category/over_stock/report', [
    adminAuth,
    [
        check('from', 'From date is required').not().isEmpty(),
        check('to', 'To date is required').not().isEmpty(),
        check('category', 'Category is required').not().isEmpty()
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
            category
        } = req.body

        from = new Date(from)
        from.setHours(0)
        from.setMinutes (0);
        from.setSeconds (0);
        
        to = new Date(to)
        to.setHours(23)
        to.setMinutes (59);
        to.setSeconds(59);

        let currentDate = new Date()
        currentDate.setHours(23)
        currentDate.setMinutes(59);
        currentDate.setSeconds(59);

        let condition = {
            branch: {
                $in: req.query.branch
            }
        }

        if(category!="all"){
            condition._id = category
        }

        const child = fork(path.join(__dirname, "subprocess", "category_over_stock.js"));

        const msg = {
            from,
            to,
            currentDate,
            branch: req.query.branch,
            condition,
            type: 'pdf'
        }
        child.send(msg)

        child.on('message', async (response) => {
            const {
                allCategoryData,
                totalOverStock,
                totalStock,
                totalSoldQuantity,
                totalStock_prev
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
                title: "Over stock report by category",
                headers: ["BarCode", "Product Name"],
                currentDate: ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
                fromDate: ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
                toDate: ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
                createTime,
                branch_phone : branch.phone,
                company_name : config.get('company').full_name,
                company_logo : config.get('company').company_logo,
                branch_id: branch.serialNo,
                branch_name: branch.name.trim(),
                branch_address: branch.address,
                data: allCategoryData.sort(function (a, b) {
                    return a.serial - b.serial;
                }),
                totalOverStock: totalOverStock.toFixed(2),
                totalStock: totalStock.toFixed(2),
                totalSoldQuantity: totalSoldQuantity.toFixed(2),
                totalStock_prev: totalStock_prev.toFixed(2)

            }

            var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'reports', 'stock_status', 'over_stock_report.html'), 'utf8');

            var options = {
                format: "A4",
                orientation: "landscape",
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
                path: "./public/reports/category_over_stock_report.pdf"
            };

            pdf.create(document, options)
                .then(data => {
                    const file = data.filename;
                    return res.status(200).json({
                        auth: true,
                        fileLink: '/reports/category_over_stock_report.pdf'
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


// @route GET api/report/category/over_stock/report/:adminID/:from/:to/:category?branch=..........
// @description Get category wise over stock report excel
// @access Private
router.get('/category/over_stock/report/:adminID/:from/:to/:category', [
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

        from = new Date(from)
        from.setHours(0)
        from.setMinutes(0);
        from.setSeconds(0);

        to = new Date(to)
        to.setHours(23)
        to.setMinutes(59);
        to.setSeconds(59);

        let currentDate = new Date()
        currentDate.setHours(23)
        currentDate.setMinutes(59);
        currentDate.setSeconds(59);

        let condition = {
            branch: {
                $in: req.query.branch
            }
        }

        if (category != "all") {
            condition._id = category
        }

        const child = fork(path.join(__dirname, "subprocess", "category_over_stock.js"));

        const msg = {
            from,
            to,
            currentDate,
            branch: req.query.branch,
            condition,
            type: 'excel'
        }
        child.send(msg)

        child.on('message', async (response) => {
            const {
                mainData,
                totalOverStock,
                totalStock,
                totalSoldQuantity,
                totalStock_prev
            } = response

            let branchInfo = await Branch.findById(req.query.branch).select('_id serialNo name address');
            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
            var today = new Date()

            let reportFullDataset = {
                currentDate: ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
                fromDate: ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
                toDate: ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
                shopName: branchInfo.name.trim(),
                shopAddress: branchInfo.address,
                data: mainData,
                totalSoldQuantity: totalSoldQuantity.toFixed(2),
                totalStock_prev: totalStock_prev.toFixed(2),
                totalStock: totalStock.toFixed(2),
                totalOverStock: totalOverStock.toFixed(2),
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
                supplier: { // <- the key should match the actual data key
                    displayName: 'Category', // <- Here you specify the column header
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
                unitCost: { // <- the key should match the actual data key
                    displayName: 'Cost Price', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                unitSell: { // <- the key should match the actual data key
                    displayName: 'Sell Price', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                soldQuantity: { // <- the key should match the actual data key
                    displayName: 'Quantity', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                fromDateStock: { // <- the key should match the actual data key
                    displayName: 'From Date Stock', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                toDateStock: { // <- the key should match the actual data key
                    displayName: 'To Date Stock', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                overStock: { // <- the key should match the actual data key
                    displayName: 'Over Stock', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                }
            }

            const heading = [
                [{ value: 'Category wise over stock from : ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Code: ' + reportFullDataset.shopCode, style: styles.shop_info }],
                [{ value: 'Shop Name: ' + reportFullDataset.shopName, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.shopAddress, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                ['Grand Total:', ' ', ' ', ' ', ' ',
                    reportFullDataset.totalSoldQuantity,
                    reportFullDataset.totalStock_prev,
                    reportFullDataset.totalStock,
                    reportFullDataset.totalOverStock
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
                        name: 'Category wise Over Stock From: ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                        heading: heading,
                        merges: merges,
                        specification: specification, // <- Report specification
                        data: reportFullDataset.data // <-- Report data
                    }
                ]
            );

            // You can then return this straight
            res.attachment('category_wise_over_stock.xlsx'); // This is sails.js specific (in general you need to set headers)
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