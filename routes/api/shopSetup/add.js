const express = require('express');
const router = express.Router();
const slugify = require('slugify');

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../middleware/admin/auth');
const ShopSetup = require('../../../models/ShopSetup');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');

// @route POST api/brand
// @description Add new brand
// @access Private
router.post('/', [auth,
    [
        check('from_branch', 'Copy from branch is required').not().isEmpty(),
        check('category', 'Category is required').not().isEmpty(),
        check('to_branch', 'Copy to branch is required').not().isEmpty()
    ]
], async (req, res) => {
    try {

        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'shop setup')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to shop setup'
                }]
            })
        }

        const {
            from_branch,
            category,
            to_branch
        } = req.body

        const shopSetupExist = await ShopSetup.findOne({
            from_branch,
            category: {
                $in: category
            },
            to_branch
        })

        if (shopSetupExist) {
            return res.status(400).send({
                errors: [{
                    msg: 'Shop setup category already exists'
                }]
            })
        }

        const addShopSetupInfo = new ShopSetup({
            from_branch,
            category,
            to_branch
        })

        await addShopSetupInfo.save()
        res.status(200).json({
            msg: 'New setup completed successfully',
            data: addShopSetupInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router