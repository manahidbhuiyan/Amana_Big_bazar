const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../middleware/admin/auth');
const Role = require('../../../../models/admin/Role');

const { getAdminRoleChecking } = require('../../../../lib/helpers');
// @route PUT api/role
// @description Update Role
// @access Private
router.put('/', [auth,
    [
        check('role', 'Role id required').not().isEmpty(),
        check('name', 'Role name required').not().isEmpty()
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    //Check the role permission from the lib/helpers
    const adminRoles = await getAdminRoleChecking(req.admin.id, 'role')

    //If role is not permited
    if (!adminRoles) {
        return res.status(400).send({
            errors: [
                {
                    msg: 'Account is not authorized to modify role',
                    type: 'error'
                }
            ]
        })
    }

    try {
        let icon = null

        if (req.body.icon) {
            icon = req.body.icon
        }

        const { name } = req.body

        let role = await Role.findById(req.body.role)

        role.name = name
        role.icon = icon
        role.update = Date.now()

        await role.save()
        res.status(200).json({
            type: 'success',
            msg: 'Role information updated successfully',
            data: role
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