const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../middleware/admin/auth');
const Branch = require('../../../models/Branch');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');

// @route PUT api/branch
// @description Update single branch
// @access Private
router.put('/', [auth,
    [
        check('branch', 'Branch id required').not().isEmpty(),
        check('name', 'Name is required').not().isEmpty(),
        check('address', 'Address is required').not().isEmpty(),
        check('thana', 'Thana is required').not().isEmpty(),
        check('district', 'District is required').not().isEmpty(),
        check('division', 'Division is required').not().isEmpty(),
        check('phone', 'Phone no. is required').not().isEmpty(),
        check('point_apply_active', 'Point apply activity is required').not().isEmpty(),
        check('personal_discount_active', 'Personal discount activity is required').not().isEmpty(),
        check('special_discount_active', 'Special discount activity is required').not().isEmpty(),
        check('sales_person_active', 'Sales person activity is required').not().isEmpty(),
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    const adminRoles = await getAdminRoleChecking(req.admin.id, 'branch')

    if (!adminRoles) {
        return res.status(400).send({
            errors: [{
                msg: 'Account is not authorized to branch'
            }]
        })
    }

    try {
        const {
            name,
            address,
            thana,
            district,
            division,
            phone,
            first_order_data,
            flat_order_data,
            facebook_page_id,
            purchase,
            expand,
            bench_mark,
            use_points_on,
            taxIdentificationNo,
            point_apply_active,
            personal_discount_active,
            special_discount_active,
            sales_person_active,
            pos_slip_notes,
            branch_notice,
            nbr_sdc_ips,
            vat_applicable_warehouse_receiving
        } = req.body

        let branch = await Branch.findById(req.body.branch)

        branch.admin = req.admin.id
        branch.name = name.toLowerCase().trim()
        branch.address = address
        branch.thana = thana
        branch.district = district
        branch.division = division
        branch.phone = phone
        branch.first_order = first_order_data
        branch.flat_order = flat_order_data
        branch.facebook_page_id = facebook_page_id
        branch.point_settings.purchase = purchase
        branch.point_settings.expand = expand
        branch.point_settings.bench_mark = bench_mark
        branch.point_settings.use_points_on = use_points_on
        branch.taxIdentificationNo =taxIdentificationNo
        branch.point_apply_active = point_apply_active
        branch.personal_discount_active = personal_discount_active
        branch.special_discount_active = special_discount_active
        branch.sales_person_active = sales_person_active
        branch.pos_slip_notes = pos_slip_notes
        branch.branch_notice = branch_notice
        branch.nbr_sdc_ips = nbr_sdc_ips
        branch.vat_applicable_warehouse_receiving= vat_applicable_warehouse_receiving
        branch.update = Date.now()

        await branch.save()
        res.status(200).json({
            msg: 'Branch information updated successfully',
            data: branch
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).json({
                msg: 'Branch not found'
            });
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});


// @route PUT api/branch/default
// @description Update single branch
// @access Private
router.put('/default', [auth,
    [
        check('branch', 'Branch id required').not().isEmpty()
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    const adminRoles = await getAdminRoleChecking(req.admin.id, 'branch')

    if (!adminRoles) {
        return res.status(400).send({
            errors: [{
                msg: 'Account is not authorized to branch'
            }]
        })
    }

    try {

        let selectedBranch = await Branch.findById(req.body.branch)

        let branch = await Branch.find({
            "division.name": {
                $regex: selectedBranch.division.name,
                $options: "i"
            }
        })

        branch.map(async (value, index) => {
            if (value._id == req.body.branch) {
                value.isDefaultShop = true
            } else {
                value.isDefaultShop = false
            }
            value.update = Date.now()
            await value.save()
        })

        res.status(200).json({
            msg: 'Default branch is set successfully',
            data: branch
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).json({
                msg: 'Branch not found'
            });
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router