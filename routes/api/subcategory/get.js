const express = require('express');
const router = express.Router();

const Category = require('../../../models/Category');
const Branch = require('../../../models/Branch');
const SubCategory = require('../../../models/SubCategory');

// @route GET api/subcategory
// @description Get all the subcategories
// @access Private
router.get('/:pageNo', async (req, res) => {

    try {
        let dataList = 10
        let offset = (parseInt(req.params.pageNo) - 1) * 10

        let condition = {}

        if (req.query.type !== undefined) {
            let columnName = req.query.type
            let text = req.query.text

            if (columnName == 'branch') {
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
            } else {
                condition = {
                    [columnName]: {
                        $regex: text,
                        $options: "i"
                    }
                }
            }

        }

        let subCategory = await SubCategory.find(condition).populate('category', ['name']).populate('branch', ['name']).limit(dataList).skip(offset)

        res.status(200).json({
            data: subCategory
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/subcategory
// @description Get all the subcategories
// @access Public
router.get('/', async (req, res) => {
    try {
        let subcategory = await SubCategory.find().select('_id').select('name isSizeAvailable isWeightAvailable')

        res.status(200).json({
            data: subcategory
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/category/subcategory/:categoryID
// @description Get all the subcategories of specific category
// @access Public
router.get('/category/:categoryID', async (req, res) => {
    try {
        let categoryID = req.params.categoryID

        let condition = {
            category: {
                $in: [categoryID]
            }
        }

        if(req.query.branch){
            condition.branch = req.query.branch
        }

        let subcategory = await SubCategory.find(condition).select('_id').select('name isSizeAvailable isWeightAvailable')

        res.status(200).json({
            data: subcategory
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/subcategory/data/:subcategoryID
// @description Get single subcategory
// @access Private
router.get('/data/:subcategoryID', async (req, res) => {

    try {
        let subCategory = await SubCategory.findById(req.params.subcategoryID).populate('category', ['name']).populate('branch', ['name'])

        res.status(200).json({
            data: subCategory
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

// @route GET api/subcategory/data/slug/:slug
// @description Get single subcategory by slug
// @access Private
router.get('/data/slug/:slug', async (req, res) => {

    try {
        let subCategory = await SubCategory.findOne({
            slug: req.params.slug
        }).populate('category', ['name']).populate('branch', ['name'])

        res.status(200).json({
            data: subCategory
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