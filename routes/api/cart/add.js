const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../middleware/user/auth');
const Cart = require('../../../models/Cart');

// @route POST api/cart
// @description Add New Product On Cart
// @access Private
router.post('/', [auth,
    [
        check('branch', 'branch id required').not().isEmpty(),
        check('code', 'product code required').not().isEmpty()
    ]
], async (req, res) => {
    try {

        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

        const user = await User.findById(req.user.id).select('-password').select('-forgot');
        if (!user) {
            return res.status(400).send({
                errors: [{
                    msg: 'invailid user.'
                }]
            })
        }

        const product = await Product.findById(req.body.code).select('barcode branch category subcategory name price discount thumbnail vat brand supplier')

        if (product) {
            if (product.branch != req.body.branch) {
                return res.status(400).send({
                    errors: [{
                        msg: 'invailid branch and product.'
                    }]
                })
            } else {
                // See if user exsist
                let cart = await Cart.findOne({
                    user: user.id,
                    branch: req.body.branch,
                    code: req.body.code
                })
                if (cart) {
                    return res.status(400).send({
                        errors: [{
                            msg: 'product already added.'
                        }]
                    })
                } else {
                    const cartProduct = new Cart({
                        user: user.id,
                        branch: req.body.branch,
                        product: product._id,
                        code: product.barcode,
                        name: product.name,
                        thumbnail: product.thumbnail,
                        category: product.category,
                        vat: product.vat,
                        subcategory: product.subcategory,
                        brand: product.brand,
                        supplier: product.supplier,
                        discount: product.discount,
                        purchase_price: product.price.purchase,
                        price: product.price.sell,
                        subtotal: product.price.sell
                    })
                    await cartProduct.save();

                }

                cart = await Cart.find({
                    user: user.id,
                    branch: req.body.branch
                }).populate('product', ['discount']).sort({
                    "_id": 1
                })

                res.json(cart);

            }
        } else {
            return res.status(400).send({
                errors: [{
                    msg: 'product not found.'
                }]
            })
        }

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router