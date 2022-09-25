const express = require('express');
const router = express.Router();

const auth = require('../../../../middleware/admin/auth');
const BillingService = require('../../../../models/Billing/Service');

const { getAdminRoleChecking } = require('../../../../lib/helpers');

// @route DELETE api/billing/service
// @description Remove Specific Billing Service
// @access Private
router.delete('/:serviceID', auth, async (req, res) => {
    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'billing')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to service'
                }]
            })
        }

        // See if user exsist
        let serviceInfo = await BillingService.findById(req.params.serviceID)

        if (!serviceInfo) {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid service remove request'
                }]
            })
        }

        await serviceInfo.remove()

        res.status(200).json({
            msg: 'service is removed successfully'
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).json({
                msg: 'service not found'
            });
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router