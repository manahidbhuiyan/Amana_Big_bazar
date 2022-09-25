const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../middleware/admin/auth');
const Product = require('../../../models/Product');
const Inventory = require('../../../models/Inventory')

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');

// @route DELETE api/inventory/reset
// @description reset inventory
// @access Private
router.delete('/reset', auth, async (req, res) => {
    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'inventory')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to Inventory'
                }]
            })
        }


        let branch = req.query.branch
        let category = req.query.category
        let subcategory = req.query.subcategory
        let brand = req.query.brand
        let supplier = req.query.supplier
        let inventoryProduct;
        let products;

        //See if inventory product exsist
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

        // delete data from 
        if (inventoryProduct.length !== 0) {
            let inventoryProductArray = inventoryProduct.map(async (product) => {
                try {
                    await product.remove()
                } catch (err) {
                    console.error(err);
                  return res.status(500).send('Server error');
                }
                
            })
            await Promise.all(inventoryProductArray)
        }
        // Add item to inventory
        if (category != 'all') {
            if (subcategory != undefined) {
                products = await Product.find({
                    branch: branch,
                    category: category,
                    subcategory: subcategory
                })
            } else if (brand != undefined) {
                products = await Product.find({
                    branch: branch,
                    category: category,
                    subcategory: subcategory,
                    brand: brand
                })
            } else if (supplier != undefined) {
                products = await Product.find({
                    branch: branch,
                    category: category,
                    subcategory: subcategory,
                    brand: brand,
                    supplier: supplier
                })
            } else {
                products = await Product.find({
                    branch: branch,
                    category: category
                })
            }
        } else {
            products = await Product.find({
                branch: branch
            })
        }

        products.map(async (data) => {
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
                const branch = data.branch._id


                const addInventoryProductInfo = new Inventory({
                    product,
                    price,
                    stock_quantity,
                    branch,
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
        if (category != 'all') {
            res.status(200).json({
                msg: 'Inventory stock is cleared'
            });
        } else {
            res.status(200).json({
                msg: 'Inventory stock is cleared for all Products'
            });
        }


    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route DELETE /branch/category/wise/delete
// @description Remove specific product
// @access Private
router.post('/branch/category/wise/delete', [auth, [
    check('from_branch', 'From branch is required').not().isEmpty(),
    check('category', 'Category is required').not().isEmpty(),
]], async (req, res) => {
    try {

        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'product')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to product'
                }]
            })
        }

        const {
            from_branch,
            category
        } = req.body


        let product = await Product.deleteMany({
            branch: from_branch,
            category: {
                $in: category
            }
        })

        res.status(200).json({
            msg: 'Products removed successfully'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router