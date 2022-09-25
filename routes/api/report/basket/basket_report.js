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


// @route GET api/report/basket?branch=..........
// @description Get monthly and weekly basket report pdf
// @access Private
router.post('/basket', [
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
            currentMonthTo,
            comparisonLength
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
        const child = fork(path.join(__dirname, "subprocess", "monthly_weekly_basket_report.js"));

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
                grandPrevMonthEarnAmount,
                grandPrevMonthCustomer,
                grandCurrentMonthEarnAmount,
                grandCurrentMonthCustomer,
                grandPrevMonthBasket,
                grandCurrentMonthBasket,
                grandDifference
            } = response

            let branch = await Branch.findById(req.query.branch).select('_id name address serialNo phone');
            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
            
            let today = new Date();
            let hours = today.getHours();
            let minutes = today.getMinutes();
            let ampm = hours >= 12 ? 'pm' : 'am';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            minutes = minutes < 10 ? '0' + minutes : minutes;
            let createTime = hours + ':' + minutes + ' ' + ampm;
            
            let prevMonthFromDate;
            let currentMonthFromDate;


            prevMonthFromDate = ("0" + prevMonthFrom.getDate()).slice(-2) + ' ' + months[prevMonthFrom.getMonth()] + ', ' + prevMonthFrom.getUTCFullYear() + ' - ' + ("0" + prevMonthTo.getDate()).slice(-2) + ' ' + months[prevMonthTo.getMonth()] + ', ' + prevMonthTo.getUTCFullYear()
            currentMonthFromDate = ("0" + currentMonthFrom.getDate()).slice(-2) + ' ' + months[currentMonthFrom.getMonth()] + ', ' + currentMonthFrom.getUTCFullYear() + ' - ' + ("0" + currentMonthTo.getDate()).slice(-2) + ' ' + months[currentMonthTo.getMonth()] + ', ' + currentMonthTo.getUTCFullYear()


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
                grandPrevMonthEarnAmount: grandPrevMonthEarnAmount.toFixed(2),
                grandPrevMonthCustomer: grandPrevMonthCustomer.toFixed(2),
                grandCurrentMonthEarnAmount: grandCurrentMonthEarnAmount.toFixed(2),
                grandCurrentMonthCustomer: grandCurrentMonthCustomer.toFixed(2),
                grandPrevMonthBasket: grandPrevMonthBasket.toFixed(2),
                grandCurrentMonthBasket: grandCurrentMonthBasket.toFixed(2),
                grandDifference: grandDifference.toFixed(2)
            }


            var html;

            if (comparisonLength == 'monthly') {
                html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'reports', 'basket', 'monthly_basket_report.html'), 'utf8');
            } else {
                html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'reports', 'basket', 'weekly_basket_report.html'), 'utf8');
            }

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
                            <th style="font-size: 7px; text-align: left; width: 26%; padding-left: 3px">Category</th>
                            <th style="font-size: 7px; text-align: left;">Prev Sale</th>
                            <th style="font-size: 7px; text-align: right;">Prev FF</th>
                            <th style="font-size: 7px; text-align: right;">Prev Busket</th>
                            <th style="font-size: 7px; text-align: right;">Latest Sale</th>
                            <th style="font-size: 7px; text-align: right;">Latest FF</th>
                            <th style="font-size: 7px; text-align: right;">Latest Busket</th>
                            <th style="font-size: 7px; text-align: right;">Busket Difference</th>
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
                path: `./public/reports/${comparisonLength}_basket_report.pdf`
            };

            pdf.create(document, options)
                .then(data => {
                    const file = data.filename;
                    return res.status(200).json({
                        auth: true,
                        fileLink: `/reports/${comparisonLength}_basket_report.pdf`
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


// @route GET api/report/basket/daily?branch=..........
// @description Get daily basket report pdf
// @access Private
router.post('/basket/daily', [
    adminAuth,
    [
        check('firstDay', 'First Day is required').not().isEmpty(),
        check('secondDay', 'Second Day is required').not().isEmpty()
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
            firstDay,
            secondDay
        } = req.body

        let firstDayFrom = new Date(firstDay)
        firstDayFrom.setHours(0)
        firstDayFrom.setMinutes(0);
        firstDayFrom.setSeconds(0);

        let firstDayTo = new Date(firstDay)
        firstDayTo.setHours(23)
        firstDayTo.setMinutes(59);
        firstDayTo.setSeconds(59);


        let secondDayFrom = new Date(secondDay)
        secondDayFrom.setHours(0)
        secondDayFrom.setMinutes(0);
        secondDayFrom.setSeconds(0);

        let secondDayTo = new Date(secondDay)
        secondDayTo.setHours(23)
        secondDayTo.setMinutes(59);
        secondDayTo.setSeconds(59);

        const child = fork(path.join(__dirname, "subprocess", "daily_basket_report.js"));

        const msg = {
            firstDayFrom,
            firstDayTo,
            secondDayFrom,
            secondDayTo,
            branch: req.query.branch,
            type: 'pdf'
        }

        child.send(msg)

        child.on('message', async (response) => {
            const {
                reportDataFinal,
                grandPrevMonthEarnAmount,
                grandPrevMonthCustomer,
                grandCurrentMonthEarnAmount,
                grandCurrentMonthCustomer,
                grandPrevMonthBasket,
                grandCurrentMonthBasket,
                grandDifference
            } = response

            let branch = await Branch.findById(req.query.branch).select('_id name address serialNo phone');
            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
            
            let today = new Date();
            let hours = today.getHours();
            let minutes = today.getMinutes();
            let ampm = hours >= 12 ? 'pm' : 'am';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            minutes = minutes < 10 ? '0' + minutes : minutes;
            let createTime = hours + ':' + minutes + ' ' + ampm;

            let reportFullDataset = {
                firstDay: ("0" + firstDayFrom.getDate()).slice(-2) + ' ' + months[firstDayFrom.getMonth()] + ', ' + firstDayFrom.getUTCFullYear(),
                secondDay: ("0" + secondDayFrom.getDate()).slice(-2) + ' ' + months[secondDayFrom.getMonth()] + ', ' + secondDayFrom.getUTCFullYear(),
                today: ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
                createTime,
                branch_phone : branch.phone,
                company_name : config.get('company').full_name,
                company_logo : config.get('company').company_logo,
                branch_id: branch.serialNo,
                branch_name: branch.name,
                branch_address: branch.address,
                data: reportDataFinal,
                grandPrevMonthEarnAmount: grandPrevMonthEarnAmount.toFixed(2),
                grandPrevMonthCustomer: grandPrevMonthCustomer.toFixed(2),
                grandCurrentMonthEarnAmount: grandCurrentMonthEarnAmount.toFixed(2),
                grandCurrentMonthCustomer: grandCurrentMonthCustomer.toFixed(2),
                grandPrevMonthBasket: grandPrevMonthBasket.toFixed(2),
                grandCurrentMonthBasket: grandCurrentMonthBasket.toFixed(2),
                grandDifference: grandDifference.toFixed(2)
            }

            var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'reports', 'basket', 'daily_basket_report.html'), 'utf8');
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
                            <th style="font-size: 7px; text-align: left; width: 26%; padding-left: 3px">Category</th>
                            <th style="font-size: 7px; text-align: left;">Prev Sale</th>
                            <th style="font-size: 7px; text-align: right;">Prev FF</th>
                            <th style="font-size: 7px; text-align: right;">Prev Busket</th>
                            <th style="font-size: 7px; text-align: right;">Latest Sale</th>
                            <th style="font-size: 7px; text-align: right;">Latest FF</th>
                            <th style="font-size: 7px; text-align: right;">Latest Busket</th>
                            <th style="font-size: 7px; text-align: right;">Busket Difference</th>
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
                path: `./public/reports/daily_basket_report.pdf`
            };

            pdf.create(document, options)
                .then(data => {
                    const file = data.filename;
                    return res.status(200).json({
                        auth: true,
                        fileLink: `/reports/daily_basket_report.pdf`
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


// @route GET api/report/basket/hourly?branch=..........
// @description Get hourly basket report pdf
// @access Private
router.post('/basket/hourly', [
    adminAuth,
    [
        check('timeFrom', 'Time From is required').not().isEmpty(),
        check('timeTo', 'Time To is required').not().isEmpty()
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
            timeFrom,
            timeTo
        } = req.body

        timeFrom = new Date(timeFrom)
        timeTo = new Date(timeTo)

        const child = fork(path.join(__dirname, "subprocess", "hourly_basket_report.js"));

        const msg = {
            timeFrom,
            timeTo,
            branch: req.query.branch,
            type: 'pdf'
        }
        child.send(msg)

        child.on('message', async (response) => {
            const {
                reportDataFinal,
                grandEarnAmount,
                grandCustomer,
                grandBasket
            } = response

            let branch = await Branch.findById(req.query.branch).select('_id name address serialNo phone');
            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
            
            let today = new Date();
            let hours = today.getHours();
            let minutes = today.getMinutes();
            let ampm = hours >= 12 ? 'pm' : 'am';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            minutes = minutes < 10 ? '0' + minutes : minutes;
            let createTime = hours + ':' + minutes + ' ' + ampm;

            let reportFullDataset = {
                date: ("0" + timeFrom.getDate()).slice(-2) + ' ' + months[timeFrom.getMonth()] + ', ' + timeFrom.getUTCFullYear(),
                today: ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
                createTime,
                branch_phone : branch.phone,
                company_name : config.get('company').full_name,
                company_logo : config.get('company').company_logo,
                branch_id: branch.serialNo,
                branch_name: branch.name,
                branch_address: branch.address,
                data: reportDataFinal,
                grandEarnAmount: grandEarnAmount.toFixed(2),
                grandCustomer: grandCustomer.toFixed(2),
                grandBasket: grandBasket.toFixed(2)
            }
            var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'reports', 'basket', 'hourly_basket_report.html'), 'utf8');
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
                path: `./public/reports/hourly_basket_report.pdf`
            };

            pdf.create(document, options)
                .then(data => {
                    const file = data.filename;
                    return res.status(200).json({
                        auth: true,
                        fileLink: `/reports/hourly_basket_report.pdf`
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



//Excel Start

// @route GET api/report/basket/:adminID/:prevMonthFrom/:prevMonthTo/:currentMonthFrom/:currentMonthTo/:comparisonLength?branch=..........
// @description weekly and monthly basket report excel
// @access Private
router.get('/basket/:adminID/:prevMonthFrom/:prevMonthTo/:currentMonthFrom/:currentMonthTo/:comparisonLength', [
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

        let comparisonLength = req.params.comparisonLength


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

        const child = fork(path.join(__dirname, "subprocess", "monthly_weekly_basket_report.js"));

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
                grandPrevMonthEarnAmount,
                grandPrevMonthCustomer,
                grandCurrentMonthEarnAmount,
                grandCurrentMonthCustomer,
                grandPrevMonthBasket,
                grandCurrentMonthBasket,
                grandDifference
            } = response

            let branchInfo = await Branch.findById(req.query.branch).select('_id name address serialNo');
            var months = ["Januany", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

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
                grandPrevMonthEarnAmount: grandPrevMonthEarnAmount,
                grandPrevMonthCustomer: grandPrevMonthCustomer,
                grandCurrentMonthEarnAmount: grandCurrentMonthEarnAmount,
                grandCurrentMonthCustomer: grandCurrentMonthCustomer,
                grandPrevMonthBasket: grandPrevMonthBasket,
                grandCurrentMonthBasket: grandCurrentMonthBasket,
                grandDifference: grandDifference
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
                    displayName: 'Category', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200, // <- width in pixels
                    cellStyle: styles.text_left
                },
                prevMonthEarn: { // <- the key should match the actual data key
                    displayName: 'Prev Month Sale', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                prevMonthFF: { // <- the key should match the actual data key
                    displayName: 'Prev Month FF', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200, // <- width in pixels
                },
                prevMonthBasket: { // <- the key should match the actual data key
                    displayName: 'Prev Month Basket', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                currentMonthEarn: { // <- the key should match the actual data key
                    displayName: 'Current Month Sale', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                currentMonthFF: { // <- the key should match the actual data key
                    displayName: 'Current Month FF', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                currentMonthBasket: { // <- the key should match the actual data key
                    displayName: 'Current Month Basket', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                differerce: { // <- the key should match the actual data key
                    displayName: 'Busket Difference', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200, // <- width in pixels
                    cellStyle: function (value, row) {
                        return (value < 0) ? styles.redColor : ' '
                    }
                },
            }


            const heading = [
                [{ value: `${comparisonLength} Basket Report From : ` + reportFullDataset.prevMonthFromDate + ' To: ' + reportFullDataset.currentMonthFromDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Name: ' + reportFullDataset.shopName, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.shopAddress, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                [''],
                ['Grand Total:',
                    reportFullDataset.grandPrevMonthEarnAmount,
                    reportFullDataset.grandPrevMonthCustomer,
                    reportFullDataset.grandPrevMonthBasket,
                    reportFullDataset.grandCurrentMonthEarnAmount,
                    reportFullDataset.grandCurrentMonthCustomer,
                    reportFullDataset.grandCurrentMonthBasket,
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
                        name: `${comparisonLength} Basket Report From: ` + reportFullDataset.prevMonthFromDate + ' To: ' + reportFullDataset.currentMonthFromDate, // <- Specify sheet name (optional)
                        heading: heading,
                        merges: merges,
                        specification: specification, // <- Report specification
                        data: reportFullDataset.data // <-- Report data
                    }
                ]
            );

            // You can then return this straight
            res.attachment(`${comparisonLength}_basket_report.xlsx`); // This is sails.js specific (in general you need to set headers)
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



// @route GET api/report/basket/daily/:adminID/:firstDay/:secondDay?branch=..........
// @description Daily basket report excel
// @access Private
router.get('/basket/daily/:adminID/:firstDay/:secondDay', [
    [
        check('firstDay', 'First Day is required').not().isEmpty(),
        check('secondDay', 'Second Day is required').not().isEmpty()
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

        let firstDay = req.params.firstDay
        let secondDay = req.params.secondDay


        let firstDayFrom = new Date(firstDay)
        firstDayFrom.setHours(0)
        firstDayFrom.setMinutes(0);
        firstDayFrom.setSeconds(0);

        let firstDayTo = new Date(firstDay)
        firstDayTo.setHours(23)
        firstDayTo.setMinutes(59);
        firstDayTo.setSeconds(59);


        let secondDayFrom = new Date(secondDay)
        secondDayFrom.setHours(0)
        secondDayFrom.setMinutes(0);
        secondDayFrom.setSeconds(0);

        let secondDayTo = new Date(secondDay)
        secondDayTo.setHours(23)
        secondDayTo.setMinutes(59);
        secondDayTo.setSeconds(59);

        const child = fork(path.join(__dirname, "subprocess", "daily_basket_report.js"));

        const msg = {
            firstDayFrom,
            firstDayTo,
            secondDayFrom,
            secondDayTo,
            branch: req.query.branch,
            type: 'excel'
        }

        child.send(msg)

        child.on('message', async (response) => {
            const {
                reportDataFinal,
                grandPrevMonthEarnAmount,
                grandPrevMonthCustomer,
                grandCurrentMonthEarnAmount,
                grandCurrentMonthCustomer,
                grandPrevMonthBasket,
                grandCurrentMonthBasket,
                grandDifference
            } = response

            let branchInfo = await Branch.findById(req.query.branch).select('_id name address serialNo');
            var months = ["Januany", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

            let reportFullDataset = {
                firstDay: ("0" + firstDayFrom.getDate()).slice(-2) + ' ' + months[firstDayFrom.getMonth()] + ', ' + firstDayFrom.getUTCFullYear(),
                secondDay: ("0" + secondDayFrom.getDate()).slice(-2) + ' ' + months[secondDayFrom.getMonth()] + ', ' + secondDayFrom.getUTCFullYear(),
                shopName: branchInfo.name.trim(),
                shopAddress: branchInfo.address,
                data: reportDataFinal,
                grandPrevMonthEarnAmount: grandPrevMonthEarnAmount,
                grandPrevMonthCustomer: grandPrevMonthCustomer,
                grandCurrentMonthEarnAmount: grandCurrentMonthEarnAmount,
                grandCurrentMonthCustomer: grandCurrentMonthCustomer,
                grandPrevMonthBasket: grandPrevMonthBasket,
                grandCurrentMonthBasket: grandCurrentMonthBasket,
                grandDifference: grandDifference
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
                    displayName: 'Category', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200, // <- width in pixels
                    cellStyle: styles.text_left
                },
                prevMonthEarn: { // <- the key should match the actual data key
                    displayName: 'Prev Sale', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                prevMonthFF: { // <- the key should match the actual data key
                    displayName: 'Prev FF', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200, // <- width in pixels
                },
                prevMonthBasket: { // <- the key should match the actual data key
                    displayName: 'Prev Basket', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                currentMonthEarn: { // <- the key should match the actual data key
                    displayName: 'Current Sale', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                currentMonthFF: { // <- the key should match the actual data key
                    displayName: 'Current FF', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                currentMonthBasket: { // <- the key should match the actual data key
                    displayName: 'Current Basket', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                differerce: { // <- the key should match the actual data key
                    displayName: 'Busket Difference', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200, // <- width in pixels
                    cellStyle: function (value, row) {
                        return (value < 0) ? styles.redColor : ' '
                    }
                },
            }


            const heading = [
                [{ value: `Daily Basket Report First Day : ` + reportFullDataset.firstDay + ' Second Day: ' + reportFullDataset.secondDay, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Name: ' + reportFullDataset.shopName, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.shopAddress, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                [''],
                ['Grand Total:',
                    reportFullDataset.grandPrevMonthEarnAmount,
                    reportFullDataset.grandPrevMonthCustomer,
                    reportFullDataset.grandPrevMonthBasket,
                    reportFullDataset.grandCurrentMonthEarnAmount,
                    reportFullDataset.grandCurrentMonthCustomer,
                    reportFullDataset.grandCurrentMonthBasket,
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
                        name: `Daily Basket Report Fist Day: ` + reportFullDataset.firstDay + ' Second Day: ' + reportFullDataset.secondDay, // <- Specify sheet name (optional)
                        heading: heading,
                        merges: merges,
                        specification: specification, // <- Report specification
                        data: reportFullDataset.data // <-- Report data
                    }
                ]
            );

            // You can then return this straight
            res.attachment(`daily_basket_report.xlsx`); // This is sails.js specific (in general you need to set headers)
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

// @route GET api/report/basket/hourly/:adminID/:timeFrom/:timeTo?branch=..........
// @description Hourly basket report excel
// @access Private
router.get('/basket/hourly/:adminID/:timeFrom/:timeTo', [
    [
        check('timeFrom', 'Time From is required').not().isEmpty(),
        check('timeTo', 'Time To is required').not().isEmpty()
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

        let timeFrom = req.params.timeFrom
        let timeTo = req.params.timeTo

        timeFrom = new Date(timeFrom)
        timeTo = new Date(timeTo)

        const child = fork(path.join(__dirname, "subprocess", "hourly_basket_report.js"));

        const msg = {
            timeFrom,
            timeTo,
            branch: req.query.branch,
            type: 'excel'
        }
        child.send(msg)

        child.on('message', async (response) => {
            const {
                reportDataFinal,
                grandEarnAmount,
                grandCustomer,
                grandBasket
            } = response

            let branchInfo = await Branch.findById(req.query.branch).select('_id name address serialNo');
            var months = ["Januany", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

            let reportFullDataset = {
                date: ("0" + timeFrom.getDate()).slice(-2) + ' ' + months[timeFrom.getMonth()] + ', ' + timeFrom.getUTCFullYear(),
                shopName: branchInfo.name.trim(),
                shopAddress: branchInfo.address,
                data: reportDataFinal,
                grandEarnAmount: grandEarnAmount,
                grandCustomer: grandCustomer,
                grandBasket: grandBasket
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
                timeRange: { // <- the key should match the actual data key
                    displayName: 'Time Range', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200, // <- width in pixels
                    cellStyle: styles.text_left
                },
                sale: { // <- the key should match the actual data key
                    displayName: 'Sale', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                FF: { // <- the key should match the actual data key
                    displayName: 'FF', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200, // <- width in pixels
                },
                basket: { // <- the key should match the actual data key
                    displayName: 'Basket', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                }
            }


            const heading = [
                [{ value: `Hourly Basket Report of Day: ` + reportFullDataset.date, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Name: ' + reportFullDataset.shopName, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.shopAddress, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                [''],
                ['Grand Total:',
                    reportFullDataset.grandEarnAmount,
                    reportFullDataset.grandCustomer,
                    reportFullDataset.grandBasket
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
                        name: `Hourly Basket Report Of Day : ` + reportFullDataset.date, // <- Specify sheet name (optional)
                        heading: heading,
                        merges: merges,
                        specification: specification, // <- Report specification
                        data: reportFullDataset.data // <-- Report data
                    }
                ]
            );

            // You can then return this straight
            res.attachment(`hourly_basket_report.xlsx`); // This is sails.js specific (in general you need to set headers)
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