const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../middleware/admin/auth');
const productSize = require('../../../models/ProductSize');

const { getAdminRoleChecking } = require('../../../lib/helpers');

// @route POST api/product/size
// @description Add Product Size
// @access Private - admin access
// @params name(required) image(optional)
router.post('/', [auth, 
    [
        check('name', 'Product size name is required').not().isEmpty(),
        check('shortform', 'Product size short form is required').not().isEmpty()
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

        const {name, shortform} = req.body

        const productSizeInfo = new productSize({
            name: name.toLowerCase().trim(),
            shortform: shortform.toLowerCase().trim()
        })

        await productSizeInfo.save()

        res.status(200).json({
            type: 'success',
            msg: 'Product size added successfully',
            data: productSizeInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router