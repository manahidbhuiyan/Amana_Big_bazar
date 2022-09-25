const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../middleware/admin/auth');
const DeliveryCharges = require('../../../../models/DeliveryCharges');

const {
    getAdminRoleChecking
} = require('../../../../lib/helpers');

// @route PUT api/branch
// @description Update single branch
// @access Private
router.put('/', [auth,
    [
        check('deliveryChargeID', 'Delivery charge id required').not().isEmpty(),
        check('thana', 'Thana is required').not().isEmpty(),
        check('district', 'District is required').not().isEmpty(),
        check('division', 'Division is required').not().isEmpty(),
        check('branch', 'Branch is required').not().isEmpty(),
        check('min_amount', 'Min amount is required').not().isEmpty(),
        check('max_amount', 'Max amount is required').not().isEmpty(),
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    const adminRoles = await getAdminRoleChecking(req.admin.id, 'backoffice settings')

    if (!adminRoles) {
        return res.status(400).send({
            errors: [{
                msg: 'Account is not authorized to backoffice settings'
            }]
        })
    }

    try {
        const {
            deliveryChargeID,
            thana,
            district,
            division,
            branch,
            notes,
            min_amount,
            max_amount
        } = req.body

        if (+min_amount > +max_amount) {
            return res.status(400).send({
                errors: [{
                    msg: 'Min amount should not be gratter than Max amount'
                }]
            })
        }

        let deliveryInfo = await DeliveryCharges.findById(deliveryChargeID)

        deliveryInfo.admin = req.admin.id
        deliveryInfo.thana = thana
        deliveryInfo.district = district
        deliveryInfo.division = division
        deliveryInfo.branch = branch
        deliveryInfo.notes = notes
        deliveryInfo.minimum = +min_amount
        deliveryInfo.maximum = +max_amount
        
        deliveryInfo.update = Date.now()

        await deliveryInfo.save()
        res.status(200).json({
            msg: 'Delivery charge information updated successfully',
            data: deliveryInfo
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).json({
                msg: 'Delivery charge id not found'
            });
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router