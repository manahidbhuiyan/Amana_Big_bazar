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

// @route POST api/accounts/chart/subgroup
// @description Add new subgroup
// @access Private
router.post('/', [auth, 
    [
        check('group', 'group id required').not().isEmpty(),
        check('name', 'subgroup name is required').not().isEmpty()
    ]
], async (req, res) => { 
    try {
        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

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

        const { name, group } = req.body

        const subgroupName = await SubGroup.findOne({
            name: name.toLowerCase()
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

        let serialNo = 100

            const lastSerialInfo = await SubGroup.findOne().sort({create: -1})

            if(lastSerialInfo){
                serialNo = lastSerialInfo.serialNo + 1
            }else{
                serialNo = serialNo + 1
            }
        
        let slug = slugify(name)

        const addSubGroupInfo = new SubGroup({
            group,
            serialNo,
            name: name.toLowerCase().trim(),
            slug: slug.toLowerCase().trim(),
            admin: req.admin.id
        })

        await addSubGroupInfo.save()
        res.status(200).json({
            msg: 'new subgroup added successfully',
            data: addSubGroupInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router