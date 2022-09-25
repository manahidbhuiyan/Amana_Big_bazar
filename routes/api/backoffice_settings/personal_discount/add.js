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

// @route POST api/cart
// @description Add New Product On Cart
// @access Private
router.post('/', [auth,
    [
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

        let serialNo =  Number(10000)

        const lastSerialInfo = await PersonalDiscount.findOne({}).sort({create: -1})

        if(lastSerialInfo){
            serialNo = lastSerialInfo.personID + 1
        }else{
            serialNo = serialNo + 1
        } 

        const {
            name,
            phone,
            email,
            address,
            notes,
            max_discount_percentage,
            max_amount,
            max_purchase_amount,
            person_type
        } = req.body

        // See if pos user exsist
        let personalDiscount = await PersonalDiscount.findOne({
            phone
        })

        if (personalDiscount) {
            return res.status(400).send({
                auth: false,
                errors: [{
                    msg: 'your provided phone no should be unique'
                }]
            })
        }

        const personalDiscountInfo = new PersonalDiscount({
            personID: serialNo,
            name: name,
            phone: phone,
            email: email,
            address: address,
            notes: notes,
            max_discount_percentage,
            max_purchase_amount,
            max_amount,
            person_type
        })

        await personalDiscountInfo.save();

        return res.status(200).json({
            auth: true,
            msg: "New person for personal discount has been set successfully",
            data: personalDiscountInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router