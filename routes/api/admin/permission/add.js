const express = require('express');
const router = express.Router();
const slugify = require('slugify');

const {
    check,
    validationResult
} = require('express-validator');

//Load admin authentication middleware
const auth = require('../../../../middleware/admin/auth');
// Load permission model 
const Permission = require('../../../../models/admin/Permission');

const { getAdminRoleChecking } = require('../../../../lib/helpers');


// @route POST api/role
// @description Add New permission
// @access Private - this api can be accessed by the admin who have role permission
router.post('/', [auth, 
    [
        check('name', 'Permission is name required').not().isEmpty(),
        check('menuID', 'Menu id is required').not().isEmpty()
    ]
], async (req, res) => {
    try {
        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

        //Check the admin permission from the lib/helpers
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'admin permission')

        //If admin permission is not permited
        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to modify admin permission',
                        type: 'error'
                    }
                ]
            })
        }

        
        const { name, menuID } = req.body

        let permissionNameCheck = await Permission.findOne({
            name
        })
    
        if (permissionNameCheck) {
            return res.status(400).send({
              errors: [
                {
                  msg: 'Permission already exists'
                }
              ]
            })
        }

        const addPermissionInfo = new Permission({
            name: name.toLowerCase(),
            slug: slugify(name.toLowerCase()),
            menu: menuID
        })

        await addPermissionInfo.save()

        res.status(200).json({
            type: 'success',
            msg: 'New permission added successfully',
            data: addPermissionInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send({
            msg: 'Server error',
            type: 'error'
        });
    }
});

module.exports = router