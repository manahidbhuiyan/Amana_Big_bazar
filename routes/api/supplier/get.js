const express = require('express');
const router = express.Router();

const Brand = require('../../../models/BrandName');
const Subcategory = require('../../../models/SubCategory');
const Category = require('../../../models/Category');
const Branch = require('../../../models/Branch');
const Supplier = require('../../../models/Supplier');

// @route GET api/supplier
// @description Get all the subcategories
// @access Private
router.get('/:pageNo', async (req, res) => {
    
    try {
        let dataList = 10
        let offset = (parseInt(req.params.pageNo) - 1) * 10

        let condition = {}
        
        if(req.query.type !== undefined)
        {
            let columnName = req.query.type
            let text = req.query.text
            
            if(columnName == 'subcategory'){
                let subcategoryID = []
                const subcategory = await Subcategory.find({
                    name: { $regex: text, $options: "i" }
                }).select('id')
                subcategory.map(value => subcategoryID.push(value._id))
                condition = { [columnName]: { $in: subcategoryID } }
            }else if(columnName == 'category'){
                let categoryID = []
                const category = await Category.find({
                    name: { $regex: text, $options: "i" }
                }).select('id')
                category.map(value => categoryID.push(value._id))
                condition = { [columnName]: { $in: categoryID } }
            }else if(columnName == 'brand'){
                let brandID = []
                const brand = await Brand.find({
                    name: { $regex: text, $options: "i" }
                }).select('id')
                brand.map(value => brandID.push(value._id))
                condition = { [columnName]: { $in: brandID } }
            }else if(columnName == 'branch'){
                let branchID = []
                const branch = await Branch.find({
                    name: { $regex: text, $options: "i" }
                }).select('id')
                branch.map(value => branchID.push(value._id))
                condition = { [columnName]: { $in: branchID } }
            }else{
                condition = { [columnName]: { $regex: text, $options: "i" } }
            }
            
        }

        let supplierData = await Supplier.find(condition).populate('branchWiseOpeningBalance.branch',['name']).populate('brand',['name']).populate('subcategory',['name']).populate('category',['name']).populate('branch',['name']).limit(dataList).skip(offset)
    
        res.status(200).json({
            data: supplierData
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/supplier
// @description Get all the supplier
// @access Public
router.get('/', async (req, res) => {
    try {
        let condition = {}

        if(req.query.branch){
            condition.branch = {
                $in: req.query.branch
            }
        }

        if (req.query.warehouseSupplier) {
            if (req.query.warehouseSupplier == 'true') {
                condition.warehouseSupplier = req.query.warehouseSupplier
            } else {
                condition.warehouseSupplier = { $ne: true }
            }
        }

        if (req.query.activeSupplier) {
            if (req.query.activeSupplier == 'true') {
                condition.activeSupplier = { $ne: false }
            }
        }

        let supplier = await Supplier.find(condition).select('_id').select('name')
        
    
        res.status(200).json({
            data: supplier
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/supplier/brand/:brandID
// @description Get all the supplier
// @access Public
router.get('/brand/:brandID', async (req, res) => {
    try {
        let brandID = req.params.brandID

        let condition = {
            brand: { $in: [brandID]}
        }

        if(req.query.branch){
            condition.branch = req.query.branch
        }

        if (req.query.warehouseSupplier) {
            if (req.query.warehouseSupplier == 'true') {
                condition.warehouseSupplier = req.query.warehouseSupplier
            } else {
                condition.warehouseSupplier = { $ne: true }
            }
        }

        if (req.query.activeSupplier) {
            if (req.query.activeSupplier == 'true') {
                condition.activeSupplier = { $ne: false }
            }
        }

        let supplier = await Supplier.find(condition).select('_id').select('name')
    
        res.status(200).json({
            data: supplier
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/supplier/:supplierID
// @description Get single supplier
// @access Private
router.get('/data/:supplierID', async (req, res) => {
    
    try {
        let supplierData = await Supplier.findById(req.params.supplierID).populate('branchWiseOpeningBalance.branch',['name']).populate('brand',['name']).populate('subcategory',['name']).populate('category',['name']).populate('branch',['name'])
    
        res.status(200).json({
            data: supplierData
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Invalid subcategory'
                    }
                ]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router