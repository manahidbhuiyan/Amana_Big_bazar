const express = require('express');
const router = express.Router();

const slugify = require('slugify');

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../../middleware/admin/auth');
const Category = require('../../../../../models/Accounts/Chart/Category');

const { getAdminRoleChecking } = require('../../../../../lib/helpers');

// @route PUT api/accounts/chart/category
// @description Update single category
// @access Private
router.put('/', [auth,
    [
        check('category', 'category id is required').not().isEmpty(),
        check('group', 'group id is required').not().isEmpty(),
        check('subgroup', 'subgroup id is required').not().isEmpty(),
        check('name', 'Subcategory name is required').not().isEmpty(),
        check('pay_to_supplier', 'supplier payment info required').not().isEmpty()
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'chart of accounts category')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'account is not authorized to chart of accounts'
                    }
                ]
            })
        }
        
        const { name, group, subgroup, category, active, pay_to_supplier} = req.body

        const categoryName = await Category.findOne({
            name: name.toLowerCase(),
            _id: {
                $ne: category
            }
        })
        
        if (categoryName) {
            return res.status(400).send({
              errors: [
                {
                  msg: 'category name already exists'
                }
              ]
            })
        }

        let categoryInfo = await Category.findById(category)
        
        let slug = slugify(name)
        categoryInfo.group = group
        categoryInfo.subgroup = subgroup
        categoryInfo.pay_to_supplier = pay_to_supplier
        categoryInfo.name = name.toLowerCase().trim()
        categoryInfo.slug = slug.toLowerCase().trim()
        if(typeof active !== 'undefined'){
            categoryInfo.active = active
        }
        categoryInfo.admin = req.admin.id
        
        categoryInfo.update = Date.now()
     
        await categoryInfo.save()

        res.status(200).json({
            msg: 'group information updated successfully',
            data: categoryInfo
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Invalid group'
                    }
                ]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router