const express = require('express');
const router = express.Router();
const auth = require('../../../middleware/admin/auth');
const BranchManager = require('../../../models/manager/Manager');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');

// @route GET api/brand/:pageNo
// @description Get all the brand
// @access Private
router.get('/:pageNo',[auth], async (req, res) => {

    try {
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'pos manager')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized for pos manager'
                }]
            })
        }

        let dataList = 10
        let offset = (parseInt(req.params.pageNo) - 1) * 10

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

        let branchManager = await BranchManager.find(condition).populate('branch', ['name']).populate('last_updated_by', ['name']).limit(dataList).skip(offset)

        res.status(200).json({
            data: branchManager
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


// @route GET api/brand/:brandID
// @description Get single brand
// @access Private
router.get('/data/:managerID', async (req, res) => {

    try {
        let managerInfo = await BranchManager.findById(req.params.managerID).populate('subcategory', ['name']).populate('branch', ['name']).populate('last_updated_by', ['name'])

        res.status(200).json({
            data: managerInfo
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid manager id'
                }]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router