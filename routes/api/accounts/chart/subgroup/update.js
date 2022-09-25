const express = require('express');
const router = express.Router();

const slugify = require('slugify');

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../../middleware/admin/auth');
const SubGroup = require('../../../../../models/Accounts/Chart/SubGroup');

const { getAdminRoleChecking } = require('../../../../../lib/helpers');

// @route PUT api/accounts/chart/subgroup
// @description Update single subgroup
// @access Private
router.put('/', [auth,
    [
        check('subgroup', 'subgroup id required').not().isEmpty(),
        check('group', 'group id required').not().isEmpty(),
        check('name', 'subgroup name required').not().isEmpty()
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'chart of accounts subgroup')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'account is not authorized to chart of accounts'
                    }
                ]
            })
        }
        
        const { name, subgroup, group, active} = req.body

        const subgroupName = await SubGroup.findOne({
            name: name.toLowerCase(),
            _id: {
                $ne: subgroup
            }
        })
        
        if (subgroupName) {
            return res.status(400).send({
              errors: [
                {
                  msg: 'subgroup name already exists'
                }
              ]
            })
        }

        let subgroupInfo = await SubGroup.findById(subgroup)
        
        let slug = slugify(name)
        subgroupInfo.group = group
        subgroupInfo.name = name.toLowerCase().trim()
        subgroupInfo.slug = slug.toLowerCase().trim()
        subgroupInfo.admin = req.admin.id
        if(typeof active !== 'undefined'){
            subgroupInfo.active = active
        }
        subgroupInfo.update = Date.now()
     
        await subgroupInfo.save()

        res.status(200).json({
            msg: 'subgroup information updated successfully',
            data: subgroupInfo
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Invalid subgroup'
                    }
                ]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router