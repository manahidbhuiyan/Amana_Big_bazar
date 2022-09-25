const express = require('express');
const router = express.Router();
const { fork } = require('child_process')
const {
    check,
    validationResult
} = require('express-validator');

var pdf = require("pdf-creator-node");
var fs = require('fs');
var path = require('path');
const config = require('config');

const adminAuth = require('../../../../middleware/admin/auth');

const {
    getAdminRoleChecking
} = require('../../../../lib/helpers');



// @route GET api/report/single/pos-client/purchase/report?branch=..........
// @description Get single pos user report pdf
// @access Private
router.post('/single/pos-client/purchase/report', [
    adminAuth,
    [
        check('from', 'From date is required').not().isEmpty(),
        check('to', 'To date is required').not().isEmpty(),
        check('identification', 'Identification is required').not().isEmpty(),
        check('id_type', 'Identification type is required').not().isEmpty()
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

        const adminRolesVatable = await getAdminRoleChecking(req.admin.id, 'vatable report')

        if (!adminRoles && !adminRolesVatable) {
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
            identification,
            id_type,
            branch_id
        } = req.body

        from = new Date(from)
        from.setHours(0)
        from.setMinutes(0);
        from.setSeconds(0);

        to = new Date(to)
        to.setHours(23)
        to.setMinutes(59);
        to.setSeconds(59);

        const child = fork(path.join(__dirname, "subprocess", "single_user_report.js"));

        const msg = {
            from,
            to,
            identification,
            id_type,
            branch_id
        }
        child.send(msg)

        child.on('message', async (response) => {

            const {
                grandTotal,
                orderInfoUserWise,
                posUser
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
                fromDate: ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
                toDate: ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
                today: ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
                createTime,
                company_name : config.get('company').full_name,
                company_logo : config.get('company').company_logo,
                customerID: posUser ? posUser.clientID : ' ',
                customerName: posUser ? posUser.name : ' ',
                customerPhone: posUser ? posUser.phone : ' ',
                grandTotal: grandTotal,
                data: orderInfoUserWise
            }

            var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'reports', 'customer', 'cash_memo_single_customer.html'), 'utf8');

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
                            <th style="font-size: 7px; text-align: left; width: 15%; padding-left: 3px">Bar Code</th>
                            <th style="font-size: 7px; text-align: left; width: 30%;">Item Description</th>
                            <th style="font-size: 7px; text-align: right;">sale Price</th>
                            <th style="font-size: 7px; text-align: right;">Qunatity</th>
                            <th style="font-size: 7px; text-align: center;">Product Disc</th>
                            <th style="font-size: 7px; text-align: right;">Total</th>
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
                path: "./public/reports/single_customer_cash_memo.pdf"
            };

            pdf.create(document, options)
                .then(data => {
                    const file = data.filename;
                    return res.status(200).json({
                        auth: true,
                        fileLink: '/reports/single_customer_cash_memo.pdf',
                        name: 'single_customer_cash_memo.pdf'
                    })
                    //res.download(file);
                })
                .catch(error => {
                    console.error(error)
                });
        })

        child.on('close', (code) => {
            child.kill()
            console.log(`child process exited with code ${code}`);
        });

        //return res.json(orderInfoUserWise)
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router