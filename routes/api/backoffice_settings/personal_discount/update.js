const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../middleware/admin/auth');
const PersonalDiscount = require('../../../../models/PersonalDiscount');
const Admin = require('../../../../models/admin/Admin');

const {
    getAdminRoleChecking
} = require('../../../../lib/helpers');

// @route PUT api/branch
// @description Add New Branch or Shop Location
// @access Private
router.put('/', [auth,
    [
        check('discount_person_id', 'Discount person id is required').not().isEmpty(),
        check('name', 'Name is required').not().isEmpty(),
        check('phone', 'Phone is required').not().isEmpty(),
        check('max_discount_percentage', 'Maximum discount percentage is required').not().isEmpty()
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
            discount_person_id,
            name,
            phone,
            email,
            address,
            notes,
            active,
            max_discount_percentage,
            max_amount,
            max_purchase_amount,
            person_type
        } = req.body

        const personalDiscountInfo = await PersonalDiscount.findById(discount_person_id);

        personalDiscountInfo.name = name
        personalDiscountInfo.phone = phone
        personalDiscountInfo.email = email
        personalDiscountInfo.address = address
        personalDiscountInfo.notes = notes
        personalDiscountInfo.active = active
        personalDiscountInfo.max_discount_percentage = max_discount_percentage
        personalDiscountInfo.max_amount = max_amount
        personalDiscountInfo.max_purchase_amount = max_purchase_amount
        personalDiscountInfo.person_type = person_type

        await personalDiscountInfo.save();

        return res.status(200).json({
            auth: true,
            msg: "Person for personal discount has been updated successfully",
            data: personalDiscountInfo
        })

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router