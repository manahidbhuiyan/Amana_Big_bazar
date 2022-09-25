const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../middleware/admin/auth');
const Lookup = require('../../../../models/Backoffice/Lookup');

const {
    getAdminRoleChecking
} = require('../../../../lib/helpers');

// @route POST api/brand
// @description Add new brand
// @access Private
router.post('/', [auth,
    [
        check('title', 'Branch is required').not().isEmpty(),
        check('type', 'Type is required').not().isEmpty()
    ]
], async (req, res) => {
    try {
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
                    msg: 'Account is not authorized for backoffice settings'
                }]
            })
        }

        const {
            title,
            min_payment_amount,
            discount_percentage,
            max_discount_amount,
            type
        } = req.body

        let serialNo = 1000

        const lastSerialInfo = await Lookup.findOne().sort({create: -1})

            if(lastSerialInfo){
                serialNo = lastSerialInfo.serialNo + 1
            }else{
                serialNo = serialNo + 1
            }
        
        let lookupInfoCreate = {
            serialNo,
            title,
            type,
            last_updated_by: req.admin.id
        }
        
        if(discount_percentage){
            lookupInfoCreate.min_payment_amount = min_payment_amount
            lookupInfoCreate.discount_percentage = discount_percentage
            lookupInfoCreate.max_discount_amount = max_discount_amount
        }

        const addLookupInfo = new Lookup(lookupInfoCreate)

        await addLookupInfo.save()
        res.status(200).json({
            msg: 'New branch manager added successfully',
            data: addLookupInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router