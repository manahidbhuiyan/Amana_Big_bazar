const express = require('express')
const router = express.Router()
const excel = require('node-excel-export');

const jwt = require('jsonwebtoken');
const config = require('config');

const Category = require('../../../models/Category');

router.get('/data/export/excel/:token', async (req, res) => {
    try {
        const token = req.params.token;
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

        let category = await Category.find({}).populate('branch', ['name'])
    
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
            _id: { // <- the key should match the actual data key
              displayName: 'Category ID', // <- Here you specify the column header
              headerStyle: styles.headerDark, // <- Header style
              width: 200 // <- width in pixels
            },
            name: {
                displayName: 'Category name',
                headerStyle: styles.headerDark,
                width: 200 // <- width in chars (when the number is passed as string)
            },
            branch: {
              displayName: 'Branches',
              headerStyle: styles.headerDark,
              cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
                let branches = ''
                value.map((data, index) => {
                    if(value.length == index+1){
                      branches += data.name.trim()
                    }else{
                      branches += data.name.trim()+', '
                    }
                })
                return branches.trim()
              },
              width: 350 // <- width in pixels
            }
          }
           
          // The data set should have the following shape (Array of Objects)
          // The order of the keys is irrelevant, it is also irrelevant if the
          // dataset contains more fields as the report is build based on the
          // specification provided above. But you should have all the fields
          // that are listed in the report specification
          const dataset = category
           
          // Create the excel report.
          // This function will return Buffer
          const report = excel.buildExport(
            [ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
              {
                name: 'All category Information', // <- Specify sheet name (optional)
                specification: specification, // <- Report specification
                data: dataset // <-- Report data
              }
            ]
          );
           
          // You can then return this straight
          res.attachment('category.xlsx'); // This is sails.js specific (in general you need to set headers)
          return res.send(report);

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }      
});

module.exports = router