const express = require('express');
const router = express.Router();

const auth = require('../../../middleware/admin/auth');
const ProductSize = require('../../../models/ProductSize');

const { getAdminRoleChecking } = require('../../../lib/helpers');

// @route DELETE api/product/size/:sizeID
// @description Delete Single Product size
// @access Private
router.delete('/:typeID', auth, async (req, res) => {
    
    try {
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

        let productSize = await ProductSize.findById(req.params.typeID)
    
        await productSize.remove()

        res.status(200).json({
            type: 'success',
            msg: 'Product size removed successfully'
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Invalid product size'
                    }
                ]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router