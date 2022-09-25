const express = require('express');
const router = express.Router();

const auth = require('../../../middleware/admin/auth');
const ShopSetup = require('../../../models/ShopSetup');
const Product = require('../../../models/Product');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');

// @route DELETE api/subcategory
// @description Remove Specific subcategory
// @access Private
router.delete('/:shopSetupID', auth, async (req, res) => {
    try {
        // See if user exsist
        let shopSetupInfo = await ShopSetup.findById(req.params.shopSetupID)

        if (!shopSetupInfo) {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid shop setup removed request'
                }]
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

        await Product.deleteMany({
            branch: shopSetupInfo.to_branch,
            category: {
                $in: shopSetupInfo.category
            }
        })

        await shopSetupInfo.remove()

        res.status(200).json({
            msg: 'Shop setup removed successfully'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router