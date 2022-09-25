const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../middleware/admin/auth');
const CouponCode = require('../../../models/CouponCode');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');

// @route PUT api/cart
// @description Update Single product into the cart
// @access Private
router.put('/', [auth,
    [
        check('coupon_code_id', 'Coupon code id is required').not().isEmpty(),
        check('max_amount', 'Maximum amount is required').not().isEmpty(),
        check('percentage', 'Discount percentage is required').not().isEmpty(),
        check('validity_from', 'Validate from date is required').not().isEmpty(),
        check('validity_to', 'Validate to date is required').not().isEmpty(),
        check('total_order_amount_min', 'Minimum order amount is required').not().isEmpty(),
        check('isActive', 'Coupon code activity is required').not().isEmpty()
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    const adminRoles = await getAdminRoleChecking(req.admin.id, 'coupon code')

    if (!adminRoles) {
        return res.status(400).send({
            errors: [{
                    msg: 'Account is not authorized to coupon code'
            }]
        })
    }

    try {
        let {
            coupon_code_id,
            max_amount,
            percentage,
            validity_from,
            validity_to,
            max_use_time,
            total_order_amount_min,
            isActive,
            isAssignedAllUser,
            users
        } = req.body

        validity_from = new Date(validity_from)
        validity_from.setHours(0)
        validity_from.setMinutes(0);
        validity_from.setSeconds(1);

        validity_to = new Date(validity_to)
        validity_to.setHours(23)
        validity_to.setMinutes (59);
        validity_to.setSeconds (59);
        
        let couponCodeInfo = await CouponCode.findById(coupon_code_id)

        couponCodeInfo.max_amount = max_amount
        couponCodeInfo.percentage = percentage
        couponCodeInfo.validity_from = validity_from
        couponCodeInfo.validity_to = validity_to
        couponCodeInfo.max_use_time = max_use_time
        couponCodeInfo.total_order_amount_min = total_order_amount_min
        couponCodeInfo.isActive = isActive
        couponCodeInfo.isAssignedAllUser = isAssignedAllUser
        couponCodeInfo.admin = req.admin.id

        if(isAssignedAllUser==false) {
            couponCodeInfo.users = users
        }

        couponCodeInfo.update = Date.now()

        await couponCodeInfo.save()

        res.status(200).json({
            msg: 'Coupon code information updated successfully',
            data: couponCodeInfo
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid coupon code'
                }]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router