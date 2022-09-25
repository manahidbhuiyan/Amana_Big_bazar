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

// @route POST api/accounts/chart/category
// @description Add new category
// @access Private
router.post('/', [auth, 
    [
        check('group', 'group id is required').not().isEmpty(),
        check('subgroup', 'subgroup id is required').not().isEmpty(),
        check('name', 'category name required').not().isEmpty(),
        check('pay_to_supplier', 'supplier payment info required').not().isEmpty()
    ]
], async (req, res) => { 
    try {

        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

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

        const { name, group, subgroup, pay_to_supplier } = req.body

        const categoryName = await Category.findOne({
            name: name.toLowerCase()
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

        let serialNo = 100

            const lastSerialInfo = await Category.findOne().sort({create: -1})

            if(lastSerialInfo){
                serialNo = lastSerialInfo.serialNo + 1
            }else{
                serialNo = serialNo + 1
            }
        
        let slug = slugify(name)

        const addcategoryInfo = new Category({
            group,
            subgroup,
            serialNo,
            name: name.toLowerCase().trim(),
            slug: slug.toLowerCase().trim(),
            admin: req.admin.id,
            pay_to_supplier
        })

        await addcategoryInfo.save()
        res.status(200).json({
            msg: 'new category added successfully',
            data: addcategoryInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router