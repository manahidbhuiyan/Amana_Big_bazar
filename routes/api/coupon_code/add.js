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

// @route POST api/coupon code
// @description Add new coupon code
// @access Private
router.post('/', [auth,
    [
        check('code', 'Coupon code is required').not().isEmpty(),
        check('max_amount', 'Maximum amount is required').not().isEmpty(),
        check('percentage', 'Discount percentage is required').not().isEmpty(),
        check('validity_from', 'Validate from date is required').not().isEmpty(),
        check('validity_to', 'Validate to date is required').not().isEmpty(),
        check('total_order_amount_min', 'Minimum order amount is required').not().isEmpty(),
        check('isActive', 'Coupon code activity is required').not().isEmpty()
    ]
], async (req, res) => {
    try {

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

        let {
            code,
            max_amount,
            percentage,
            validity_from,
            validity_to,
            total_order_amount_min,
            isActive,
            max_use_time,
            isAssignedAllUser,
            users
        } = req.body

        let codeAlreadyExist = await CouponCode.findOne({
            code: code
        })
    
        if (codeAlreadyExist) {
            return res.status(400).send({
              errors: [
                {
                  msg: 'Your provided code already exist'
                }
              ],
              success: false
            })
        }

        validity_from = new Date(validity_from)
        validity_from.setHours(0)
        validity_from.setMinutes(0);
        validity_from.setSeconds(1);

        validity_to = new Date(validity_to)
        validity_to.setHours(23)
        validity_to.setMinutes (59);
        validity_to.setSeconds (59);

        const addCouponCodeInfo = new CouponCode({
            code,
            max_amount,
            percentage,
            validity_from,
            validity_to,
            total_order_amount_min,
            max_use_time,
            isActive,
            isAssignedAllUser,
            users,
            isActive,
            admin: req.admin.id
        })

        await addCouponCodeInfo.save()

        res.status(200).json({
            msg: 'New coupon code added successfully',
            data: addCouponCodeInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router