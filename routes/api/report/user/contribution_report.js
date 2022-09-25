
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


// @route GET api/report/customer/contribution?branch=..........
// @description Get customer contribution reoprt pdf
// @access Private
router.post('/customer/contribution', [
    adminAuth,
    [
        check('from', 'From date is required').not().isEmpty(),
        check('to', 'To date is required').not().isEmpty(),
        check('field', 'Field is required').not().isEmpty()
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
            from,
            to,
            field
        } = req.body


        from = new Date(from)
        from.setHours(0)
        from.setMinutes(0);
        from.setSeconds(0);

        to = new Date(to)
        to.setHours(23)
        to.setMinutes(59);
        to.setSeconds(59);

        const child = fork(path.join(__dirname, "subprocess", "contribution_report.js"));

        const msg = {
            from,
            to,
            field,
            branch: req.query.branch,
            type: 'pdf'
        }
        child.send(msg)

        child.on('message', async (response) => {

            const {
                finalReportData,
                grandTotal,
                grandCustomerTotal
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
                data: finalReportData,
                grandTotal: grandTotal,
                grandCustomerTotal: grandCustomerTotal.toFixed(2)
            }

            var html;
            if (field == 'category') {
                html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'reports', 'customer', 'category_customer_contribution.html'), 'utf8');
            } else {
                html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'reports', 'customer', 'subcategory_customer_contribution.html'), 'utf8');
            }

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
                path: `./public/reports/${field}_wise_customer_contribution.pdf`
            };

            pdf.create(document, options)
                .then(data => {
                    const file = data.filename;
                    return res.status(200).json({
                        auth: true,
                        fileLink: `/reports/${field}_wise_customer_contribution.pdf`
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


// @route GET api/report/customer/contribution/category/:adminID/:from/:to/:field?branch=..........
// @description Get category wise customer contribution reoprt excel
// @access Private
router.get('/customer/contribution/category/:adminID/:from/:to/:field', [
    [
        check('from', 'From date is required').not().isEmpty(),
        check('to', 'To date is required').not().isEmpty(),
        check('field', 'Field is required').not().isEmpty()
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
        const adminDetails = await Admin.find({
            branches: {
                $in: req.query.branch
            }
        }).select("_id name email")

        let from = req.params.from
        let to = req.params.to
        let field = req.params.field

        from = new Date(from)
        from.setHours(0)
        from.setMinutes(0);
        from.setSeconds(0);

        to = new Date(to)
        to.setHours(23)
        to.setMinutes(59);
        to.setSeconds(59);


        const child = fork(path.join(__dirname, "subprocess", "contribution_report.js"));

        const msg = {
            from,
            to,
            field,
            branch: req.query.branch,
            type: 'excel'
        }
        child.send(msg)

        child.on('message', async (response) => {

            const {
                finalReportData,
                grandTotal,
                grandCustomerTotal
            } = response

            let branchInfo = await Branch.findById(req.query.branch).select('_id serialNo name address');
            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

            let reportFullDataset = {
                fromDate: ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
                toDate: ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
                shopName: branchInfo.name.trim(),
                shopAddress: branchInfo.address,
                shopCode: branchInfo.serialNo,
                data: finalReportData,
                grandTotal: grandTotal,
                grandCustomerTotal: grandCustomerTotal.toFixed(2)
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
                name: { // <- the key should match the actual data key
                    displayName: 'User Name', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                number: { // <- the key should match the actual data key
                    displayName: 'Phone No', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100, // <- width in pixels
                    cellStyle: styles.text_left
                },
                cosmetics: { // <- the key should match the actual data key
                    displayName: 'cosmetics', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                food_snacks: { // <- the key should match the actual data key
                    displayName: 'food_snacks', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100, // <- width in pixels
                    cellStyle: styles.text_left
                },
                clock_glass: { // <- the key should match the actual data key
                    displayName: 'clock_glass', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                commodities: { // <- the key should match the actual data key
                    displayName: 'commodities', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                leather_bag: { // <- the key should match the actual data key
                    displayName: 'leather_bag', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                baby_care: { // <- the key should match the actual data key
                    displayName: 'baby_care', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                toiletries: { // <- the key should match the actual data key
                    displayName: 'toiletries', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                shari_others: { // <- the key should match the actual data key
                    displayName: 'shari_others', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                garments: { // <- the key should match the actual data key
                    displayName: 'garments', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                pet_care: { // <- the key should match the actual data key
                    displayName: 'pet_care', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                }
            }

            const specification2 = {
                dairy: { // <- the key should match the actual data key
                    displayName: 'dairy', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                stationary: { // <- the key should match the actual data key
                    displayName: 'stationary', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                personal_care: { // <- the key should match the actual data key
                    displayName: 'personal_care', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100, // <- width in pixels
                    cellStyle: styles.text_left
                },
                electronics_home_appli_: { // <- the key should match the actual data key
                    displayName: 'electronics_home_appli', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                toys_sports: { // <- the key should match the actual data key
                    displayName: 'toys_sports', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                footwear: { // <- the key should match the actual data key
                    displayName: 'footwear', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                frozen_item: { // <- the key should match the actual data key
                    displayName: 'frozen_item', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                crockeries: { // <- the key should match the actual data key
                    displayName: 'crockeries', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                juice_beverage: { // <- the key should match the actual data key
                    displayName: 'juice_beverage', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                fish_meat: { // <- the key should match the actual data key
                    displayName: 'fish_meat', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                }
            }

            const specification3 = {
                baby_food: { // <- the key should match the actual data key
                    displayName: 'baby_food', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                house_hold: { // <- the key should match the actual data key
                    displayName: 'house_hold', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                medicine: { // <- the key should match the actual data key
                    displayName: 'medicine', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                offer: { // <- the key should match the actual data key
                    displayName: 'offer', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                grocery: { // <- the key should match the actual data key
                    displayName: 'grocery', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                showpiece: { // <- the key should match the actual data key
                    displayName: 'showpiece', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                jewlery: { // <- the key should match the actual data key
                    displayName: 'jewlery', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                fruits_vegetables: { // <- the key should match the actual data key
                    displayName: 'fruits_vegetables', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                total: { // <- the key should match the actual data key
                    displayName: 'Total', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                }
            }

            const heading = [
                [{ value: `Category wise Contribution Report From : ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Code: ' + reportFullDataset.shopCode, style: styles.shop_info }],
                [{ value: 'Shop Name: ' + reportFullDataset.shopName, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.shopAddress, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                ['Grand Total:', ' ',
                    reportFullDataset.grandTotal.cosmetics,
                    reportFullDataset.grandTotal.food_snacks,
                    reportFullDataset.grandTotal.clock_glass,
                    reportFullDataset.grandTotal.commodities,
                    reportFullDataset.grandTotal.leather_bag,
                    reportFullDataset.grandTotal.baby_care,
                    reportFullDataset.grandTotal.toiletries,
                    reportFullDataset.grandTotal.shari_others,
                    reportFullDataset.grandTotal.garments,
                    reportFullDataset.grandTotal.pet_care
                ],
            ];

            const heading2 = [
                [{ value: `Category wise Contribution Report From : ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Code: ' + reportFullDataset.shopCode, style: styles.shop_info }],
                [{ value: 'Shop Name: ' + reportFullDataset.shopName, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.shopAddress, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                [
                    reportFullDataset.grandTotal.dairy,
                    reportFullDataset.grandTotal.stationary,
                    reportFullDataset.grandTotal.personal_care,
                    reportFullDataset.grandTotal.electronics_home_appli_,
                    reportFullDataset.grandTotal.toys_sports,
                    reportFullDataset.grandTotal.footwear,
                    reportFullDataset.grandTotal.frozen_item,
                    reportFullDataset.grandTotal.crockeries,
                    reportFullDataset.grandTotal.juice_beverage,
                    reportFullDataset.grandTotal.fish_meat
                ],
            ];

            const heading3 = [
                [{ value: `Category wise Contribution Report From : ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Code: ' + reportFullDataset.shopCode, style: styles.shop_info }],
                [{ value: 'Shop Name: ' + reportFullDataset.shopName, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.shopAddress, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                [
                    reportFullDataset.grandTotal.baby_food,
                    reportFullDataset.grandTotal.house_hold,
                    reportFullDataset.grandTotal.medicine,
                    reportFullDataset.grandTotal.offer,
                    reportFullDataset.grandTotal.grocery,
                    reportFullDataset.grandTotal.showpiece,
                    reportFullDataset.grandTotal.jewlery,
                    reportFullDataset.grandTotal.fruits_vegetables,
                    reportFullDataset.grandCustomerTotal
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
                        name: `Category wise Contribution Part 1 Report from: ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                        heading: heading,
                        merges: merges,
                        specification: specification, // <- Report specification
                        data: reportFullDataset.data[0].reportDataOne // <-- Report data
                    },
                    {
                        name: `Category wise Contribution Part 2 Report from: ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                        heading: heading2,
                        merges: merges,
                        specification: specification2, // <- Report specification
                        data: reportFullDataset.data[1].reportDataTwo // <-- Report data
                    },
                    {
                        name: `Category wise Contribution Part 3 Report from: ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                        heading: heading3,
                        merges: merges,
                        specification: specification3, // <- Report specification
                        data: reportFullDataset.data[2].reportDataThree // <-- Report data
                    }
                ]
            );

            // You can then return this straight
            res.attachment(`category_wise_contribution_report.xlsx`); // This is sails.js specific (in general you need to set headers)
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

// @route GET api/report/customer/contribution/subcategory/:adminID/:from/:to/:field?branch=..........
// @description Get subcategory wise customer contribution reoprt excel
// @access Private
router.get('/customer/contribution/subcategory/:adminID/:from/:to/:field', [
    [
        check('from', 'From date is required').not().isEmpty(),
        check('to', 'To date is required').not().isEmpty(),
        check('field', 'Field is required').not().isEmpty()
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
        const adminDetails = await Admin.find({
            branches: {
                $in: req.query.branch
            }
        }).select("_id name email")

        let from = req.params.from
        let to = req.params.to
        let field = req.params.field

        from = new Date(from)
        from.setHours(0)
        from.setMinutes(0);
        from.setSeconds(0);

        to = new Date(to)
        to.setHours(23)
        to.setMinutes(59);
        to.setSeconds(59);

        console.log(typeof (from))

        const child = fork(path.join(__dirname, "subprocess", "contribution_report.js"));

        const msg = {
            from,
            to,
            field,
            branch: req.query.branch,
            type: 'excel'
        }
        child.send(msg)

        child.on('message', async (response) => {

            const {
                finalReportData,
                grandTotal,
                grandCustomerTotal
            } = response

            let branchInfo = await Branch.findById(req.query.branch).select('_id serialNo name address');
            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

            let reportFullDataset = {
                fromDate: ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
                toDate: ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
                shopName: branchInfo.name.trim(),
                shopAddress: branchInfo.address,
                shopCode: branchInfo.serialNo,
                data: finalReportData,
                grandTotal: grandTotal,
                grandCustomerTotal: grandCustomerTotal.toFixed(2)
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



            const specification1 = {
                name: { // <- the key should match the actual data key
                    displayName: 'User Name', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                number: { // <- the key should match the actual data key
                    displayName: 'Phone No', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100, // <- width in pixels
                    cellStyle: styles.text_left
                },
                jam_jelly_pickle: { // <- the key should match the actual data key
                    displayName: 'jam_jelly_pickle', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                pest_control_mosquito_repellent: { // <- the key should match the actual data key
                    displayName: 'pest_control_mosquito_repellent', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100, // <- width in pixels
                    cellStyle: styles.text_left
                },
                fruits: { // <- the key should match the actual data key
                    displayName: 'fruits', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                toiletries: { // <- the key should match the actual data key
                    displayName: 'toiletries', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                baby_oral_care: { // <- the key should match the actual data key
                    displayName: 'baby_oral_care', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                electronics: { // <- the key should match the actual data key
                    displayName: 'electronics', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                air_freshener: { // <- the key should match the actual data key
                    displayName: 'air_freshener', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                eyepencil_eye: { // <- the key should match the actual data key
                    displayName: 'eyepencil_eye', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                supplement: { // <- the key should match the actual data key
                    displayName: 'supplement', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                antiseptic_items: { // <- the key should match the actual data key
                    displayName: 'antiseptic_items', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                }
            }
            const specification2 = {
                cosmetics: { // <- the key should match the actual data key
                    displayName: 'cosmetics', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                atta_maida_suji: { // <- the key should match the actual data key
                    displayName: 'atta_maida_suji', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100, // <- width in pixels
                    cellStyle: styles.text_left
                },
                detergents_liquid_cleanser: { // <- the key should match the actual data key
                    displayName: 'detergents_liquid_cleanser', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                bread_biscuit_cake_others: { // <- the key should match the actual data key
                    displayName: 'bread_biscuit_cake_others', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100, // <- width in pixels
                    cellStyle: styles.text_left
                },
                corn_flakes: { // <- the key should match the actual data key
                    displayName: 'corn_flakes', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                water: { // <- the key should match the actual data key
                    displayName: 'water', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                belt_wallet: { // <- the key should match the actual data key
                    displayName: 'belt_wallet', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                juice: { // <- the key should match the actual data key
                    displayName: 'juice', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                hair_clipper: { // <- the key should match the actual data key
                    displayName: 'hair_clipper', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                ice_cream: { // <- the key should match the actual data key
                    displayName: 'ice_cream', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                cereal: { // <- the key should match the actual data key
                    displayName: 'cereal', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                cheese: { // <- the key should match the actual data key
                    displayName: 'cheese', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                }
            }
            const specification3 = {
                crockeries_item: { // <- the key should match the actual data key
                    displayName: 'crockeries_item', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                coffee_tea: { // <- the key should match the actual data key
                    displayName: 'coffee_tea', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100, // <- width in pixels
                    cellStyle: styles.text_left
                },
                cotton_bads: { // <- the key should match the actual data key
                    displayName: 'cotton_bads', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                bed_sheet: { // <- the key should match the actual data key
                    displayName: 'bed_sheet', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100, // <- width in pixels
                    cellStyle: styles.text_left
                },
                can_food: { // <- the key should match the actual data key
                    displayName: 'can_food', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                pest_control: { // <- the key should match the actual data key
                    displayName: 'pest_control', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                butter_ghee: { // <- the key should match the actual data key
                    displayName: 'butter_ghee', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                shaving_item: { // <- the key should match the actual data key
                    displayName: 'shaving_item', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                colour_cosmetics: { // <- the key should match the actual data key
                    displayName: 'colour_cosmetics', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                kids: { // <- the key should match the actual data key
                    displayName: 'kids', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                diaper_wipes: { // <- the key should match the actual data key
                    displayName: 'diaper_wipes', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                essasenc_colour_syrup: { // <- the key should match the actual data key
                    displayName: 'essasenc_colour_syrup', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                }
            }
            const specification4 = {
                baby_hair_care: { // <- the key should match the actual data key
                    displayName: 'baby_hair_care', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                chocolate_chips_other: { // <- the key should match the actual data key
                    displayName: 'chocolate_chips_other', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100, // <- width in pixels
                    cellStyle: styles.text_left
                },
                baby_skin_care: { // <- the key should match the actual data key
                    displayName: 'baby_skin_care', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                energy_drink: { // <- the key should match the actual data key
                    displayName: 'energy_drink', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100, // <- width in pixels
                    cellStyle: styles.text_left
                },
                dish_wash: { // <- the key should match the actual data key
                    displayName: 'dish_wash', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                home_accessories: { // <- the key should match the actual data key
                    displayName: 'home_accessories', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                baby_accessories: { // <- the key should match the actual data key
                    displayName: 'baby_accessories', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                vinegar_mayonnaise_salad_dressing_spreads: { // <- the key should match the actual data key
                    displayName: 'vinegar_mayonnaise_salad_dressing_spreads', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                socks_other: { // <- the key should match the actual data key
                    displayName: 'socks_other', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                liquid_milk: { // <- the key should match the actual data key
                    displayName: 'liquid_milk', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                fabric_colour: { // <- the key should match the actual data key
                    displayName: 'fabric_colour', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                }
            }
            const specification5 = {
                showpiece: { // <- the key should match the actual data key
                    displayName: 'showpiece', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                school_bag: { // <- the key should match the actual data key
                    displayName: 'school_bag', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100, // <- width in pixels
                    cellStyle: styles.text_left
                },
                deodorants_body_sprays_roll_on: { // <- the key should match the actual data key
                    displayName: 'deodorants_body_sprays_roll_on', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                milk_powder: { // <- the key should match the actual data key
                    displayName: 'milk_powder', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100, // <- width in pixels
                    cellStyle: styles.text_left
                },
                oral_care_other: { // <- the key should match the actual data key
                    displayName: 'oral_care_other', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                salt_sugar: { // <- the key should match the actual data key
                    displayName: 'salt_sugar', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                under_garments: { // <- the key should match the actual data key
                    displayName: 'under_garments', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                gents: { // <- the key should match the actual data key
                    displayName: 'gents', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                honey_sweets: { // <- the key should match the actual data key
                    displayName: 'honey_sweets', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                rings_earrings: { // <- the key should match the actual data key
                    displayName: 'rings_earrings', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                tissues: { // <- the key should match the actual data key
                    displayName: 'tissues', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                fabric_brightener: { // <- the key should match the actual data key
                    displayName: 'fabric_brightener', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                }
            }
            const specification6 = {
                skin_care: { // <- the key should match the actual data key
                    displayName: 'skin_care', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                spice_mix: { // <- the key should match the actual data key
                    displayName: 'spice_mix', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100, // <- width in pixels
                    cellStyle: styles.text_left
                },
                frozen_item: { // <- the key should match the actual data key
                    displayName: 'frozen_item', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                kasundi: { // <- the key should match the actual data key
                    displayName: 'kasundi', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100, // <- width in pixels
                    cellStyle: styles.text_left
                },
                mayonise: { // <- the key should match the actual data key
                    displayName: 'mayonise', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                meat: { // <- the key should match the actual data key
                    displayName: 'meat', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                nail_polish_nail_cutter: { // <- the key should match the actual data key
                    displayName: 'nail_polish_nail_cutter', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                ladies: { // <- the key should match the actual data key
                    displayName: 'ladies', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                wall_clock: { // <- the key should match the actual data key
                    displayName: 'wall_clock', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                toys: { // <- the key should match the actual data key
                    displayName: 'toys', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                cat_food: { // <- the key should match the actual data key
                    displayName: 'cat_food', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                rice_chal: { // <- the key should match the actual data key
                    displayName: 'rice_chal', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                }
            }
            const specification7 = {
                ladies_bag: { // <- the key should match the actual data key
                    displayName: 'ladies_bag', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                ladies_garments: { // <- the key should match the actual data key
                    displayName: 'ladies_garments', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100, // <- width in pixels
                    cellStyle: styles.text_left
                },
                sports: { // <- the key should match the actual data key
                    displayName: 'sports', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                soap: { // <- the key should match the actual data key
                    displayName: 'soap', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100, // <- width in pixels
                    cellStyle: styles.text_left
                },
                gents_garments: { // <- the key should match the actual data key
                    displayName: 'gents_garments', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                fresh_water_fish: { // <- the key should match the actual data key
                    displayName: 'fresh_water_fish', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                sea_fish: { // <- the key should match the actual data key
                    displayName: 'sea_fish', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                yogurt: { // <- the key should match the actual data key
                    displayName: 'yogurt', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                powder_milk: { // <- the key should match the actual data key
                    displayName: 'powder_milk', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                chicken: { // <- the key should match the actual data key
                    displayName: 'chicken', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                janamaz: { // <- the key should match the actual data key
                    displayName: 'janamaz', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                mosquito_net: { // <- the key should match the actual data key
                    displayName: 'mosquito_net', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                }
            }
            const specification8 = {
                offer: { // <- the key should match the actual data key
                    displayName: 'offer', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                saree: { // <- the key should match the actual data key
                    displayName: 'saree', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100, // <- width in pixels
                    cellStyle: styles.text_left
                },
                soft_drinks: { // <- the key should match the actual data key
                    displayName: 'soft_drinks', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                egg: { // <- the key should match the actual data key
                    displayName: 'egg', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100, // <- width in pixels
                    cellStyle: styles.text_left
                },
                first_aid: { // <- the key should match the actual data key
                    displayName: 'first_aid', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                family_planning: { // <- the key should match the actual data key
                    displayName: 'family_planning', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                shoe_care: { // <- the key should match the actual data key
                    displayName: 'shoe_care', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                dal: { // <- the key should match the actual data key
                    displayName: 'dal', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                dry_vegetables: { // <- the key should match the actual data key
                    displayName: 'dry_vegetables', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                travel_bag: { // <- the key should match the actual data key
                    displayName: 'travel_bag', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                oil: { // <- the key should match the actual data key
                    displayName: 'oil', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                kitchen_accessories: { // <- the key should match the actual data key
                    displayName: 'kitchen_accessories', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                }
            }
            const specification9 = {
                lassi_milk_shak_borhani: { // <- the key should match the actual data key
                    displayName: 'lassi_milk_shak_borhani', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                blanket: { // <- the key should match the actual data key
                    displayName: 'blanket', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100, // <- width in pixels
                    cellStyle: styles.text_left
                },
                beauty: { // <- the key should match the actual data key
                    displayName: 'beauty', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                home_appliance: { // <- the key should match the actual data key
                    displayName: 'home_appliance', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100, // <- width in pixels
                    cellStyle: styles.text_left
                },
                dry_fruits: { // <- the key should match the actual data key
                    displayName: 'dry_fruits', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                necklace: { // <- the key should match the actual data key
                    displayName: 'necklace', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                bracelets_payel: { // <- the key should match the actual data key
                    displayName: 'bracelets_payel', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                nose_pin: { // <- the key should match the actual data key
                    displayName: 'nose_pin', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                hair_stick_band: { // <- the key should match the actual data key
                    displayName: 'hair_stick_band', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                sauce_ketchup_kashundi: { // <- the key should match the actual data key
                    displayName: 'sauce_ketchup_kashundi', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                napkins_contraceptives_others: { // <- the key should match the actual data key
                    displayName: 'napkins_contraceptives_others', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                ladies_parts: { // <- the key should match the actual data key
                    displayName: 'ladies_parts', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                }
            }
            const specification10 = {
                vegetable: { // <- the key should match the actual data key
                    displayName: 'vegetable', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                perfume_attar: { // <- the key should match the actual data key
                    displayName: 'perfume_attar', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100, // <- width in pixels
                    cellStyle: styles.text_left
                },
                clock: { // <- the key should match the actual data key
                    displayName: 'clock', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                sunglass_chosma: { // <- the key should match the actual data key
                    displayName: 'sunglass_chosma', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100, // <- width in pixels
                    cellStyle: styles.text_left
                },
                powdered_drinks: { // <- the key should match the actual data key
                    displayName: 'powdered_drinks', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                syrup: { // <- the key should match the actual data key
                    displayName: 'syrup', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                popcorn_nuts_other: { // <- the key should match the actual data key
                    displayName: 'popcorn_nuts_other', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                kids_garments: { // <- the key should match the actual data key
                    displayName: 'kids_garments', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                liquid_cleaner: { // <- the key should match the actual data key
                    displayName: 'liquid_cleaner', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                lipstick_lip: { // <- the key should match the actual data key
                    displayName: 'lipstick_lip', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                hair_care: { // <- the key should match the actual data key
                    displayName: 'hair_care', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                hand_wash_hand_sanitizer: { // <- the key should match the actual data key
                    displayName: 'hand_wash_hand_sanitizer', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                }
            }
            const specification11 = {
                spagadi_noodles_shemai_soup: { // <- the key should match the actual data key
                    displayName: 'spagadi_noodles_shemai_soup', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                stationary: { // <- the key should match the actual data key
                    displayName: 'stationary', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100, // <- width in pixels
                    cellStyle: styles.text_left
                },
                bath_laundry_soap: { // <- the key should match the actual data key
                    displayName: 'bath_laundry_soap', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                dog_food: { // <- the key should match the actual data key
                    displayName: 'dog_food', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100, // <- width in pixels
                    cellStyle: styles.text_left
                },
                gift_item: { // <- the key should match the actual data key
                    displayName: 'gift_item', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                office_stationary: { // <- the key should match the actual data key
                    displayName: 'office_stationary', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                nail_care: { // <- the key should match the actual data key
                    displayName: 'nail_care', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                birds_other: { // <- the key should match the actual data key
                    displayName: 'birds_other', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                bed_sheet_others: { // <- the key should match the actual data key
                    displayName: 'bed_sheet_others', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                dry_fish: { // <- the key should match the actual data key
                    displayName: 'dry_fish', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                soup_spoon: { // <- the key should match the actual data key
                    displayName: 'soup_spoon', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                face_wash: { // <- the key should match the actual data key
                    displayName: 'face_wash', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                }
            }
            const specification12 = {
                hand_watch: { // <- the key should match the actual data key
                    displayName: 'hand_watch', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                shoes: { // <- the key should match the actual data key
                    displayName: 'shoes', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100, // <- width in pixels
                    cellStyle: styles.text_left
                },
                mobile_accessories: { // <- the key should match the actual data key
                    displayName: 'mobile_accessories', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                baby_food: { // <- the key should match the actual data key
                    displayName: 'baby_food', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100, // <- width in pixels
                    cellStyle: styles.text_left
                },
                perfume_bodysppary_roleone: { // <- the key should match the actual data key
                    displayName: 'perfume_bodysppary_roleone', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                energy_drinks: { // <- the key should match the actual data key
                    displayName: 'energy_drinks', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                lassi_milk_milk_shake: { // <- the key should match the actual data key
                    displayName: 'lassi_milk_milk_shake', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                shaving_items: { // <- the key should match the actual data key
                    displayName: 'shaving_items', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                oral_care: { // <- the key should match the actual data key
                    displayName: 'oral_care', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                roys: { // <- the key should match the actual data key
                    displayName: 'Toys', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                party_popper: { // <- the key should match the actual data key
                    displayName: 'party_popper', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                frozen_items: { // <- the key should match the actual data key
                    displayName: 'frozen_items', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                }
            }
            const specification13 = {
                socks: { // <- the key should match the actual data key
                    displayName: 'socks', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                perfume_bodyspray: { // <- the key should match the actual data key
                    displayName: 'perfume_bodyspray', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100, // <- width in pixels
                    cellStyle: styles.text_left
                },
                chocolate_wafer_marsh_low_chips: { // <- the key should match the actual data key
                    displayName: 'chocolate_wafer_marsh_low_chips', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100 // <- width in pixels
                },
                total: { // <- the key should match the actual data key
                    displayName: 'total', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 100, // <- width in pixels
                    cellStyle: styles.text_left
                }
            }


            const heading1 = [
                [{ value: `Category wise Contribution Report From : ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Code: ' + reportFullDataset.shopCode, style: styles.shop_info }],
                [{ value: 'Shop Name: ' + reportFullDataset.shopName, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.shopAddress, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                ['Grand Total:', ' ',
                    reportFullDataset.grandTotal.jam_jelly_pickle,
                    reportFullDataset.grandTotal.pest_control_mosquito_repellent,
                    reportFullDataset.grandTotal.fruits,
                    reportFullDataset.grandTotal.toiletries,
                    reportFullDataset.grandTotal.baby_oral_care,
                    reportFullDataset.grandTotal.electronics,
                    reportFullDataset.grandTotal.air_freshener,
                    reportFullDataset.grandTotal.eyepencil_eye,
                    reportFullDataset.grandTotal.supplement,
                    reportFullDataset.grandTotal.antiseptic_items
                ],
            ];
            const heading2 = [
                [{ value: `Category wise Contribution Report From : ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Code: ' + reportFullDataset.shopCode, style: styles.shop_info }],
                [{ value: 'Shop Name: ' + reportFullDataset.shopName, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.shopAddress, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                [
                    reportFullDataset.grandTotal.cosmetics,
                    reportFullDataset.grandTotal.atta_maida_suji,
                    reportFullDataset.grandTotal.detergents_liquid_cleanser,
                    reportFullDataset.grandTotal.bread_biscuit_cake_others,
                    reportFullDataset.grandTotal.corn_flakes,
                    reportFullDataset.grandTotal.water,
                    reportFullDataset.grandTotal.belt_wallet,
                    reportFullDataset.grandTotal.juice,
                    reportFullDataset.grandTotal.hair_clipper,
                    reportFullDataset.grandTotal.ice_cream,
                    reportFullDataset.grandTotal.cereal,
                    reportFullDataset.grandTotal.cheese
                ],
            ];
            const heading3 = [
                [{ value: `Category wise Contribution Report From : ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Code: ' + reportFullDataset.shopCode, style: styles.shop_info }],
                [{ value: 'Shop Name: ' + reportFullDataset.shopName, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.shopAddress, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                [
                    reportFullDataset.grandTotal.crockeries_item,
                    reportFullDataset.grandTotal.coffee_tea,
                    reportFullDataset.grandTotal.cotton_bads,
                    reportFullDataset.grandTotal.bed_sheet,
                    reportFullDataset.grandTotal.can_food,
                    reportFullDataset.grandTotal.pest_control,
                    reportFullDataset.grandTotal.butter_ghee,
                    reportFullDataset.grandTotal.shaving_item,
                    reportFullDataset.grandTotal.colour_cosmetics,
                    reportFullDataset.grandTotal.kids,
                    reportFullDataset.grandTotal.diaper_wipes,
                    reportFullDataset.grandTotal.essasenc_colour_syrup
                ],
            ];
            const heading4 = [
                [{ value: `Category wise Contribution Report From : ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Code: ' + reportFullDataset.shopCode, style: styles.shop_info }],
                [{ value: 'Shop Name: ' + reportFullDataset.shopName, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.shopAddress, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                [
                    reportFullDataset.grandTotal.baby_hair_care,
                    reportFullDataset.grandTotal.chocolate_chips_other,
                    reportFullDataset.grandTotal.baby_skin_care,
                    reportFullDataset.grandTotal.energy_drink,
                    reportFullDataset.grandTotal.dish_wash,
                    reportFullDataset.grandTotal.home_accessories,
                    reportFullDataset.grandTotal.baby_accessories,
                    reportFullDataset.grandTotal.vinegar_mayonnaise_salad_dressing_spreads,
                    reportFullDataset.grandTotal.socks_other,
                    reportFullDataset.grandTotal.liquid_milk,
                    reportFullDataset.grandTotal.fabric_colour
                ],
            ];
            const heading5 = [
                [{ value: `Category wise Contribution Report From : ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Code: ' + reportFullDataset.shopCode, style: styles.shop_info }],
                [{ value: 'Shop Name: ' + reportFullDataset.shopName, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.shopAddress, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                [
                    reportFullDataset.grandTotal.showpiece,
                    reportFullDataset.grandTotal.school_bag,
                    reportFullDataset.grandTotal.deodorants_body_sprays_roll_on,
                    reportFullDataset.grandTotal.milk_powder,
                    reportFullDataset.grandTotal.oral_care_other,
                    reportFullDataset.grandTotal.salt_sugar,
                    reportFullDataset.grandTotal.under_garments,
                    reportFullDataset.grandTotal.gents,
                    reportFullDataset.grandTotal.honey_sweets,
                    reportFullDataset.grandTotal.rings_earrings,
                    reportFullDataset.grandTotal.tissues,
                    reportFullDataset.grandTotal.fabric_brightener
                ],
            ];
            const heading6 = [
                [{ value: `Category wise Contribution Report From : ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Code: ' + reportFullDataset.shopCode, style: styles.shop_info }],
                [{ value: 'Shop Name: ' + reportFullDataset.shopName, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.shopAddress, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                [
                    reportFullDataset.grandTotal.skin_care,
                    reportFullDataset.grandTotal.spice_mix,
                    reportFullDataset.grandTotal.frozen_item,
                    reportFullDataset.grandTotal.kasundi,
                    reportFullDataset.grandTotal.mayonise,
                    reportFullDataset.grandTotal.meat,
                    reportFullDataset.grandTotal.nail_polish_nail_cutter,
                    reportFullDataset.grandTotal.ladies,
                    reportFullDataset.grandTotal.wall_clock,
                    reportFullDataset.grandTotal.toys,
                    reportFullDataset.grandTotal.cat_food,
                    reportFullDataset.grandTotal.rice_chal
                ],
            ];
            const heading7 = [
                [{ value: `Category wise Contribution Report From : ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Code: ' + reportFullDataset.shopCode, style: styles.shop_info }],
                [{ value: 'Shop Name: ' + reportFullDataset.shopName, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.shopAddress, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                [
                    reportFullDataset.grandTotal.ladies_bag,
                    reportFullDataset.grandTotal.ladies_garments,
                    reportFullDataset.grandTotal.sports,
                    reportFullDataset.grandTotal.soap,
                    reportFullDataset.grandTotal.gents_garments,
                    reportFullDataset.grandTotal.fresh_water_fish,
                    reportFullDataset.grandTotal.sea_fish,
                    reportFullDataset.grandTotal.yogurt,
                    reportFullDataset.grandTotal.powder_milk,
                    reportFullDataset.grandTotal.chicken,
                    reportFullDataset.grandTotal.janamaz,
                    reportFullDataset.grandTotal.mosquito_net
                ],
            ];
            const heading8 = [
                [{ value: `Category wise Contribution Report From : ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Code: ' + reportFullDataset.shopCode, style: styles.shop_info }],
                [{ value: 'Shop Name: ' + reportFullDataset.shopName, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.shopAddress, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                [
                    reportFullDataset.grandTotal.offer,
                    reportFullDataset.grandTotal.saree,
                    reportFullDataset.grandTotal.soft_drinks,
                    reportFullDataset.grandTotal.egg,
                    reportFullDataset.grandTotal.first_aid,
                    reportFullDataset.grandTotal.family_planning,
                    reportFullDataset.grandTotal.shoe_care,
                    reportFullDataset.grandTotal.dal,
                    reportFullDataset.grandTotal.dry_vegetables,
                    reportFullDataset.grandTotal.travel_bag,
                    reportFullDataset.grandTotal.oil,
                    reportFullDataset.grandTotal.kitchen_accessories
                ],
            ];
            const heading9 = [
                [{ value: `Category wise Contribution Report From : ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Code: ' + reportFullDataset.shopCode, style: styles.shop_info }],
                [{ value: 'Shop Name: ' + reportFullDataset.shopName, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.shopAddress, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                [
                    reportFullDataset.grandTotal.lassi_milk_shak_borhani,
                    reportFullDataset.grandTotal.blanket,
                    reportFullDataset.grandTotal.beauty,
                    reportFullDataset.grandTotal.home_appliance,
                    reportFullDataset.grandTotal.dry_fruits,
                    reportFullDataset.grandTotal.necklace,
                    reportFullDataset.grandTotal.bracelets_payel,
                    reportFullDataset.grandTotal.nose_pin,
                    reportFullDataset.grandTotal.hair_stick_band,
                    reportFullDataset.grandTotal.sauce_ketchup_kashundi,
                    reportFullDataset.grandTotal.napkins_contraceptives_others,
                    reportFullDataset.grandTotal.ladies_parts
                ],
            ];
            const heading10 = [
                [{ value: `Category wise Contribution Report From : ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Code: ' + reportFullDataset.shopCode, style: styles.shop_info }],
                [{ value: 'Shop Name: ' + reportFullDataset.shopName, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.shopAddress, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                [
                    reportFullDataset.grandTotal.vegetable,
                    reportFullDataset.grandTotal.perfume_attar,
                    reportFullDataset.grandTotal.clock,
                    reportFullDataset.grandTotal.sunglass_chosma,
                    reportFullDataset.grandTotal.powdered_drinks,
                    reportFullDataset.grandTotal.syrup,
                    reportFullDataset.grandTotal.popcorn_nuts_other,
                    reportFullDataset.grandTotal.kids_garments,
                    reportFullDataset.grandTotal.liquid_cleaner,
                    reportFullDataset.grandTotal.lipstick_lip,
                    reportFullDataset.grandTotal.hair_care,
                    reportFullDataset.grandTotal.hand_wash_hand_sanitizer
                ],
            ];
            const heading11 = [
                [{ value: `Category wise Contribution Report From : ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Code: ' + reportFullDataset.shopCode, style: styles.shop_info }],
                [{ value: 'Shop Name: ' + reportFullDataset.shopName, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.shopAddress, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                [
                    reportFullDataset.grandTotal.spagadi_noodles_shemai_soup,
                    reportFullDataset.grandTotal.stationary,
                    reportFullDataset.grandTotal.bath_laundry_soap,
                    reportFullDataset.grandTotal.dog_food,
                    reportFullDataset.grandTotal.gift_item,
                    reportFullDataset.grandTotal.office_stationary,
                    reportFullDataset.grandTotal.nail_care,
                    reportFullDataset.grandTotal.birds_other,
                    reportFullDataset.grandTotal.bed_sheet_others,
                    reportFullDataset.grandTotal.dry_fish,
                    reportFullDataset.grandTotal.soup_spoon,
                    reportFullDataset.grandTotal.face_wash
                ],
            ];
            const heading12 = [
                [{ value: `Category wise Contribution Report From : ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Code: ' + reportFullDataset.shopCode, style: styles.shop_info }],
                [{ value: 'Shop Name: ' + reportFullDataset.shopName, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.shopAddress, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                [
                    reportFullDataset.grandTotal.hand_watch,
                    reportFullDataset.grandTotal.shoes,
                    reportFullDataset.grandTotal.mobile_accessories,
                    reportFullDataset.grandTotal.baby_food,
                    reportFullDataset.grandTotal.perfume_bodysppary_roleone,
                    reportFullDataset.grandTotal.energy_drinks,
                    reportFullDataset.grandTotal.lassi_milk_milk_shake,
                    reportFullDataset.grandTotal.shaving_items,
                    reportFullDataset.grandTotal.oral_care,
                    reportFullDataset.grandTotal.roys,
                    reportFullDataset.grandTotal.party_popper,
                    reportFullDataset.grandTotal.frozen_items
                ],
            ];
            const heading13 = [
                [{ value: `Category wise Contribution Report From : ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: 'Shop Code: ' + reportFullDataset.shopCode, style: styles.shop_info }],
                [{ value: 'Shop Name: ' + reportFullDataset.shopName, style: styles.shop_info }],
                [{ value: 'Shop Address: ' + reportFullDataset.shopAddress, style: styles.shop_info }],
                [{ value: '', style: styles.cell_border }],
                [''],
                [
                    reportFullDataset.grandTotal.socks,
                    reportFullDataset.grandTotal.perfume_bodyspray,
                    reportFullDataset.grandTotal.chocolate_wafer_marsh_low_chips,
                    reportFullDataset.grandTotal.total
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
                        name: `Category wise Contribution Report  part 1 from: ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                        heading: heading1,
                        merges: merges,
                        specification: specification1, // <- Report specification
                        data: reportFullDataset.data[0].reportDataOne // <-- Report data
                    },
                    {
                        name: `Category wise Contribution Report part 2 from: ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                        heading: heading2,
                        merges: merges,
                        specification: specification2, // <- Report specification
                        data: reportFullDataset.data[1].reportDataTwo // <-- Report data
                    },
                    {
                        name: `Category wise Contribution Report  part 3 from: ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                        heading: heading3,
                        merges: merges,
                        specification: specification3, // <- Report specification
                        data: reportFullDataset.data[2].reportDataThree // <-- Report data
                    },
                    {
                        name: `Category wise Contribution Report part 4 from: ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                        heading: heading4,
                        merges: merges,
                        specification: specification4, // <- Report specification
                        data: reportFullDataset.data[3].reportDataFour // <-- Report data
                    },
                    {
                        name: `Category wise Contribution Report part 5 from: ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                        heading: heading5,
                        merges: merges,
                        specification: specification5, // <- Report specification
                        data: reportFullDataset.data[4].reportDataFive // <-- Report data
                    },
                    {
                        name: `Category wise Contribution Report part 6 from: ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                        heading: heading6,
                        merges: merges,
                        specification: specification6, // <- Report specification
                        data: reportFullDataset.data[5].reportDataSix // <-- Report data
                    },
                    {
                        name: `Category wise Contribution Report part 7 from: ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                        heading: heading7,
                        merges: merges,
                        specification: specification7, // <- Report specification
                        data: reportFullDataset.data[6].reportDataSeven // <-- Report data
                    },
                    {
                        name: `Category wise Contribution Report part 8 from: ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                        heading: heading8,
                        merges: merges,
                        specification: specification8, // <- Report specification
                        data: reportFullDataset.data[7].reportDataEight // <-- Report data
                    },
                    {
                        name: `Category wise Contribution Report part 9 from: ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                        heading: heading9,
                        merges: merges,
                        specification: specification9, // <- Report specification
                        data: reportFullDataset.data[8].reportDataNine // <-- Report data
                    },
                    {
                        name: `Category wise Contribution Report part 10 from: ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                        heading: heading10,
                        merges: merges,
                        specification: specification10, // <- Report specification
                        data: reportFullDataset.data[9].reportDataTen // <-- Report data
                    },
                    {
                        name: `Category wise Contribution Report part 11 from: ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                        heading: heading11,
                        merges: merges,
                        specification: specification11, // <- Report specification
                        data: reportFullDataset.data[10].reportDataEleven // <-- Report data
                    },
                    {
                        name: `Category wise Contribution Report part 12 from: ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                        heading: heading12,
                        merges: merges,
                        specification: specification12, // <- Report specification
                        data: reportFullDataset.data[11].reportDataTwelve // <-- Report data
                    },
                    {
                        name: `Category wise Contribution Report part 13 from: ` + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                        heading: heading13,
                        merges: merges,
                        specification: specification13, // <- Report specification
                        data: reportFullDataset.data[12].reportDataThirteen // <-- Report data
                    }
                ]
            );

            // You can then return this straight
            res.attachment(`subcategory_wise_contribution_report.xlsx`); // This is sails.js specific (in general you need to set headers)
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