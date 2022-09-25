// Load Config 
const config = require('config')
const multer = require('multer')
const fs = require('fs')
const path = require('path');
const cron = require("node-cron");
// Load Request 
const fetch = require("node-fetch");

const SendEmail = require('../email/sendEmailModule')

const {dbAutoBackUp} = require('../backup/mongodb_backup');
const {dbAutoRestore} = require('../backup/mongodb_restore');

const excel = require('node-excel-export');

const Branch = require('../../models/Branch');
const Notification = require('../../models/Notification');
const Product = require('../../models/Product');
const Cart = require('../../models/PosCart');
const Admin = require('../../models/admin/Admin')

const savePreviousStockReport = require('./previous_stock_report')
const saveWarehousePreviousStockReport = require('./warehouse_previous_stock_report')
const paymentReportScheduler = require('./payment_report_scheduler')
const applyScheduledDiscount = require('./discount/apply_discount')
const removeScheduledDiscount = require('./discount/discount_remove')


const Supplier = require('../../models/Supplier');
const getListOFNotMatchedStock = require('./match_stock_with_operation');

var mongoose = require('mongoose');
const Category = require('../../models/Category');
const SubCategory = require('../../models/SubCategory');
const Brand = require('../../models/BrandName');
const ProductSize = require('../../models/ProductSize');
const ProductWeightUnit = require('../../models/ProductWeightUnit');
const PosUser = require('../../models/PosUser');

// Specific admin role checking 
const getAdminRoleChecking = async (adminID, roleType) => {
  try {
    const adminInfo = await Admin.findOne({
      _id: adminID
    }).select('admin_roles')

    if (!adminInfo) {
      return false
    }
    return adminInfo.admin_roles.filter(value => value == roleType).length > 0 ? true : false
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
}

// Function for checking an object is empty or not
const isObjEmpty = (obj) => {
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      return false
    }
  }
  return true
}

// Send single sms using GP Message API
const sendMessageTo = async (msisdn, message, apicode="1", messagetype="1") => {
  const rawResponse = await fetch(config.get('gp_sms_api').requestURL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: config.get('gp_sms_api').username,
      password: config.get('gp_sms_api').password,
      apicode: apicode,
      msisdn: msisdn,
      countrycode: config.get('gp_sms_api').countrycode,
      cli: config.get('gp_sms_api').cli,
      messagetype: messagetype,
      message: message,
      messageid: config.get('gp_sms_api').messageid
    })
  });

  const content = await rawResponse.json();

  return content
}

// Generate Six Digit Random Number 
const generateRandomNumber = () => {
  return Math.floor(100000 + Math.random() * 900000)
}

// Generate Random Number  According to Range
const generateOwnRandomNumber = (min, max) => {
  return Math.floor(min + Math.random() * max)
}

// Generate Next Order ID According to Order Collection 
const generateNextCode = (totalOrdersPlaced) => {
  let nextOrderNumber = config.get('generatedIDFrom')

  return totalOrdersPlaced + nextOrderNumber + 1
}

// Generate Next Order ID According to Order Collection 
const generateNextID = (totalOrdersPlaced, digitValue) => {
  let nextOrderNumber = digitValue

  return totalOrdersPlaced + nextOrderNumber + 1
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.get('imageLocation'));
  },
  filename: (req, file, cb) => {
    var filetype = '';
    if (file.mimetype === 'image/png') {
      filetype = 'png';
    }
    if (file.mimetype === 'image/jpeg') {
      filetype = 'jpg';
    }
    cb(null, 'image-' + Date.now() + generateNextCode(Date.now()) + '.' + filetype);
  }
});

// Upload the photos method
const upload = multer({
  storage: storage
});

//Remove uploaded files if not satisfy the validation
const removeNotvalidateFile = (res, uploadedFileDetails, validationMessage) => {
  fs.unlink(uploadedFileDetails.path, (err) => {
    if (err) {
      console.error(err)
      return
    } else {
      // return res.json({
      //   errors: [{
      //     msg: validationMessage
      //   }]
      // })
      return null;
    }
  });
}

//Remove uploaded files from images folder
const removeUploadedFile = (res, removedPath, successInfo) => {
  if (fs.existsSync(removedPath)) {
    fs.unlink(removedPath, (err) => {
      if (err) {
        console.error(err)
        return
      } else {
        return res.status(200).json({
          type: 'success',
          msg: successInfo.msg,
          data: successInfo.data
        })
      }
    });
  } else {
    return res.status(200).json({
      type: 'success',
      msg: successInfo.msg,
      data: successInfo.data
    })
  }



}


//Remove uploaded files .jpg or .png from images folder after uploading
const removeUploadedImageFile = (removedPath) => {
  fs.unlink(removedPath, (err) => {
    if (err) {
      console.error(err)
      return
    }
  });
}

const mongoDatabaseBackup = async () => {
  cron.schedule("*/20 * * * *", async function () {
    dbAutoBackUp()
  })
}

const mongoDatabaseRestore = async () => {
  cron.schedule("*/30 * * * *", async function () {
    dbAutoRestore()
  })
}

//Stockout notification
const stockOutNotification = async () => {
  // schedule tasks to be run on the server "59 23 * * *"  
  cron.schedule("59 23 * * *", async function () {
    let branches = await Branch.find({}).select('id name')

    //Clear Junk Cart Data Every Day
    await Cart.deleteMany({})

    try {
      fs.readdir(config.get('stockLocation'), (err, files) => {
        if (err) throw err;

        for (const file of files) {
          console.log(file)
          fs.unlinkSync(path.join(config.get('stockLocation'), file));
        }
      });

      branches.map(async (branch, index) => {
        let email_notifications = await Notification.find({
          type: 'email',
          notificationType: {
            $in: ['product reorder']
          },
          branch: {
            $in: [branch._id]
          }
        }).select('email branch')

        let find_products = await Product.find({
          branch: branch._id,
          reorderLevel: {
            $gt: 0
          },
          isAvailable: true
        }).select('_id name barcode quantity reorderLevel').populate('supplier', ['name'])

        let productNeeded = []

        find_products.map(product => {
          if (product.quantity < product.reorderLevel) {
            productNeeded.push({
              _id: product._id,
              name: product.name,
              barcode: product.barcode,
              supplier: product.supplier.name,
              quantity: product.quantity,
              reorderLevel: product.reorderLevel,
            })
          }
        })

        let styles = {
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
        let specification = {
          // _id: { // <- the key should match the actual data key
          //   displayName: 'Product ID', // <- Here you specify the column header
          //   headerStyle: styles.headerDark, // <- Header style
          //   width: 200 // <- width in pixels
          // },
          name: { // <- the key should match the actual data key
            displayName: 'Name', // <- Here you specify the column header
            headerStyle: styles.headerDark, // <- Header style
            width: 200 // <- width in pixels
          },
          barcode: {
            displayName: 'Barcode',
            headerStyle: styles.headerDark,
            width: 320 // <- width in chars (when the number is passed as string)
          },
          supplier: {
            displayName: 'Supplier',
            headerStyle: styles.headerDark,
            width: 320 // <- width in chars (when the number is passed as string)
          },
          quantity: {
            displayName: 'Quantity',
            headerStyle: styles.headerDark,
            // cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
            //   return value.name;
            // },
            width: 120 // <- width in chars (when the number is passed as string)
          },
          reorderLevel: {
            displayName: 'Reorder Level',
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
        let dataset = productNeeded

        // Create the excel report.
        // This function will return Buffer
        let report = excel.buildExport(
          [ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
            {
              name: 'Low Stock Products', // <- Specify sheet name (optional)
              specification: specification, // <- Report specification
              data: dataset // <-- Report data
            }
          ]
        );

        let fileName = branch.name + '-' + Date.now() + '.xlsx'
        let fileNameLocation = config.get('stockLocation') + fileName

        fs.writeFileSync(fileNameLocation, report);

        //   const templateDetails = {
        //     folder: "verify",
        //     filename: "index.ejs",
        //     data:{
        //         code: verify,
        //         host:  config.get('hostname'),
        //         resetLink: '/api/admin/verify/',
        //         companyname: 'Amana Homes',
        //         supportEmail: 'support@amanahomes.com',
        //         button:{
        //             text: 'Verify'
        //         },
        //         user:{
        //             name: admin.name
        //         }
        //     }
        // }

        if (productNeeded.length > 0) {
          email_notifications.map(branchInfo => {
            let attachment = [{ // utf-8 string as an attachment
              filename: fileName,
              content: fs.readFileSync(fileNameLocation).toString("base64"),
              disposition: "attachment"
            }]

            const emailOptions = {
              from: config.get('basicEmailInfo').fromEmail,
              to: (branchInfo.email.trim()).toLowerCase(),
              subject: 'Stockout Notification(' + branch.name + ')'
            }

            let message = "Hope you are doing awesome. Please check the email attachment which represents stock out information of the branch " + branchInfo.name

            SendEmail(null, message, attachment, emailOptions)

          })
        }

      })
    } catch (error) {
      console.error(err);
    }
  });
  console.log("Cron Job Started!");
}

const stockReportScheduler = async() => {
  cron.schedule("1 0 * * *", async function () {
    let branches = await Branch.find({}).select('id')

    branches.map(branchInfo=>{
      savePreviousStockReport(branchInfo.id)
    })

    saveWarehousePreviousStockReport()
  });
}

const accountsPaymentReportScheduler = async() => {
  cron.schedule("0 2 * * *", async function () {
    let branches = await Branch.find({}).select('id')

    branches.map(branchInfo=>{
      paymentReportScheduler(branchInfo.id)
    })
  });
}


const applyProductDiscount = async() => {
  cron.schedule("15 0 * * *", async function () {
    let branches = await Branch.find({}).select('id')

    branches.map(branchInfo=>{
      applyScheduledDiscount(branchInfo.id)
    })
  });
}

const removeProductDiscount = async() => {
  cron.schedule("55 23 * * *", async function () {
    let branches = await Branch.find({}).select('id')

    branches.map(branchInfo=>{
      removeScheduledDiscount(branchInfo.id)
    })
  });
}


const checkMatchedStock = async () => {
  let suppliers = await Supplier.find({}).select('name')
  let supplierLoopArray = suppliers.map(supplierInfo=>{
    getListOFNotMatchedStock('2020-01-01', '2021-02-17', supplierInfo._id, mongoose.Types.ObjectId('5f82a8635e989e064902d02e'));
  })

  await Promise.all(supplierLoopArray)
}

const checkAllNamesAndTrim = async () => {
  console.log('start to trim all names')
  let branches = await Branch.find({}).select('name')
  let branchLoopArray = branches.map(async branchInfo=>{
    let branchSingleInfo = await Branch.findById(branchInfo._id)
    branchSingleInfo.name = branchSingleInfo.name.toLowerCase().trim()
    await branchSingleInfo.save()
  })

  await Promise.all(branchLoopArray)

  let categories = await Category.find({}).select('name')
  let categoryLoopArray = categories.map(async categoryInfo=>{
    let categorySingleInfo = await Category.findById(categoryInfo._id)
    categorySingleInfo.name = categorySingleInfo.name.toLowerCase().trim()
    await categorySingleInfo.save()
  })

  await Promise.all(categoryLoopArray)

  let subcategories = await SubCategory.find({}).select('name')
  let subcategoryLoopArray = subcategories.map(async subcategoryInfo=>{
    let subcategorySingleInfo = await SubCategory.findById(subcategoryInfo._id)
    subcategorySingleInfo.name = subcategorySingleInfo.name.toLowerCase().trim()
    await subcategorySingleInfo.save()
  })

  await Promise.all(subcategoryLoopArray)

  let brands = await Brand.find({}).select('name')
  let brandLoopArray = brands.map(async brandInfo=>{
    let brandSingleInfo = await Brand.findById(brandInfo._id)
    brandSingleInfo.name = brandSingleInfo.name.toLowerCase().trim()
    await brandSingleInfo.save()
  })

  await Promise.all(brandLoopArray)

  let suppliers = await Supplier.find({}).select('name')
  let supplierLoopArray = suppliers.map(async supplierInfo=>{
    let supplierSingleInfo = await Supplier.findById(supplierInfo._id)
    supplierSingleInfo.name = supplierSingleInfo.name.toLowerCase().trim()
    await supplierSingleInfo.save()
  })

  await Promise.all(supplierLoopArray)

  let productsizes = await ProductSize.find({}).select('name shortform')
  let productsizeLoopArray = productsizes.map(async sizeInfo=>{
    let productsizeSingleInfo = await ProductSize.findById(sizeInfo._id)
    productsizeSingleInfo.name = productsizeSingleInfo.name.toLowerCase().trim()
    productsizeSingleInfo.shortform = productsizeSingleInfo.shortform.toLowerCase().trim()
    await productsizeSingleInfo.save()
  })

  await Promise.all(productsizeLoopArray)

  let productweights = await ProductWeightUnit.find({}).select('name shortform')
  let productweightLoopArray = productweights.map(async weightInfo=>{
    let productweightSingleInfo = await ProductWeightUnit.findById(weightInfo._id)
    productweightSingleInfo.name = productweightSingleInfo.name.toLowerCase().trim()
    productweightSingleInfo.shortform = productweightSingleInfo.shortform.toLowerCase().trim()
    await productweightSingleInfo.save()
  })

  await Promise.all(productweightLoopArray)

  console.log('All name trimed completed')
}

const posClientsBranchIntegrate = async () => {
  console.log('start to integrate branch all pos users')
  let branches = [
    {
      name: "bonpara",
      id: "5e42b3e9ad2733136cfe64f8"
    },
    {
      name: "natore",
      id: "5e42b482ad2733136cfe64f9"
    }
  ]
  let pos_users = await PosUser.find({}).select('name address')
  let branchLoopArray = pos_users.map(async userInfo=>{
    let branchData = branches.filter(branchInfo => branchInfo.name == userInfo.address)
    await Promise.all(branchData)

    let POSUserSingleInfo = await PosUser.findById(userInfo._id)
    if(branchData.length==0){
      POSUserSingleInfo.branch = "5f82a8635e989e064902d02e"
    }else{
      POSUserSingleInfo.branch = branchData[0].id
    }
    await POSUserSingleInfo.save()
  })

  await Promise.all(branchLoopArray)

  console.log('All integrate branch all pos users completed')
}

module.exports = { 
  isObjEmpty,
  generateRandomNumber,
  generateNextCode,
  upload,
  removeNotvalidateFile,
  removeUploadedFile,
  getAdminRoleChecking,
  removeUploadedImageFile,
  generateOwnRandomNumber,
  generateNextID,
  stockOutNotification,
  mongoDatabaseBackup,
  mongoDatabaseRestore,
  stockReportScheduler,
  applyProductDiscount,
  removeProductDiscount,
  checkMatchedStock,
  checkAllNamesAndTrim,
  posClientsBranchIntegrate,
  sendMessageTo,
  accountsPaymentReportScheduler
}