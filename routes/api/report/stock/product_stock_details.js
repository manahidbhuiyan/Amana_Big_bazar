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

const Product = require('../../../../models/Product');
const Supplier = require('../../../../models/Supplier');
const Branch = require('../../../../models/Branch');

const auth = require('../../../../middleware/user/auth');
const adminAuth = require('../../../../middleware/admin/auth');

const {
    getAdminRoleChecking
} = require('../../../../lib/helpers');

const Admin = require('../../../../models/admin/Admin');

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

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'report')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to report'
                    }
                ]
            })
        }


        let suppliers = await Supplier.find({
            branch: {
                $in: req.query.branch
            }
        }).select('_id name')

        
        


        let reportData = []


        let totalQuantity = 0;
        let totalCostAmount = 0;
        let totalSellAmount = 0;
        // let totalDiscountAmount = 0;

        let allCategoryData = []

        await suppliers.map(async (category, index) => {

            let categoryWiseProductList = await Product.find({
                branch: req.query.branch,
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
                let branch = await Branch.findById(req.query.branch).select('_id name address');

                var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

                var today = new Date()

                let reportFullDataset = {
                    currentDate: ("0" + today.getDate()).slice(-2) + ' ' + months[today.getMonth()] + ', ' + today.getUTCFullYear(),
                    branch_id: branch._id,
                    branch_name: branch.name.trim(),
                    branch_address: branch.address,
                    data: allCategoryData,
                    totalEarnAmount: totalSellAmount.toFixed(2),
                    totalCostAmount: totalCostAmount.toFixed(2),
                    totalQuantity: totalQuantity.toFixed(2),
                }

                var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'reports', 'stock', 'current_stock_report_supplier.html'), 'utf8');

                var options = {
                    format: "A4",
                    orientation: "portrait",
                    border: "10mm"
                }




                var document = {
                    html: html,
                    data: reportFullDataset,
                    path: "./public/reports/supplier_stock_report_summery.pdf"
                };

                pdf.create(document, options)
                    .then(data => {
                        const file = data.filename;
                        return res.status(200).json({
                            auth: true,
                            fileLink: '/reports/supplier_stock_report_summery.pdf' 
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