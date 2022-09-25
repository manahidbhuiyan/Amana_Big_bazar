const express = require('express')
const router = express.Router()
const excel = require('node-excel-export');

const jwt = require('jsonwebtoken');
const config = require('config');

const PosUser = require('../../../models/PosUser');

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

    let posUser = await PosUser.find({}).select('clientID name phone points address email notes')

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
      clientID: { // <- the key should match the actual data key
        displayName: 'Name', // <- Here you specify the column header
        headerStyle: styles.headerDark, // <- Header style
        width: 200 // <- width in pixels
      },
      name: { // <- the key should match the actual data key
        displayName: 'Name', // <- Here you specify the column header
        headerStyle: styles.headerDark, // <- Header style
        width: 200 // <- width in pixels
      },
      phone: {
        displayName: 'Barcode',
        headerStyle: styles.headerDark,
        width: 320 // <- width in chars (when the number is passed as string)
      },
      points: {
        displayName: 'Quantity',
        headerStyle: styles.headerDark,
        // cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
        //   return value.name;
        // },
        width: 120 // <- width in chars (when the number is passed as string)
      },
      address: {
        displayName: 'Price',
        headerStyle: styles.headerDark,
        // cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
        //   return value.purcase;
        // },
        width: 120 // <- width in chars (when the number is passed as string)
      },
      email: {
        displayName: 'Reorder Level',
        headerStyle: styles.headerDark,
        // cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
        //   return value.name;
        // },
        width: 120 // <- width in chars (when the number is passed as string)
      },
      notes: {
        displayName: 'Discount Percentage',
        headerStyle: styles.headerDark,
        // cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
        //   return value.name;
        // },
        width: 120 // <- width in chars (when the number is passed as string)
      }
    }

    // The data set should have the following shape (Array of Objects)
    // The order of the keys is irrelevant, it is also irrelevant if the
    // dataset contains more fields as the report is build based on the
    // specification provided above. But you should have all the fields
    // that are listed in the report specification
    const dataset = posUser

    // Create the excel report.
    // This function will return Buffer
    const report = excel.buildExport(
      [ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
        {
          name: 'All POS User Information', // <- Specify sheet name (optional)
          specification: specification, // <- Report specification
          data: dataset // <-- Report data
        }
      ]
    );

    // You can then return this straight
    res.attachment('POS_Clients.xlsx'); // This is sails.js specific (in general you need to set headers)
    return res.send(report);

  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router