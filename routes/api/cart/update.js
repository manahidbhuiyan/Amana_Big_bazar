const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../middleware/user/auth');
const Cart = require('../../../models/Cart');

// @route PUT api/cart
// @description Update Cart Information
// @access Private
router.put('/', [auth,
    [
        check('branch', 'branch id required').not().isEmpty(),
        check('id', 'cart id required').not().isEmpty(),
        check('quantity', 'product quantity required').not().isEmpty(),
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

        const cart = await Cart.findById(req.body.id)

        if (cart) {
            if (cart.branch != req.body.branch) {
                return res.status(400).send({
                    errors: [{
                        msg: 'invailid branch and product.'
                    }]
                })
            } else {
                if (req.body.quantity < 1) {
                    await cart.remove();
                } else {
                    cart.quantity = req.body.quantity
                    await cart.save();
                }

                let cartdata = await Cart.find({
                    user: user.id,
                    branch: req.body.branch
                }).populate('product', ['discount']).sort({
                    "_id": 1
                })
                res.json(cartdata);

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