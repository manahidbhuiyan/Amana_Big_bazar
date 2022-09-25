const express = require('express');
const router = express.Router();
const fs = require('fs')
const xlsx = require('node-xlsx');

// Load Middleware
const auth = require('../../../middleware/admin/auth')

const Supplier = require('../../../models/Supplier');
const Brand = require('../../../models/BrandName');
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
              
              let allImportedDataInfo = allImportedData.map(async(data)=>{
                let nameData = escape(data[0]).toLowerCase().trim()
                
                let phoneNo = data[1].split(",").map(function(phone) {
                  return phone.trim();
                })

                let brands = []
                let subcategories = []
                let categories = []
                let branches = []

                let brandData = data[2].split(",").map(async function(brand) {
                  let brandInfo = await Brand.findOne({
                    name: {
                      $regex: brand.trim(),
                      $options: "i"
                    }
                  })
                  brands.push(brandInfo.id)
                })
                await Promise.all(brandData)
                
                let subcategoryData = data[3].split(",").map(async function(subcategory) {
                  let subcategoryInfo = await SubCategory.findOne({
                    name: {
                      $regex: subcategory.trim(),
                      $options: "i"
                    }
                  })
                  subcategories.push(subcategoryInfo.id)
                })
                await Promise.all(subcategoryData)
                
                let categoryData = data[4].split(",").map(async function(category) {
                  let categoryInfo = await Category.findOne({
                    name: {
                      $regex: category.trim(),
                      $options: "i"
                    }
                  })
                  categories.push(categoryInfo.id)
                })
                await Promise.all(categoryData)
                
                let branchData = data[5].split(",").map(async function(branch) {
                  let branchInfo = await Branch.findOne({
                    name: {
                      $regex: branch.trim(),
                      $options: "i"
                    }
                  })
                  branches.push(branchInfo.id)
                })
                await Promise.all(branchData)

                importDataObject.push({
                  name: unescape(nameData),
                  contact: {
                    phone: phoneNo
                  },
                  brand: brands,
                  subcategory: subcategories,
                  category: categories,
                  branch: branches
              })
            })

            await Promise.all(allImportedDataInfo)

              Supplier.insertMany(importDataObject, function (err, docs) {
                if (err){ 
                    return console.error(err);
                } else {
                  removeUploadedFile(res, uploadedFileDetails, null)
                  return res.status(200).json({
                      msg: 'Supplier imported successfully',
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

