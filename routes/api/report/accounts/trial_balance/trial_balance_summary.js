const express = require('express');
const router = express.Router();
const { fork } = require('child_process');

const config = require('config');
const jwt = require('jsonwebtoken');
const excel = require('node-excel-export');

var isodate = require("isodate");
var pdf = require("pdf-creator-node");
var fs = require('fs');
var path = require('path');

const {
    validationResult
} = require('express-validator');

const adminAuth = require('../../../../../middleware/admin/auth');
const Branch = require('../../../../../models/Branch');

const { getAdminRoleChecking } = require('../../../../../lib/helpers');

// @route GET /accounts/trial_balance/summary/pdf?from=?&to=?
// @description Get trial balance summary report
// @access Private
router.post('/accounts/trial_balance/summary', adminAuth, async (req, res) => {
    try {
        
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'report accounts')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to report'
                    }
                ]
            })
        }
        
        let {from, to} = req.body
        let type = 'pdf'
        let condition = {}

        
       
        from = new Date(from)
        let prev = new Date (from - 1)
        from.setHours(0)
        from.setMinutes (0)
        from.setSeconds (0)
        
        to = new Date(to)
        to.setHours(23)
        to.setMinutes(59)
        to.setSeconds(59)

        if(req.query.branch !== undefined)
        { 
            condition.record_date = {
                $gte: isodate(from),
                $lte: isodate(to)
            }
            condition.cost_center = req.query.branch
            condition.create = {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        }
     
        let child = fork(path.join(__dirname, "subprocess", "trial_balance_summary.js"))

        let msg = {
            from,
            prev,
            condition,
            type
        }

        child.send(msg)

        child.on('message', async (response) => {
            const {
                groupWiseCategory,
                trialBalanceTotalDebit,
                trialBalanceTotalCredit,
                totalDisposeAmont
            } = response

            let branch = await Branch.findById(req.query.branch).select('_id name address serialNo phone')
            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
            let today = new Date();
            let hours = today.getHours();
            let minutes = today.getMinutes();
            let ampm = hours >= 12 ? 'pm' : 'am';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            minutes = minutes < 10 ? '0' + minutes : minutes;
            let createTime = hours + ':' + minutes + ' ' + ampm;

            let reportFullDataset = {
                fromDate: ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
                toDate: ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
                today: ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
                createTime,
                branch_phone : branch.phone,
                company_name : config.get('company').full_name,
                company_logo : config.get('company').company_logo,
                branch_id: branch.serialNo,
                branch_name: branch.name.trim(),
                branch_address: branch.address.trim(),
                data: groupWiseCategory.sort((a,b) => a.serial - b.serial),
                grandTotalDebit: trialBalanceTotalDebit.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1}),
                grandTotalCredit: trialBalanceTotalCredit.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1}),
                totalDisposeAmont: totalDisposeAmont.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1})
            }

            

            var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..','..','reports', 'accounts', 'trial_balance_summary.html'), 'utf8');

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
                path: "./public/reports/trial_balance_summary.pdf"
            };

            pdf.create(document, options)
                .then(data => {
                    const file = data.filename;
                    return res.status(200).json({
                        auth: true,
                        fileLink: '/reports/trial_balance_summary.pdf',
                        filename: 'trial_balance_summary'
                    })
                })
                .catch(error => {
                    console.error(error)
                });
        })
        child.on('close', (code) => {
            child.kill()
            console.log(`child process exited with code ${code}`)
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error')
    }
});


//module.exports = router

// @route GET /accounts/trial_balance/summary/excel?from=?&to=?
// description Get trial balance summary Excel report
// @access Private
router.get('/accounts/trial_balance/summary/:adminID/:from/:to', async (req, res) => {
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
        let type = 'excel'
        let condition = {}

        from = new Date(from)
        let prev = new Date (from -1)
        from.setHours(0)
        from.setMinutes(0);
        from.setSeconds(0);

        to = new Date(to)
        to.setHours(23)
        to.setMinutes(59)
        to.setSeconds(59)

        if(req.query.branch !== undefined)
        { 
            condition.record_date = {
                $gte: isodate(from),
                $lte: isodate(to)
            }
            condition.cost_center = req.query.branch
            condition.create = {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        }

        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        const child = fork(path.join(__dirname, "subprocess", "trial_balance_summary.js"));

        const msg = {
            from,
            prev,
            condition,
            type
        }

        child.send(msg)

        child.on('message', async (response) => {

            const {
                mainData,
                trialBalanceTotalDebit,
                trialBalanceTotalCredit,
                totalDisposeAmont
            } = response

            let branch = await Branch.findById(req.query.branch).select('_id serialNo name address');

            var today = new Date()

            let reportFullDataset = {
                currentDate: ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
                fromDate: ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
                toDate: ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
                branchName: branch.name,
                data: mainData.sort((a,b) => a.serial - b.serial),
                grandTotalDebit: trialBalanceTotalDebit,
                grandTotalCredit: trialBalanceTotalCredit,
                totalDispose : totalDisposeAmont
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
                    displayName: 'S/L', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                category: { // <- the key should match the actual data key
                    displayName: 'Category', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                debitBalance: { // <- the key should match the actual data key
                    displayName: 'Debit', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                creditBalance: { // <- the key should match the actual data key
                    displayName: 'Credit', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                }
            }


            const heading = [
                [{ value: 'Trail Balance Summary Report At Date: ' + reportFullDataset.toDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: '', style: styles.cell_border }],
                [{ value: 'Cost Center: ' + reportFullDataset.branchName, style: styles.shop_info }],
                [''],
                ['Disposal:', ' ',' ',
                    reportFullDataset.totalDispose
                ],
                [''],
                ['Grand Total:', ' ',
                    reportFullDataset.grandTotalDebit,
                    reportFullDataset.grandTotalCredit
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
                        name: 'Trail Balance Summary Report At Date: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                        heading: heading,
                        merges: merges,
                        specification: specification, // <- Report specification
                        data: reportFullDataset.data // <-- Report data
                    }
                ]
            );

            // You can then return this straight
            res.attachment('trial_balance_summary_report.xlsx'); // This is sails.js specific (in general you need to set headers)
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