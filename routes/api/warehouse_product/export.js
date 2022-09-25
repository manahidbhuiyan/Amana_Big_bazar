const express = require('express')
const router = express.Router()
const excel = require('node-excel-export');

const jwt = require('jsonwebtoken');
const config = require('config');

const WarehouseProduct = require('../../../models/WarehouseProduct');

router.get('/data/export/excel/:token', async (req, res) => {
    try {

      const token = req.params.token;
        let adminInformation = null;
        let category = req.query.category
        let condition = {}

        let categoryInfo = null

        if(category){
          condition.category = category
          categoryInfo = await Category.findById(category)
        }else{
          return res.status(400).json({
            msg: 'Invalid link trying to access'
          });
        }

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
        
        let warehouseProduct = await WarehouseProduct.find(condition).select('name barcode quantity price.sell price.purchase reorderLevel discount description weight vat newProduct specialOffer bestSell branch category subcategory brand supplier thumbnail images availableSize').populate('category', ['name']).populate('subcategory', ['name']).populate('brand', ['name']).populate('supplier', ['name']).populate('branch', ['name']).populate('unitType', ['name', 'shortform'])
    
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
            quantity: {
              displayName: 'Quantity',
              headerStyle: styles.headerDark,
              // cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
              //   return value.name;
              // },
              width: 120 // <- width in chars (when the number is passed as string)
            },
            'price.purchase': {
              displayName: 'Purchase Price',
              headerStyle: styles.headerDark,
              // cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
              //   return value.purcase;
              // },
              width: 120 // <- width in chars (when the number is passed as string)
            },
            'price.sell': {
              displayName: 'Sell Price',
              headerStyle: styles.headerDark,
              // cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
              //   return value.purcase;
              // },
              width: 120 // <- width in chars (when the number is passed as string)
            },
            vat: {
              displayName: 'Vat',
              headerStyle: styles.headerDark,
              // cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
              //   return value.purcase;
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
            },
            discount: {
              displayName: 'Discount Percentage',
              headerStyle: styles.headerDark,
              // cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
              //   return value.name;
              // },
              width: 120 // <- width in chars (when the number is passed as string)
            },
            description: {
              displayName: 'Description',
              headerStyle: styles.headerDark,
              // cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
              //   return value.name;
              // },
              width: 400 // <- width in chars (when the number is passed as string)
            },
            weight: {
              displayName: 'Weight',
              headerStyle: styles.headerDark,
              // cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
              //   return value.name;
              // },
              width: 120 // <- width in chars (when the number is passed as string)
            },
            newProduct: {
              displayName: 'New Product',
              headerStyle: styles.headerDark,
              // cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
              //   return value.name;
              // },
              width: 120 // <- width in chars (when the number is passed as string)
            },
            specialOffer: {
              displayName: 'Special Offer',
              headerStyle: styles.headerDark,
              // cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
              //   return value.name;
              // },
              width: 120 // <- width in chars (when the number is passed as string)
            },
            bestSell: {
              displayName: 'Best Sell',
              headerStyle: styles.headerDark,
              // cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
              //   return value.name;
              // },
              width: 120 // <- width in chars (when the number is passed as string)
            },
            category: {
              displayName: 'Category',
              headerStyle: styles.headerDark,
              // cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
              //   return value.name;
              // },
              width: 120 // <- width in chars (when the number is passed as string)
            },
            subcategory: {
              displayName: 'Subcategory',
              headerStyle: styles.headerDark,
              // cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
              //   return value.name;
              // },
              width: 120 // <- width in chars (when the number is passed as string)
            },
            brand: {
              displayName: 'Brand',
              headerStyle: styles.headerDark,
              // cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
              //   return value.name;
              // },
              width: 120 // <- width in chars (when the number is passed as string)
            },
            supplier: {
              displayName: 'Supplier',
              headerStyle: styles.headerDark,
              // cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
              //   return value.name;
              // },
              width: 120 // <- width in chars (when the number is passed as string)
            },
            thumbnail: {
              displayName: 'Thumbnail Images',
              headerStyle: styles.headerDark,
              // cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
              //   return value.name;
              // },
              width: 120 // <- width in chars (when the number is passed as string)
            },
            images: {
              displayName: 'Images',
              headerStyle: styles.headerDark,
              // cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
              //   return value.name;
              // },
              width: 120 // <- width in chars (when the number is passed as string)
            },
            unitType: {
              displayName: 'Unit type',
              headerStyle: styles.headerDark,
              // cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
              //   return value.name;
              // },
              width: 120 // <- width in chars (when the number is passed as string)
            },
            availableSize: {
              displayName: 'Available Size',
              headerStyle: styles.headerDark,
              // cellFormat: function(value, row) { // <- Renderer function, you can access also any row.property
              //   let numbers = ''
              //   value.map((phone, index) => {
              //       if(value.length == index+1){
              //           numbers += phone.trim()
              //       }else{
              //           numbers += phone.trim()+', '
              //       }
              //   })
              //   return numbers.trim()
              // },
              width: 250 // <- width in pixels
            }
          }

          let updatedProductListData = []

          let productArrayLoop = warehouseProduct.map((productInfo, index)=>{
            if(productInfo.supplier){
              updatedProductListData.push({
                'price.purchase': productInfo.price.purchase,
                'price.sell': productInfo.price.sell,
                vat: productInfo.vat,
                quantity: productInfo.quantity,
                discount: productInfo.discount,
                images: productInfo.images,
                availableSize: productInfo.availableSize,
                newProduct: productInfo.newProduct,
                specialOffer: productInfo.specialOffer,
                bestSell: productInfo.bestSell,
                _id: productInfo._id,
                category: productInfo.category.name,
                subcategory: productInfo.subcategory.name,
                brand: productInfo.brand.name,
                supplier: productInfo.supplier.name,
                barcode: productInfo.barcode,
                name: productInfo.name,
                description: productInfo.description,
                reorderLevel: productInfo.reorderLevel,
                unitType: productInfo.unitType.shortform
              })
            }  
          })

          await Promise.all(productArrayLoop)
          
          // The data set should have the following shape (Array of Objects)
          // The order of the keys is irrelevant, it is also irrelevant if the
          // dataset contains more fields as the report is build based on the
          // specification provided above. But you should have all the fields
          // that are listed in the report specification
          const dataset = updatedProductListData
          
          // Create the excel report.
          // This function will return Buffer
          const report = excel.buildExport(
            [ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
              {
                name: 'All Warehouse Product Information', // <- Specify sheet name (optional)
                specification: specification, // <- Report specification
                data: dataset // <-- Report data
              }
            ]
          );
          
          // You can then return this straight
          res.attachment('warehouse-product('+categoryInfo.name+').xlsx'); // This is sails.js specific (in general you need to set headers)
          return res.send(report);

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }      
});

module.exports = router