const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../middleware/admin/auth');
const CouponCode = require('../../../models/CouponCode');
const Order = require('../../../models/Order');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');

// @route DELETE api/product/:productID
// @description Remove specific product
// @access Private
router.delete('/:couponCode', auth, async (req, res) => {
    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'coupon code')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to coupon code'
                }]
            })
        }

        let couponOrderInfoExist = await Order.findOne({
            coupon_code: req.params.couponCode
        });

        if (couponOrderInfoExist) {
            return res.status(400).send({
                errors: [{
                    msg: "Coupon code already applied with order"
                }]
            })
        }

        // See if user exsist
        let couponCodeInfo = await CouponCode.findOne({
            code: req.params.couponCode
        })

        if (!couponCodeInfo) {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid coupon code remove request'
                }]
            })
        }

        await couponCodeInfo.remove()

        res.status(200).json({
            msg: 'Coupon code removed successfully'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router