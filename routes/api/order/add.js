const express = require('express');
const config = require('config')
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const {
    generateNextCode
} = require('../../../lib/helpers');

const auth = require('../../../middleware/user/auth');
const Cart = require('../../../models/Cart');
const Order = require('../../../models/Order');

// @route POST api/cart
// @description Add New Product On Cart
// @access Private
router.post('/success', async (req, res) => {
    try {
        if (req.body.store_id === config.get("sslCommerce").store_id && req.body.verify_sign !== '') {
            let order = await Order.findOne({
                orderID: req.body.tran_id
            })
            order.payment_status = true
            order.payment_method = 'Card'
            order.paid_amount = order.total_bill
            await order.save()
            let success_link = config.get('redirectBack') + '/#/customer/order/payment/' + order._id
            return res.redirect(success_link);
        } else {
            res.status(401).json({
                message: 'hacker not allowede here :)'
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.post('/fail', async (req, res) => {
    try {
        let order = await Order.findOne({
            orderID: req.body.tran_id
        })
        let fail_link = config.get('redirectBack') + '/#/customer/order/payment/' + order._id
        return res.redirect(fail_link);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.post('/cancel', async (req, res) => {
    try {
        let order = await Order.findOne({
            orderID: req.body.tran_id
        })
        let cancel_link = config.get('redirectBack') + '/#/customer/order/payment/' + order._id
        return res.redirect(cancel_link);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.post('/cancel_reason', [auth], async (req, res) => {
    try {
        let order = await Order.findById(req.body.id)
        order.cancel_reason = req.body.reason
        await order.save()

        res.status(200).json({
            success: true
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.post('/order_instraction', [auth], async (req, res) => {
    try {
        let order = await Order.findById(req.body.id)
        var row = {
            text: req.body.text,
            status: false
        }
        order.order_instractions.push(row);
        await order.save()

        res.status(200).json({
            success: true
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router