const express = require('express');
const router = express.Router();
const slugify = require('slugify');

const {
    check,
    validationResult
} = require('express-validator');

var isodate = require("isodate");

const auth = require('../../../middleware/admin/auth');
const Inventory = require('../../../models/Inventory');
const Product = require('../../../models/Product');
const {
    getAdminRoleChecking
} = require('../../../lib/helpers');


// @route POST api/product
// @description Add new product
// @access Private
router.put('/adjust', [auth,
], async (req, res) => {
    try {
        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }



        const adminRoles = await getAdminRoleChecking(req.admin.id, 'inventory adjustment')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to inventory adjustment'
                }]
            })
        }


        let branch = req.query.branch
        let category = req.query.category
        let subcategory = req.query.subcategory
        let brand = req.query.brand
        let supplier = req.query.supplier
        let inventoryProduct;

        if (category != 'all') {
            if (subcategory != undefined) {
                inventoryProduct = await Inventory.find({
                    branch: branch,
                    category: category,
                    subcategory: subcategory
                })
            } else if (brand != undefined) {
                inventoryProduct = await Inventory.find({
                    branch: branch,
                    category: category,
                    subcategory: subcategory,
                    brand: brand
                })
            } else if (supplier != undefined) {
                inventoryProduct = await Inventory.find({
                    branch: branch,
                    category: category,
                    subcategory: subcategory,
                    brand: brand,
                    supplier: supplier
                })
            } else {
                inventoryProduct = await Inventory.find({
                    branch: branch,
                    category: category
                })
            }
        } else {
            inventoryProduct = await Inventory.find({
                branch: branch
            })
        }

        let length = inventoryProduct.length
        let inventoryProductArray = inventoryProduct.map(async (productInfo, index) => {

            const barcode = productInfo.barcode
            const stock_quantity = productInfo.stock_quantity 
            const category = productInfo.category._id
            const branch = productInfo.branch._id
            const is_adjusted = productInfo.is_adjusted
            
            if (!is_adjusted) {
                await Product.updateOne({
                    "barcode": barcode,
                    "category": category,
                    "branch" : branch
                }, {
                    $set: {quantity: stock_quantity}
                })

                // update is_adjusted field
                await Inventory.updateOne({
                    "barcode": barcode,
                    "category": category,
                    "branch" : branch
                }, {
                    $set: {is_adjusted : true}
                })
                if (index == length - 1) {
                    return res.status(200).json({
                        msg: 'Inventory Successfully Adjusted'
                    })
                }
            }
            else {
                if (index == length - 1) {
                    return res.status(200).json({
                        msg: 'Already adjusted'
                    })
                }
            }
        })
        await Promise.all(inventoryProductArray)


    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router