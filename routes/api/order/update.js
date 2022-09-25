const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../middleware/admin/auth');
const Order = require('../../../models/Order');
const Product = require('../../../models/Product');
const {
    request
} = require('express');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');


// @route PUT api/order/status_update
// @description Order status update
// @access Private
router.put('/status_update', [auth,
    [
        check('id', 'Order id is required').not().isEmpty(),
        check('status', 'Order Status is required').not().isEmpty()
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    const adminRoles = await getAdminRoleChecking(req.admin.id, 'online order')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to order'
                }]
            })
        }

    try {
        let status = req.body.status

        let order = await Order.findById(req.body.id)
        order.order_status = status

        if (status === 'processing') {
            order.progress = {
                pending: true,
                processing: true,
                shipping: false,
                delivered: false
            }
        } else if (status === 'shipping') {
            order.progress = {
                pending: true,
                processing: true,
                shipping: true,
                delivered: false
            }
        } else if (status === 'delivered') {
            order.progress = {
                pending: true,
                processing: true,
                shipping: true,
                delivered: true
            }

            order.paid_amount = order.total_bill
            order.payment_status = true
        } else {
            order.progress = {
                pending: false,
                processing: false,
                shipping: false,
                delivered: false
            }

            order.payment_status = false
            order.cancel_reason = req.body.cancel_reason

            order.products.map(async productData=>{
                let productInfo = await Product.findById(productData.code)
                productInfo.quantity = productInfo.quantity + product.quantity
                await productInfo.save()
            })
        }

        order.admin = req.admin.id

        await order.save()
        res.status(200).json({
            data: order
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route PUT api/order/order_update
// @description Order product update
// @access Private
router.put('/order_update', [auth,
    [
        check('id', 'Order id is required').not().isEmpty(),
        check('code', 'Order Product is required').not().isEmpty()
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    const adminRoles = await getAdminRoleChecking(req.admin.id, 'online order')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to order'
                }]
            })
        }

    try {
        let order = await Order.findById(req.body.id)
        if (order) {
            if (req.body.type === 'update') {
                order.products.map(async product => {
                    if (product.code == req.body.code) {
                        if (req.body.operation === 'quantity') {
                            
                            let productInfo = await Product.findById(req.body.code)
                            productInfo.quantity = productInfo.quantity - product.quantity + req.body.value
                            await productInfo.save()

                            product.quantity = req.body.value
                        }

                        if (req.body.operation === 'price') {
                            product.price = req.body.value
                        }
                    }
                })

                if (req.body.operation === 'delivery_charge') {
                    order.delivery_charge = req.body.value
                }
            } else if (req.body.type === 'delete') {
                const removeIndex = order.products.map(product => product.code).indexOf(req.body.code)
                order.products.splice(removeIndex, 1)
                let productInfo = await Product.findById(req.body.code)
                productInfo.quantity = productInfo.quantity + product.quantity
                await productInfo.save()
            }


            let totalBill = 0;
            var vat = 0;
            order.products.map(product => {
                let vat_data = (product.vat == undefined ? 0 : product.vat);

                product.subtotal = (product.price - product.discount) * product.quantity
                totalBill += ((product.price - product.discount) * product.quantity)
                vat += (((product.price - product.discount) * product.quantity) * vat_data) / 100
            })
            order.sub_total_bill = totalBill
            order.vat = vat
            order.total_bill = parseFloat((totalBill + vat + order.delivery_charge).toFixed(2))
            await order.save()
        }

        order.admin = req.admin.id

        res.status(200).json({
            data: order
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


// @route PUT api/order/:orderID/add
// @description Increase Order Product Quantity
// @access Private
router.put('/:orderID/add', [auth,
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

    const adminRoles = await getAdminRoleChecking(req.admin.id, 'online order')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to order'
                }]
            })
        }

    try {
        const admin = await Admin.findById(req.admin.id).select('-password').select('-forgot');

        let order = await Order.findOne({
            orderID: Number(req.params.orderID)
        })

        const code = req.body.code

        const orderProductUpdate = order.products.find(product => product.code == code)

        if (orderProductUpdate) {
            orderProductUpdate.quantity += 1
            orderProductUpdate.subtotal = (orderProductUpdate.quantity * orderProductUpdate.price)
        } else {
            return res.status(400).send({
                errors: [{
                    msg: 'Product code is not valid'
                }]
            })
        }

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

        order.admin = req.admin.id

        await order.save()
        res.status(200).json(order);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


// @route PUT api/order/:orderID/remove
// @description Decrease Order Product Quantity
// @access Private
router.put('/:orderID/remove', [auth,
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

    const adminRoles = await getAdminRoleChecking(req.admin.id, 'online order')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to order'
                }]
            })
        }

    try {
        const admin = await Admin.findById(req.admin.id).select('-password').select('-forgot');
        let order = await Order.findOne({
            orderID: Number(req.params.orderID)
        })

        const code = req.body.code

        const orderProductUpdate = order.products.find(product => product.code == code)

        if (orderProductUpdate) {
            orderProductUpdate.quantity -= 1
            orderProductUpdate.subtotal = (orderProductUpdate.quantity * orderProductUpdate.price)
        } else {
            return res.status(400).send({
                errors: [{
                    msg: 'Product code is not valid'
                }]
            })
        }

        order.products.map(product => {
            if (product.code == code) {
                product = orderProductUpdate
            }
        })

        let totalBill = 0;

        order.products.map(product => {
            totalBill += ((product.price - product.discount) * product.quantity)
        })

        order.total_bill = totalBill
        
        order.admin = req.admin.id

        await order.save()
        res.status(200).json(order);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route PUT api/order/:orderID/discount
// @description Update order discount
// @access Private
router.put('/:orderID/discount', [auth,
    [
        check('discount', 'Order Discount is required').not().isEmpty()
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    const adminRoles = await getAdminRoleChecking(req.admin.id, 'online order')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to order'
                }]
            })
        }

    try {
        const admin = await Admin.findById(req.admin.id).select('-password').select('-forgot');
        let order = await Order.findOne({
            orderID: Number(req.params.orderID)
        })

        const discount = req.body.discount

        order.discount = discount
        order.total_bill = (order.total_bill - order.discount)

        order.admin = req.admin.id

        await order.save()
        res.status(200).json(order);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route PUT api/order/:orderID/payment/status
// @description Order Payment status
// @access Private
router.put('/:orderID/payment/status', [auth,
    [
        check('payment_status', 'payment status is required').not().isEmpty()
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    const adminRoles = await getAdminRoleChecking(req.admin.id, 'online order')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to order'
                }]
            })
        }

    try {
        const admin = await Admin.findById(req.admin.id).select('-password').select('-forgot');
        let order = await Order.findOne({
            orderID: Number(req.params.orderID)
        })

        const {
            payment_status
        } = req.body

        order.payment_status = payment_status

        order.admin = req.admin.id

        await order.save()
        res.status(200).json(order);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router