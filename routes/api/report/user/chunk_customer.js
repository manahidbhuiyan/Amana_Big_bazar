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

const Branch = require('../../../../models/Branch');
const adminAuth = require('../../../../middleware/admin/auth');

const {
    getAdminRoleChecking
} = require('../../../../lib/helpers');


// @route GET api/report/churn/customer?branch=..........
// @description Get all churn customer report pdf
// @access Private
router.post('/churn/customer', [
    adminAuth,
    [
        check('prevMonthFrom', 'Previous Month From date is required').not().isEmpty(),
        check('prevMonthTo', 'Previous Month To date is required').not().isEmpty(),
        check('currentMonthFrom', 'Current Month From date is required').not().isEmpty(),
        check('currentMonthTo', 'Current Month To date is required').not().isEmpty()
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
            prevMonthFrom,
            prevMonthTo,
            currentMonthFrom,
            currentMonthTo
        } = req.body

        prevMonthFrom = new Date(prevMonthFrom)
        prevMonthFrom.setHours(0)
        prevMonthFrom.setMinutes(0);
        prevMonthFrom.setSeconds(0);

        prevMonthTo = new Date(prevMonthTo)
        prevMonthTo.setHours(23)
        prevMonthTo.setMinutes(59);
        prevMonthTo.setSeconds(59);

        currentMonthFrom = new Date(currentMonthFrom)
        currentMonthFrom.setHours(0)
        currentMonthFrom.setMinutes(0);
        currentMonthFrom.setSeconds(0);

        currentMonthTo = new Date(currentMonthTo)
        currentMonthTo.setHours(23)
        currentMonthTo.setMinutes(59);
        currentMonthTo.setSeconds(59);

        const child = fork(path.join(__dirname, "subprocess", "chunk_customer.js"));

        const msg = {
            prevMonthFrom,
            prevMonthTo,
            currentMonthFrom,
            currentMonthTo,
            branch: req.query.branch,
            type: 'pdf'
        }
        child.send(msg)

        child.on('message', async (response) => {

            const {
                reportDataFinal,
                grandprevMonthTotal,
                grandCurrentMonthTotal,
                grandDifference
            } = response

            let prevMonthFromDate;
            let currentMonthFromDate;

            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            let today = new Date();
            let hours = today.getHours();
            let minutes = today.getMinutes();
            let ampm = hours >= 12 ? 'pm' : 'am';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            minutes = minutes < 10 ? '0' + minutes : minutes;
            let createTime = hours + ':' + minutes + ' ' + ampm;

            prevMonthFromDate = ("0" + prevMonthFrom.getDate()).slice(-2) + ' ' + months[prevMonthFrom.getMonth()] + ', ' + prevMonthFrom.getUTCFullYear() + ' - ' + ("0" + prevMonthTo.getDate()).slice(-2) + ' ' + months[prevMonthTo.getMonth()] + ', ' + prevMonthTo.getUTCFullYear()
            currentMonthFromDate = ("0" + currentMonthFrom.getDate()).slice(-2) + ' ' + months[currentMonthFrom.getMonth()] + ', ' + currentMonthFrom.getUTCFullYear() + ' - ' + ("0" + currentMonthTo.getDate()).slice(-2) + ' ' + months[currentMonthTo.getMonth()] + ', ' + currentMonthTo.getUTCFullYear()


            let branch = await Branch.findById(req.query.branch).select('_id name address serialNo phone');

            let reportFullDataset = {
                prevMonthFromDate: prevMonthFromDate,
                currentMonthFromDate: currentMonthFromDate,
                today: ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
                createTime,
                branch_phone : branch.phone,
                company_name : config.get('company').full_name,
                company_logo : config.get('company').company_logo,
                branch_id: branch.serialNo,
                branch_name: branch.name,
                branch_address: branch.address,
                data: reportDataFinal,
                grandprevMonthTotal: grandprevMonthTotal.toFixed(2),
                grandCurrentMonthTotal: grandCurrentMonthTotal.toFixed(2),
                grandDifference: grandDifference.toFixed(2),
            }

            var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'reports', 'customer', 'churn_customer_report.html'), 'utf8');

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
                            <th style="font-size: 7px; text-align: left; width: 25%; padding-left: 3px">Customer Name</th>
                            <th style="font-size: 7px; text-align: left; width: 17%;">Customer Phone</th>
                            <th style="font-size: 7px; text-align: center;">Last month purchase Amount</th>
                            <th style="font-size: 7px; text-align: center;"> Current Month Purchase Amount</th>
                            <th style="font-size: 7px; text-align: right;">Difference</th>
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
                path: "./public/reports/churn_customer_report.pdf"
            };

            pdf.create(document, options)
                .then(data => {
                    const file = data.filename;
                    return res.status(200).json({
                        auth: true,
                        fileLink: '/reports/churn_customer_report.pdf'
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


// @route GET api/report/churn/customer/:adminID/:prevMonthFrom/:prevMonthTo/:currentMonthFrom/:currentMonthTo?branch=..........
// @description churn Customer report excel
// @access Private
router.get('/churn/customer/:adminID/:prevMonthFrom/:prevMonthTo/:currentMonthFrom/:currentMonthTo', [
    [
        check('prevMonthFrom', 'Previous Month From date is required').not().isEmpty(),
        check('prevMonthTo', 'Previous Month To date is required').not().isEmpty(),
        check('currentMonthFrom', 'Current Month From date is required').not().isEmpty(),
        check('currentMonthTo', 'Current Month To date is required').not().isEmpty()
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

        let prevMonthFrom = req.params.prevMonthFrom
        let prevMonthTo = req.params.prevMonthTo
        let currentMonthFrom = req.params.currentMonthFrom
        let currentMonthTo = req.params.currentMonthTo

        prevMonthFrom = new Date(prevMonthFrom)
        prevMonthFrom.setHours(0)
        prevMonthFrom.setMinutes(0);
        prevMonthFrom.setSeconds(0);

        prevMonthTo = new Date(prevMonthTo)
        prevMonthTo.setHours(23)
        prevMonthTo.setMinutes(59);
        prevMonthTo.setSeconds(59);

        currentMonthFrom = new Date(currentMonthFrom)
        currentMonthFrom.setHours(0)
        currentMonthFrom.setMinutes(0);
        currentMonthFrom.setSeconds(0);

        currentMonthTo = new Date(currentMonthTo)
        currentMonthTo.setHours(23)
        currentMonthTo.setMinutes(59);
        currentMonthTo.setSeconds(59);

        const child = fork(path.join(__dirname, "subprocess", "chunk_customer.js"));

        const msg = {
            prevMonthFrom,
            prevMonthTo,
            currentMonthFrom,
            currentMonthTo,
            branch: req.query.branch,
            type: 'excel'
        }
        child.send(msg)

        child.on('message', async (response) => {

            const {
                reportDataFinal,
                grandprevMonthTotal,
                grandCurrentMonthTotal,
                grandDifference
            } = response

            let branchInfo = await Branch.findById(req.query.branch).select('_id name address serialNo');
            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

            let prevMonthFromDate;
            let currentMonthFromDate;


            prevMonthFromDate = ("0" + prevMonthFrom.getDate()).slice(-2) + ' ' + months[prevMonthFrom.getMonth()] + ', ' + prevMonthFrom.getUTCFullYear() + ' - ' + ("0" + prevMonthTo.getDate()).slice(-2) + ' ' + months[prevMonthTo.getMonth()] + ', ' + prevMonthTo.getUTCFullYear()
            currentMonthFromDate = ("0" + currentMonthFrom.getDate()).slice(-2) + ' ' + months[currentMonthFrom.getMonth()] + ', ' + currentMonthFrom.getUTCFullYear() + ' - ' + ("0" + currentMonthTo.getDate()).slice(-2) + ' ' + months[currentMonthTo.getMonth()] + ', ' + currentMonthTo.getUTCFullYear()

            let reportFullDataset = {
                prevMonthFromDate: prevMonthFromDate,
                currentMonthFromDate: currentMonthFromDate,
                shopName: branchInfo.name.trim(),
                shopAddress: branchInfo.address,
                data: reportDataFinal,
                grandprevMonthTotal: grandprevMonthTotal.toFixed(2),
                grandCurrentMonthTotal: grandCurrentMonthTotal.toFixed(2),
                grandDifference: grandDifference.toFixed(2)
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
                },
            };

            //Here you specify the export structure
            const specification = {
                name: { // <- the key should match the actual data key
                    displayName: 'Customer', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200, // <- width in pixels
                    cellStyle: styles.text_left
                },
                number: { // <- the key should match the actual data key
                    displayName: 'Phone No', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                prevMonthTotal: { // <- the key should match the actual data key
                    displayName: 'Prev Month Purchase', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200, // <- width in pixels
                },
                currentMonthTotal: { // <- the key should match the actual data key
                    displayName: 'Current Month Purchase', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 220 // <- width in pixels
                },
                difference: { // <- the key should match the actual data key
                    displayName: 'Difference', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200, // <- width in pixels
                    cellStyle: function (value, row) {
                        return (value < 0) ? styles.redColor : ' '
                    }
                }
            }

            const heading = [
                [{ value: `Churn Customer Report From : ` + reportFullDataset.prevMonthFromDate + ' To: ' + reportFullDataset.currentMonthFromDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Name: ' + reportFullDataset.shopName, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.shopAddress, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                [''],
                ['Grand Total:', ' ',
                    reportFullDataset.grandprevMonthTotal,
                    reportFullDataset.grandCurrentMonthTotal,
                    reportFullDataset.grandDifference
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
                        name: `Churn Customer Report From: ` + reportFullDataset.prevMonthFromDate + ' To: ' + reportFullDataset.currentMonthFromDate, // <- Specify sheet name (optional)
                        heading: heading,
                        merges: merges,
                        specification: specification, // <- Report specification
                        data: reportFullDataset.data // <-- Report data
                    }
                ]
            );

            // You can then return this straight
            res.attachment(`churn_customer_report.xlsx`); // This is sails.js specific (in general you need to set headers)
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