const express = require('express');
const router = express.Router();
const { fork } = require('child_process');
const {
    check,
    validationResult
} = require('express-validator');

const config = require('config')

var isodate = require("isodate");

var pdf = require("pdf-creator-node");
var fs = require('fs');
var path = require('path');

const auth = require('../../../../../middleware/admin/auth');


const {
    getAdminRoleChecking
} = require('../../../../../lib/helpers');


// @route GET api/report/purchase/supplier-wise/top/list
// @description Get warehouse top supplier list pdf report
// @access Private
router.post('/purchase/supplier-wise/top/list', [
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

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'warehouse report')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to report'
                    }
                ]
            })
        }

        let { from, to } = req.body

        from = new Date(from)
        from.setHours(0)
        from.setMinutes (0);
        from.setSeconds (0);
        
        to = new Date(to)
        to.setHours(23)
        to.setMinutes (59);
        to.setSeconds (59);

        const child = fork(path.join(__dirname, "subprocess", "top_sheet_purchase.js"));

        const msg = {
            from,
            to
        }

        child.send(msg)

        child.on('message', async (response) => {
            const {
                allSupplierInfo,
                grandTotalCostAmount,
                grandTotalSellAmount,
                grandTotalQuantity
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

            let allDataInfo = {
                "branchID": config.get('warehouse').code,
                branchName: config.get('warehouse').name,
                branchAddress: config.get('warehouse').address,
                "fromDate": ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
                "toDate": ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
                "allSupplierData": allSupplierInfo.sort(function (a, b) {
                    return Number(b.supplierTotalCostAmount) - Number(a.supplierTotalCostAmount);
                }).slice(0, 10),
                "grandTotalQuantity": grandTotalQuantity.toFixed(2),
                "grandTotalCostAmount": grandTotalCostAmount.toFixed(2),
                "grandTotalSellAmount": grandTotalSellAmount.toFixed(2),
                "grandTotalProfitAmount": (grandTotalSellAmount - grandTotalCostAmount).toFixed(2),
                company_name : config.get('company').full_name,
                company_logo : config.get('company').company_logo,
                branch_phone: config.get('warehouse').phone,
                createTime,
                today: ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
            }

            //return res.json(allDataInfo)

            var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', '..', 'reports', 'purchase', 'top_purchase.html'), 'utf8');

            var options = {
                format: "A4",
                orientation: "portrait",
                border: "5mm",
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
                path: "./public/reports/warehouse_top_purchase.pdf"
            };

            pdf.create(document, options)
                .then(data => {
                    const file = data.filename;
                    console.log(file)
                    return res.status(200).json({
                        auth: true,
                        fileLink: '/reports/warehouse_top_purchase.pdf'
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
