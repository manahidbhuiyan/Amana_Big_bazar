const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../middleware/admin/auth');
const CategoryDiscount = require('../../../../models/CategoryDiscount');

// @route PUT api/category/discount
// @description Remove product from order
// @access Private
router.delete('/:category_discount_id', [auth], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    try {
        let categoryDiscount = await CategoryDiscount.findById(req.params.category_discount_id)

        const products = await Product.find({
            branch: categoryDiscount.branch,
            category: categoryDiscount.category
        });

        products.forEach(async product => {
            try {
                let productDiscountInfo = await Product.findById(product.id)
                productDiscountInfo.discount = 0
                await productDiscountInfo.save()
            } catch (err) {
                console.error(err);
            }
        })

        await categoryDiscount.remove()

        res.status(200).json({
            msg: 'Category discount is removed successfully'
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid category discount id'
                }]
            })
        }

        console.error(err);
        res.status(500).send('Server error');
    }
});



module.exports = router