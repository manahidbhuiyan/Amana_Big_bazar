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

// @route POST api/branch
// @description Add New Delivery Charges or Shop Location
// @access Private
router.post('/', [auth,
    [
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
    try {
        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

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

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'branch')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to branch'
                }]
            })
        }

        const branchInfo = await Branch.findOne({
            name,
            division,
            district,
            thana
        })

        if (branchInfo) {
            return res.status(400).send({
                errors: [{
                    msg: 'Branch name already exists'
                }]
            })
        }

        let serialNo = 100

        const lastSerialInfo = await Branch.findOne({}).sort({create: -1})

        if(lastSerialInfo){
            serialNo = lastSerialInfo.serialNo + 1
        }else{
            serialNo = serialNo + 1
        }

        const addBranchInfo = new Branch({
            serialNo,
            admin: req.admin.id,
            name: name.toLowerCase().trim(),
            address,
            thana,
            district,
            division,
            phone,
            first_order: first_order_data,
            flat_order: flat_order_data,
            facebook_page_id,
            point_settings: {
                purchase,
                expand,
                bench_mark,
                use_points_on
            },
            taxIdentificationNo,
            point_apply_active,
            personal_discount_active,
            special_discount_active,
            sales_person_active,
            pos_slip_notes,
            branch_notice,
            nbr_sdc_ips,
            vat_applicable_warehouse_receiving,
        })

        await addBranchInfo.save()
        res.status(200).json({
            msg: 'New branch added successfully',
            data: addBranchInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router