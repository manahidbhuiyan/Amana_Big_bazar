const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../middleware/admin/auth');
const ProductWeightUnit = require('../../../models/ProductWeightUnit');

const { getAdminRoleChecking } = require('../../../lib/helpers');

// @route PUT api/product/weight
// @description Update Product Size
// @access Private - admin access
// @params weightID, name (required) shortform(optional) 
router.put('/', [auth,
    [
        check('weightID', 'Project weight id required').not().isEmpty(),
        check('name', 'Project weight name is required').not().isEmpty(),
        check('shortform', 'Project weight short form is required').not().isEmpty(),
        check('fractionAllowed', 'fraction allowed info required').not().isEmpty()
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    const adminRoles = await getAdminRoleChecking(req.admin.id, 'warehouse product')

    if (!adminRoles) {
        return res.status(400).send({
            errors: [
                {
                    msg: 'Account is not authorized for warehouse product'
                }
            ]
        })
    }

    try {
        const { name, shortform, fractionAllowed } = req.body

        let productWeight = await ProductWeightUnit.findById(req.body.weightID)

        productWeight.name = name.toLowerCase().trim()
        productWeight.shortform = shortform.toLowerCase().trim()
        productWeight.fractionAllowed = fractionAllowed
        productWeight.update = Date.now()

        await productWeight.save()
        
        res.status(200).json({
            type: 'success',
            msg: 'Product weight updated successfully',
            data: productWeight
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router