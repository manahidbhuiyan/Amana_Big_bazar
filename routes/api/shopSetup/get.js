const express = require('express');
const router = express.Router();

const Category = require('../../../models/Category');
const Branch = require('../../../models/Branch');
const ShopSetup = require('../../../models/ShopSetup');

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

            if (columnName == 'from_branch' || columnName == 'to_branch') {
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

        let shopSetupList = await ShopSetup.find(condition).populate('category', ['name']).populate('from_branch', ['name']).populate('to_branch', ['name']).limit(dataList).skip(offset)

        res.status(200).json({
            data: shopSetupList
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/subcategory/data/:shopSetupID
// @description Get single subcategory
// @access Private
router.get('/data/:shopSetupID', async (req, res) => {

    try {
        let shopSetupData = await ShopSetup.findById(req.params.shopSetupID).populate('category', ['name']).populate('from_branch', ['name']).populate('to_branch', ['name'])

        res.status(200).json({
            data: shopSetupData
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