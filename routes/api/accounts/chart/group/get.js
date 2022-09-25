const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../../middleware/admin/auth');

const Group = require('../../../../../models/Accounts/Chart/Group');

const { getAdminRoleChecking } = require('../../../../../lib/helpers');

// @route GET api/accounts/chart/group/:pageNo
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

        let groups = await Group.find(condition).limit(dataList).skip(offset)

        res.status(200).json({
            data: groups
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/accounts/chart/group
// @description Get all the groups
// @access Private
router.get('/', [auth], async (req, res) => {
    try {
        let condition = {
            active: true
        }

        let groups = await Group.find(condition)

        res.status(200).json({
            data: groups
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


// @route GET api/accounts/chart/group/data/:groupID
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

        let groupInfo = await Group.findById(req.params.groupID)

        res.status(200).json({
            data: groupInfo
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

// @route GET api/accounts/chart/group/data/slug/:slug
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

        let group = await Group.findOne({
            slug: req.params.slug
        })

        res.status(200).json({
            data: group
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid group'
                }]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router