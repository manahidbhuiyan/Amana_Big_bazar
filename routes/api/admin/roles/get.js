const express = require('express');
const router = express.Router();

const auth = require('../../../../middleware/admin/auth');
const Role = require('../../../../models/admin/Role');

const { getAdminRoleChecking } = require('../../../../lib/helpers');

// @route GET api/role
// @description Get all roles
// @access Public
router.get('/', auth, async (req, res) => {
    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'role')

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

        let roles = await Role.find({})

        res.status(200).json({
            data: roles,
            type: 'success'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send({
            msg: 'Server error',
            type: 'error'
        });
    }
});


// @route GET api/role/:roleID
// @description Get Single roles
// @access Public
router.get('/:roleID', auth, async (req, res) => {
    try {
        let roles = await Role.findById(req.params.roleID)

        res.status(200).json({
            data: roles,
            type: 'success'
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