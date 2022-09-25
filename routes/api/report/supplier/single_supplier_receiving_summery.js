const express = require('express');
const router = express.Router();
const { fork } = require('child_process');

const config = require('config')
const jwt = require('jsonwebtoken');
const excel = require('node-excel-export');

const {
    check,
    validationResult
} = require('express-validator');

var pdf = require("pdf-creator-node");
var fs = require('fs');
var path = require('path');

const auth = require('../../../../middleware/admin/auth');
const Branch = require('../../../../models/Branch');


const {
    getAdminRoleChecking
} = require('../../../../lib/helpers');


// @route GET api/report//single/supplier-receiving/summery?branch=..........
// @description Get single supplier receiving report details pdf 
// @access Private
router.post('/single/supplier-receiving/summery', [
    auth,
    [
        check('from', 'From date is required').not().isEmpty(),
        check('to', 'To date is required').not().isEmpty(),
        check('supplier', 'Supplier id is required').not().isEmpty()
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

        let {from, to, supplier, branch, receivingPlace} = req.body

        from = new Date(from)
        from.setHours(0)
        from.setMinutes (0);
        from.setSeconds (0);
        
        to = new Date(to)
        to.setHours(23)
        to.setMinutes (59);
        to.setSeconds (59);
        const child = fork(path.join(__dirname, "subprocess", "single_supplier_receiving_summery.js"));

        const msg = {
            from,
            to,
            branch,
            type: 'pdf',
            supplier,
            receivingPlace
        }

        child.send(msg)

        child.on('message', async (response) => {
            const {
                branchWiseReceiving,
                grandTotalQuantity,
                grandTotalAmount,
                grandTotalDiscount,
                grandTotalSellAmount
            } = response

            //let branchInfo = await Branch.findById(req.query.branch).select('_id name address serialNo phone')
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
                // "branchName": branchInfo.name.trim(),
                // "branchAddress": branchInfo.address,
                title : branch == 'all' ? "Single Supplier Receiving Summary(all branch)" : "Single Supplier Receiving Summary(single branch)",
                "fromDate": ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
                "toDate": ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
                today: ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
                createTime,
                // branch_phone : branchInfo.phone,
                // branch_id : branchInfo.serialNo,
                company_name : config.get('company').full_name,
                company_logo : config.get('company').company_logo,
                "branchWiseReceiving": branchWiseReceiving,
                "grandTotalQuantity": grandTotalQuantity.toFixed(2),
                "grandTotalAmount": grandTotalAmount.toFixed(2),
                "grandTotalDiscount": grandTotalDiscount.toFixed(2),
                "grandTotalSellAmount": grandTotalSellAmount.toFixed(2),
                "grandGP": (((grandTotalSellAmount - grandTotalAmount) / grandTotalSellAmount) * 100).toFixed(2),
                receivingPlace
            }

            //return res.json(allDataInfo)

            var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'reports', 'summery', 'single_supplier_receiving_summery.html'), 'utf8');

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
                                <th style="font-size: 10px; text-align: left; width: 17% ;padding-left: 3px"></th>
                                <th style="font-size: 10px; text-align: left; width: 22%">Receiving No</th>
                                <th style="font-size: 10px; text-align: right;">Receive Qty</th>
                                <th style="font-size: 10px; text-align: center;">Total Cost</th>
                                <th style="font-size: 10px; text-align: center;">Total Sell</th>
                                <th style="font-size: 10px; text-align: left;">GP(%)</th>
                                <th style="font-size: 10px; text-align: right;"></th>
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
                path: "./public/reports/single_supplier_receiving_summery.pdf"
            };

            pdf.create(document, options)
                .then(data => {
                    const file = data.filename;
                    // console.log(file)
                    return res.status(200).json({
                        auth: true,
                        fileLink: '/reports/single_supplier_receiving_summery.pdf'
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

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/report/single/supplier-receiving/summery/:adminID/:from/:to/:supplier?branch=..........
// @description Get single supplier receiving report summery excel 
// @access Private
router.get('/single/supplier-receiving/summery/:adminID/:from/:to/:supplier/:branch/:receivingPlace', [
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
        let supplier = req.params.supplier
        let branch = req.params.branch
        let receivingPlace = req.params.receivingPlace

        from = new Date(from)
        to = new Date(to)
        to.setHours(to.getHours() + 23)
        to.setMinutes(to.getMinutes() + 59);
        to.setSeconds(to.getSeconds() + 59);
        const child = fork(path.join(__dirname, "subprocess", "single_supplier_receiving_summery.js"));

        const msg = {
            from,
            to,
            branch,
            type: 'excel',
            receivingPlace,
            supplier
        }

        child.send(msg)

        child.on('message', async (response) => {
            const {
                mainData,
                grandTotalQuantity,
                grandTotalAmount,
                grandTotalDiscount,
                grandTotalSellAmount,
                supplierInformations
            } = response

            //let branchInfo = await Branch.findById(req.query.branch).select('_id name address')
            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            let reportFullDataset = {
                fromDate: ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
                toDate: ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
                // shopName: branchInfo.name.trim(),
                // shopAddress: branchInfo.address,
                supplierName: supplierInformations.name,
                supplierCode: supplierInformations.serialNo,
                data: mainData,
                grandTotalQuantity: grandTotalQuantity.toFixed(2),
                grandSubtotalAmount: (grandTotalAmount + grandTotalDiscount).toFixed(2),
                grandTotalAmount: grandTotalAmount.toFixed(2),
                grandTotalDiscount: grandTotalDiscount.toFixed(2),
                grandTotalSellAmount: grandTotalSellAmount.toFixed(2),
                grandTotalGP: (((grandTotalSellAmount - grandTotalAmount) / grandTotalSellAmount) * 100).toFixed(2)
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
                supplier: { // <- the key should match the actual data key
                    displayName: 'Supplier', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200, // <- width in pixels
                },
                date: { // <- the key should match the actual data key
                    displayName: 'Date', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                fromWarehouse: { // <- the key should match the actual data key
                    displayName: 'From Warehouse', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                receiveNo: { // <- the key should match the actual data key
                    displayName: 'Receiving No', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200, // <- width in pixels
                    cellStyle: styles.text_left
                },
                receiceQTY: { // <- the key should match the actual data key
                    displayName: 'Receive Qty', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                productToatalCost: { // <- the key should match the actual data key
                    displayName: 'Receiving Total Cost', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                productToatalSell: { // <- the key should match the actual data key
                    displayName: 'Receiving Total Sell', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                gp: { // <- the key should match the actual data key
                    displayName: 'Receiving Gp(%)', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                }
            }

            let branchNum = (branch == "all") ? 'All Branch)' : 'Single Branch)'
            const heading = [
                [{ value: 'Single Supplier Receiving Summery(' + branchNum + 'From : ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                // [{ value: 'Shop Name: ' + reportFullDataset.shopName, style: styles.shop_info }],
                // [{ value: 'Shop Address: ' + reportFullDataset.shopAddress, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                [{ value: 'Supplier Name: ' + reportFullDataset.supplierName, style: styles.shop_info }],
                [{ value: 'Supplier Serial No: ' + reportFullDataset.supplierCode, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                [{ value: 'Grand SubTotal Cost: ' + reportFullDataset.grandSubtotalAmount, style: styles.shop_info }],
                [{ value: 'Total Discount: ' + reportFullDataset.grandTotalDiscount, style: styles.shop_info }],
                [{ value: 'Grand Total Quantity: ' + reportFullDataset.grandTotalQuantity, style: styles.shop_info }],
                [{ value: 'Grand Total Cost: ' + reportFullDataset.grandTotalAmount, style: styles.shop_info }],
                [{ value: 'Grand Total Sell: ' + reportFullDataset.grandTotalSellAmount, style: styles.shop_info }],
                [{ value: 'Grand Total GP: ' + reportFullDataset.grandTotalGP, style: styles.shop_info }],
                ['']

            ];

            const merges = [
                { start: { row: 1, column: 1 }, end: { row: 1, column: 10 } }
            ]

            // Create the excel report.
            // This function will return Buffer
            const report = excel.buildExport(
                [ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
                    {
                        name: 'Single Supplier Receiving Summery(' + branchNum + 'From: ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                        heading: heading,
                        merges: merges,
                        specification: specification, // <- Report specification
                        data: reportFullDataset.data // <-- Report data
                    }
                ]
            );

            // You can then return this straight
            res.attachment('single_supplier_receiving_summery.xlsx'); // This is sails.js specific (in general you need to set headers)
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