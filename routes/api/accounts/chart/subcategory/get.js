const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../../middleware/admin/auth');

const SubCategory = require('../../../../../models/Accounts/Chart/SubCategory');

const { getAdminRoleChecking } = require('../../../../../lib/helpers');

// @route GET api/accounts/chart/subcategory/:pageNo?name=?&group=?&subgroup=?&category=?
// @description Get all the subcategory
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

        if (req.query.subgroup !== undefined) {
            condition.subgroup = req.query.subgroup
        }

        if (req.query.category !== undefined) {
            condition.category = req.query.category
        }

        let subcategory = await SubCategory.find(condition).populate('group').populate('subgroup').populate('category').populate('branchWiseOpening.branch', ['name']).limit(dataList).skip(offset)

        res.status(200).json({
            data: subcategory
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/accounts/chart/subcategory
// @description Get all the subcategory
// @access Private
router.get('/', [auth], async (req, res) => {
    try {
        let condition = {
            active: true
        }

        let subcategory = await SubCategory.find(condition).populate('group').populate('subgroup').populate('category').populate('branchWiseOpening.branch', ['name'])

        res.status(200).json({
            data: subcategory
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/accounts/chart/subcategory/category-wise/:category
// @description Get all the subcategory category wise
// @access Private
router.get('/category-wise/:category', [auth], async (req, res) => {
    try {
        let condition = {
            active: true,
            category: req.params.category
        }

        let subcategory = await SubCategory.find(condition).populate('group').populate('subgroup').populate('category').populate('branchWiseOpening.branch', ['name'])

        res.status(200).json({
            data: subcategory
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


// @route GET api/accounts/chart/subcategory/data/:groupID
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

        let groupInfo = await SubCategory.findById(req.params.groupID).populate('group').populate('subgroup').populate('category').populate('branchWiseOpening.branch', ['name'])

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

// @route GET api/accounts/chart/subcategory/data/slug/:slug
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

        let group = await SubCategory.findOne({
            slug: req.params.slug
        }).populate('group').populate('subgroup').populate('category').populate('branchWiseOpening.branch', ['name'])

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