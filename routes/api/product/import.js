const express = require('express');
const router = express.Router();
const fs = require('fs')
const xlsx = require('node-xlsx');
const slugify = require('slugify');


// Load Middleware
const auth = require('../../../middleware/admin/auth')

const Product = require('../../../models/Product');
const Branch = require('../../../models/Branch');
const Category = require('../../../models/Category');
const SubCategory = require('../../../models/SubCategory');
const Brand = require('../../../models/BrandName');
const Supplier = require('../../../models/Supplier');
const ProductWeightUnit = require('../../../models/ProductWeightUnit');
const ProductSize = require('../../../models/ProductSize');

const {
  upload,
  removeUploadedFile
} = require('../../../lib/data/import');

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
        let path = appRoot + '/' + uploadedFileDetails.path.replace('\\', '/')
        // Parse a file
        var obj = xlsx.parse(fs.readFileSync(path.replace(/\\/g, "/")));
      
        if (obj[0].data.length > 0) {
          let allImportedData = obj[0].data.filter((data) => data.length != 0)
          for(let i=0; i<=allImportedData.length; i++){
            let data  = allImportedData[i]

            if(data){
              
              if((data[0].toString()).trim()==null || (data[0].toString()).trim()==''){
                break;
              }

              let branchFind = await Branch.findOne({
                name: (data[0].toString()).toLowerCase().trim()
              }).select('name serialNo')
              let branchCode = branchFind._id

              let productInfo = await Product.findOne({
                barcode: String(data[5]).trim(),
                branch: branchCode,
              }).select('_id')

              if(!productInfo){
                let categoryFind = await Category.findOne({
                  name: (data[1].toString()).toLowerCase().trim()
                }).select('name branch')
    
                if(!categoryFind){
                  return res.status(400).json({
                    msg: (data[1].toString()).toLowerCase()+' category not found please fix it before import.'
                  })
                }
    
    
                if(categoryFind.branch.includes(branchCode)==false){
                  let categoryInfo = await Category.findById(categoryFind._id)
                  categoryInfo.branch.push(branchCode)
                  categoryFind = await categoryInfo.save()
                }
    
                let categoryOfProduct = categoryFind._id
    
                let subcategoryFind = await SubCategory.findOne({
                  name: (data[2].toString()).toLowerCase().trim()
                }).select('name category branch')
    
                if(!subcategoryFind){
                  let serialNoSubCat = 100
    
                  let lastSerialInfoSubCat = await SubCategory.findOne().sort({create: -1})
    
                  if(lastSerialInfoSubCat){
                    serialNoSubCat = lastSerialInfoSubCat.serialNo + 1
                  }else{
                    serialNoSubCat = serialNoSubCat + 1
                  }
    
                  let slug = slugify((data[2].toString()).toLowerCase().trim())
                  const addSubCategoryNameInfo = new SubCategory({
                      serialNo: serialNoSubCat,
                      branch: [branchCode],
                      category: [categoryOfProduct],
                      name: (data[2].toString()).toLowerCase().trim(),
                      slug
                  })
    
                  subcategoryFind = await addSubCategoryNameInfo.save()
                  // return res.status(400).json({
                  //   msg: (data[2].toString()).toLowerCase().trim()+' subcategory not found please fix it before import.'
                  // })
                }else{
                  let flag = 0
                  if(!subcategoryFind.branch.includes(branchCode)){
                    subcategoryFind.branch.push(branchCode)
                    flag = 1
                  }
    
                  if(!subcategoryFind.category.includes(categoryOfProduct)){
                    subcategoryFind.category.push(categoryOfProduct)
                    flag = 1
                  }
    
                  if(flag==1){
                    subcategoryFind = await subcategoryFind.save()
                  }
                }
    
                let subcategoryOfProduct = subcategoryFind._id
    
                let brandOfProduct = null
                let brandFind = await Brand.findOne({
                  name: (data[3].toString()).toLowerCase().trim()
                }).select('name category subcategory branch')
    
                if(!brandFind){
                  let serialNo = 1000
    
                  const lastSerialInfo = await Brand.findOne().sort({create: -1})
    
                  if(lastSerialInfo){
                      serialNo = lastSerialInfo.serialNo + 1
                  }else{
                      serialNo = serialNo + 1
                  }
    
                  let slug = slugify((data[3].toString()).toLowerCase().trim())
                  const addBrandNameInfo = new Brand({
                      serialNo,
                      branch: [branchCode],
                      category: [categoryOfProduct],
                      subcategory: [subcategoryOfProduct],
                      name: (data[3].toString()).toLowerCase().trim(),
                      slug
                  })
    
                  let savedBrandNameInfo = await addBrandNameInfo.save()
                  brandOfProduct = savedBrandNameInfo._id
                }else{
                  let flag = 0
                  if(!brandFind.branch.includes(branchCode)){
                    brandFind.branch.push(branchCode)
                    flag = 1
                  }
    
                  if(!brandFind.category.includes(categoryOfProduct)){
                    brandFind.category.push(categoryOfProduct)
                    flag = 1
                  }
    
                  if(!brandFind.subcategory.includes(subcategoryOfProduct)){
                    brandFind.subcategory.push(subcategoryOfProduct)
                    flag = 1
                  }
    
                  if(flag==1){
                    brandFind = await brandFind.save()
                  }
    
                  brandOfProduct = brandFind._id
                }
    
                
                let supplierOfProduct = null
                let supplierFind = await Supplier.findOne({
                  name: (data[4].toString()).toLowerCase().trim()
                })
    
                if(!supplierFind){
                  let serialNo1 = 1000
    
                  const lastSerialInfo_supplier = await Supplier.findOne().sort({create: -1})
    
                  if(lastSerialInfo_supplier){
                      serialNo1 = lastSerialInfo_supplier.serialNo + 1
                  }else{
                      serialNo1 = serialNo1 + 1
                  }
    
                  let slug = slugify((data[3].toString()).toLowerCase().trim())
                  const addSupplierNameInfo = new Supplier({
                      serialNo: serialNo1,
                      branch: [branchCode],
                      brand: [brandOfProduct],
                      category: [categoryOfProduct],
                      subcategory: [subcategoryOfProduct],
                      name: (data[4].toString()).toLowerCase().trim(),
                      slug
                  })
    
                  let savedSupplierNameInfo = await addSupplierNameInfo.save()
                  supplierOfProduct = savedSupplierNameInfo._id
                }else{
                  let flag = 0
                  if(!supplierFind.branch.includes(branchCode)){
                    supplierFind.branch.push(branchCode)
                    flag = 1
                  }
    
                  if(!supplierFind.category.includes(categoryOfProduct)){
                    supplierFind.category.push(categoryOfProduct)
                    flag = 1
                  }
    
                  if(!supplierFind.subcategory.includes(subcategoryOfProduct)){
                    supplierFind.subcategory.push(subcategoryOfProduct)
                    flag = 1
                  }
    
                  if(!supplierFind.brand.includes(brandOfProduct)){
                    supplierFind.brand.push(brandOfProduct)
                    flag = 1
                  }
    
                  if(flag==1){
                    supplierFind = await supplierFind.save()
                  }
    
                  supplierOfProduct = supplierFind._id
                }
    
                let barcodeOfProduct = String(data[5]).trim()
    
                let nameOfProduct = escape(data[6].toString()).toLowerCase().trim()
                let slugOfProduct = slugify(nameOfProduct)
                let quantityOfProduct = data[7]
                let sellingPriceOfProduct = data[8]
                let purchasePriceOfProduct = data[9]
                let discountOfProduct = data[10]
    
                let vatOfProduct = data[11]
                let descriptionOfProduct = data[12]
                let expireDateOfProduct = data[13]
                let reorderOfProduct = data[14]
    
                let weightOfProduct = data[15]
                // let newOfferProduct = data[16]
                // let specialOfferProduct = data[17]
                // let bestsellOfferProduct = data[18]
    
                // let soldProduct = data[17]
                // let thumbnailOfProduct = data[18]
                // let productImages = data[19].split(",").map(function (image) {
                //   return image.trim();
                // })
    
                let productSerialNo = null
                let lastProductInfo = await Product.findOne({
                  branch: branchCode,
                }).select('_id serialNo').sort({create: -1})
  
                if(lastProductInfo){
                  productSerialNo = lastProductInfo.serialNo + 1
                }else{
                  productSerialNo = Number(branchFind.serialNo + '10001')
                }
    
                let productData = {
                  serialNo: productSerialNo,
                  name: unescape(nameOfProduct),
                  slug: slugOfProduct,
                  barcode: barcodeOfProduct,
                  quantity: quantityOfProduct,
                  price: {
                    sell: sellingPriceOfProduct,
                    purchase: purchasePriceOfProduct
                  },
                  reorderLevel: reorderOfProduct,
                  discount: discountOfProduct,
                  description: descriptionOfProduct,
                  weight: weightOfProduct,
                  // newProduct: newOfferProduct,
                  // specialOffer: specialOfferProduct,
                  // bestSell: bestsellOfferProduct,
                  vat: vatOfProduct,
                  expireDate: expireDateOfProduct,
                  branch: branchCode,
                  category: categoryOfProduct,
                  subcategory: subcategoryOfProduct,
                  brand: brandOfProduct,
                  supplier: supplierOfProduct
                  // sold: soldProduct,
                  // thumbnail: thumbnailOfProduct,
                  // images: productImages
                }
    
                if (data[16]) {
                  let weightUnitOfProduct = await ProductWeightUnit.findOne({
                    shortform: data[16].toLowerCase()
                  }).select('_id')
                  productData.unitType = weightUnitOfProduct._id
                }
    
                if (data[17]) {
                  let sizeOfProduct =  data[17].split(",").map(async (size) => {
                    let productSizeInfo = await ProductSize.findOne({
                      shortform: data[16].toLowerCase()
                    }).select('_id')
  
                    return productSizeInfo._id;
                  });
  
                  await Promise.all(sizeOfProduct)
    
                  productData.availableSize = sizeOfProduct
                }
  
                await Product.create(productData)
              }

              // let productInfo = await Product.findOne({
              //   barcode: barcodeOfProduct,
              //   branch: branchCode,
              // }).select('_id')

              // if(!productInfo){
              //   // console.log(productData)
              //   await Product.create(productData)
              //   // importDataObject.push(productData)
              // }
            }
          }

          
          removeUploadedFile(res, uploadedFileDetails, null)
          return res.status(200).json({
            msg: 'Product imported successfully'
          })

        }else{
          removeUploadedFile(res, uploadedFileDetails, "Your excel file is empty")
        } 
      } catch (error) {
        console.error(error)
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