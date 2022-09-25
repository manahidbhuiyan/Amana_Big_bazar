const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../middleware/admin/auth');
const ProductWeight = require('../../../models/ProductWeightUnit');

const { getAdminRoleChecking } = require('../../../lib/helpers');

// @route POST api/product/weight
// @description Add Product weight
// @access Private - admin access
// @params name(required) image(optional)
router.post('/', [auth, 
    [
        check('name', 'Product weight name is required').not().isEmpty(),
        check('shortform', 'Product weight short form is required').not().isEmpty(),
        check('fractionAllowed', 'fraction allowed info required').not().isEmpty()
    ]
], async (req, res) => {
    try {
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

        const {name, shortform, fractionAllowed} = req.body

        const productWightInfo = new ProductWeight({
            name: name.toLowerCase().trim(),
            shortform: shortform.toLowerCase().trim(),
            fractionAllowed
        })

        await productWightInfo.save()

        res.status(200).json({
            type: 'success',
            msg: 'Product weight type added successfully',
            data: productWightInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router