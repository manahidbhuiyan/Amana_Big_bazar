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

// @route GET /api/report/fractional/discount/report?branch=..........
// @description Get fractional discount report pdf
// @access Private
router.post('/fractional/discount/report', [
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

        let { to, from } = req.body

        from = new Date(from)
        from.setHours(0)
        from.setMinutes(0);
        from.setSeconds(0);

        to = new Date(to)
        to.setHours(23)
        to.setMinutes(59);
        to.setSeconds(59);

        const child = fork(path.join(__dirname, "subprocess", "fractional_discount.js"));

        const msg = {
            from,
            to,
            branch: req.query.branch,
            type: 'pdf'
        }

        child.send(msg)

        child.on('message', async (response) => {
            const {
                reportInfo,
                totalDiscountAmount
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
                title: "Fractional discount report",
                fromDate: from.getDate() + '-' + (from.getMonth() + 1) + '-' + from.getFullYear(),
                toDate: to.getDate() + '-' + (to.getMonth() + 1) + '-' + to.getFullYear(),
                today: ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
                createTime,
                branch_phone : branch.phone,
                company_name : config.get('company').full_name,
                company_logo : config.get('company').company_logo,
                branch_id: branch.serialNo,
                branch_name: branch.name.trim(),
                branch_address: branch.address,
                data: reportInfo.sort(function (a, b) {
                    return a.serial - b.serial;
                }),
                totalDiscountAmount: totalDiscountAmount.toFixed(2),
            }

            var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'reports', 'discount', 'fractional_discount.html'), 'utf8');

            var options = {
                format: "A4",
                orientation: "portrait",
                border: "10mm",
                header: {
                    height: "8mm",
                    contents: {
                        first: ' ',
                        default: `
                        <table cellspacing=0 cellpadding=0 width="510px" style="margin: 0 auto;"
                        class="table-border">
                        <tr>
                            <th style="font-size: 7px; text-align: left; width: 16%; padding-left: 3px">Order ID</th>
                            <th style="font-size: 7px; text-align: left; width: 40%;">User Name</th>
                            <th style="font-size: 7px; text-align: right;">Order Date</th>
                            <th style="font-size: 7px; text-align: right;">Fractional Discount</th>
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
                path: "./public/reports/point_discount_report.pdf"
            };

            pdf.create(document, options)
                .then(data => {
                    const file = data.filename;
                    return res.status(200).json({
                        auth: true,
                        fileLink: '/reports/point_discount_report.pdf'
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


// @route GET /api/report/fractional/discount/report/:adminID/:from/:to?branch=..........
// @description Get fractional discount report excel
// @access Private
router.get('/fractional/discount/report/:adminID/:from/:to', [
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

        from = new Date(from)
        to = new Date(to)
        to.setHours(to.getHours() + 23)
        to.setMinutes(to.getMinutes() + 59);
        to.setSeconds(to.getSeconds() + 59);

        let branchInfo = await Branch.findById(req.query.branch).select('_id name address')

        const child = fork(path.join(__dirname, "subprocess", "fractional_discount.js"));

        const msg = {
            from,
            to,
            branch: req.query.branch,
            type: 'excel'
        }

        child.send(msg)

        child.on('message', async (response) => {
            const {
                reportInfo,
                totalDiscountAmount
            } = response

            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            let reportFullDataset = {
                fromDate: ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
                toDate: ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
                shopName: branchInfo.name.trim(),
                shopAddress: branchInfo.address,
                data: reportInfo,
                totalDiscountAmount: totalDiscountAmount
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
                orderNo: { // <- the key should match the actual data key
                    displayName: 'Order ID', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200, // <- width in pixels
                    cellStyle: styles.text_left
                },
                customerName: { // <- the key should match the actual data key
                    displayName: 'User Name', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 300 // <- width in pixels
                },
                date: { // <- the key should match the actual data key
                    displayName: 'Order Date', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 400, // <- width in pixels
                },
                fractionalDiscount: { // <- the key should match the actual data key
                    displayName: 'Fractional Discount', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                }
            }


            const heading = [
                [{ value: 'Fractional Discount Report From : ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Name: ' + reportFullDataset.shopName, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.shopAddress, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                [''],
                ['Grand Total:', ' ', ' ',
                    reportFullDataset.totalDiscountAmount
                ],

            ];

            const merges = [
                { start: { row: 1, column: 1 }, end: { row: 1, column: 10 } }
            ]

            // Create the excel report.
            // This function will return Buffer
            const report = excel.buildExport(
                [ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
                    {
                        name: 'Fractional Discount Report From: ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                        heading: heading,
                        merges: merges,
                        specification: specification, // <- Report specification
                        data: reportFullDataset.data // <-- Report data
                    }
                ]
            );

            // You can then return this straight
            res.attachment('fractional_discount_report.xlsx'); // This is sails.js specific (in general you need to set headers)
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