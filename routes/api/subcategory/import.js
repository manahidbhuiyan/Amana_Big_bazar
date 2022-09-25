const express = require('express');
const router = express.Router();
const fs = require('fs')
const xlsx = require('node-xlsx');
const slugify = require('slugify');

// Load Middleware
const auth = require('../../../middleware/admin/auth')

const SubCategory = require('../../../models/SubCategory');
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
              let allImportedDataInfo = allImportedData.map(async (data)=>{
                let nameData = escape(data[0]).toLowerCase().trim()
                let slugData = slugify(nameData)

                let categories = []
                let branches = []

                let categoryData = data[1].split(",").map(async function(category) {
                  let categoryInfo = await Category.findOne({
                    name: {
                      $regex: category.trim(),
                      $options: "i"
                    }
                  })
                  categories.push(categoryInfo.id)
                })
                await Promise.all(categoryData)
                
                let branchData = data[2].split(",").map(async function(branch) {
                  let branchInfo = await Branch.findOne({
                    name: {
                      $regex: branch.trim(),
                      $options: "i"
                    }
                  })
                  branches.push(branchInfo.id)
                })
                await Promise.all(branchData)

                let isSizeAvailable = data[3] == 1 ? true : false
                let isWeightAvailable = data[4] == 1 ? true : false
               
                importDataObject.push({
                  name: unescape(nameData),
                  slug: slugData,
                  category: categories,
                  branch: branches,
                  isSizeAvailable,
                  isWeightAvailable
                })
              })

              await Promise.all(allImportedDataInfo)

              SubCategory.insertMany(importDataObject, function (err, docs) {
                if (err){ 
                    return console.error(err);
                } else {
                  removeUploadedFile(res, uploadedFileDetails, null)
                  return res.status(200).json({
                      msg: 'Subcategory imported successfully',
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

