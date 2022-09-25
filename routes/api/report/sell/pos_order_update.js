const express = require('express');
const router = express.Router();
const { fork } = require('child_process');
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


const Branch = require('../../../../models/Branch');
const adminAuth = require('../../../../middleware/admin/auth');

const {
    getAdminRoleChecking
} = require('../../../../lib/helpers');

// @route GET api/report/order-wise/product/check?branch=..........
// @description Get exchang/refund report pdf 
// @access Private
router.post('/order-wise/product/check', [
    adminAuth,
    [
        check('from', 'From date is required').not().isEmpty(),
        check('to', 'To date is required').not().isEmpty(),
        check('type', 'Type is required').not().isEmpty(),
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
            type
        } = req.body

        from = new Date(from)
        from.setHours(0)
        from.setMinutes (0);
        from.setSeconds (0);
        
        to = new Date(to)
        to.setHours(23)
        to.setMinutes (59);
        to.setSeconds (59);
        const child = fork(path.join(__dirname, "subprocess", "pos_order_update.js"));

        const msg = {
            from,
            to,
            branch: req.query.branch,
            type,
            reportType: 'pdf'
        }

        child.send(msg)

        child.on('message', async (response) => {
            const {
                reportData,
                grandTotalQuantity,
                grandTotalAmount,
                exchangedByGrandTotalQuantity,
                exchangedByGrandTotalAmount
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
                type: type,
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
                data: reportData,
                grandTotalQuantity: grandTotalQuantity.toFixed(2),
                grandTotalAmount: grandTotalAmount.toFixed(2),
                exchangedByGrandTotalQuantity: exchangedByGrandTotalQuantity.toFixed(2),
                exchangedByGrandTotalAmount: exchangedByGrandTotalAmount.toFixed(2)
            }

            //return res.json(reportFullDataset)
            var html;

            if (type == 'exchange') {
                html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'reports', 'sell', 'pos_order_update_report.html'), 'utf8');
            } else {
                html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'reports', 'sell', 'sales_refund_report.html'), 'utf8');
            }

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
                path: "./public/reports/product_" + type + ".pdf"
            };

            pdf.create(document, options)
                .then(data => {
                    const file = data.filename;
                    return res.status(200).json({
                        auth: true,
                        fileLink: '/reports/product_' + type + '.pdf',
                        name: 'product_' + type + '.pdf'
                    })
                    // res.download(file);
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

// @route GET api/report/order-wise/product/check/:adminID/:from/:to/:type?branch=..........
// @description Get exchange/refund report excel
// @access Private
router.get('/order-wise/product/check/:adminID/:from/:to/:type', [
    [
        check('from', 'From date is required').not().isEmpty(),
        check('to', 'To date is required').not().isEmpty(),
        check('type', 'Type is required').not().isEmpty()
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
        let type = req.params.type

        from = new Date(from)
        from.setHours(0)
        from.setMinutes(0);
        from.setSeconds(0);

        to = new Date(to)
        to.setHours(23)
        to.setMinutes(59);
        to.setSeconds(59);

        const child = fork(path.join(__dirname, "subprocess", "pos_order_update.js"));

        const msg = {
            from,
            to,
            branch: req.query.branch,
            type,
            reportType: 'excel'
        }

        child.send(msg)

        child.on('message', async (response) => {
            const {
                mainData,
                grandTotalQuantity,
                grandTotalAmount,
                exchangedByGrandTotalQuantity,
                exchangedByGrandTotalAmount
            } = response

            let branchInfo = await Branch.findById(req.query.branch).select('_id serialNo name address');
            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

            let reportFullDataset = {
                fromDate: ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
                toDate: ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
                shopName: branchInfo.name.trim(),
                shopAddress: branchInfo.address,
                shopCode: branchInfo.serialNo,
                data: mainData,
                grandTotalQuantity: grandTotalQuantity,
                grandTotalAmount: grandTotalAmount,
                exchangedByGrandTotalQuantity: exchangedByGrandTotalQuantity,
                exchangedByGrandTotalAmount: exchangedByGrandTotalAmount
            }

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

            let specification;
            if (type == 'exchange') {
                specification = {
                    barcode: { // <- the key should match the actual data key
                        displayName: 'Barcode', // <- Here you specify the column header
                        headerStyle: styles.headerDark, // <- Header style
                        width: 200, // <- width in pixels
                        cellStyle: styles.text_left
                    },
                    name: { // <- the key should match the actual data key
                        displayName: 'Product', // <- Here you specify the column header
                        headerStyle: styles.headerDark, // <- Header style
                        width: 250 // <- width in pixels
                    },
                    costPrice: { // <- the key should match the actual data key
                        displayName: 'Cost Price', // <- Here you specify the column header
                        headerStyle: styles.headerDark, // <- Header style
                        width: 200 // <- width in pixels
                    },
                    quantity: { // <- the key should match the actual data key
                        displayName: 'Quantity', // <- Here you specify the column header
                        headerStyle: styles.headerDark, // <- Header style
                        width: 200 // <- width in pixels
                    },
                    amount: { // <- the key should match the actual data key
                        displayName: 'Amount', // <- Here you specify the column header
                        headerStyle: styles.headerDark, // <- Header style
                        width: 200 // <- width in pixels
                    }

                }

            } else {
                specification = {
                    barcode: { // <- the key should match the actual data key
                        displayName: 'Barcode', // <- Here you specify the column header
                        headerStyle: styles.headerDark, // <- Header style
                        width: 200, // <- width in pixels
                        cellStyle: styles.text_left
                    },
                    name: { // <- the key should match the actual data key
                        displayName: 'Product', // <- Here you specify the column header
                        headerStyle: styles.headerDark, // <- Header style
                        width: 250 // <- width in pixels
                    },
                    costPrice: { // <- the key should match the actual data key
                        displayName: 'Cost Price', // <- Here you specify the column header
                        headerStyle: styles.headerDark, // <- Header style
                        width: 200 // <- width in pixels
                    },
                    quantity: { // <- the key should match the actual data key
                        displayName: 'Quantity', // <- Here you specify the column header
                        headerStyle: styles.headerDark, // <- Header style
                        width: 200 // <- width in pixels
                    },
                    amount: { // <- the key should match the actual data key
                        displayName: 'Amount', // <- Here you specify the column header
                        headerStyle: styles.headerDark, // <- Header style
                        width: 200 // <- width in pixels
                    }
                }
            }

            let heading;
            if (type == 'exchange') {
                heading = [
                    [{ value: `${type} Report From : ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                    [''], // <-- It can be only values
                    [{ value: 'Shop Code: ' + reportFullDataset.shopCode, style: styles.shop_info }],
                    [{ value: 'Shop Name: ' + reportFullDataset.shopName, style: styles.shop_info }],
                    [{ value: 'Shop Address: ' + reportFullDataset.shopAddress, style: styles.shop_info }],
                    [{ value: '', style: styles.cell_border }],
                    [''],
                    [{ value: 'Grand Total Quantity: ' + reportFullDataset.grandTotalQuantity, style: styles.shop_info }],
                    [{ value: 'Grand Total Payment: ' + reportFullDataset.grandTotalAmount, style: styles.shop_info }],
                    [{ value: 'ExchangedBy Grand Total Quantity: ' + reportFullDataset.exchangedByGrandTotalQuantity, style: styles.shop_info }],
                    [{ value: 'ExchangedBy Grand Total Payment: ' + reportFullDataset.exchangedByGrandTotalAmount, style: styles.shop_info }]
                ];
            } else {
                heading = [
                    [{ value: `${type} Report From : ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                    [''], // <-- It can be only values
                    [{ value: 'Shop Code: ' + reportFullDataset.shopCode, style: styles.shop_info }],
                    [{ value: 'Shop Name: ' + reportFullDataset.shopName, style: styles.shop_info }],
                    [{ value: 'Shop Address: ' + reportFullDataset.shopAddress, style: styles.shop_info }],
                    [{ value: '', style: styles.cell_border }],
                    [''],
                    [{ value: 'Grand Total Quantity: ' + reportFullDataset.grandTotalQuantity, style: styles.shop_info }],
                    [{ value: 'Grand Total Payment: ' + reportFullDataset.grandTotalAmount, style: styles.shop_info }]
                ];
            }


            const merges = [
                { start: { row: 1, column: 1 }, end: { row: 1, column: 7 } }
            ]

            // Create the excel report.
            // This function will return Buffer
            const report = excel.buildExport(
                [ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
                    {
                        name: `${type} Report from: ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                        heading: heading,
                        merges: merges,
                        specification: specification, // <- Report specification
                        data: reportFullDataset.data // <-- Report data
                    }
                ]
            );

            // You can then return this straight
            res.attachment(`${type}_report.xlsx`); // This is sails.js specific (in general you need to set headers)
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