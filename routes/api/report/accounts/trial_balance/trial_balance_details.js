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

// @route GET /accounts/trial_balance/details?from=?&to=?&branch=?&group=?&subgroup=?&category=?
// @description Get trial balance details report
// @access Private
router.post('/accounts/trial_balance/details', adminAuth, async (req, res) => {
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
        
        let {from, to, group, subgroup, category} = req.body
        let type = 'pdf'
        let condition = {}
       
        from = new Date(from)
        let prev = new Date (from -1)
        from.setHours(0)
        from.setMinutes (0)
        from.setSeconds (0)
        
        to = new Date(to)
        to.setHours(23)
        to.setMinutes(59)
        to.setSeconds(59)

        if(req.query.branch !== undefined)
        { 
            condition.group = group
            condition.subgroup = subgroup
            condition.category = category
            condition.cost_center = req.query.branch
            condition.record_date = {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        }
        
        let child = fork(path.join(__dirname, "subprocess", "trial_balance_details.js"))

        let msg = {
            from,
            prev,
            condition,
            type
        }

        child.send(msg)

        child.on('message', async (response) => {
            const {
                allDataItems,
                trialBalanceTotalDebit,
                trialBalanceTotalCredit,
                trialBalanceTotalClosingBalance
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
                data: allDataItems,
                grandTotalDebit: trialBalanceTotalDebit.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1}),
                grandTotalCredit: trialBalanceTotalCredit.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1}),
                grandTotalClosingBalance: trialBalanceTotalClosingBalance.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1})
            }

            
            
            var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..','..','reports', 'accounts', 'trial_balance_details.html'), 'utf8');

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
                path: "./public/reports/trial_balance_details.pdf"
            };

            pdf.create(document, options)
                .then(data => {
                    const file = data.filename;
                    return res.status(200).json({
                        auth: true,
                        fileLink: '/reports/trial_balance_details.pdf',
                        filename: 'trial_balance_details'
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


// @route GET /accounts/trial_balance/details/excel?from=?&to=?&branch=?&group=?&subgroup=?&category=?
// description Get Trial Balance details Excel report
// @access Private
router.get('/accounts/trial_balance/details/:adminID/:from/:to/:group/:subgroup/:category', async (req, res) => {
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
        let group = req.params.group
        let subgroup = req.params.subgroup
        let category = req.params.category
        let type = 'excel'
        let condition = {}

       
        if(req.query.branch !== undefined)
        { 
            condition.group = group
            condition.subgroup = subgroup
            condition.category = category
            condition.cost_center = req.query.branch
            condition.record_date = {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        }


        from = new Date(from)
        let prev = new Date (from -1)
        from.setHours(0)
        from.setMinutes(0);
        from.setSeconds(0);

        to = new Date(to)
        to.setHours(23)
        to.setMinutes(59)
        to.setSeconds(59)

        condition.record_date = {
            $gte: isodate(from),
            $lte: isodate(to)
        }
        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        const child = fork(path.join(__dirname, "subprocess", "trial_balance_details.js"));

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
                trialBalanceTotalClosingBalance,
                group,
                subgroup,
                category
            } = response

            let branch = await Branch.findById(req.query.branch).select('_id serialNo name address');

            var today = new Date()

            let reportFullDataset = {
                currentDate: ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
                fromDate: ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
                toDate: ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
                branchName: branch.name,
                data: mainData,
                grandTotalDebit: trialBalanceTotalDebit,
                grandTotalCredit: trialBalanceTotalCredit,
                grandTotalClosingBalance : trialBalanceTotalClosingBalance,
                group,
                subgroup,
                category
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
                particular: { // <- the key should match the actual data key
                    displayName: 'Particulars', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200, // <- width in pixels
                    cellStyle: styles.text_left
                },
                debit: { // <- the key should match the actual data key
                    displayName: 'Total Debit', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                credit: { // <- the key should match the actual data key
                    displayName: 'Total Credit', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                balance: { // <- the key should match the actual data key
                    displayName: 'Closing Balance', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                }
            }


            const heading = [
                [{ value: 'Trial Balance Details report date wise from: ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Group: ' + reportFullDataset.group, style: styles.shop_info }],
                [{ value: 'Subgroup: ' + reportFullDataset.subgroup, style: styles.shop_info }],
                [{ value: 'Category: ' + reportFullDataset.category, style: styles.shop_info }],
                [{ value: 'Cost Center: ' + reportFullDataset.branchName, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                [''],
                ['Grand Total:',
                    reportFullDataset.grandTotalDebit,
                    reportFullDataset.grandTotalCredit,
                    reportFullDataset.grandTotalClosingBalance
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
                        name: 'Trial Balance Details report date wise from: ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                        heading: heading,
                        merges: merges,
                        specification: specification, // <- Report specification
                        data: reportFullDataset.data // <-- Report data
                    }
                ]
            );

            // You can then return this straight
            res.attachment('trial_balance_details_report_date_wise.xlsx'); // This is sails.js specific (in general you need to set headers)
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