const express = require('express');
const router = express.Router();

const auth = require('../../../middleware/admin/auth');
const Admin = require('../../../models/admin/Admin');

const { getAdminRoleChecking } = require('../../../lib/helpers');

// @route GET api/admin/all/:pageNo
// @description Admin Route
// @access Private
router.get('/all/:pageNo', auth, async (req, res) => {
    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'admin')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to modify admin',
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

        const admin = await Admin.find(condition).select('name email superAdmin').populate('admin_roles_id', ['name']).populate('branches',['name']).limit(dataList).skip(offset);
        res.status(200).json({
            data: admin
        });
    } catch (err) {
        console.error(err);
        res.status(500).send({
            msg: 'Server error',
            type: 'error'
        });
    }
});


// @route GET api/admin/single/:adminID
// @description Admin Single Information Route
// @access Private
router.get('/single/:adminID', auth, async (req, res) => {
    try {
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'admin')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to modify admin',
                        type: 'error'
                    }
                ]
            })
        }

        const admin = await Admin.findById(req.params.adminID).populate('admin_roles_id').populate('roles',['name']).populate('branches',['name']).populate('sdcDeviceInfo.branchID', 'name').select('-password').select('-forgot');
        res.status(200).json(admin);
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).json({
                msg: 'Admin not found'
            });
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});


module.exports = router;