const express = require('express');
const router = express.Router();
const slugify = require('slugify');

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../middleware/admin/auth');
const AdminRole = require('../../../../models/admin/AdminRole');
const Admin = require('../../../../models/admin/Admin');

const { getAdminRoleChecking } = require('../../../../lib/helpers');
// @route PUT api/role
// @description Update Role
// @access Private
router.put('/', [auth, 
    [
        check('adminRoleID', 'Admin role id required').not().isEmpty(),
        check('name', 'Role name required').not().isEmpty(),
        check('menu_permission', 'Menu permission is required').not().isEmpty(),
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    // //Check the role permission from the lib/helpers
    // const adminRoles = await getAdminRoleChecking(req.admin.id, 'role')

    // //If role is not permited
    // if (!adminRoles) {
    //     return res.status(400).send({
    //         errors: [
    //             {
    //                 msg: 'Account is not authorized to modify role',
    //                 type: 'error'
    //             }
    //         ]
    //     })
    // }

    try {
        const { name, adminRoleID, menu_permission } = req.body

        let adminRoleInfo = await AdminRole.findById(adminRoleID)

        adminRoleInfo.name = name.toLowerCase()
        adminRoleInfo.slug = slugify(name)
        adminRoleInfo.menu_permission = menu_permission
        adminRoleInfo.update = Date.now()

        await adminRoleInfo.save()

        let adminRoles = await AdminRole.findById(adminRoleID).populate('menu_permission.menu', ['name']).populate('menu_permission.permission', ['name'])
        let admin_roles = []
        let parentArray = adminRoles.menu_permission.map(async roleInfo=>{
            admin_roles.push(roleInfo.menu.name)
            let childArray = roleInfo.permission.map(async permissionInfo=>{
                admin_roles.push(permissionInfo.name)
            })
            await Promise.all(childArray)
        })
        await Promise.all(parentArray)

        await Admin.updateMany({
            admin_roles_id: adminRoleID
        }, {
            admin_roles
        })
        
        res.status(200).json({
            type: 'success',
            msg: 'Role information updated successfully',
            data: adminRoleInfo
        });
        
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).json({
                msg: 'Role not found',
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