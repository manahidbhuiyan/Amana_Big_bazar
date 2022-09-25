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

// @route POST api/accounts/chart/subcategory
// @description Add new subcategory
// @access Private
router.post('/', [auth, 
    [
        check('group', 'group id is required').not().isEmpty(),
        check('subgroup', 'subgroup id is required').not().isEmpty(),
        check('category', 'category id is required').not().isEmpty(),
        check('name', 'group name required').not().isEmpty(),
        check('branchWiseOpening', 'branch wise opening balance required').not().isEmpty(),
        check('warehouse_opening_balance', 'warehouse opening balance required').not().isEmpty(),
    ]
], async (req, res) => { 
    try {

        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

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

        const { name, branchWiseOpening, warehouse_opening_balance, warehouse_depreciation_amount, group, subgroup, category, account_no, address } = req.body

        const subcategoryName = await SubCategory.findOne({
            group,
            subgroup,
            category,
            name: name.toLowerCase()
        })

        if (subcategoryName) {
            return res.status(400).send({
              errors: [
                {
                  msg: 'subcategory name already exists'
                }
              ]
            })
        }

        let serialNo = 100

            const lastSerialInfo = await SubCategory.findOne().sort({create: -1})

            if(lastSerialInfo){
                serialNo = lastSerialInfo.serialNo + 1
            }else{
                serialNo = serialNo + 1
            }
        
        let slug = slugify(name)

        let subCategoryInfoDetails = {
            group,
            subgroup,
            category,
            serialNo,
            name: name.toLowerCase().trim(),
            slug: slug.toLowerCase().trim(),
            branchWiseOpening,
            warehouse_opening_balance,
            warehouse_depreciation_amount,
            admin: req.admin.id
        }

        if(account_no){
            subCategoryInfoDetails.account_no = account_no
        }

        if(address){
            subCategoryInfoDetails.address = address
        }

        const subcategoryInfo = new SubCategory(subCategoryInfoDetails)

        await subcategoryInfo.save()
        res.status(200).json({
            msg: 'new subcategory added successfully',
            data: subcategoryInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router