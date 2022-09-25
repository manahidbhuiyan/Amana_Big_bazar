const express = require('express');
const router = express.Router();
const { fork } = require('child_process')
const {
  check,
  validationResult
} = require('express-validator');

const config = require('config')
const jwt = require('jsonwebtoken');
var isodate = require("isodate");

var pdf = require("pdf-creator-node");
const excel = require('node-excel-export');
var fs = require('fs');
var path = require('path');


const Branch = require('../../../../models/Branch');
const adminAuth = require('../../../../middleware/admin/auth');

const {
  getAdminRoleChecking
} = require('../../../../lib/helpers');


// @route GET api/report/all/pos-client/summery/report?branch=..........
// @description Get all the pos user report pdf
// @access Private
router.post('/all/pos-client/summery/report', [
  adminAuth,
  [
    check('from', 'From date is required').not().isEmpty(),
    check('to', 'To date is required').not().isEmpty(),
    check('branch_id', 'Branch is required').not().isEmpty()
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
      branch_id
    } = req.body
    let condition = {}

    condition.create = {
      $gte: isodate(from),
      $lte: isodate(to)
    }

    from = new Date(from)
    from.setHours(0)
    from.setMinutes(0);
    from.setSeconds(0);

    to = new Date(to)
    to.setHours(23)
    to.setMinutes(59);
    to.setSeconds(59);

    const child = fork(path.join(__dirname, "subprocess", "all_user_report.js"));

    const msg = {
      branch_id,
      condition,
      type: 'pdf'
    }
    child.send(msg)

    child.on('message', async (response) => {

      const {
        userWiseOrderInfo
      } = response

      let branchInfo = await Branch.findById(branch_id)
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
            branch_phone : branchInfo.phone,
            company_name : config.get('company').full_name,
            company_logo : config.get('company').company_logo,
            branchName: branchInfo.name,
            branchAddress : branchInfo.address,
            branch_id: branchInfo.serialNo,
            data: userWiseOrderInfo.sort((a, b) => b.balance - a.balance)
      }
      var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'reports', 'customer', 'all_customer_summery.html'), 'utf8');
      var options = {
            format: "A4",
            orientation: "portrait",
            border: "10mm",
            timeout: 60000,
            header: {
              height: "8mm",
              contents: {
                  first: ' ',
                  default: `
                  <table cellspacing=0 cellpadding=0 width="510px" style="margin: 0 auto;"
                  class="">
                  <tr>
                      <th style="font-size: 7px; text-align: left; width: 15%; padding-left: 10px">Code</th>
                      <th style="font-size: 7px; text-align: left; width: 15% ">Customer Name</th>
                      <th style="font-size: 7px; text-align: left; width: 12%">Contact No.</th>
                      <th style="font-size: 7px; text-align: left; width: 10%">Balance</th>
                      <th style="font-size: 7px; text-align: center;">Address</th>
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
            path: "./public/reports/all_customer_summery.pdf"
      };

      pdf.create(document, options)
        .then(data => {
          const file = data.filename;
          return res.status(200).json({
            auth: true,
            fileLink: '/reports/all_customer_summery.pdf',
            name: 'all_customer_summery.pdf'
          })
        }).catch(error => {
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


// @route GET api/report/all/pos-client/summery/report/:adminID/:from/:to?branch=..........
// @description Get all the pos user report excel
// @access Private
router.get('/all/pos-client/summery/report/:adminID/:from/:to', async (req, res) => {
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

    let from = req.params.from
    let to = req.params.to

    from = new Date(from)
    to = new Date(to)
    to.setHours(23)
    to.setMinutes(59);
    to.setSeconds(59);

    const child = fork(path.join(__dirname, "subprocess", "all_user_report.js"));

    const msg = {
      branch_id: req.query.branch_id,
      type: 'excel'
    }
    child.send(msg)

    child.on('message', async (response) => {

      const {
        userWiseOrderInfo
      } = response

      let reportFullDataset = {
        fromDate: ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
        toDate: ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
        data: userWiseOrderInfo.sort((a, b) => b.balance - a.balance)
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
        code: { // <- the key should match the actual data key
          displayName: 'Code', // <- Here you specify the column header
          headerStyle: styles.headerDark, // <- Header style
          width: 200 // <- width in pixels
        },
        name: {
          displayName: 'Customer Name',
          headerStyle: styles.headerDark,
          width: 320 // <- width in chars (when the number is passed as string)
        },
        phone: {
          displayName: 'Contact No',
          headerStyle: styles.headerDark,
          // cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
          //   return value.name;
          // },
          width: 120 // <- width in chars (when the number is passed as string)
        },
        bonus_point: {
          displayName: 'Bonus Point',
          headerStyle: styles.headerDark,
          width: 120 // <- width in chars (when the number is passed as string)
        },
        address: {
          displayName: 'Address',
          headerStyle: styles.headerDark,
          width: 400 // <- width in chars (when the number is passed as string)
        }
      }


      const heading = [
        [{ value: 'All Clients Info From: ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, style: styles.headerDark }] // <-- It can be only values
      ];

      const merges = [
        { start: { row: 1, column: 1 }, end: { row: 1, column: 5 } }
      ]

      // Create the excel report.
      // This function will return Buffer
      const report = excel.buildExport(
        [ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
          {
            name: 'All Clients Info From: ' + reportFullDataset.fromDate + ' To: ' + reportFullDataset.toDate, // <- Specify sheet name (optional)
            heading: heading,
            merges: merges,
            specification: specification, // <- Report specification
            data: reportFullDataset.data // <-- Report data
          }
        ]
      );

      // You can then return this straight
      res.attachment('All_Clients_Info.xlsx'); // This is sails.js specific (in general you need to set headers)
      return res.send(report);
    })

    child.on('close', (code) => {
      child.kill()
      console.log(`child process exited with code ${code}`);
    });

    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router