const express = require('express');
const router = express.Router();

const auth = require('../../../../middleware/admin/auth');
const Permission = require('../../../../models/admin/Permission');

const { getAdminRoleChecking } = require('../../../../lib/helpers');

// @route GET api/role
// @description Get all roles
// @access Public
router.get('/:pageNo', auth, async (req, res) => {
    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'admin permission')

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

        let permissions = await Permission.find(condition).populate('menu', ['name']).limit(dataList).skip(offset)

        res.status(200).json({
            data: permissions
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
router.get('/single/:permissionID', auth, async (req, res) => {
    try {
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'admin permission')

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

        let permissions = await Permission.findById(req.params.permissionID)

        res.status(200).json({
            data: permissions,
            type: 'success'
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

router.get('/all/:menuID', async (req, res) => {
    try {
        let condition = {
            menu: req.params.menuID,
            active: true
        }
        let permissions = await Permission.find(condition)

        res.status(200).json({
            data: permissions,
            type: 'success'
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