const express = require('express');
const router = express.Router();

const auth = require('../../../middleware/user/auth');
const Cart = require('../../../models/Cart');

// @route GET api/cart?branch=
// @description Get products according user cart
// @access Private
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password').select('-forgot');

        // See if user exsist
        let cart = await Cart.find({
            user: user.id,
            branch:req.query.branch
        }).populate('product',['discount']).sort({ "_id": 1 })

        if (cart.length==0) {
            return res.status(200).json({
                msg: 'cart is empty'
            });
        }

        res.json(cart);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/cart/product_check
// @description Get products according user cart
// @access Private
router.get('/product_check', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password').select('-forgot');

        // See if user exsist
        let cart = await Cart.find({
            user: user.id,branch:req.query.branch,code:req.query.code
        })

        if(cart.length>0){
        res.json(false);
        }else{
        res.json(true);
        }

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router