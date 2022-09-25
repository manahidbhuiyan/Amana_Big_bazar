const express = require('express');
const router = express.Router();

const slugify = require('slugify');

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../../middleware/admin/auth');
const SubCategory = require('../../../../../models/Accounts/Chart/SubCategory');

const { getAdminRoleChecking } = require('../../../../../lib/helpers');

// @route PUT api/accounts/chart/subcategory
// @description Update single subcategory
// @access Private
router.put('/', [auth,
    [
        check('subcategory', 'subcategory id is required').not().isEmpty(),
        check('group', 'group id is required').not().isEmpty(),
        check('subgroup', 'subgroup id is required').not().isEmpty(),
        check('category', 'category id is required').not().isEmpty(),
        check('name', 'group name required').not().isEmpty(),
        check('branchWiseOpening', 'branch wise opening balance required').not().isEmpty(),
        check('warehouse_opening_balance', 'warehouse opening balance required').not().isEmpty(),
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'chart of accounts subcategory')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'account is not authorized to chart of accounts'
                    }
                ]
            })
        }
        
        const { name, group, subgroup, category, subcategory, branchWiseOpening, warehouse_opening_balance, warehouse_depreciation_amount, active, account_no, address} = req.body

        const groupName = await SubCategory.findOne({
            group,
            subgroup,
            category,
            name: name.toLowerCase(),
            _id: {
                $ne: subcategory
            }
        })
        
        if (groupName) {
            return res.status(400).send({
              errors: [
                {
                  msg: 'subcategory name already exists'
                }
              ]
            })
        }

        let subcategoryInfo = await SubCategory.findById(subcategory)
        
        let slug = slugify(name)
        subcategoryInfo.group = group
        subcategoryInfo.subgroup = subgroup
        subcategoryInfo.category = category
        subcategoryInfo.branchWiseOpening = branchWiseOpening
        subcategoryInfo.warehouse_opening_balance = warehouse_opening_balance
        subcategoryInfo.warehouse_depreciation_amount = warehouse_depreciation_amount
        subcategoryInfo.name = name.toLowerCase().trim()
        subcategoryInfo.slug = slug.toLowerCase().trim()
        subcategoryInfo.admin = req.admin.id
        
        if(typeof active !== 'undefined'){
            subcategoryInfo.active = active
        }

        if(account_no){
            subcategoryInfo.account_no = account_no
        }

        if(address){
            subcategoryInfo.address = address
        }

        subcategoryInfo.update = Date.now()
     
        await subcategoryInfo.save()

        res.status(200).json({
            msg: 'subcategory information updated successfully',
            data: subcategoryInfo
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