const express = require('express');
const router = express.Router();

const Subcategory = require('../../../models/SubCategory');
const Category = require('../../../models/Category');
const Branch = require('../../../models/Branch');
const BrandName = require('../../../models/BrandName');

// @route GET api/brand/:pageNo
// @description Get all the brand
// @access Private
router.get('/:pageNo', async (req, res) => {

    try {

        let dataList = 10
        let offset = (parseInt(req.params.pageNo) - 1) * 10

        let condition = {}

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
            } else if (columnName == 'branch') {
                let branchID = []
                const branch = await Branch.find({
                    name: {
                        $regex: text,
                        $options: "i"
                    }
                }).select('id')
                branch.map(value => branchID.push(value._id))
                condition = {
                    [columnName]: {
                        $in: branchID
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

        }

        let brandName = await BrandName.find(condition).populate('subcategory', ['name']).populate('category', ['name']).populate('branch', ['name']).limit(dataList).skip(offset)

        res.status(200).json({
            data: brandName
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/brand
// @description Get all the brand
// @access Public
router.get('/', async (req, res) => {
    try {
        let brand = await BrandName.find().select('_id').select('name')

        res.status(200).json({
            data: brand
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/brand/subcategory/:subcategoryID
// @description Get all the brand
// @access Public
router.get('/subcategory/:subcategoryID', async (req, res) => {
    try {

        let subcategoryID = req.params.subcategoryID

        let condition = {
            subcategory: {
                $in: [subcategoryID]
            }
        }

        if(req.query.branch){
            condition.branch = req.query.branch
        }

        let brand = await BrandName.find(condition).select('_id').select('name')

        res.status(200).json({
            data: brand
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/brand/:brandID
// @description Get single brand
// @access Private
router.get('/data/:brandID', async (req, res) => {

    try {
        let brandName = await BrandName.findById(req.params.brandID).populate('subcategory', ['name']).populate('category', ['name']).populate('branch', ['name'])

        res.status(200).json({
            data: brandName
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid subcategory'
                }]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router