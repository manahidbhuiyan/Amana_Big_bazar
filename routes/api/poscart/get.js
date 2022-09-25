const express = require('express');
const router = express.Router();

const auth = require('../../../middleware/admin/auth');
const Cart = require('../../../models/PosCart');
const Admin = require('../../../models/admin/Admin');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');

// @route GET api/cart
// @description Get products according user cart
// @access Private
router.get('/', auth, async (req, res) => {
    try {
        const user = await Admin.findById(req.admin.id).select('-password').select('-forgot');

        if (!user) {
            return res.status(400).send({
                errors: [{
                    msg: 'Invailid user.'
                }]
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'pos cart')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to POS cart'
                }]
            })
        }

        let browserTabID = req.query.tabID

        // See if user exsist
        let cart = await Cart.find({
            admin: user.id,
            branch: req.query.branch,
            browserTabID: browserTabID
        }).populate('product', ['discount']).sort({
            "_id": -1
        })

        if (cart.length == 0) {
            return res.status(200).json({
                msg: 'Cart is empty',
                data: cart
            });
        }

        return res.status(200).json({
            data: cart
        });
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
        const user = await Admin.findById(req.admin.id).select('-password').select('-forgot');

        let browserTabID = req.query.tabID

        // See if user exsist
        let cart = await Cart.find({
            user: user.id,
            branch: req.query.branch,
            browserTabID: browserTabID,
            code: req.query.code
        })

        if (cart.length > 0) {
            res.json(false);
        } else {
            res.json(true);
        }

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router