const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../../middleware/admin/auth');

const Category = require('../../../../../models/Accounts/Chart/Category');

const { getAdminRoleChecking } = require('../../../../../lib/helpers');

// @route GET api/accounts/chart/category/:pageNo?name=?&group=?&subgroup=?
// @description Get all the categories
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

        let categories = await Category.find(condition).populate('group').populate('subgroup').limit(dataList).skip(offset)

        res.status(200).json({
            data: categories
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/accounts/chart/category
// @description Get all the categories
// @access Private
router.get('/', [auth], async (req, res) => {
    try {
        let condition = {
            active: true
        }

        let categories = await Category.find(condition).populate('group').populate('subgroup')

        res.status(200).json({
            data: categories
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/accounts/chart/category/create-subcategory/:subgroup
// @description Get all the categories with pay_to_suplier false
// @access Private
router.get('/create-subcategory/:subgroup', [auth], async (req, res) => {
    try {
        let condition = {
            active: true,
            pay_to_supplier: false,
            subgroup: req.params.subgroup
        }

        let categories = await Category.find(condition).populate('group').populate('subgroup')

        res.status(200).json({
            data: categories
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/accounts/chart/subgroup-wise/:subgroup
// @description Get all the categories subgroup wise
// @access Private
router.get('/subgroup-wise/:subgroup', [auth], async (req, res) => {
    try {
        let condition = {
            active: true,
            subgroup: req.params.subgroup
        }

        let categories = await Category.find(condition).populate('group').populate('subgroup')

        res.status(200).json({
            data: categories
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


// @route GET api/accounts/chart/category/data/:categoryID
// @description Get single group
// @access Private
router.get('/data/:categoryID', [auth], async (req, res) => {

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

        let categoryInfo = await Category.findById(req.params.categoryID).populate('group').populate('subgroup')

        res.status(200).json({
            data: categoryInfo
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

// @route GET api/accounts/chart/category/data/slug/:slug
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

        let categories = await Category.findOne({
            slug: req.params.slug
        }).populate('group').populate('subgroup')

        res.status(200).json({
            data: categories
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid categories'
                }]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router