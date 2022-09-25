const express = require('express');
const router = express.Router();

const slugify = require('slugify');

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../middleware/admin/auth');
const SubCategory = require('../../../models/SubCategory');

const { getAdminRoleChecking } = require('../../../lib/helpers');

// @route PUT api/category
// @description Update single category
// @access Private
router.put('/', [auth,
    [
        check('subcategory', 'Subcategory id required').not().isEmpty(),
        check('branch', 'Branch id required').not().isEmpty(),
        check('category', 'Category id required').not().isEmpty(),
        check('name', 'Subcategory name required').not().isEmpty()
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    try {

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
        
        const { branch, category, name, isSizeAvailable, isWeightAvailable } = req.body

        const subCategoryName = await SubCategory.findOne({
            name,_id : {$ne :req.body.subcategory}
        })
        
        if (subCategoryName) {
            return res.status(400).send({
              errors: [
                {
                  msg: 'Sub Category name already exists'
                }
              ]
            })
        }

        let subCategory = await SubCategory.findById(req.body.subcategory)
        
        let slug = slugify(name)
        subCategory.category = category
        subCategory.branch = branch
        subCategory.name = name.toLowerCase().trim()
        subCategory.slug = slug.toLowerCase().trim()
        subCategory.isSizeAvailable = isSizeAvailable
        subCategory.isWeightAvailable = isWeightAvailable
        subCategory.update = Date.now()
     
        await subCategory.save()
        res.status(200).json({
            msg: 'Subcategory information updated successfully',
            data: subCategory
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Invalid subcategory'
                    }
                ]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router