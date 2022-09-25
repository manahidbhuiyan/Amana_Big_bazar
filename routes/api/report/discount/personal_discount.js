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

var pdf = require("pdf-creator-node");
var fs = require('fs');
var path = require('path');

const auth = require('../../../../middleware/admin/auth');
const Branch = require('../../../../models/Branch');


const {
    getAdminRoleChecking
} = require('../../../../lib/helpers');


// @route GET api/order
// @description Get all the orders
// @access Private
router.post('/personal-discount/all', [
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

        let { from, to } = req.body

        from = new Date(from)
        from.setHours(0)
        from.setMinutes(0);
        from.setSeconds(0);

        to = new Date(to)
        to.setHours(23)
        to.setMinutes(59);
        to.setSeconds(59);

        const child = fork(path.join(__dirname, "subprocess", "personal_discount.js"));

        const msg = {
            from,
            to,
            branch: req.query.branch,
        }

        child.send(msg)

        child.on('message', async (response) => {
            const {
                allPersonalDiscountDataList,
                grandTotalPersonalDiscountAmount,
                grandAvgPersonalDiscountPercentage,
                length
            } = response

            let branchInfo = await Branch.findById(req.query.branch).select('_id name address serialNo phone')
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
                "branchName": branchInfo.name.trim(),
                "branchAddress": branchInfo.address,
                "fromDate": ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
                "toDate": ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
                today: ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
                createTime,
                branch_phone : branchInfo.phone,
                company_name : config.get('company').full_name,
                company_logo : config.get('company').company_logo,
                "allPersonalDiscountList": allPersonalDiscountDataList,
                "grandTotalDiscountAmount": grandTotalPersonalDiscountAmount.toFixed(2),
                "grandTotalAvgDiscountPercentage": length ? (grandAvgPersonalDiscountPercentage / length).toFixed(2) : '0.00'
            }

            // return res.json(allDataInfo)

            var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'reports', 'person_wise_discount.html'), 'utf8');

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
                            <th style="font-size: 7px; text-align: left; width: 16%; padding-left: 3px">Personal Info</th>
                            <th style="font-size: 7px; text-align: left; width: 10%;">Order No</th>
                            <th style="font-size: 7px; text-align: right; width: 30%">Order Total</th>
                            <th style="font-size: 7px; text-align: right;">Discount Amount</th>
                            <th style="font-size: 7px; text-align: right;">Discount(%)</th>
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
                path: "./public/reports/person_wise_discount.pdf"
            };

            pdf.create(document, options)
                .then(data => {
                    const file = data.filename;
                    // console.log(file)
                    return res.status(200).json({
                        auth: true,
                        fileLink: '/reports/person_wise_discount.pdf'
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

// @route GET api/order
// @description Get all the orders
// @access Private
router.get('/personal-discount/all/:adminID/:from/:to', [
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

        let branchInfo = await Branch.findById(req.query.branch).select('_id name address')

        let personalDiscount = await PersonalDiscount.find({}).select("_id name personID person_type phone active max_discount_percentage")


        let allPersonalDiscountDataList = []
        let grandTotalPersonalDiscountAmount = 0
        let grandAvgPersonalDiscountPercentage = 0

        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        let finalArray = await personalDiscount.map(async (personalDiscountInfo, index) => {
            let personalDiscountApplyOnOrder = await OrderForPos.find({
                discountPerson: personalDiscountInfo._id,
                branch: req.query.branch,
                create: {
                    $gte: isodate(from),
                    $lte: isodate(to)
                }
            }).select('_id orderID total_bill personalDiscountAmount personalDiscountPercentage')

            let personalDiscountDataList = []
            let totalPersonalDiscountAmount = 0
            let avgPersonalDiscount = 0

            let childArray = personalDiscountApplyOnOrder.map(discountInfo => {
                personalDiscountDataList.push([discountInfo.orderID, (discountInfo.total_bill + discountInfo.personalDiscountAmount), discountInfo.personalDiscountAmount, discountInfo.personalDiscountPercentage])

                totalPersonalDiscountAmount += discountInfo.personalDiscountAmount
                avgPersonalDiscount += discountInfo.personalDiscountPercentage
            })

            await Promise.all(childArray)

            allPersonalDiscountDataList.push({
                personalInfo: [personalDiscountInfo.personID, personalDiscountInfo.name, personalDiscountInfo.phone, personalDiscountInfo.person_type, personalDiscountInfo.max_discount_percentage],
                discountList: personalDiscountDataList,
                totalDiscountAmount: totalPersonalDiscountAmount,
                totalDiscountPercentage: avgPersonalDiscount == 0 ? 0 : (avgPersonalDiscount / personalDiscountApplyOnOrder.length),
            })

            grandTotalPersonalDiscountAmount += totalPersonalDiscountAmount
            grandAvgPersonalDiscountPercentage += avgPersonalDiscount == 0 ? 0 : (avgPersonalDiscount / personalDiscountApplyOnOrder.length)
        })

        await Promise.all(finalArray);





        let reportFullDataset = {
            fromDate: ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
            toDate: ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
            shopName: branchInfo.name.trim(),
            shopAddress: branchInfo.address,
            data: allPersonalDiscountDataList,
            grandTotalPersonalDiscountAmount: grandTotalPersonalDiscountAmount.toFixed(2),
            grandAvgPersonalDiscountPercentage: grandAvgPersonalDiscountPercentage.toFixed(2)
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
            supplier: { // <- the key should match the actual data key
                displayName: 'Supplier', // <- Here you specify the column header
                headerStyle: styles.headerDark, // <- Header style
                width: 400, // <- width in pixels
            },
            date: { // <- the key should match the actual data key
                displayName: 'Date', // <- Here you specify the column header
                headerStyle: styles.headerDark, // <- Header style
                width: 200 // <- width in pixels
            },
            receiveNo: { // <- the key should match the actual data key
                displayName: 'Receiving No', // <- Here you specify the column header
                headerStyle: styles.headerDark, // <- Header style
                width: 200, // <- width in pixels
                cellStyle: styles.text_left
            },
            unitCost: { // <- the key should match the actual data key
                displayName: 'Unit Cost', // <- Here you specify the column header
                headerStyle: styles.headerDark, // <- Header style
                width: 200 // <- width in pixels
            },
            receiceQTY: { // <- the key should match the actual data key
                displayName: 'Receive Qty', // <- Here you specify the column header
                headerStyle: styles.headerDark, // <- Header style
                width: 200 // <- width in pixels
            },
            productToatalCost: { // <- the key should match the actual data key
                displayName: 'Product Total Cost', // <- Here you specify the column header
                headerStyle: styles.headerDark, // <- Header style
                width: 200 // <- width in pixels
            },
            totalQty: { // <- the key should match the actual data key
                displayName: 'Subtotal QTY', // <- Here you specify the column header
                headerStyle: styles.headerDark, // <- Header style
                width: 200 // <- width in pixels
            },
            subtotalCost: { // <- the key should match the actual data key
                displayName: 'Subtotal Cost', // <- Here you specify the column header
                headerStyle: styles.headerDark, // <- Header style
                width: 200 // <- width in pixels
            },
            discount: { // <- the key should match the actual data key
                displayName: 'Discount', // <- Here you specify the column header
                headerStyle: styles.headerDark, // <- Header style
                width: 200 // <- width in pixels
            },
            totalCost: { // <- the key should match the actual data key
                displayName: 'Total Cost', // <- Here you specify the column header
                headerStyle: styles.headerDark, // <- Header style
                width: 200 // <- width in pixels
            }
        }


        const heading = [
            [{ value: 'All Supplier Receiving Details From : ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }],
            [''], // <-- It can be only values
            [{ value: 'Shop Name: ' + reportFullDataset.shopName, style: styles.shop_info }],
            [{ value: 'Shop Address: ' + reportFullDataset.shopAddress, style: styles.shop_info }],
            [{ value: '', style: styles.cell_border }],
            [''],
            [''],
            [{ value: 'Grand SubTotal: ' + reportFullDataset.grandSubtotalAmount, style: styles.shop_info }],
            [{ value: 'Total Discount: ' + reportFullDataset.grandTotalDiscount, style: styles.shop_info }],
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
                    name: 'All Supplier Receiving Details From: ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
                    heading: heading,
                    merges: merges,
                    specification: specification, // <- Report specification
                    data: reportFullDataset.data // <-- Report data
                }
            ]
        );

        // You can then return this straight
        res.attachment('all_supplier_receiving_details.xlsx'); // This is sails.js specific (in general you need to set headers)
        return res.send(report);

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router