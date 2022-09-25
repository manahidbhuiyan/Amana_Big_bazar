const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const config = require('config');

const auth = require('../../../middleware/admin/auth');
const Admin = require('../../../models/admin/Admin');
const NoPaymentReset = require('../../../models/NoPaymentReset')

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');

// @route POST api/cart
// @description Add New Product On Cart
// @access Private
router.post('/no-payment-reset', auth, async (req, res) => {
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


        let { branch, items } = req.body
        let products = []

        // console.log(req.body)

        items.map((data) => {
            products.push({
                barcode: data.code,
                name: data.name,
                discount: data.discount,
                quantity: data.quantity,
                sell_price: data.price,
                purchase_price: data.purchase_price,
                vat: data.vat
            })
        })

        const noPaymentResetProduct = new NoPaymentReset({
            admin: user.id,
            branch: branch,
            products: products
        })
        await noPaymentResetProduct.save();

        return res.status(200).json({
            auth: true
        });


    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


module.exports = router