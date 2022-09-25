const express = require('express');
const router = express.Router();
const { fork } = require('child_process')
const {
    validationResult
} = require('express-validator');

const config = require('config')
const jwt = require('jsonwebtoken');

var isodate = require("isodate");

var pdf = require("pdf-creator-node");
const excel = require('node-excel-export');
var fs = require('fs');
var path = require('path');


const adminAuth = require('../../../../middleware/admin/auth');

const {
    getAdminRoleChecking
} = require('../../../../lib/helpers');


// @route GET api/report/subscribedUser/report?branch=..........
// @description Get all subscribed User report pdf
// @access Private
router.post('/subscribedUser/report', [
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

        let {
            from,
            to,
            all
      } = req.body
      
      let subscriberCondition = {}

      if (from != '' && to != '') {
          from = new Date(from)
          from.setHours(0)
          from.setMinutes (0);
          from.setSeconds (0);
          
          to = new Date(to)
          to.setHours(23)
          to.setMinutes (59);
          to.setSeconds(59);
          
          subscriberCondition = {               
            create: {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        }
      }

      const child = fork(path.join(__dirname, "subprocess", "subscribed_user_report.js"));

      const msg = {
        from,
        to,
        subscriberCondition
      }
      child.send(msg)

      child.on('message', async (response) => {
        const {
          subscribedUserInfo
        } = response

        let reportFullDataset = {}
        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        if (all == '') {
          reportFullDataset = {
                fromDate: ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
                toDate: ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
                data: subscribedUserInfo
            }
        } else {
              reportFullDataset = {
                data: subscribedUserInfo
            }
        }
        //return res.json(reportFullDataset)
        var html
        if (all == '') {
          html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'reports', 'subscribedUser', 'subscribed_user_bydate.html'), 'utf8');
        } else {
          html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'reports', 'subscribedUser', 'all_subscribed_user.html'), 'utf8');
        }

        var options = {
            format: "A4",
            orientation: "portrait",
            border: "10mm"
        }

        var document = {
            html: html,
            data: reportFullDataset,
            path: "./public/reports/subscribedUser/subscribed_user_report.pdf"
        };

        pdf.create(document, options)
            .then(data => {
                const file = data.filename;
                return res.status(200).json({
                    auth: true,
                    fileLink: '/reports/subscribedUser/subscribed_user_report.pdf',
                    name: 'subscribed_user_report.pdf'
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



// @route GET api/report/subscribedUser/report/:adminID/:from/:to
// @description Get subscribed User report excel
// @access Private
router.get('/subscribedUser/report/:adminID/:from/:to', async (req, res) => {
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
        from.setHours(0)
        from.setMinutes (0);
        from.setSeconds (0);
        
        to = new Date(to)
        to.setHours(23)
        to.setMinutes (59);
      to.setSeconds(59);

        
        let subscriberCondition = {               
          create: {
              $gte: isodate(from),
              $lte: isodate(to)
          }
      }
      
      const child = fork(path.join(__dirname, "subprocess", "subscribed_user_report.js"));

      const msg = {
        subscriberCondition
      }
      child.send(msg)

      child.on('message', async (response) => {
        const {
          subscribedUserInfo
        } = response
        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        let reportFullDataset = {
            fromDate: ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
            toDate: ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
            data: subscribedUserInfo
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
              alignment:{
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
            email: { // <- the key should match the actual data key
              displayName: 'Email', // <- Here you specify the column header
              headerStyle: styles.headerDark, // <- Header style
              width: 200 // <- width in pixels
            }
          }
          const heading = [
            [{value: 'All Subscriber Info From: '+reportFullDataset.fromDate+' To: '+ reportFullDataset.toDate, style: styles.headerDark}] // <-- It can be only values
          ];

          const merges = [
            { start: { row: 1, column: 1 }, end: { row: 1, column: 7 } }
          ]
          
          // Create the excel report.
          // This function will return Buffer
          const report = excel.buildExport(
            [ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
              {
                name: 'All Subscriber Info From: '+reportFullDataset.fromDate+' To: '+ reportFullDataset.toDate, // <- Specify sheet name (optional)
                heading: heading,
                merges: merges,
                specification: specification, // <- Report specification
                data: reportFullDataset.data // <-- Report data
              }
            ]
          );
           
          // You can then return this straight
          res.attachment('Subscriber_Info_byDate.xlsx'); // This is sails.js specific (in general you need to set headers)
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



// @route GET api/report/all/pos-client/summery/report
// @description Get all the orders
// @access Private
router.get('/subscribedUser/report/:adminID/:all', async (req, res) => {
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

      let all = req.params.all



    
    let subscribedUserInfo = []

      
      let subscriberCondition = {}
    
    let subscriber = await Subscription.find(subscriberCondition).select('email')
    
    
    let parentArray = await subscriber.map(async subscriberInfo=>{
      subscribedUserInfo.push({
          email: subscriberInfo.email,
      })
    })
    
    await Promise.all(parentArray)

      
      var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      let reportFullDataset = {
          data: subscribedUserInfo
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
            alignment:{
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
          email: { // <- the key should match the actual data key
            displayName: 'Email', // <- Here you specify the column header
            headerStyle: styles.headerDark, // <- Header style
            width: 200 // <- width in pixels
          }
        }
        
        
        const heading = [
          [{value: 'All Subscriber Info : ', style: styles.headerDark}] // <-- It can be only values
        ];

        const merges = [
          { start: { row: 1, column: 1 }, end: { row: 1, column: 7 } }
        ]
        
        // Create the excel report.
        // This function will return Buffer
        const report = excel.buildExport(
          [ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
            {
              name: 'All Subscriber Info : ', // <- Specify sheet name (optional)
              heading: heading,
              merges: merges,
              specification: specification, // <- Report specification
              data: reportFullDataset.data // <-- Report data
            }
          ]
        );
         
        // You can then return this straight
        res.attachment('All_Subscriber_Info.xlsx'); // This is sails.js specific (in general you need to set headers)
        return res.send(report);

  } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
  }
});

module.exports = router