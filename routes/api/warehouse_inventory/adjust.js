const express = require('express');
const router = express.Router();
const slugify = require('slugify');

const {
    check,
    validationResult
} = require('express-validator');

var isodate = require("isodate");

const auth = require('../../../middleware/admin/auth');
const WarehouseInventory = require('../../../models/WarehouseInventory');
const Product = require('../../../models/WarehouseProduct');
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

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'warehouse inventory')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to warehouse inventory adjustment'
                }]
            })
        }


        let category = req.query.category
        let subcategory = req.query.subcategory
        let brand = req.query.brand
        let supplier = req.query.supplier
        let inventoryProduct;

        if (category != 'all') {
            if (subcategory != undefined) {
                inventoryProduct = await WarehouseInventory.find({
                    category: category,
                    subcategory: subcategory
                })
            } else if (brand != undefined) {
                inventoryProduct = await WarehouseInventory.find({
                    category: category,
                    subcategory: subcategory,
                    brand: brand
                })
            } else if (supplier != undefined) {
                inventoryProduct = await WarehouseInventory.find({
                    category: category,
                    subcategory: subcategory,
                    brand: brand,
                    supplier: supplier
                })
            } else {
                inventoryProduct = await WarehouseInventory.find({
                    category: category
                })
            }
        } else {
            inventoryProduct = await WarehouseInventory.find()
        }


        let length = inventoryProduct.length
        let warehouseInventoryProductsArray = inventoryProduct.map(async (productInfo, index) => {
            const barcode = productInfo.barcode
            const stock_quantity = productInfo.stock_quantity
            const category = productInfo.category._id
            const is_adjusted = productInfo.is_adjusted

            if (!is_adjusted) {
                await Product.updateOne({
                    "barcode": barcode,
                    "category": category
                }, {
                    $set: { quantity: stock_quantity }
                })

                // update is_adjusted field
                await WarehouseInventory.updateOne({
                    "barcode": barcode,
                    "category": category
                }, {
                    $set: { is_adjusted: true }
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
        await Promise.all(warehouseInventoryProductsArray)


        res.status(200).json({
            msg: 'Warehouse Inventory Successfully Adjusted'
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router