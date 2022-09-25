const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../middleware/admin/auth');
const BillingPayment = require('../../../../models/Billing/Payment');

const { getAdminRoleChecking } = require('../../../../lib/helpers');

// @route POST api/billing/payment
// @description Add new Billing Payment
// @access Private
router.post('/', [auth, 
    [
        check('branch', 'payment branch required').not().isEmpty(),
        check('validate_from', 'payment validate from required').not().isEmpty(),
        check('validate_till', 'payment validate till required').not().isEmpty(),
        check('expire_date', 'payment expire date required').not().isEmpty(),
        check('isLifetimeFreeAccess', 'lifetime access is required').not().isEmpty(),
        check('notificationBeforeToUpgrade', 'payment notification before upgrade is required').not().isEmpty(),
        check('paid_amount', 'payment amount is required').not().isEmpty(),
    ]
], async (req, res) => { 
    try {

        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'billing')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to billing'
                    }
                ]
            })
        }

        const { branch, validate_from, validate_till, expire_date, isLifetimeFreeAccess, notificationBeforeToUpgrade, paid_amount, notes } = req.body

        let serialNo = 1000

            const lastSerialInfo = await BillingPayment.findOne().sort({create: -1})

            if(lastSerialInfo){
                serialNo = lastSerialInfo.serialNo + 1
            }else{
                serialNo = serialNo + 1
            }

        const billingPaymentInfo = new BillingPayment({
            serialNo,
            branch,
            validate_from,
            validate_till,
            expire_date,
            isLifetimeFreeAccess,
            notificationBeforeToUpgrade,
            paid_amount,
            notes
        })

        await billingPaymentInfo.save()
        res.status(200).json({
            msg: 'New billing payment added successfully',
            data: billingPaymentInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router