const express = require('express');
const router = express.Router();
const slugify = require('slugify');

const {
    check,
    validationResult
} = require('express-validator');

//Load admin authentication middleware
const auth = require('../../../../middleware/admin/auth');
// Load Role model 
const AdminRole = require('../../../../models/admin/AdminRole');

const { getAdminRoleChecking } = require('../../../../lib/helpers');

// @route POST api/role
// @description Add New Role
// @access Private - this api can be accessed by the admin who have role permission
router.post('/', [ auth, 
    [
        check('name', 'Admin role name required').not().isEmpty(),
        check('menu_permission', 'Menu permission is required').not().isEmpty(),
    ]
], async (req, res) => {
    try {
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
        const { name, menu_permission } = req.body
        

        const addRoleInfo = new AdminRole({
            name: name.toLowerCase(),
            slug: slugify(name.toLowerCase()),
            menu_permission
        })

        await addRoleInfo.save()

        res.status(200).json({
            type: 'success',
            msg: 'New admin role added successfully',
            data: addRoleInfo
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