const express = require('express');
const router = express.Router();
const fs = require('fs')
const xlsx = require('node-xlsx');

// Load Middleware
const auth = require('../../../middleware/admin/auth')

const Branch = require('../../../models/Branch');

const {upload, removeUploadedFile} = require('../../../lib/data/import')


// @route api/category/data/import
// @description Category data import
// @access Private
router.post('/data/import/excel', [auth, upload.single('file')], async (req, res) => {
    let validationMessage = '';
    const uploadedFileDetails = req.file
    if (uploadedFileDetails.mimetype === 'application/octet-stream' || uploadedFileDetails.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || uploadedFileDetails.mimetype === 'application/vnd.ms-excel') {
      const filesize = parseFloat(uploadedFileDetails.size) / (1024 * 1024)
      if (filesize < 10) {
        try {
          let path = appRoot +'/'+ uploadedFileDetails.path.replace('\\', '/')
          // Parse a file
            var obj = xlsx.parse(fs.readFileSync(path.replace(/\\/g, "/"))); 
            let importDataObject =[]
            if(obj[0].data.length > 0)
            {
              let allImportedData = obj[0].data.filter((data)=> data.length != 0 )
              allImportedData.map((data)=>{
                let branchName = escape(data[0]).toLowerCase().trim()
                let divisionData = data[1].split(",")
                let districtData = data[2].split(",")
                let thanaData = data[3].split(",")
                let addressData = data[4]
                let phoneData = data[5].split(",").map(function(phone) {
                  return phone.trim();
                });
                importDataObject.push({
                  name: unescape(branchName),
                  division: {
                    id: divisionData[0].trim(),
                    name: divisionData[1].trim()
                  },
                  district: {
                    id: districtData[0].trim(),
                    name: districtData[1].trim()
                  },
                  thana: {
                    id: thanaData[0].trim(),
                    name: thanaData[1].trim()
                  },
                  address: addressData.trim(),
                  phone: phoneData
                })
              })

              Branch.insertMany(importDataObject, function (err, docs) {
                if (err){ 
                    return console.error(err);
                } else {
                  removeUploadedFile(res, uploadedFileDetails, null)
                  return res.status(200).json({
                      auth: true,
                      msg: 'Branch imported successfully',
                      data: importDataObject
                  })
                }
              });

            }else{
              removeUploadedFile(res, uploadedFileDetails, "Your excel file is empty")
            }
        } catch (error) {
          console.error(error.message)
          return res.status(500).send('Server error')
        }
      } else {
        validationMessage = 'File should not be more than 10 MB.'
        removeUploadedFile(res, uploadedFileDetails, validationMessage)
      }
    } else {
      validationMessage = 'Only xlsx and xls files are allowed.'
      removeUploadedFile(res, uploadedFileDetails, validationMessage)
    }
  })

  module.exports = router

