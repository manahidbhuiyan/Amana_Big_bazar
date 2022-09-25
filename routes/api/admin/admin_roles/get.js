const express = require('express');
const router = express.Router();

const auth = require('../../../../middleware/admin/auth');
const AdminRole = require('../../../../models/admin/AdminRole');

const { getAdminRoleChecking } = require('../../../../lib/helpers');

// @route GET api/role
// @description Get all roles
// @access Public
router.get('/:pageNo', auth, async (req, res) => {
    try {

        const adminRolesCheck = await getAdminRoleChecking(req.admin.id, 'admin role list')

        if (!adminRolesCheck) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to modify admin role list',
                        type: 'error'
                    }
                ]
            })
        }

        let dataList = 25
        let offset = (parseInt(req.params.pageNo) - 1) * dataList

        let condition = {}

        if (req.query.type !== undefined) {
            let columnName = req.query.type
            let text = req.query.text

            condition = {
                [columnName]: {
                    $regex: text,
                    $options: "i"
                }
            }

        }

        let adminRoles = await AdminRole.find(condition).populate('menu_permission.menu', ['name']).populate('menu_permission.permission', ['name']).limit(dataList).skip(offset)

        res.status(200).json({
            data: adminRoles
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
router.get('/single/:adminRoleID', auth, async (req, res) => {
    try {
        const adminRolesCheck = await getAdminRoleChecking(req.admin.id, 'admin role list')

        if (!adminRolesCheck) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to modify admin role list',
                        type: 'error'
                    }
                ]
            })
        }

        let adminRoleInfo = await AdminRole.findById(req.params.adminRoleID)

        res.status(200).json({
            data: adminRoleInfo,
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

router.get('/', async (req, res) => {
    try {
        let adminRoles = await AdminRole.find({}).populate('menu_permission.menu', ['name']).populate('menu_permission.permission', ['name'])

        res.status(200).json({
            data: adminRoles
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router