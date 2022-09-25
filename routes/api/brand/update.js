const express = require('express');
const router = express.Router();
const slugify = require('slugify');

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../middleware/admin/auth');
const BrandName = require('../../../models/BrandName');

const { getAdminRoleChecking } = require('../../../lib/helpers');

// @route PUT api/brand
// @description Update single brand
// @access Private
router.put('/', [auth,
    [
        check('brand', 'Brand id required').not().isEmpty(),
        check('branch', 'Branch is required').not().isEmpty(),
        check('category', 'Category id required').not().isEmpty(),
        check('subcategory', 'Sub category id required').not().isEmpty(),
        check('name', 'Subcategory name required').not().isEmpty()
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

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

    try {
        const { branch, category, subcategory, name } = req.body


        let brandName = await BrandName.findById(req.body.brand)
        let slug = slugify(name)
        brandName.name = name.toLowerCase().trim()
        brandName.slug = slug.toLowerCase().trim()
        brandName.branch = branch
        brandName.category = category
        brandName.subcategory = subcategory
        brandName.update = Date.now()
     
        await brandName.save()
        res.status(200).json({
            msg: 'Brand information updated successfully',
            data: brandName
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Invalid brand'
                    }
                ]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router