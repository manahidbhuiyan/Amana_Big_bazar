const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const Branch = require('../../../models/Branch');
const Category = require('../../../models/Category');
const Subcategory = require('../../../models/SubCategory');

// @route GET api/branch
// @description Get all the branches
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
            } else {
                condition = {
                    [columnName]: {
                        $regex: text,
                        $options: "i"
                    }
                }
            }

        }

        let category = await Category.find(condition).populate({
            path: 'branch',
            select: 'name'
        }).limit(dataList).skip(offset)

        res.status(200).json({
            data: category
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/category
// @description Get all the categories
// @access Public
router.get('/', async (req, res) => {
    try {
        let condition = {}

        if(req.query.branch){
            condition.branch = req.query.branch
        }

        let category = await Category.find(condition).select('_id').select('name').select('vat')

        res.status(200).json({
            data: category
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


// @route GET api/category/common/selected/branch
// @description Get all the categories
// @access Public
router.post('/common/selected/branch', [
    [
        check('from_branch_id', 'From branch id is required').not().isEmpty(),
        check('to_branch_id', 'To branch id is required').not().isEmpty()
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    const {
        from_branch_id,
        to_branch_id
    } = req.body

    try {
        let category = await Category.find({
            branch: {
                $in: [from_branch_id, to_branch_id]
            }
        }).select('_id').select('name').select('branch')

        res.status(200).json({
            data: category
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


// @route GET api/category/data/:categoryID
// @description Get single category
// @access Private
router.get('/data/:categoryID', async (req, res) => {

    try {
        let category = await Category.findById(req.params.categoryID).populate('branch', ['name'])

        res.status(200).json({
            data: category
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid category'
                }]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/category/data/slug/:slug
// @description Get single category by slug
// @access Private
router.get('/data/slug/:slug', async (req, res) => {
    try {
        let category = await Category.findOne({
            slug: req.params.slug
        }).populate('branch', ['name'])

        res.status(200).json({
            data: category
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid category'
                }]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/category/branch/:branchID
// @description Get all the category with subcategory
// @access Public
router.get('/branch/:branchID', async (req, res) => {
    try {
        let branchID = req.params.branchID
        let categoryResult = await Category.find({
            branch: {
                $in: [branchID]
            }
        }).select('-branch')

        let subcategoriesData = await Subcategory.find({
            branch: {
                $in: [branchID]
            }
        }).select('_id name slug category')

        let allDataCategory = []

        categoryResult.map((category, index) => {
            let subcategory = subcategoriesData.filter((subcategory, index) => subcategory.category.includes(category._id))
            allDataCategory.push({
                category: category,
                subcategory: subcategory
            })
        })

        return res.status(200).json({
            info: allDataCategory
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router