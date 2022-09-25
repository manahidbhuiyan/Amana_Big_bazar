const express = require('express');
const router = express.Router();
const { fork } = require('child_process')
const {
    check,
    validationResult
} = require('express-validator');

const config = require('config')
var isodate = require("isodate");

var pdf = require("pdf-creator-node");
var fs = require('fs');
var path = require('path');

const auth = require('../../../../middleware/admin/auth');
const Branch = require('../../../../models/Branch');

const {
    getAdminRoleChecking
} = require('../../../../lib/helpers');


// @route GET api/report/payment/type/details?branch=..........
// @description Get all the details payment report pdf
// @access Private
router.post('/payment/type/details', [
    auth,
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

        let {from, to, methods, type} = req.body

        if(!methods || methods.length>1 || methods.length==0){
            methods = ['cash', 'mobile banking', 'card']
        }

        from = new Date(from)
        from.setHours(0)
        from.setMinutes (0);
        from.setSeconds (0);
        
        to = new Date(to)
        to.setHours(23+6)
        to.setMinutes (59);
        to.setSeconds(59);
        const child = fork(path.join(__dirname, "subprocess", "details.js"));

        const msg = {
            from,
            to,
            branch: req.query.branch,
            methods,
            type
        }

        child.send(msg)

        child.on('message', async (response) => {
            const {
                allPaymentList,
                grantTotalAmount,
                grantTotalOrderNo
            } = response

            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            let branchInfo = await Branch.findById(req.query.branch).select('_id serialNo name address phone')
            
            let today = new Date();
            let hours = today.getHours();
            let minutes = today.getMinutes();
            let ampm = hours >= 12 ? 'pm' : 'am';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            minutes = minutes < 10 ? '0' + minutes : minutes;
            let createTime = hours + ':' + minutes + ' ' + ampm;

            let allDataInfo = {
                "branchID": branchInfo.serialNo,
                "branchName": branchInfo.name.trim(),
                "branchAddress": branchInfo.address,
                "fromDate": ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
                "toDate": ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
                today: ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
                createTime,
                branch_phone : branchInfo.phone,
                company_name : config.get('company').full_name,
                company_logo : config.get('company').company_logo,
                "allPaymentData": allPaymentList,
                "totalOrderNo": grantTotalOrderNo,
                "grandTotalAmount": grantTotalAmount.toFixed(2),
                "avgOrderPayment": (grantTotalAmount / grantTotalOrderNo).toFixed(2)
            }

            var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'reports', 'payment', 'details.html'), 'utf8');

            var options = {
                format: "A4",
                orientation: "portrait",
                border: "5mm",
                header: {
                    height: "8mm",
                    contents: {
                        first: ' ',
                        default: `
                        <table cellspacing=0 cellpadding=0 width="510px" style="margin: 0 auto;"
                        class="table-border">
                        <tr>
                            <th style="font-size: 7px; text-align: left; width: 20%; padding-left: 3px">Receipt No</th>
                            <th style="font-size: 7px; text-align: left;">Receipt Type</th>
                            <th style="font-size: 7px; text-align: right;">Amount</th>
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
                data: allDataInfo,
                path: "./public/reports/payment_details.pdf"
            };

            pdf.create(document, options)
                .then(data => {
                    const file = data.filename;
                    return res.status(200).json({
                        auth: true,
                        fileLink: '/reports/payment_details.pdf'
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

module.exports = router
