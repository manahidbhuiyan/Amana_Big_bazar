const express = require('express');
const router = express.Router();

const auth = require('../../../middleware/admin/auth');
const ProductWeightUnit = require('../../../models/ProductWeightUnit');

const { getAdminRoleChecking } = require('../../../lib/helpers');

// @route DELETE api/product/weight/:weightID
// @description Delete Single Product weight
// @access Private
router.delete('/:weightID', auth, async (req, res) => {
    
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
        
        let productWeightUnit = await ProductWeightUnit.findById(req.params.weightID)
    
        await productWeightUnit.remove()

        res.status(200).json({
            type: 'success',
            msg: 'Product weight type removed successfully'
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Invalid product weight'
                    }
                ]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router