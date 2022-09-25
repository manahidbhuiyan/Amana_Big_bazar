const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../../middleware/admin/auth');

const CostCenter = require('../../../../../models/Accounts/Settings/CostCenter');

const { getAdminRoleChecking } = require('../../../../../lib/helpers');

// @route GET api/accounts/settings/cost-center/:pageNo
// @description Get all the costcenters
// @access Private
router.get('/:pageNo', [auth], async (req, res) => {

    try {
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'accounts settings')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'account is not authorized to accounts settings'
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

        let costcenters = await CostCenter.find(condition).limit(dataList).skip(offset)

        res.status(200).json({
            data: costcenters
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/accounts/settings/cost-center
// @description Get all the costcenters
// @access Private
router.get('/', [auth], async (req, res) => {
    try {
        let condition = {
            active: true
        }

        let costcenters = await CostCenter.find(condition).select('_id').select('name')

        res.status(200).json({
            data: costcenters
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


// @route GET api/accounts/settings/cost-center/data/:categoryID
// @description Get single group
// @access Private
router.get('/data/:categoryID', [auth], async (req, res) => {

    try {
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'accounts settings')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'account is not authorized to accounts settings'
                    }
                ]
            })
        }

        let categoryInfo = await CostCenter.findById(req.params.categoryID)

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

// @route GET api/accounts/settings/cost-center/data/slug/:slug
// @description Get single group by slug
// @access Private
router.get('/data/slug/:slug', [auth], async (req, res) => {
    try {
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'accounts settings')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'account is not authorized to accounts settings'
                    }
                ]
            })
        }

        let costcenters = await CostCenter.findOne({
            slug: req.params.slug
        })

        res.status(200).json({
            data: costcenters
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid costcenters'
                }]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router