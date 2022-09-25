const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../middleware/admin/auth');
const Product = require('../../../models/WarehouseProduct');
const WarehouseInventory = require('../../../models/WarehouseInventory')

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');

// @route DELETE api/inventory/reset
// @description reset inventory
// @access Private
router.delete('/reset', auth, async (req, res) => {
    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'warehouse inventory')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to Warehouse Inventory'
                }]
            })
        }

        let category = req.query.category
        let subcategory = req.query.subcategory
        let brand = req.query.brand
        let supplier = req.query.supplier
        let inventoryProduct;
        let products;
        // See if inventory product exsist
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
        // delete data from 
        if (inventoryProduct.length !== 0) {
            inventoryProduct.map(async (product) => {
                try {
                    await product.remove()
                } catch (err) {
                    console.error(err);
                    return res.status(500).send('Server error');
                }

            })
        }

        // Add item to inventory
        if (category != 'all') {
            if (subcategory != undefined) {
                products = await Product.find({
                    category: category,
                    subcategory: subcategory
                })
            } else if (brand != undefined) {
                products = await Product.find({
                    category: category,
                    subcategory: subcategory,
                    brand: brand
                })
            } else if (supplier != undefined) {
                products = await Product.find({
                    category: category,
                    subcategory: subcategory,
                    brand: brand,
                    supplier: supplier
                })
            } else {
                products = await Product.find({
                    category: category
                })
            }
        } else {
            products = await Product.find()
        }

        let productsArray = products.map(async (data) => {
            try {
                const product = data._id
                const price = data.price
                const barcode = data.barcode
                const name = data.name
                const stock_quantity = 0
                const category = data.category._id
                const subcategory = data.subcategory._id
                const brand = data.brand._id
                const supplier = data.supplier._id


                const addInventoryProductInfo = new WarehouseInventory({
                    product,
                    price,
                    stock_quantity,
                    category,
                    subcategory,
                    brand,
                    supplier,
                    barcode: String(barcode).trim(),
                    name: name.toLowerCase(),
                    created_by: req.admin.id
                })

                await addInventoryProductInfo.save()
            } catch {
                console.error(err);
                return res.status(500).send('Server error');
            }

        })
        await Promise.all(productsArray)

        if (category != 'all') {
            res.status(200).json({
                msg: 'Warehouse Inventory stock is cleared.'
            });
        } else {
            res.status(200).json({
                msg: 'Warehouse Inventory stock is cleared for all Products.'
            });
        }

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router