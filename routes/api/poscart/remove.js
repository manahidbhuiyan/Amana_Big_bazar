const express = require('express');
const router = express.Router();

const auth = require('../../../middleware/admin/auth');
const Cart = require('../../../models/PosCart');

const Admin = require('../../../models/admin/Admin');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');

// @route DELETE api/cart
// @description Remove All Product
// @access Private
router.delete('/delete', auth, async (req, res) => {
    try {
        let browserTabID = req.query.tabID
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


        // See if user exsist
        let cart = await Cart.deleteMany({
            admin: req.admin.id,
            branch: req.query.branch,
            browserTabID: browserTabID
        })

        cart = await Cart.find({
            admin: user.id,
            branch: req.query.branch,
            browserTabID: browserTabID
        });

        res.status(200).json(cart);

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route DELETE api/cart/:productID
// @description Remove Specific Product From Admin Cart
// @access Private
router.delete('/:cart_id/remove', auth, async (req, res) => {
    try {

        let browserTabID = req.query.tabID

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'pos cart')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to POS cart'
                }]
            })
        }

        const user = await Admin.findById(req.admin.id).select('-password').select('-forgot');


        let cart = await Cart.findById(req.params.cart_id)


        if (cart == null) {
            return res.status(200).json({
                errors: [{
                    msg: 'Product is not into the cart'
                }]
            });
        }

        if (cart.admin != req.admin.id || cart.branch != req.query.branch) {
            return res.status(400).send({
                errors: [{
                    msg: 'Not authorized to remove'
                }]
            })
        } else {
            await cart.remove()
        }

        cart = await Cart.find({
            admin: user.id,
            branch: req.query.branch,
            browserTabID: browserTabID
        }).sort({
            "_id": -1
        });

        res.status(200).json({
            auth: true,
            data: cart
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router