const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../middleware/admin/auth');
const Order = require('../../../models/Order');

// @route PUT api/order/:orderID/product/remove
// @description Remove product from order
// @access Private
router.put('/:orderID/product/remove', [auth,
    [
        check('code', 'Product code is required').not().isEmpty()
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    try {
        const admin = await Admin.findById(req.admin.id).select('-password').select('-forgot');
        let order = await Order.findOne({
            orderID: Number(req.params.orderID)
        })

        const code = req.body.code

        const removeIndex = order.products.map(product => product.code).indexOf(code)

        if (removeIndex < 0) {
            return res.status(400).send({
                errors: [{
                    msg: 'Product code is not valid'
                }]
            })
        }

        order.products.splice(removeIndex, 1)

        order.products.map(product => {
            if (product.code == code) {
                product = orderProductUpdate
            }
        })

        let totalBill = 0;

        order.products.map(product => {
            totalBill += ((product.price - product.discount) * product.quantity)
        })

        order.total_bill = parseFloat(totalBill.toFixed(2))

        await order.save()
        res.status(200).json(order);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


// @route DELETE api/order/:orderID
// @description Remove order
// @access Private
router.delete('/:orderID', [auth], async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.id).select('-password').select('-forgot');
        let order = await Order.findOne({
            orderID: Number(req.params.orderID)
        })

        await order.remove()
        res.status(200).json({
            msg: 'Order is removed successfully'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


module.exports = router