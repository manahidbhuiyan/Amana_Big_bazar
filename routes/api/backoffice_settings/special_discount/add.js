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

// @route POST api/cart
// @description Add New Product On Cart
// @access Private
router.post('/', [auth,
    [
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
            name,
            specific_customer,
            max_discount_percentage,
            max_amount,
            max_purchase_amount,
            want_to_define_contact
        } = req.body

        // See if pos user exsist
        let specialDiscount = await SpecialDiscount.findOne({
            name: name.toLowerCase()
        })

        if (specialDiscount) {
            return res.status(400).send({
                auth: false,
                errors: [{
                    msg: 'your provided phone no should be unique'
                }]
            })
        }

        let discountInfoData = {
            name: name.toLowerCase(),
            max_discount_percentage,
            max_purchase_amount,
            max_amount,
            wantToDefineContactNo: want_to_define_contact
        }

        if(specific_customer.length>0){
            discountInfoData.specific_customer = specific_customer
        }

        const specialDiscountInfo = new SpecialDiscount(discountInfoData)

        await specialDiscountInfo.save();

        return res.status(200).json({
            auth: true,
            msg: "Special discount has been set successfully",
            data: specialDiscountInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router