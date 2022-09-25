const express = require('express');
const router = express.Router();
const slugify = require('slugify');

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../middleware/admin/auth');
const Permission = require('../../../../models/admin/Permission');

const { getAdminRoleChecking } = require('../../../../lib/helpers');
// @route PUT api/role
// @description Update Permission
// @access Private
router.put('/', [auth, 
    [
        check('permissionID', 'Permission id required').not().isEmpty(),
        check('name', 'Permission name required').not().isEmpty(),
        check('menu', 'Menu id is required').not().isEmpty(),
        check('active', 'Menu activity required').not().isEmpty()
    ]
], async (req, res) => {
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

    try {
        const { name, active, permissionID, menu } = req.body

        let permissionInfo = await Permission.findById(permissionID)

        if(permissionInfo.name != name.toLowerCase()){
            let permissionNameCheck = await Permission.findOne({
                name: name.toLowerCase()
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
        }

        permissionInfo.name = name.toLowerCase()
        permissionInfo.slug = slugify(name.toLowerCase())
        permissionInfo.menu = menu
        permissionInfo.active = active
        permissionInfo.update = Date.now()

        await permissionInfo.save()
        res.status(200).json({
            type: 'success',
            msg: 'Permission information updated successfully',
            data: permissionInfo
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).json({
                msg: 'Permission not found',
                type: 'error'
            });
        }
        console.error(err);
        res.status(500).send({
            msg: 'Server error',
            type: 'error'
          });
    }
});

module.exports = router