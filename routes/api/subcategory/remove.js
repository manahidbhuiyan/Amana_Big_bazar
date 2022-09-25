const express = require('express');
const router = express.Router();

const auth = require('../../../middleware/admin/auth');
const SubCategory = require('../../../models/SubCategory');
const Brand = require('../../../models/BrandName');

const { getAdminRoleChecking } = require('../../../lib/helpers');

// @route DELETE api/subcategory
// @description Remove Specific subcategory
// @access Private
router.delete('/:subcategoryID', auth, async (req, res) => {
    try {
        // See if user exsist
        let subCategory = await SubCategory.findById(req.params.subcategoryID)

        if(!subCategory){
            return res.status(400).send({
                errors: [
                  {
                    msg: 'Invalid subcategory remove request'
                  }
                ]
              })
        }

        let brands = await Brand.find({
            subcategory: {$in: req.params.subcategoryID}
        })

        if (brands.length > 0) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Subcategory is already used in brand'
                    }
                ]
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'subcategory')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to subcategory'
                    }
                ]
            })
        }

        await subCategory.remove()

        res.status(200).json({
            msg: 'Subcategory removed successfully'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router