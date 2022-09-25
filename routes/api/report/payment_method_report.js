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

const OrderForPos = require('../../../models/OrderForPos');
const Category = require('../../../models/Category');
const Branch = require('../../../models/Branch');

const auth = require('../../../middleware/user/auth');
const adminAuth = require('../../../middleware/admin/auth');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');

const Admin = require('../../../models/admin/Admin');

// @route GET api/order
// @description Get all the orders
// @access Private
router.post('/category/sell/list', [
    adminAuth,
    [
        check('from', 'From date is required').not().isEmpty(),
        check('to', 'To date is required').not().isEmpty(),
    ]
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

        let {
            from,
            to
        } = req.body

        from = new Date(from)
        from.setHours(0)
        from.setMinutes (0);
        from.setSeconds (0);
        
        to = new Date(to)
        to.setHours(23)
        to.setMinutes (59);
        to.setSeconds (59);

        let categories = await Category.find({
            branch: {
                $in: req.query.branch
            }
        }).select('_id name')

        let orderListItems = await OrderForPos.find({
            branch: req.query.branch,
            create: {
                $gte: isodate(from),
                $lte: isodate(to)
            }
        })


        let reportData = []


        let totalCategoryEarnAmount = 0;
        let totalCategoryCostAmount = 0;
        let totalProfitAmount = 0;
        let totalDiscountAmount = 0;

        await categories.map(async (category, index) => {
            let categoryEarnAmount = 0;
            let categoryCostAmount = 0;
            await orderListItems.map(async (item, index) => {
                await item.products.map(async product => {
                    if (product.category.toString() == category._id.toString()) {
                        categoryEarnAmount += (product.price * product.quantity)
                        totalDiscountAmount += (product.discount * product.quantity)
                        categoryCostAmount += (product.purchase_price * product.quantity)
                    }
                })
            })

            totalCategoryEarnAmount += categoryEarnAmount
            totalCategoryCostAmount += categoryCostAmount
            totalProfitAmount += (categoryEarnAmount - categoryCostAmount)

            reportData.push({
                _id: category._id,
                name: category.name,
                earn: categoryEarnAmount,
                cost: categoryCostAmount,
                profit: categoryEarnAmount - categoryCostAmount
            })

        })

        let branch = await Branch.findById(req.query.branch).select('_id name address');

        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        let reportFullDataset = {
            fromDate: ("0" + from.getDate()).slice(-2) + ' ' + months[from.getMonth()] + ', ' + from.getUTCFullYear(),
            toDate: ("0" + to.getDate()).slice(-2) + ' ' + months[to.getMonth()] + ', ' + to.getUTCFullYear(),
            branch_id: branch._id,
            branch_name: branch.name,
            branch_address: branch.address,
            data: reportData,
            totalEarnAmount: totalCategoryEarnAmount,
            totalCostAmount: totalCategoryCostAmount,
            totalProfitAmount: totalProfitAmount,
            specialDiscount: totalDiscountAmount,
            netSellAmount: totalCategoryEarnAmount - totalDiscountAmount,
            netProfitLoss: (totalCategoryEarnAmount - totalDiscountAmount) - totalCategoryCostAmount,
            netProfitLossPercentage: ((Math.abs((totalCategoryEarnAmount - totalDiscountAmount) - totalCategoryCostAmount) / totalCategoryCostAmount) * 100).toFixed(2),
        }

        var html = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'reports', 'category_wise_sell.html'), 'utf8');

        var options = {
            format: "A3",
            orientation: "portrait",
            border: "10mm"
        }




        var document = {
            html: html,
            data: reportFullDataset,
            path: "./public/reports/category_wise_sell_report.pdf"
        };

        pdf.create(document, options)
            .then(data => {
                const file = data.filename;
                res.download(file);
            })
            .catch(error => {
                console.error(error)
            });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router