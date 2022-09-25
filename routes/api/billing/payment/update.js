const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../middleware/admin/auth');
const BillingPayment = require('../../../../models/Billing/Payment');

const { getAdminRoleChecking } = require('../../../../lib/helpers');

// @route PUT api/billing/payment
// @description Update Billing Payment
// @access Private
router.put('/', [auth,
    [
        check('paymentID', 'payment id required').not().isEmpty(),
        check('branch', 'payment branch required').not().isEmpty(),
        check('validate_from', 'payment validate from required').not().isEmpty(),
        check('validate_till', 'payment validate till required').not().isEmpty(),
        check('expire_date', 'payment expire date required').not().isEmpty(),
        check('isLifetimeFreeAccess', 'lifetime access is required').not().isEmpty(),
        check('notificationBeforeToUpgrade', 'payment notification before upgrade is required').not().isEmpty(),
        check('paid_amount', 'payment amount is required').not().isEmpty(),
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    try {
        const { paymentID, branch, validate_from, validate_till, expire_date, isLifetimeFreeAccess, notificationBeforeToUpgrade, paid_amount, notes } = req.body

        let billingPaymentInfo = await BillingPayment.findById(paymentID)
        
        billingPaymentInfo.branch = branch
        billingPaymentInfo.validate_from = validate_from
        billingPaymentInfo.validate_till = validate_till
        billingPaymentInfo.expire_date = expire_date
        billingPaymentInfo.isLifetimeFreeAccess = isLifetimeFreeAccess
        billingPaymentInfo.notificationBeforeToUpgrade = notificationBeforeToUpgrade
        billingPaymentInfo.paid_amount = paid_amount
        billingPaymentInfo.notes = notes
        billingPaymentInfo.update = Date.now()
    
        await billingPaymentInfo.save()
        res.status(200).json({
            msg: 'payment information updated successfully',
            data: billingPaymentInfo
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Invalid billing payment'
                    }
                ]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router