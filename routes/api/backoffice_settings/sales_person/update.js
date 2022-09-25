const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../middleware/admin/auth');
const SalesPerson = require('../../../../models/SalesPerson');
const Admin = require('../../../../models/admin/Admin');

const {
    getAdminRoleChecking
} = require('../../../../lib/helpers');

// @route PUT api/branch
// @description Add New Branch or Shop Location
// @access Private
router.put('/', [auth,
    [
        check('sales_person_id', 'Discount person id is required').not().isEmpty(),
        check('branch', 'Branch is required').not().isEmpty(),
        check('name', 'Name is required').not().isEmpty(),
        check('phone', 'Phone is required').not().isEmpty(),
    ]
], async (req, res) => {
    try {

        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

        const user = await Admin.findById(req.admin.id).select('-password').select('-forgot');

        if (!user) {
            return res.status(400).send({
                errors: [{
                    msg: 'Invailid user.'
                }]
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'backoffice settings')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to backoffice settings'
                }]
            })
        }

        const {
            sales_person_id,
            branch,
            name,
            phone,
            email,
            address,
            notes,
            active
        } = req.body

        const salesPersonInfo = await SalesPerson.findById(sales_person_id);

        salesPersonInfo.branch = branch
        salesPersonInfo.name = name
        salesPersonInfo.phone = phone
        salesPersonInfo.email = email
        salesPersonInfo.address = address
        salesPersonInfo.notes = notes
        salesPersonInfo.active = active

        await salesPersonInfo.save();

        return res.status(200).json({
            auth: true,
            msg: "Sales person information has been updated successfully",
            data: salesPersonInfo
        })

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router