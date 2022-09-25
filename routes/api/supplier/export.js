const express = require('express')
const router = express.Router()
const excel = require('node-excel-export');

const jwt = require('jsonwebtoken');
const config = require('config');

const Supplier = require('../../../models/Supplier');

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

        let supplier = await Supplier.find({}).populate('brand', ['name']).populate('subcategory', ['name']).populate('category', ['name']).populate('branch', ['name'])
    
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
              displayName: 'Supplier ID', // <- Here you specify the column header
              headerStyle: styles.headerDark, // <- Header style
              width: 200 // <- width in pixels
            },
            name: { // <- the key should match the actual data key
              displayName: 'Name', // <- Here you specify the column header
              headerStyle: styles.headerDark, // <- Header style
              width: 200 // <- width in pixels
            },
            contact: {
              displayName: 'Phone',
              headerStyle: styles.headerDark,
              cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
                let phoneData = ''
                let phoneArray = value.phone
                phoneArray.forEach((phoneNo, index) => {
                    if(phoneArray.length == index+1){
                      phoneData += phoneNo
                    }else{
                      phoneData += phoneNo +', '
                    }
                })
                return phoneData
              },
              width: 320 // <- width in chars (when the number is passed as string)
            },
            brand: {
              displayName: 'Brand',
              headerStyle: styles.headerDark,
              cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
                let brand = ''
                value.map((brandData, index) => {
                    if(value.length == index+1){
                      brand += brandData.name.trim()
                    }else{
                      brand += brandData.name.trim()+', '
                    }
                })
                return brand.trim()
              },
              width: 320 // <- width in chars (when the number is passed as string)
            },
            subcategory: {
              displayName: 'Subcategory',
              headerStyle: styles.headerDark,
              cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
                let subcategory = ''
                value.map((subcategoryData, index) => {
                    if(value.length == index+1){
                      subcategory += subcategoryData.name.trim()
                    }else{
                      subcategory += subcategoryData.name.trim()+', '
                    }
                })
                return subcategory.trim()
              },
              width: 320 // <- width in chars (when the number is passed as string)
            },
            category: {
                displayName: 'Category',
                headerStyle: styles.headerDark,
                cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
                  let category = ''
                  value.map((categoryData, index) => {
                      if(value.length == index+1){
                        category += categoryData.name.trim()
                      }else{
                        category += categoryData.name.trim()+', '
                      }
                  })
                  return category.trim()
                },
                width: 320 // <- width in chars (when the number is passed as string)
            },
            branch: {
              displayName: 'Branch',
              headerStyle: styles.headerDark,
              cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
                let branch = ''
                value.map((branchData, index) => {
                    if(value.length == index+1){
                      branch += branchData.name.trim()
                    }else{
                      branch += branchData.name.trim()+', '
                    }
                })
                return branch.trim()
              },
              width: 320 // <- width in chars (when the number is passed as string)
            }
          }
           
          // The data set should have the following shape (Array of Objects)
          // The order of the keys is irrelevant, it is also irrelevant if the
          // dataset contains more fields as the report is build based on the
          // specification provided above. But you should have all the fields
          // that are listed in the report specification
          const dataset = supplier
           
          // Create the excel report.
          // This function will return Buffer
          const report = excel.buildExport(
            [ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
              {
                name: 'All Supplier Information', // <- Specify sheet name (optional)
                specification: specification, // <- Report specification
                data: dataset // <-- Report data
              }
            ]
          );
           
          // You can then return this straight
          res.attachment('supplier.xlsx'); // This is sails.js specific (in general you need to set headers)
          return res.send(report);

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }      
});

module.exports = router