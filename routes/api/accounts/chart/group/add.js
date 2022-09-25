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

// @route POST api/accounts/chart/group
// @description Add new group
// @access Private
router.post('/', [auth, 
    [
        check('name', 'group name required').not().isEmpty()
    ]
], async (req, res) => { 
    try {

        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

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

        const { name } = req.body

        const groupName = await Group.findOne({
            name: name.toLowerCase()
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

        let serialNo = 100

            const lastSerialInfo = await Group.findOne().sort({create: -1})

            if(lastSerialInfo){
                serialNo = lastSerialInfo.serialNo + 1
            }else{
                serialNo = serialNo + 1
            }
        
        let slug = slugify(name)

        const addGroupInfo = new Group({
            serialNo,
            name: name.toLowerCase().trim(),
            slug: slug.toLowerCase().trim(),
            admin: req.admin.id
        })

        await addGroupInfo.save()
        res.status(200).json({
            msg: 'new group added successfully',
            data: addGroupInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router