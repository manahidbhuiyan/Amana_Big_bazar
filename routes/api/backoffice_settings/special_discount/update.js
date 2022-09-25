const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../middleware/admin/auth');
const SpecialDiscount = require('../../../../models/SpecialDiscount');
const Admin = require('../../../../models/admin/Admin');

const {
    getAdminRoleChecking
} = require('../../../../lib/helpers');

// @route PUT api/branch
// @description Add New Branch or Shop Location
// @access Private
router.put('/', [auth,
    [
        check('special_discount_id', 'Special discount id is required').not().isEmpty(),
        check('name', 'Name is required').not().isEmpty(),
        check('max_discount_percentage', 'Maximum discount percentage is required').not().isEmpty(),
        check('want_to_define_contact', 'Want to define contact or not info is required').not().isEmpty()
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
            special_discount_id,
            name,
            specific_customer,
            max_discount_percentage,
            max_amount,
            max_purchase_amount,
            want_to_define_contact
        } = req.body

        const specialDiscountInfo = await SpecialDiscount.findById(special_discount_id);

        specialDiscountInfo.name = name
        specialDiscountInfo.max_discount_percentage = max_discount_percentage
        specialDiscountInfo.max_amount = max_amount
        specialDiscountInfo.max_purchase_amount = max_purchase_amount
        specialDiscountInfo.wantToDefineContactNo = want_to_define_contact

        if(specific_customer.length>0){
            specialDiscountInfo.specific_customer = specific_customer
        }

        await specialDiscountInfo.save();

        return res.status(200).json({
            auth: true,
            msg: "Special discount has been updated successfully",
            data: specialDiscountInfo
        })

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router