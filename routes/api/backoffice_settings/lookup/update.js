const express = require('express');
const router = express.Router();
const slugify = require('slugify');

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../middleware/admin/auth');
const Lookup = require('../../../../models/Backoffice/Lookup');

const { getAdminRoleChecking } = require('../../../../lib/helpers');

// @route PUT api/brand
// @description Update single brand
// @access Private
router.put('/', [auth,
    [
        check('lookupID', 'Lookup id is required').not().isEmpty(),
        check('title', 'Brand id required').not().isEmpty(),
        check('type', 'Branch is required').not().isEmpty()
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
                errors: [
                    {
                        msg: 'Account is not authorized for backoffice settings'
                    }
                ]
            })
        }

    try {
        const { title, type, discount_percentage, max_discount_amount, min_payment_amount } = req.body


        let lookupInfo = await Lookup.findById(req.body.lookupID)
        lookupInfo.title = title
        
        if(discount_percentage){
            lookupInfo.min_payment_amount = min_payment_amount
            lookupInfo.discount_percentage = discount_percentage
            lookupInfo.max_discount_amount = max_discount_amount
        }

        lookupInfo.type = type
        lookupInfo.last_updated_by = req.admin.id
        lookupInfo.update = Date.now()
     
        await lookupInfo.save()
        res.status(200).json({
            msg: 'Lookup information updated successfully',
            data: lookupInfo
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Invalid brand'
                    }
                ]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router