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

var isodate = require("isodate");

var pdf = require("pdf-creator-node");
var fs = require('fs');
var path = require('path');

const Branch = require('../../../../models/Branch');

const auth = require('../../../../middleware/user/auth');
const adminAuth = require('../../../../middleware/admin/auth');

const {
    getAdminRoleChecking
} = require('../../../../lib/helpers');

const Admin = require('../../../../models/admin/Admin');

// @route GET /api/report/supplier/sell/list?branch=...........
// @description Get suppliuer wise report pdf
// @access Private
router.post('/supplier/sell/list', [
    adminAuth,
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

        const user = await Admin.findById(req.admin.id).select('-password').select('-forgot');

        if (!user) {
            return res.status(400).send({
                errors: [{
                    msg: 'Invailid user.'
                }]
            })
        }

        let {
            from,
            to
        } = req.body

        from = new Date(from)
        from.setHours(0)
        from.setMinutes (0);
        from.setSeconds (0);
        
        to = new Date(to)
        to.setHours(23)
        to.setMinutes (59);
        to.setSeconds (59);

        const child = fork(path.join(__dirname, "subprocess", "supplier_sell.js"));
        
        const msg = {
            from,
            to,
            branch: req.query.branch,
            type: 'pdf'
        }

        child.send(msg)

        child.on('message', async (response)=>{
            const {
                reportData,
                totalSupplierEarnAmount,
                totalSupplierCostAmount,
                totalProfitAmount,
                totalDiscountAmount,
                totalSoldQuantity,
                totalGp
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
            fromDate: ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
            toDate: ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
            today: ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
            createTime,
            branch_phone : branch.phone,
            company_name : config.get('company').full_name,
            company_logo : config.get('company').company_logo,
            branch_id: branch.serialNo,
            branch_name: branch.name,
            branch_address: branch.address,
            data: reportData.sort( function (a,b) {
                return a.name.localeCompare(b.name)
            }),
            totalEarnAmount: totalSupplierEarnAmount.toFixed(2),
            totalCostAmount: totalSupplierCostAmount.toFixed(2),
            totalProfitAmount: totalProfitAmount.toFixed(2),
            specialDiscount: totalDiscountAmount.toFixed(2),
            netSellAmount: (totalSupplierEarnAmount - totalDiscountAmount).toFixed(2),
            netProfitLoss: ((totalSupplierEarnAmount - totalDiscountAmount) - totalSupplierCostAmount).toFixed(2),
            netProfitLossPercentage: ((Math.abs((totalSupplierEarnAmount - totalDiscountAmount) - totalSupplierCostAmount) / totalSupplierEarnAmount) * 100).toFixed(2),
        }

        var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'reports', 'supplier_wise_sell.html'), 'utf8');

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
                        <th style="font-size: 7px; text-align: left; width: 14%;">Supplier Code</th>
                        <th style="font-size: 7px; text-align: left; width: 37%;">Supplier Name</th>
                        <th style="font-size: 7px; text-align: right;">Ext. Net Sales</th>
                        <th style="font-size: 7px; text-align: right;">Cost Amt</th>
                        <th style="font-size: 7px; text-align: right;">Ext. Profit/Loss</th>
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
            path: "./public/reports/supplier_wise_sell.pdf"
        };

        pdf.create(document, options)
            .then(data => {
                const file = data.filename;
                res.status(200).json({
                    auth: true,
                    fileLink: '/reports/supplier_wise_sell.pdf' 
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

// @route GET /api/report/supplier/sell/:adminID/:from/:to
// @description Get supplier wise sell excel
// @access Private
router.get('/supplier/sell/:adminID/:from/:to', [
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
        from.setHours(0)
        from.setMinutes(0);
        from.setSeconds(0);

        to = new Date(to)
        to.setHours(23)
        to.setMinutes (59);
        to.setSeconds (59);

        const child = fork(path.join(__dirname, "subprocess", "supplier_sell.js"));
        
        const msg = {
            from,
            to,
            branch: req.query.branch,
            type: 'excel'
        }

        child.send(msg)

        child.on('message', async (response)=>{
            const {
                reportData,
                totalSupplierEarnAmount,
                totalSupplierCostAmount,
                totalProfitAmount,
                totalDiscountAmount,
                totalSoldQuantity,
                totalGp
            } = response

            let grandTotal = {
                totalSupplierEarnAmount: totalSupplierEarnAmount,
                totalSupplierCostAmount: totalSupplierCostAmount,
                totalProfitAmount: totalProfitAmount,
                totalGp: totalGp,
                totalSoldQuantity: totalSoldQuantity,
                specialDiscount: totalDiscountAmount,
                netSellAmount: (totalSupplierEarnAmount - totalDiscountAmount),
                netProfitLoss: ((totalSupplierEarnAmount - totalDiscountAmount) - totalSupplierCostAmount),
                netProfitLossPercentage: ((Math.abs((totalSupplierEarnAmount - totalDiscountAmount) - totalSupplierCostAmount) / totalSupplierEarnAmount) * 100),
            }
    
            let branch = await Branch.findById(req.query.branch).select('_id name address serialNo');
    
            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    
            let reportFullDataset = {
                fromDate: ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
                toDate: ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
                shopCode: branch.serialNo,
                shopName: branch.name,
                shopAddress: branch.address,
                grandTotal,
                data: reportData
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
                    displayName: 'Supplier Code', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200, // <- width in pixels
                    cellStyle: styles.text_left
                },
                name: { // <- the key should match the actual data key
                    displayName: 'Supplier Name', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 300 // <- width in pixels
                },
                quantity: { // <- the key should match the actual data key
                    displayName: 'Sold Quantity', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 300 // <- width in pixels
                },
                earn: { // <- the key should match the actual data key
                    displayName: 'Net Sales', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                cost: { // <- the key should match the actual data key
                    displayName: 'Cost Amount', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                profit: { // <- the key should match the actual data key
                    displayName: 'Profit/Loss', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                gp: { // <- the key should match the actual data key
                    displayName: 'GP(%)', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                }
    
    
            }
    
    
            const heading = [
                [{ value: 'Net Profit/Loss By Supplier from : ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Code: ' + reportFullDataset.shopCode, style: styles.shop_info }],
                [{ value: 'Shop Name: ' + reportFullDataset.shopName, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.shopAddress, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                [''],
                [{ value: 'Special Discount: ' + grandTotal.specialDiscount, style: styles.shop_info }],
                [{ value: 'Total Net Sale: ' + grandTotal.netSellAmount, style: styles.shop_info }],
                [{ value: 'Total Cost Amount: ' + grandTotal.totalSupplierCostAmount, style: styles.shop_info }],
                [{ value: 'Net Profit/Loss: ' + grandTotal.netProfitLoss, style: styles.shop_info }],
                [{ value: 'Net Profit(%): ' + grandTotal.netProfitLossPercentage, style: styles.shop_info }],
                [''],
                ['Grand Total:', ' ',
                    grandTotal.totalSoldQuantity,
                    grandTotal.totalSupplierEarnAmount,
                    grandTotal.totalSupplierCostAmount,
                    grandTotal.totalProfitAmount,
                    grandTotal.totalGp
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
                        name: 'Net Profit/Loss By Supplier From: ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                        heading: heading,
                        merges: merges,
                        specification: specification, // <- Report specification
                        data: reportFullDataset.data // <-- Report data
                    }
                ]
            );
    
            // You can then return this straight
            res.attachment('supplier_wise_sell.xlsx'); // This is sails.js specific (in general you need to set headers)
            res.send(report);
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