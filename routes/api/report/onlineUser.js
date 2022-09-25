const express = require('express');
const router = express.Router();
const { fork } = require('child_process')
const {
    validationResult
} = require('express-validator');

const config = require('config')
const jwt = require('jsonwebtoken');

var pdf = require("pdf-creator-node");
const excel = require('node-excel-export');
var fs = require('fs');
var path = require('path');


const adminAuth = require('../../../middleware/admin/auth');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');


// @route GET api/report/onlineUser/report?branch=..........
// @description Get all E-commercer Users report pdf
// @access Private
router.post('/onlineUser/report', [
    adminAuth
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
        
        // get current date
        let today = new Date();
        let dd = String(today.getDate()).padStart(2, '0');
        let mm = String(today.getMonth() + 1).padStart(2, '0');
        let yyyy = today.getFullYear();

        today = mm + '/' + dd + '/' + yyyy;

        const child = fork(path.join(__dirname, "subprocess", "onlineUser.js"))

        child.on('message', async (response) => {
            const {
                onlineUserInfo
            } = response

            let reportFullDataset = {
                date: today,
                data: onlineUserInfo
            }
            let html = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'reports', 'online_user_report.html'), 'utf8');
            var options = {
                format: "A4",
                orientation: "landscape",
                border: "10mm"
            }

            var document = {
                html: html,
                data: reportFullDataset,
                path: "./public/reports/online_user_report.pdf"
            };

            pdf.create(document, options)
                .then(data => {
                    const file = data.filename;
                    return res.status(200).json({
                        auth: true,
                        fileLink: '/reports/online_user_report.pdf',
                        name: 'online_user_report.pdf'
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


// @route GET api/report/onlineUser/report/:adminID?branch=..........
// @description Get all E-commercer Users report excel
// @access Private
router.get('/onlineUser/report/:adminID', async (req, res) => {
    try {
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
       // get current date
       let today = new Date();
       let dd = String(today.getDate()).padStart(2, '0');
       let mm = String(today.getMonth() + 1).padStart(2, '0');
       let yyyy = today.getFullYear();

       today = mm + '/' + dd + '/' + yyyy;
     
        const child = fork(path.join(__dirname, "subprocess", "onlineUser.js"))

        child.on('message', async (response) => {
            const {
                onlineUserInfo
            } = response

            let reportFullDataset = {
                date: today,
                data: onlineUserInfo
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
                    },
                    alignment: {
                        horizontal: 'center'
                    }
                },
                cellPink: {
                    fill: {
                        fgColor: {
                            rgb: 'FFFFCCFF'
                        }
                    }
                },
                cellGreen: {
                    fill: {
                        fgColor: {
                            rgb: 'FF00FF00'
                        }
                    }
                }
            };
            //Here you specify the export structure
            const specification = {
                name: { // <- the key should match the actual data key
                    displayName: 'Name', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                email: { // <- the key should match the actual data key
                    displayName: 'Email', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                phone: { // <- the key should match the actual data key
                    displayName: 'Phone', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                address: { // <- the key should match the actual data key
                    displayName: 'Address', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                thana: { // <- the key should match the actual data key
                    displayName: 'Thana', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                district: { // <- the key should match the actual data key
                    displayName: 'District', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                },
                division: { // <- the key should match the actual data key
                    displayName: 'Division', // <- Here you specify the column header
                    headerStyle: styles.headerDark, // <- Header style
                    width: 200 // <- width in pixels
                }

            }
            const heading = [
                [{ value: 'Online User Info ', style: styles.headerDark }] // <-- It can be only values
            ];

            const merges = [
                { start: { row: 1, column: 1 }, end: { row: 1, column: 7 } }
            ]

            // Create the excel report.
            // This function will return Buffer
            const report = excel.buildExport(
                [ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
                    {
                        name: 'Online User Info', // <- Specify sheet name (optional)
                        heading: heading,
                        merges: merges,
                        specification: specification, // <- Report specification
                        data: reportFullDataset.data // <-- Report data
                    }
                ]
            );

            // You can then return this straight
            res.attachment('Online_User_Info.xlsx'); // This is sails.js specific (in general you need to set headers)
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