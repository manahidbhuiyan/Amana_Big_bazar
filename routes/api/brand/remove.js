const express = require('express');
const router = express.Router();

const auth = require('../../../middleware/admin/auth');
const BrandName = require('../../../models/BrandName');
const Supplier = require('../../../models/Supplier');

const { getAdminRoleChecking } = require('../../../lib/helpers');

// @route DELETE api/brand
// @description Remove Specific brand
// @access Private
router.delete('/:brandNameID', auth, async (req, res) => {
    try {

      const adminRoles = await getAdminRoleChecking(req.admin.id, 'brand')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to brand'
                    }
                ]
            })
        }

        let supplier = await Supplier.find({
            brand: {$in: req.params.brandNameID}
        })

        if (supplier.length > 0) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Brand is already used in supplier'
                    }
                ]
            })
        }

        // See if user exsist
        let brandName = await BrandName.findById(req.params.brandNameID)

        if(!brandName){
            return res.status(400).send({
                errors: [
                  {
                    msg: 'Invalid brand name remove request'
                  }
                ]
              })
        }

        await brandName.remove()

        res.status(200).json({
            msg: 'Brand name removed successfully'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router