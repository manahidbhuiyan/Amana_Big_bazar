const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const config = require('config')

var isodate = require("isodate");

var pdf = require("pdf-creator-node");
var fs = require('fs');
var path = require('path');

const Product = require('../../../../../models/WarehouseProduct');
const Supplier = require('../../../../../models/Supplier');

const adminAuth = require('../../../../../middleware/admin/auth');

const {
    getAdminRoleChecking
} = require('../../../../../lib/helpers');

const Admin = require('../../../../../models/admin/Admin');

// @route GET api/order
// @description Get all the orders
// @access Private
router.post('/supplier/stock/report', [
    adminAuth
], async (req, res) => {
    try {
        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'warehouse report')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to report'
                    }
                ]
            })
        }


        let suppliers = await Supplier.find({}).select('_id name')

        
        


        let reportData = []


        let totalQuantity = 0;
        let totalCostAmount = 0;
        let totalSellAmount = 0;
        // let totalDiscountAmount = 0;

        let allCategoryData = []

        await suppliers.map(async (category, index) => {

            let categoryWiseProductList = await Product.find({
                supplier: category._id
            })

            let categoryWiseData = {
                _id: category._id,
                name: category.name.trim(),
                quantity: 0,
                cost: 0,
                sell: 0
            }

            categoryWiseProductList.map((productInfo, index)=>{
                categoryWiseData.serial = productInfo.serialNo
                categoryWiseData.quantity += productInfo.quantity
                totalQuantity += productInfo.quantity
                categoryWiseData.cost += (productInfo.quantity * productInfo.price.purchase)
                totalCostAmount += (productInfo.quantity * productInfo.price.purchase)
                categoryWiseData.sell += (productInfo.quantity * productInfo.price.sell)
                totalSellAmount += (productInfo.quantity * productInfo.price.sell)
                
                if(categoryWiseProductList.length==(index+1)){
                    categoryWiseData.quantity = categoryWiseData.quantity.toFixed(2)
                    categoryWiseData.cost = categoryWiseData.cost.toFixed(2)
                    categoryWiseData.sell = categoryWiseData.sell.toFixed(2)
                    allCategoryData.push(categoryWiseData)
                }
            })

            if(suppliers.length == (index+1)){
                
                var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

                let today = new Date();
                let hours = today.getHours();
                let minutes = today.getMinutes();
                let ampm = hours >= 12 ? 'pm' : 'am';
                hours = hours % 12;
                hours = hours ? hours : 12; // the hour '0' should be '12'
                minutes = minutes < 10 ? '0' + minutes : minutes;
                let createTime = hours + ':' + minutes + ' ' + ampm;

                let reportFullDataset = {
                    currentDate: ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
                    branch_id: config.get('warehouse').serialNo,
                    branch_name: config.get('warehouse').name,
                    branch_address: config.get('warehouse').address,
                    data: allCategoryData,
                    totalEarnAmount: totalSellAmount.toFixed(2),
                    totalCostAmount: totalCostAmount.toFixed(2),
                    totalQuantity: totalQuantity.toFixed(2),
                }

                var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', '..', 'reports', 'stock', 'current_stock_report_supplier.html'), 'utf8');

                var options = {
                    format: "A4",
                    orientation: "portrait",
                    border: "10mm",
                    footer: {
                        height: "2mm",
                        contents: {
                            default: '<span style="color: #444; text-align: center">page - {{page}} </span>', // fallback value
                        }
                    }
                }




                var document = {
                    html: html,
                    data: reportFullDataset,
                    path: "./public/reports/warehouse_supplier_stock_report_summery.pdf"
                };

                pdf.create(document, options)
                    .then(data => {
                        const file = data.filename;
                        return res.status(200).json({
                            auth: true,
                            fileLink: '/reports/warehouse_supplier_stock_report_summery.pdf' 
                        })
                    })
                    .catch(error => {
                        console.error(error)
                });
            }
        })

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router