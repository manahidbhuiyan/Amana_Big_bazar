const express = require('express');
const router = express.Router();

const auth = require('../../../middleware/admin/auth');
const Product = require('../../../models/Product');
const Supplier = require('../../../models/Supplier');

const { getAdminRoleChecking } = require('../../../lib/helpers');

// @route DELETE api/supplier
// @description Remove Specific supplier
// @access Private
router.delete('/:supplierID', auth, async (req, res) => {
    try {
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'supplier')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to supplier'
                    }
                ]
            })
        }

        let isOccupiedProduct = await Product.find({
            supplier: req.params.supplierID
        })

        if (isOccupiedProduct.length > 0) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'supplier already used in product'
                    }
                ]
            })
        }

        // See if user exsist
        let supplierData = await Supplier.findById(req.params.supplierID)

        if(!supplierData){
            return res.status(400).send({
                errors: [
                  {
                    msg: 'Invalid spplier remove request'
                  }
                ]
              })
        }

        await supplierData.remove()

        res.status(200).json({
            msg: 'Supplier removed successfully'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router