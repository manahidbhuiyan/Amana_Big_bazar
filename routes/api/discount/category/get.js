const express = require('express');
const router = express.Router();

const auth = require('../../../../middleware/admin/auth');
const CategoryDiscount = require('../../../../models/CategoryDiscount');
const Category = require('../../../../models/Category');

// @route GET api/category/discount
// @description Get all the discounts on category
// @access Private
router.get('/:pageNo', [auth], async (req, res) => {

    try {

        if (!req.query.branch) {
            return res.status(400).send({
                errors: [{
                    msg: 'Branch is required'
                }]
            })
        }

        let dataList = 10
        let offset = (parseInt(req.params.pageNo) - 1) * 10

        let condition = {}

        if (req.query.type !== undefined) {
            let columnName = req.query.type
            let text = req.query.text

            if (columnName == 'category') {
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

        condition.branch = req.query.branch

        let categoryDiscount = await CategoryDiscount.find(condition).populate({
            path: 'branch',
            select: 'name'
        }).populate({
            path: 'category',
            select: 'name'
        }).limit(dataList).skip(offset)

        res.status(200).json({
            data: categoryDiscount
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/category/data/:categoryID
// @description Get single category
// @access Private
router.get('/data/:category_discount_id', async (req, res) => {

    try {
        let categorDiscount = await CategoryDiscount.findById(req.params.category_discount_id).populate('branch', ['name']).populate('category', ['name'])

        res.status(200).json({
            data: categorDiscount
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

module.exports = router