const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../../middleware/admin/auth');

const Group = require('../../../../../models/Accounts/Chart/Group');
const SubGroup = require('../../../../../models/Accounts/Chart/SubGroup');

const { getAdminRoleChecking } = require('../../../../../lib/helpers');

// @route GET api/accounts/chart/subgroup/:pageNo?name=?&group=?
// @description Get all the groups
// @access Private
router.get('/:pageNo', [auth], async (req, res) => {

    try {
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'chart of accounts')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'account is not authorized to chart of accounts'
                    }
                ]
            })
        }

        let dataList = 10
        let offset = (parseInt(req.params.pageNo) - 1) * 10

        let condition = {}

        if (req.query.name !== undefined) {
            condition.name = {
                $regex: req.query.name,
                $options: "i"
            }
        }

        if (req.query.group !== undefined) {
            condition.group = req.query.group
        }

        let subgroups = await SubGroup.find(condition).populate('group').limit(dataList).skip(offset)

        res.status(200).json({
            data: subgroups
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/accounts/chart/subgroup
// @description Get all the groups
// @access Private
router.get('/', [auth], async (req, res) => {
    try {
        let condition = {
            active: true
        }

        let subgroups = await SubGroup.find(condition).populate('group')

        res.status(200).json({
            data: subgroups
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/accounts/chart/subgroup/group-wise/:group
// @description Get all the subgroups group wise
// @access Private
router.get('/group-wise/:group', [auth], async (req, res) => {
    try {
        let condition = {
            active: true,
            group: req.params.group
        }

        let subgroups = await SubGroup.find(condition).populate('group')

        res.status(200).json({
            data: subgroups
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


// @route GET api/accounts/chart/subgroup/data/:groupID
// @description Get single group
// @access Private
router.get('/data/:groupID', [auth], async (req, res) => {

    try {
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'chart of accounts')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'account is not authorized to chart of accounts'
                    }
                ]
            })
        }

        let subgroupInfo = await SubGroup.findById(req.params.groupID).populate('group')

        res.status(200).json({
            data: subgroupInfo
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid category'
                }]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/accounts/chart/subgroup/data/slug/:slug
// @description Get single group by slug
// @access Private
router.get('/data/slug/:slug', [auth], async (req, res) => {
    try {
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'chart of accounts')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'account is not authorized to chart of accounts'
                    }
                ]
            })
        }

        let subgroup = await SubGroup.findOne({
            slug: req.params.slug
        }).populate('group')

        res.status(200).json({
            data: subgroup
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid subgroup'
                }]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router