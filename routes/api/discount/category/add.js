const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../middleware/admin/auth');
const CategoryDiscount = require('../../../../models/CategoryDiscount');
const Product = require('../../../../models/Product');

// @route POST api/category/discount
// @description Add New discount on category
// @access Private
router.post('/', [auth, [
    [
        check('branch', 'Branch is required').not().isEmpty(),
        check('category', 'Category is required').not().isEmpty(),
        check('discount', 'Discount is required').not().isEmpty(),
    ]
]], async (req, res) => {
    try {
        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

        const {
            branch,
            category,
            discount
        } = req.body

        const categoryDiscount = new CategoryDiscount({
            branch,
            category,
            discount
        })

        const products = await Product.find({
            branch: branch,
            category: category
        });

        products.forEach(async product => {
            try {
                let productDiscountInfo = await Product.findById(product.id)
                productDiscountInfo.discount = (productDiscountInfo.price.sell * (parseFloat(discount) / 100))
                await productDiscountInfo.save()
            } catch (err) {
                console.error(err);
            }
        })

        await categoryDiscount.save();

        res.status(200).json({
            msg: 'New discount on category is added successfully',
            data: categoryDiscount
        })

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }


});

module.exports = router