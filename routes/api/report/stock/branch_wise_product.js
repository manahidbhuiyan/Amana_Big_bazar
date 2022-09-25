const express = require('express');
const router = express.Router();
const { fork } = require('child_process');

const {
    check,
    validationResult
} = require('express-validator');
var isodate = require("isodate");
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

// @route GET /api/report/brand/stock/details/report?branch=..........
// @description Get brand wise details stock report pdf
// @access Private
// router.post('/all_branch/product', [
//     adminAuth,
//     [
//         check('from', 'From date is required').not().isEmpty(),
//         check('to', 'To date is required').not().isEmpty()
//     ]
// ], async (req, res) => {
//     try {
//         const error = validationResult(req)

//         if (!error.isEmpty()) {
//             return res.status(400).json({
//                 errors: error.array()
//             })
//         }

//         const adminRoles = await getAdminRoleChecking(req.admin.id, 'report')

//         if (!adminRoles) {
//             return res.status(400).send({
//                 errors: [
//                     {
//                         msg: 'Account is not authorized to report'
//                     }
//                 ]
//             })
//         }

//         let {
//             from,
//             to
//         } = req.body

//         from = new Date(from)
//         from.setHours(0)
//         from.setMinutes(0);
//         from.setSeconds(0);

//         to = new Date(to)
//         to.setHours(23)
//         to.setMinutes(59);
//         to.setSeconds(59);

//         const child = fork(path.join(__dirname, "subprocess", "daily_stock.js"));

//         const msg = {
//             from,
//             to,
//             branch: req.query.branch,
//             type: 'pdf'
//         }

//         child.send(msg)

//         child.on('message', async (response) => {
//             const {
//                 allDailyStockData,
//                 grandtotalQuantity,
//                 grandtotalSellAmount,
//                 grandtotalCostAmount,
//                 grandtotalGp
//             } = response

//             let branch = await Branch.findById(req.query.branch).select('_id serialNo name address phone');

//             var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
//             let today = new Date();
//             let hours = today.getHours();
//             let minutes = today.getMinutes();
//             let ampm = hours >= 12 ? 'pm' : 'am';
//             hours = hours % 12;
//             hours = hours ? hours : 12; // the hour '0' should be '12'
//             minutes = minutes < 10 ? '0' + minutes : minutes;
//             let createTime = hours + ':' + minutes + ' ' + ampm;

//             let reportFullDataset = {
//                 title: "Daily Stock Report",
//                 fromDate: ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
//                 toDate: ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
//                 today: ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
//                 createTime,
//                 branch_phone : branch.phone,
//                 company_name : config.get('company').full_name,
//                 company_logo : config.get('company').company_logo,
//                 branch_id: branch.serialNo,
//                 branch_name: branch.name.trim(),
//                 branch_address: branch.address,
//                 data: allDailyStockData.sort( function (a,b) {
//                     return a.date.localeCompare(b.date)
//                 }),
//                 totalEarnAmount: grandtotalSellAmount.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1}),
//                 totalCostAmount: grandtotalCostAmount.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1}),
//                 totalQuantity: grandtotalQuantity.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1}),
//                 totalGp: grandtotalGp.toLocaleString('en-In', {minimumFractionDigits: 1, maximumFractionDigits: 1})
//             }

//             // res.json(reportFullDataset)

//             var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'reports', 'stock', 'daily_stock_report.html'), 'utf8');

//             var options = {
//                 format: "A4",
//                 orientation: "landscape",
//                 border: "10mm",
//                 header: {
//                     height: "8mm",
//                     contents: {
//                         first: ' ',
//                         default: `
//                         <table cellspacing=0 cellpadding=0 width="510px" style="margin: 0 auto;"
//                         class="table-border">
//                         <tr>
//                             <th style="font-size: 10px; text-align: left; width: 14% ;padding-left: 3px">Date</th>
//                             <th style="font-size: 10px; text-align: left; width: 21%">Quantity</th>
//                             <th style="font-size: 10px; text-align: right;">Cost Amount</th>
//                             <th style="font-size: 10px; text-align: right;">Sell Amount</th>
//                             <th style="font-size: 10px; text-align: right;">GP(%)</th>
//                         </tr>
//                         </table>`
//                     }
//                 },
//                 footer: {
//                     height: "2mm",
//                     contents: {
//                         default: '<span style="color: #444; text-align: center">page - {{page}} </span>', // fallback value
//                     }
//                 }
//             }

//             var document = {
//                 html: html,
//                 data: reportFullDataset,
//                 path: "./public/reports/daily_stock_report.pdf"
//             };

//             pdf.create(document, options)
//                 .then(data => {
//                     const file = data.filename;
//                     return res.status(200).json({
//                         auth: true,
//                         fileLink: '/reports/daily_stock_report.pdf'
//                     })
//                 })
//                 .catch(error => {
//                     console.error(error)
//                 });
//         })
//         child.on('close', (code) => {
//             child.kill()
//             console.log(`child process exited with code ${code}`);
//         });

//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server error');
//     }
// });

// @route GET /api/report/brand/stock/details/:adminID/:category?branch=..........
// @description Get Branch wise Products report excel
// @access Private
router.get('/branch-wise/product/:adminID/:category', async (req, res) => {
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
        let category = req.params.category
        let branch = req.query.branch
        let condition = {}

        if(category == 'all'){
            condition.branch = branch
        }else{
            condition.category = category
            condition.branch = branch
        }
        
        const child = fork(path.join(__dirname, "subprocess", "branch_wise_product.js"));

        const msg = {
            type: 'excel',
            condition
        }

        child.send(msg)
        child.on('message', async (response) => {
            const {
                allProducts
            } = response
   
            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            let currentDate = new Date()

            let reportFullDataset = {
                currentDate: ("0" + currentDate.getDate()).slice(-2) + ' ' + months[currentDate.getMonth()] + ', ' + currentDate.getUTCFullYear(),
                data: allProducts
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
                branch: { // <- the key should match the actual data key
                    displayName: 'Branch', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 150, // <- width in pixels
                    cellStyle: styles.text_left
                },
                category: { // <- the key should match the actual data key
                    displayName: 'Category', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 150 // <- width in pixels
                },
                subcategory: { // <- the key should match the actual data key
                    displayName: 'SubCategory', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                brand: { // <- the key should match the actual data key
                    displayName: 'Brand', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 150 // <- width in pixels
                },
                supplier: { // <- the key should match the actual data key
                    displayName: 'Supplier', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 150 // <- width in pixels
                },
                barcode: { // <- the key should match the actual data key
                    displayName: 'Barcode', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 150 // <- width in pixels
                },
                name: { // <- the key should match the actual data key
                    displayName: 'Name', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 150 // <- width in pixels
                },
                quantity: { // <- the key should match the actual data key
                    displayName: 'Quantity', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 150 // <- width in pixels
                },
                sell: { // <- the key should match the actual data key
                    displayName: 'Sell', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 150 // <- width in pixels
                },
                purchase: { // <- the key should match the actual data key
                    displayName: 'Purchase', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 150 // <- width in pixels
                },
                discount: { // <- the key should match the actual data key
                    displayName: 'Discount', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 150 // <- width in pixels
                },
                vat: { // <- the key should match the actual data key
                    displayName: 'Vat', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 150 // <- width in pixels
                },
                description: { // <- the key should match the actual data key
                    displayName: 'Description', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 150 // <- width in pixels
                },
                expireDate: { // <- the key should match the actual data key
                    displayName: 'Expire Date', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 150 // <- width in pixels
                },
                reorderLevel: { // <- the key should match the actual data key
                    displayName: 'Reorder Level', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 150 // <- width in pixels
                },
                weight: { // <- the key should match the actual data key
                    displayName: 'Weight', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 150 // <- width in pixels
                },
                unitType: { // <- the key should match the actual data key
                    displayName: 'Unit Type', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 150 // <- width in pixels
                },
                size: { // <- the key should match the actual data key
                    displayName: 'Product Size', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 150 // <- width in pixels
                }
            }


            const heading = [
                [{ value: 'Branch Wise Prodcuts At Date : ' + reportFullDataset.currentDate, style: styles.headerDark }],
                [''], // <-- It can be only values
                [{ value: '', style: styles.cell_border }]
                
            ];

            const merges = [
                { start: { row: 1, column: 1 }, end: { row: 1, column: 7 } }
            ]

            // Create the excel report.
            // This function will return Buffer
            const report = excel.buildExport(
                [ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
                    {
                        name: 'Branch Wise Prodcuts At Date: ' + reportFullDataset.currentDate, // <- Specify sheet name (optional)
                        heading: heading,
                        merges: merges,
                        specification: specification, // <- Report specification
                        data: reportFullDataset.data // <-- Report data
                    }
                ]
            );

            // You can then return this straight
            res.attachment('branch_wise_products.xlsx'); // This is sails.js specific (in general you need to set headers)
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