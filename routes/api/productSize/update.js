const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../middleware/admin/auth');
const ProductSize = require('../../../models/ProductSize');

const { getAdminRoleChecking } = require('../../../lib/helpers');

// @route PUT api/product/size
// @description Update Product Size
// @access Private - admin access
// @params sizeID, name (required) shortform(optional) 
router.put('/', [auth,
    [
        check('sizeID', 'Project size id required').not().isEmpty(),
        check('name', 'Project type is required').not().isEmpty(),
        check('shortform', 'Project type is required').not().isEmpty()
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
        const { name, shortform } = req.body

        let productSize = await ProductSize.findById(req.body.sizeID)

        productSize.name = name.toLowerCase().trim()
        productSize.shortform = shortform.toLowerCase().trim()
        productSize.update = Date.now()

        await productSize.save()
        
        res.status(200).json({
            type: 'success',
            msg: 'Product size updated successfully',
            data: productSize
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router