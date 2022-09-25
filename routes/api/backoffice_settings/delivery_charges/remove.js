const express = require('express');
const router = express.Router();

const auth = require('../../../../middleware/admin/auth');
const DeliveryCharges = require('../../../../models/DeliveryCharges');

const {
    getAdminRoleChecking
} = require('../../../../lib/helpers');

// @route DELETE api/cart
// @description Remove Specific Delivery Charges
// @access Private
router.delete('/:deliveryChargeID', auth, async (req, res) => {
    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'backoffice settings')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to backoffice settings'
                }]
            })
        }

        // See if user exsist
        let deliveryChargeInfo = await DeliveryCharges.findById(req.params.deliveryChargeID)

        if (!deliveryChargeInfo) {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid delivery charge info remove request'
                }]
            })
        }

        await deliveryChargeInfo.remove()

        res.status(200).json({
            msg: 'Delivery charge info is removed successfully'
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).json({
                msg: 'Delivery charge info not found'
            });
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router