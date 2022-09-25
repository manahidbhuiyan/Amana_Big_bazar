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

const auth = require('../../../../../middleware/admin/auth');
const Branch = require('../../../../../models/Branch');


const {
    getAdminRoleChecking
} = require('../../../../../lib/helpers');


// @route GET api/report/branch-receiving/single/supplier-wise/details
// @description Get single supplier wise branch receiving report details pdf
// @access Private
router.post('/branch-receiving/all/supplier-wise/details', [
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

        let {from, to} = req.body

        from = new Date(from)
        from.setHours(0)
        from.setMinutes (0);
        from.setSeconds (0);

        to = new Date(to)
        to.setHours(23)
        to.setMinutes (59);
        to.setSeconds (59);



        const child = fork(path.join(__dirname, "subprocess", "all_supplier_wise_receiving_details.js"));

        const msg = {
            from,
            to,
            branch: req.query.branch,
            type: 'pdf'
        }

        child.send(msg)

        child.on('message', async (response) => {
            const {
                allSupplierInfo,
                grandTotalQuantity,
                grandTotalAmount,
                grandTotalDiscount
            } = response

            let branchInfo = await Branch.findById(req.query.branch).select('_id serialNo name address')
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
                branch_id: branchInfo.serialNo,
                branchName: branchInfo.name,
                branchAddress: branchInfo.address,
                "fromDate": ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
                "toDate": ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
                today: ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
                createTime,
                company_name : config.get('company').full_name,
                company_logo : config.get('company').company_logo,
                "allSupplierData": allSupplierInfo,
                "grandTotalQuantity": grandTotalQuantity.toFixed(2),
                "grandSubtotalAmount": (grandTotalAmount + grandTotalDiscount).toFixed(2),
                "grandTotalAmount": grandTotalAmount.toFixed(2),
                "grandTotalDiscount": grandTotalDiscount.toFixed(2)
            }

            var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', '..', 'reports', 'warehouse', 'all_supplier_receiving_details.html'), 'utf8');

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
                                <th style="font-size: 10px; text-align: left; width: 13% ;padding-left: 3px">Barcode</th>
                                <th style="font-size: 10px; text-align: left; width: 30%">Product</th>
                                <th style="font-size: 10px; text-align: right;">Unit Cost</th>
                                <th style="font-size: 10px; text-align: right;">Return Qty</th>
                                <th style="font-size: 10px; text-align: right;">Total Cost</th>
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
                path: "./public/reports/brance_wise_warehouse_all_receiving_details.pdf"
            };

            pdf.create(document, options)
                .then(data => {
                    const file = data.filename;
                    // console.log(file)
                    return res.status(200).json({
                        auth: true,
                        fileLink: '/reports/brance_wise_warehouse_all_receiving_details.pdf'
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


// @route GET api/report/warehouse/branch-receiving/all/supplier-wise/details/:adminID/:from/:to?branch=..........
// @description Get warehouse all supplier wise branch receiving report details excel 
// @access Private
router.get('/branch-receiving/all/supplier-wise/details/:adminID/:from/:to', [
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
        to.setMinutes(59);
        to.setSeconds(59);


        const child = fork(path.join(__dirname, "subprocess", "all_supplier_wise_receiving_details.js"));

        const msg = {
            from,
            to,
            branch: req.query.branch,
            type: 'excel'
        }

        child.send(msg)

        child.on('message', async (response) => {
            const {
                mainData,
                grandTotalQuantity,
                grandTotalAmount
            } = response

            let branchInfo = await Branch.findById(req.query.branch).select('_id serialNo name address')
            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            let reportFullDataset = {
                fromDate: ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
                toDate: ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
                branch_id: branchInfo.serialNo,
                branchName: branchInfo.name,
                branchAddress: branchInfo.address,
                data: mainData,
                grandTotalQuantity: grandTotalQuantity,
                grandTotalAmount: grandTotalAmount
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
                barcode: { // <- the key should match the actual data key
                    displayName: 'Barcode', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                productName: { // <- the key should match the actual data key
                    displayName: 'Product Name', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 300 // <- width in pixels
                },
                unitCost: { // <- the key should match the actual data key
                    displayName: 'Unit Cost', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                receiceQTY: { // <- the key should match the actual data key
                    displayName: 'Return Qty', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                costAmount: { // <- the key should match the actual data key
                    displayName: 'Cost Amount', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                }
            }


            const heading = [
                [{ value: 'Warehouse All Supplier Receiving Details From : ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Name: ' + reportFullDataset.branchName, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.branchAddress, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                [''],
                [{ value: 'Grand Total Quantity: ' + reportFullDataset.grandTotalQuantity, style: styles.shop_info }],
                [{ value: 'Grand Total Cost: ' + reportFullDataset.grandTotalAmount, style: styles.shop_info }],
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
                        name: 'Warehouse All Supplier Receiving Details From: ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                        heading: heading,
                        merges: merges,
                        specification: specification, // <- Report specification
                        data: reportFullDataset.data // <-- Report data
                    }
                ]
            );

            // You can then return this straight
            res.attachment('warehouse_all_supplier_receiving_details.xlsx'); // This is sails.js specific (in general you need to set headers)
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

// @route GET api/report/branch-receiving/all/supplier-wise/summery
// @description Get all supplier wise branch receiving report summery pdf
// @access Private
router.post('/branch-receiving/all/supplier-wise/summery', [
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

        let {from, to} = req.body

        from = new Date(from)
        from.setHours(0)
        from.setMinutes (0);
        from.setSeconds (0);

        to = new Date(to)
        to.setHours(23)
        to.setMinutes (59);
        to.setSeconds(59);

        const child = fork(path.join(__dirname, "subprocess", "all_supplier_wise_receiving_summery.js"));

        const msg = {
            from,
            to,
            branch: req.query.branch,
            type: 'pdf'
        }

        child.send(msg)

        child.on('message', async (response) => {
            const {
                allSupplierInfo,
                grandTotalQuantity,
                grandTotalAmount,
                grandTotalDiscount
            } = response

            let branchInfo = await Branch.findById(req.query.branch).select('_id serialNo name address')
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
                branch_id: branchInfo.serialNo,
                branchName: branchInfo.name,
                branchAddress: branchInfo.address,
                "fromDate": ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
                "toDate": ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
                today: ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
                createTime,
                company_name : config.get('company').full_name,
                company_logo : config.get('company').company_logo,
                "allSupplierData": allSupplierInfo,
                "grandTotalQuantity": grandTotalQuantity.toFixed(2),
                "grandSubtotalAmount": (grandTotalAmount + grandTotalDiscount).toFixed(2),
                "grandTotalAmount": grandTotalAmount.toFixed(2),
                "grandTotalDiscount": grandTotalDiscount.toFixed(2)
            }

            //return res.json(allDataInfo)

            var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', '..', 'reports', 'warehouse', 'all_supplier_receiving_summery.html'), 'utf8');

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
                                <th style="font-size: 10px; text-align: left; width: 17% ;padding-left: 3px">Supplier</th>
                                <th style="font-size: 10px; text-align: left; width: 30%">Return No</th>
                                <th style="font-size: 10px; text-align: right;">Return Qty</th>
                                <th style="font-size: 10px; text-align: right;">Total</th>
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
                path: "./public/reports/brance_wise_warehouse_all_receiving_summery.pdf"
            };

            pdf.create(document, options)
                .then(data => {
                    const file = data.filename;
                    // console.log(file)
                    return res.status(200).json({
                        auth: true,
                        fileLink: '/reports/brance_wise_warehouse_all_receiving_summery.pdf'
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

// @route GET api/report/warehouse/branch-receiving/all/supplier-wise/summery/:adminID/:from/:to?branch=..........
// @description Get all warehouse supplier receiving summery excel
// @access Private
router.get('/branch-receiving/all/supplier-wise/summery/:adminID/:from/:to', [
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


        const child = fork(path.join(__dirname, "subprocess", "all_supplier_wise_receiving_summery.js"));

        const msg = {
            from,
            to,
            branch: req.query.branch,
            type: 'excel'
        }

        child.send(msg)

        child.on('message', async (response) => {
            const {
                mainData,
                grandTotalQuantity,
                grandTotalAmount,
                grandTotalDiscount
            } = response

            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            let branchInfo = await Branch.findById(req.query.branch).select('_id serialNo name address')
            let reportFullDataset = {
                fromDate: ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
                toDate: ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
                branch_id: branchInfo.serialNo,
                branchName: branchInfo.name,
                branchAddress: branchInfo.address,
                data: mainData,
                grandTotalQuantity: grandTotalQuantity,
                grandTotalAmount: grandTotalAmount
            }

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
                receiveNo: { // <- the key should match the actual data key
                    displayName: 'Return No', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200, // <- width in pixels
                    cellStyle: styles.text_left
                },
                receiceQTY: { // <- the key should match the actual data key
                    displayName: 'Return Qty', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                productToatalCost: { // <- the key should match the actual data key
                    displayName: 'Return Total Cost', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                }
            }


            const heading = [
                [{ value: 'Warehouse All Supplier Receiving Summery From : ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Name: ' + reportFullDataset.branchName, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.branchAddress, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                [{ value: 'Grand Total Quantity: ' + reportFullDataset.grandTotalQuantity, style: styles.shop_info }],
                [{ value: 'Grand Total Cost: ' + reportFullDataset.grandTotalAmount, style: styles.shop_info }],
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
                        name: 'Warehouse All Supplier Receiving Summery From: ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                        heading: heading,
                        merges: merges,
                        specification: specification, // <- Report specification
                        data: reportFullDataset.data // <-- Report data
                    }
                ]
            );

            // You can then return this straight
            res.attachment('warehouse_all_supplier_receiving_summery.xlsx'); // This is sails.js specific (in general you need to set headers)
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

// @route GET api/report/branch-receiving/single/supplier-wise/details
// @description Get single supplier wise branch receiving report details pdf
// @access Private
router.post('/branch-receiving/single/supplier-wise/details', [
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

        let {from, to, supplier} = req.body

        from = new Date(from)
        from.setHours(0)
        from.setMinutes (0);
        from.setSeconds (0);

        to = new Date(to)
        to.setHours(23)
        to.setMinutes (59);
        to.setSeconds (59);

        const child = fork(path.join(__dirname, "subprocess", "single_supplier_wise_receiving_details.js"));

        const msg = {
            from,
            to,
            branch: req.query.branch,
            supplier,
            type: 'pdf'
        }

        child.send(msg)

        child.on('message', async (response) => {
            const {
                allSupplierInfo,
                grandTotalQuantity,
                grandTotalAmount,
                grandTotalDiscount
            } = response

            let branchInfo = await Branch.findById(req.query.branch).select('_id serialNo name address')
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
                branch_id: branchInfo.serialNo,
                branchName: branchInfo.name,
                branchAddress: branchInfo.address,
                "fromDate": ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
                "toDate": ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
                today: ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
                createTime,
                company_name : config.get('company').full_name,
                company_logo : config.get('company').company_logo,
                "allSupplierData": allSupplierInfo,
                "grandTotalQuantity": grandTotalQuantity.toFixed(2),
                "grandTotalAmount": grandTotalAmount.toFixed(2),
                "grandTotalDiscount": grandTotalDiscount.toFixed(2)
            }

            //return res.json(allDataInfo)

            var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', '..', 'reports', 'warehouse', 'single_supplier_receiving_details.html'), 'utf8');

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
                                <th style="font-size: 10px; text-align: left; width: 13% ;padding-left: 3px">Barcode</th>
                                <th style="font-size: 10px; text-align: left; width: 30%">Product</th>
                                <th style="font-size: 10px; text-align: right;">Unit Cost</th>
                                <th style="font-size: 10px; text-align: right;">Return Qty</th>
                                <th style="font-size: 10px; text-align: right;">Total Cost</th>
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
                path: "./public/reports/brance_wise_warehouse_single_receiving_details.pdf"
            };

            pdf.create(document, options)
                .then(data => {
                    const file = data.filename;
                    // console.log(file)
                    return res.status(200).json({
                        auth: true,
                        fileLink: '/reports/brance_wise_warehouse_single_receiving_details.pdf'
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

// @route GET api/report/warehouse/single/supplier-return/details/:adminID/:from/:to?branch=..........
// @description Get warehouse single supplier wise branch receiving report details excel 
// @access Private
router.get('/branch-receiving/single/supplier-wise/details/:adminID/:from/:to/:supplier', [
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

        from = new Date(from)
        from.setHours(0)
        from.setMinutes(0);
        from.setSeconds(0);

        to = new Date(to)
        to.setHours(23)
        to.setMinutes(59);
        to.setSeconds(59);


        const child = fork(path.join(__dirname, "subprocess", "single_supplier_wise_receiving_details.js"));

        const msg = {
            from,
            to,
            supplier,
            branch: req.query.branch,
            type: 'excel'
        }

        child.send(msg)

        child.on('message', async (response) => {
            const {
                mainData,
                grandTotalQuantity,
                grandTotalAmount
            } = response

            let branchInfo = await Branch.findById(req.query.branch).select('_id serialNo name address')
            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            let reportFullDataset = {
                fromDate: ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
                toDate: ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
                branch_id: branchInfo.serialNo,
                branchName: branchInfo.name,
                branchAddress: branchInfo.address,
                data: mainData,
                grandTotalQuantity: grandTotalQuantity,
                grandTotalAmount: grandTotalAmount
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
                barcode: { // <- the key should match the actual data key
                    displayName: 'Barcode', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                productName: { // <- the key should match the actual data key
                    displayName: 'Product Name', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 300 // <- width in pixels
                },
                unitCost: { // <- the key should match the actual data key
                    displayName: 'Unit Cost', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                receiceQTY: { // <- the key should match the actual data key
                    displayName: 'Return Qty', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                costAmount: { // <- the key should match the actual data key
                    displayName: 'Cost Amount', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                }
            }


            const heading = [
                [{ value: 'Warehouse Single Supplier Receiving Details From : ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Name: ' + reportFullDataset.branchName, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.branchAddress, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                [''],
                [{ value: 'Grand Total Quantity: ' + reportFullDataset.grandTotalQuantity, style: styles.shop_info }],
                [{ value: 'Grand Total Cost: ' + reportFullDataset.grandTotalAmount, style: styles.shop_info }],
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
                        name: 'Warehouse Single Supplier Receiving Details From: ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                        heading: heading,
                        merges: merges,
                        specification: specification, // <- Report specification
                        data: reportFullDataset.data // <-- Report data
                    }
                ]
            );

            // You can then return this straight
            res.attachment('warehouse_single_supplier_receiving_details.xlsx'); // This is sails.js specific (in general you need to set headers)
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


// @route GET api/report/branch-receiving/single/supplier-wise/summery
// @description Get single supplier wise branch receiving report summery pdf
// @access Private
router.post('/branch-receiving/single/supplier-wise/summery', [
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

        let {from, to, supplier} = req.body

        from = new Date(from)
        from.setHours(0)
        from.setMinutes (0);
        from.setSeconds (0);
        
        to = new Date(to)
        to.setHours(23)
        to.setMinutes (59);
        to.setSeconds(59);

        const child = fork(path.join(__dirname, "subprocess", "single_supplier_wise_receiving_summery.js"));

        const msg = {
            from,
            to,
            branch: req.query.branch,
            supplier,
            type: 'pdf'
        }

        child.send(msg)

        child.on('message', async (response) => {
            const {
                allSupplierInfo,
                grandTotalQuantity,
                grandTotalAmount,
                grandTotalDiscount
            } = response

            let branchInfo = await Branch.findById(req.query.branch).select('_id serialNo name address')
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
                branch_id: branchInfo.serialNo,
                branchName: branchInfo.name,
                branchAddress: branchInfo.address,
                "fromDate": ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
                "toDate": ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
                today: ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
                createTime,
                company_name : config.get('company').full_name,
                company_logo : config.get('company').company_logo,
                "allSupplierData": allSupplierInfo,
                "grandTotalQuantity": grandTotalQuantity.toFixed(2),
                "grandTotalAmount": grandTotalAmount.toFixed(2),
                "grandTotalDiscount": grandTotalDiscount.toFixed(2)
            }

            //return res.json(allDataInfo)

            var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', '..', 'reports', 'warehouse', 'single_supplier_receiving_summery.html'), 'utf8');

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
                                <th style="font-size: 10px; text-align: left; width: 17% ;padding-left: 3px">Supplier</th>
                                <th style="font-size: 10px; text-align: left; width: 30%">Return No</th>
                                <th style="font-size: 10px; text-align: right;">Return Qty</th>
                                <th style="font-size: 10px; text-align: right;">Total</th>
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
                path: "./public/reports/brance_wise_warehouse_single_receiving_summery.pdf"
            };

            pdf.create(document, options)
                .then(data => {
                    const file = data.filename;
                    // console.log(file)
                    return res.status(200).json({
                        auth: true,
                        fileLink: '/reports/brance_wise_warehouse_single_receiving_summery.pdf'
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

// @route GET api/report/warehouse/branch-receiving/single/supplier-wise/summery/:adminID/:from/:to/:supplier?branch=..........
// @description Get single warehouse supplier receiving summery excel
// @access Private
router.get('/branch-receiving/single/supplier-wise/summery/:adminID/:from/:to/:supplier', [
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

        from = new Date(from)
        to = new Date(to)
        to.setHours(to.getHours() + 23)
        to.setMinutes(to.getMinutes() + 59);
        to.setSeconds(to.getSeconds() + 59);


        const child = fork(path.join(__dirname, "subprocess", "single_supplier_wise_receiving_summery.js"));

        const msg = {
            from,
            to,
            branch: req.query.branch,
            type: 'excel',
            supplier
        }

        child.send(msg)

        child.on('message', async (response) => {
            const {
                mainData,
                grandTotalQuantity,
                grandTotalAmount,
                grandTotalDiscount
            } = response

            let branchInfo = await Branch.findById(req.query.branch).select('_id serialNo name address')
            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

            let reportFullDataset = {
                fromDate: ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
                toDate: ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
                branch_id: branchInfo.serialNo,
                branchName: branchInfo.name,
                branchAddress: branchInfo.address,
                data: mainData,
                grandTotalQuantity: grandTotalQuantity,
                grandTotalAmount: grandTotalAmount
            }

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
                receiveNo: { // <- the key should match the actual data key
                    displayName: 'Return No', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200, // <- width in pixels
                    cellStyle: styles.text_left
                },
                receiceQTY: { // <- the key should match the actual data key
                    displayName: 'Return Qty', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                productToatalCost: { // <- the key should match the actual data key
                    displayName: 'Return Total Cost', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                }
            }


            const heading = [
                [{ value: 'Warehouse Single Supplier Receiving Summery From : ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Name: ' + reportFullDataset.branchName, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.branchAddress, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                [{ value: 'Grand Total Quantity: ' + reportFullDataset.grandTotalQuantity, style: styles.shop_info }],
                [{ value: 'Grand Total Cost: ' + reportFullDataset.grandTotalAmount, style: styles.shop_info }],
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
                        name: 'Warehouse Single Supplier Receiving Summery From: ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                        heading: heading,
                        merges: merges,
                        specification: specification, // <- Report specification
                        data: reportFullDataset.data // <-- Report data
                    }
                ]
            );

            // You can then return this straight
            res.attachment('warehouse_single_supplier_receiving_summery.xlsx'); // This is sails.js specific (in general you need to set headers)
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