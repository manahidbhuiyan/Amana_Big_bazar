const express = require('express');
const router = express.Router();
const fs = require('fs')
const xlsx = require('node-xlsx');
const slugify = require('slugify');

// Load Middleware
const auth = require('../../../middleware/admin/auth')

const Category = require('../../../models/Category');
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
              let allImportedDataInfo =  allImportedData.map(async (data)=>{
                let categoryName =  escape(data[0]).toLowerCase().trim()
                
                let branches = []

                let branchData = data[1].split(",").map(async function(branch) {
                  let branchInfo = await Branch.findOne({
                    name: {
                      $regex: branch.trim(),
                      $options: "i"
                    }
                  })
                  branches.push(branchInfo.id)
                })
                await Promise.all(branchData)

                let iconLink = data[2]==undefined?'':data[2].toLowerCase().trim()
                let slug = slugify(categoryName)
                importDataObject.push({
                  name: unescape(categoryName),
                  slug: slug,
                  branch: branches,
                  icon: iconLink
                })
              })

              await Promise.all(allImportedDataInfo)

              Category.insertMany(importDataObject,  (err, docs) => {
                if (err){ 
                    return console.error(err);
                } else {
                  removeUploadedFile(res, uploadedFileDetails, null)
                  res.status(200).json({
                      msg: 'Category imported successfully',
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

