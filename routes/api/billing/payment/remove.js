const express = require('express');
const router = express.Router();

const auth = require('../../../../middleware/admin/auth');
const BillingPayment = require('../../../../models/Billing/Payment');

const { getAdminRoleChecking } = require('../../../../lib/helpers');

// @route DELETE api/billing/payment
// @description Remove Specific Billing Payment
// @access Private
router.delete('/:paymentID', auth, async (req, res) => {
    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'billing')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to payment'
                }]
            })
        }

        // See if user exsist
        let paymentInfo = await BillingPayment.findById(req.params.paymentID)

        if (!paymentInfo) {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid payment info remove request'
                }]
            })
        }

        await paymentInfo.remove()

        res.status(200).json({
            msg: 'payment info removed successfully'
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).json({
                msg: 'payment not found'
            });
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router