const express = require('express');
const router = express.Router();


const WarehouseInventory = require('../../../models/WarehouseInventory');
const Brand = require('../../../models/BrandName');
const Subcategory = require('../../../models/SubCategory');
const Category = require('../../../models/Category');


// @route GET api/inventory product
// @description Get all the products from inventory
// @access Private
router.get('/allproduct', async (req, res) => {

    try {
        let inventoryProduct = await WarehouseInventory.find().sort({
            name: 1
        })


        res.status(200).json({
            data: inventoryProduct
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});




// @route GET api/inventory/single/category/barcode
// @description Get single product by category and barcode from inventory
// @access Private
router.get('/category', async (req, res) => {

    try {
        let category = req.query.category
        let subcategory = req.query.subcategory
        let brand = req.query.brand
        let supplier = req.query.supplier
        let condition = {};

        if (category != 'all') {
            if (subcategory != undefined) {
                condition.category = category
                condition.subcategory = subcategory
            } else if (brand != undefined) {
                condition.category = category
                condition.subcategory = subcategory
                condition.brand = brand
            } else if (supplier != undefined) {
                condition.category = category
                condition.subcategory = subcategory
                condition.brand = brand
                condition.supplier = supplier
            } else {
                condition.category = category
            }
        }

        let inventoryProduct = await WarehouseInventory.find(condition).populate('brand', ['name']).populate('subcategory', ['name']).populate('supplier', ['name']).populate('category', ['name']).populate('product', 'name')
        if (!inventoryProduct) {
            return res.status(400).send({
                errors: [{
                    msg: 'No product found'
                }]
            })
        }

        res.status(200).json({
            data: inventoryProduct
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid brand'
                }]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/warehouse/inventory/list/:pageNo
// @description Get all warehouse inventroy product products by category/name/barcode/subcategory/brand
// @access Private
router.get('/list/:pageNo', async (req, res) => {
    try {

        let dataList = 30
        let offset = (parseInt(req.params.pageNo) - 1) * dataList


        let condition = {
        }

        if (req.query.type !== undefined) {
            let columnName = req.query.type
            let text = req.query.text

            if (columnName == 'subcategory') {
                let subcategoryID = []
                const subcategory = await Subcategory.find({
                    name: {
                        $regex: text,
                        $options: "i"
                    }
                }).select('id')
                subcategory.map(value => subcategoryID.push(value._id))
                condition = {
                    [columnName]: {
                        $in: subcategoryID
                    }
                }
            } else if (columnName == 'category') {
                let categoryID = []
                const category = await Category.find({
                    name: {
                        $regex: text,
                        $options: "i"
                    }
                }).select('id')
                category.map(value => categoryID.push(value._id))
                condition = {
                    [columnName]: {
                        $in: categoryID
                    }
                }
            } else if (columnName == 'brand') {
                let brandID = []
                const brand = await Brand.find({
                    name: {
                        $regex: text,
                        $options: "i"
                    }
                }).select('id')
                brand.map(value => brandID.push(value._id))
                condition = {
                    [columnName]: {
                        $in: brandID
                    }
                }
            } else if (columnName == 'barcode') {
                condition = {
                    [columnName]: {
                        $regex: text,
                        $options: "i"
                    }
                }
            } else if (columnName == 'name') {
                condition = {
                    [columnName]: {
                        $regex: text,
                        $options: "i"
                    }
                }
            } else {
                condition = {
                    [columnName]: {
                        $regex: text,
                        $options: "i"
                    }
                }
            }

        } else {
            if (req.query.category) {
                condition.category = {
                    $in: req.query.category
                }
            }

            if (req.query.subcategory) {
                condition.subcategory = {
                    $in: req.query.subcategory
                }
            }

            if (req.query.brand) {
                condition.brand = {
                    $in: req.query.brand
                }
            }

            if (req.query.supplier) {
                condition.supplier = {
                    $in: req.query.supplier
                }
            }

            if (req.query.text) {
                condition.name = {
                    $regex: req.query.text.toLowerCase(),
                    $options: "i"
                }
            }
        }

        let product;

        //pageno have to be -999 to get all data in one call
        if (parseInt(req.params.pageNo) == -999) {
            product = await WarehouseInventory.find(condition).populate('brand', ['name']).populate('subcategory', ['name']).populate('category', ['name']).populate('supplier', ['name']).sort({
                "_id": -1
            })
        } else {
            product = await WarehouseInventory.find(condition).populate('brand', ['name']).populate('subcategory', ['name']).populate('category', ['name']).populate('supplier', ['name']).limit(dataList).skip(offset).sort({
                "_id": -1
            })
        }

        let totalProductNumber = await WarehouseInventory.find(condition).countDocuments();

        res.status(200).json({
            data: product,
            count: totalProductNumber
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router