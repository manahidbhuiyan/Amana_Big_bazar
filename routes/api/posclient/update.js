const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../middleware/admin/auth');
const OrderForPos = require('../../../models/OrderForPos');
const PosOrderExchange = require('../../../models/PosOrderExchange');
const PosOrderRefund = require('../../../models/PosOrderRefund');
const PosUser = require('../../../models/PosUser');
const Admin = require('../../../models/admin/Admin');

const {
    getAdminRoleChecking,
    generateNextID
} = require('../../../lib/helpers');

// @route POST api/cart
// @description Add New Product On Cart
// @access Private
router.put('/', [auth,
    [
        check('clientID', 'Client id is required').not().isEmpty(),
        check('name', 'Name is required').not().isEmpty(),
        check('phone', 'Phone is required').not().isEmpty(),
        check('address', 'Address is required').not().isEmpty()
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

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'pos cart')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to POS cart'
                }]
            })
        }

        const {
            clientID,
            name,
            phone,
            email,
            address,
            notes
        } = req.body

        // See if pos user exsist
        let posUser = await PosUser.findOne({
            clientID
        })

        let conditionUpdate = {
            "customer.phone": posUser.phone
        }

        if(posUser.phone != phone){
            // See if pos user exsist
            let posUserPhoneCheck = await PosUser.findOne({
                phone
            })

            if (posUserPhoneCheck) {
                return res.status(400).send({
                    auth: false,
                    errors: [{
                        msg: 'phone no. already exists'
                    }]
                })
            }
        }

        posUser.phone = phone
        posUser.name = name.toLowerCase().trim()
        posUser.email = email.toLowerCase().trim()
        posUser.address = address.toLowerCase().trim()
        posUser.notes = notes.toLowerCase().trim()

        await posUser.save();

        let customerInfo = {
            customer:{
                name: name,
                address: address,
                phone: phone,
            }
        }

        await OrderForPos.updateMany(conditionUpdate, customerInfo).catch(e => new Error(e))
        await PosOrderExchange.updateMany(conditionUpdate, customerInfo).catch(e => new Error(e))
        await PosOrderRefund.updateMany(conditionUpdate, customerInfo).catch(e => new Error(e))

        return res.status(200).json({
            auth: true,
            msg: "POS client updated successfully",
            data: posUser
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router