const express = require('express');
const router = express.Router();
const auth = require('../../../../middleware/admin/auth');
const Lookup = require('../../../../models/Backoffice/Lookup');

const {
    getAdminRoleChecking
} = require('../../../../lib/helpers');

// @route GET api/brand/:pageNo
// @description Get all the brand
// @access Private
router.get('/:pageNo',[auth], async (req, res) => {

    try {
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'backoffice settings')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized for backoffice settings'
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

        let getLookupInfo = await Lookup.find(condition).populate('branch', ['name']).populate('last_updated_by', ['name']).limit(dataList).skip(offset)

        res.status(200).json({
            data: getLookupInfo
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/branch/:branchID
// @description Get single branche
// @access Public
router.get('/data/:lookupID', [auth], async (req, res) => {

    try {
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'backoffice settings')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized for backoffice settings'
                }]
            })
        }

        let lookupInfo = await Lookup.findById(req.params.lookupID)

        res.status(200).json({
            auth: true,
            data: lookupInfo
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(200).json({
                auth: false,
                msg: 'Lookup not found'
            });
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});


// @route GET api/branch/:branchID
// @description Get single branche
// @access Public
router.get('/data/search/:lookupType', async (req, res) => {

    try {
        let lookupInfo = await Lookup.find({
            type: {
                $in: req.params.lookupType
            }
        }).select('title type min_payment_amount discount_percentage max_discount_amount')

        res.status(200).json({
            auth: true,
            data: lookupInfo
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(200).json({
                auth: false,
                msg: 'Lookup not found'
            });
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});



module.exports = router