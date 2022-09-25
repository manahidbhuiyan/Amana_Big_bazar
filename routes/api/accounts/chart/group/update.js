const express = require('express');
const router = express.Router();

const slugify = require('slugify');

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../../middleware/admin/auth');
const Group = require('../../../../../models/Accounts/Chart/Group');

const { getAdminRoleChecking } = require('../../../../../lib/helpers');

// @route PUT api/accounts/chart/group
// @description Update single group
// @access Private
router.put('/', [auth,
    [
        check('group', 'group id required').not().isEmpty(),
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

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'chart of accounts group')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'account is not authorized to chart of accounts'
                    }
                ]
            })
        }
        
        const { name, group, active} = req.body

        const groupName = await Group.findOne({
            name: name.toLowerCase(),
            _id: {
                $ne: group
            }
        })
        
        if (groupName) {
            return res.status(400).send({
              errors: [
                {
                  msg: 'group name already exists'
                }
              ]
            })
        }

        let groupInfo = await Group.findById(group)
        
        let slug = slugify(name)
        groupInfo.name = name.toLowerCase().trim()
        groupInfo.slug = slug.toLowerCase().trim()
        groupInfo.admin = req.admin.id
        if(typeof active !== 'undefined'){
            groupInfo.active = active
        }
        groupInfo.update = Date.now()
     
        await groupInfo.save()

        res.status(200).json({
            msg: 'group information updated successfully',
            data: groupInfo
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