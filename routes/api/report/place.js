const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');


const config = require('config')
const nodemailer = require("nodemailer");
var request = require('request');

const {
    generateNextCode
} = require('../../../lib/helpers');

const {
    searchNotificationData
} = require('../notification/search');

const auth = require('../../../middleware/admin/auth');
const Cart = require('../../../models/PosCart');
const OrderForPos = require('../../../models/OrderForPos');
const Admin = require('../../../models/admin/Admin');
const Product = require('../../../models/Product');


const {
    getAdminRoleChecking
} = require('../../../lib/helpers');


// @route POST api/cart
// @description Add New Product On Cart
// @access Private
router.post('/', [auth,
    [
        check('branch', 'Branch id is required').not().isEmpty(),
        check('pointDiscount', 'Point discount is required').not().isEmpty(),
        check('payment', 'Payment method is required').not().isEmpty(),
        check('vat', 'Vat is required').not().isEmpty(),
        check('order_discount', 'Order discount is required').not().isEmpty(),
        check('point_value', 'Point value is required').not().isEmpty(),
        check('used_points', 'Point used is required').not().isEmpty()
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

        // const detectFirstOrder = await OrderForPos.find({
        //     admin: req.admin.id
        // });

        let browserTabID = req.query.tabID

        // See if user exsist
        let cart = await Cart.find({
            admin: user.id,
            branch: req.body.branch,
            browserTabID: browserTabID
        }).populate('product', ['discount'])

        if (cart.length == 0) {
            return res.status(400).json({
                errors: [{
                    msg: "You don't have any produt into the cart"
                }]
            });
        }

        const currentTotalOrders = await OrderForPos.countDocuments()
        const nextOrderID = generateNextCode(currentTotalOrders)

        let totalBill = 0;
        let subTotalBill = 0

        cart.map(async product => {
            totalBill += (product.price * product.quantity)

            try {
                let productInfo = await Product.findById(product.product)

                productInfo.quantity = productInfo.quantity - product.quantity

                if (productInfo.quantity <= 0) {
                    productInfo.quantity = 0
                }

                if (productInfo.quantity < 3) {
                    productInfo.isAvailable = false
                }

                await productInfo.save()
            } catch (error) {
                console.log(error)
            }
            //product.discount = product.product.discount * product.quantity
            //product.subtotal = parseFloat(((product.price - product.discount) * product.quantity).toFixed(2))
        })

        subTotalBill = totalBill
        totalBill = totalBill + Number(req.body.vat.toFixed(2))


        // let order_discount = 0;

        // if (detectFirstOrder.length === 0) {
        //     order_discount = (totalBill + req.body.vat) > req.body.order_discount.first_order_min_amount ? req.body.order_discount.first_order_discount : order_discount
        //     if (req.body.order_discount.flat_order_discount >= order_discount) {
        //         order_discount = (totalBill + req.body.vat) > req.body.order_discount.flat_order_min_amount ? req.body.order_discount.flat_order_discount : order_discount
        //     }
        // } else {
        //     order_discount = (totalBill + req.body.vat) > req.body.order_discount.flat_order_min_amount ? req.body.order_discount.flat_order_discount : order_discount
        // }

        //order_discount = parseFloat(((totalBill + req.body.vat) * (order_discount / 100)).toFixed(2))

        let dueAmount = totalBill - (req.body.order_discount.product + req.body.order_discount.others + req.body.pointDiscount)

        let paidAmount = 0

        req.body.payment.map(payment => {
            paidAmount += payment.amount
        })

        if (!(paidAmount >= dueAmount)) {
            return res.status(400).json({
                errors: [{
                    msg: "Customer not paid the due amount"
                }]
            });
        }


        let contact = {
            name: req.body.name,
            address: req.body.address,
            phone: req.body.phone
        }


        const OrderInformation = new OrderForPos({
            orderID: nextOrderID,
            branch: req.body.branch,
            admin: user.id,
            products: cart,
            customer: contact,
            payment: req.body.payment,
            sub_total_bill: parseFloat(subTotalBill.toFixed(2)),
            vat: parseFloat(req.body.vat.toFixed(2)),
            discount: req.body.order_discount,
            point_value: req.body.point_value,
            used_points: req.body.used_points,
            total_bill: dueAmount
        })

        await Cart.deleteMany({
            admin: user.id,
            branch: req.body.branch,
            browserTabID: browserTabID
        })

        await OrderInformation.save()

        res.status(200).json({
            auth: true,
            order_id: OrderInformation.orderID,
            msg: 'Sell completed successfully'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


const returnProductsInShop = new Promise((orderID, resolve, reject) => {

})

// @route POST api/cart
// @description Add New Product On Cart
// @access Private
router.put('/', [auth,
    [
        check('id', 'Order id is required').not().isEmpty(),
        check('pointDiscount', 'Point discount is required').not().isEmpty(),
        check('orderType', 'Order type is required').not().isEmpty(),
        check('payment', 'Payment method is required').not().isEmpty(),
        check('cart', 'Cart information is required').not().isEmpty(),
        check('vat', 'Vat is required').not().isEmpty(),
        check('order_discount', 'Order discount is required').not().isEmpty()
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

        let OrderInformation = await OrderForPos.findById(req.body.id)

        new Promise((resolve, reject) => {
            OrderInformation.products.forEach(async (product, index) => {
                try {
                    let productInfo = await Product.findById(product.product)

                    productInfo.quantity = productInfo.quantity + product.quantity

                    if (productInfo.quantity <= 0) {
                        productInfo.quantity = 0
                    }

                    if (productInfo.quantity < 3) {
                        productInfo.isAvailable = false
                    }

                    await productInfo.save()

                    if (OrderInformation.products.length == (index + 1)) {
                        resolve()
                    }
                    console.log("Return products")
                } catch (error) {
                    console.log(error)
                }
            })
        }).then(async (result) => {
            // const detectFirstOrder = await OrderForPos.find({
            //     admin: req.admin.id
            // });

            // See if user exsist
            let cart = req.body.cart

            if (cart.length == 0) {
                return res.status(400).json({
                    errors: [{
                        msg: "You don't have any produt into the cart"
                    }]
                });
            }

            let totalBill = 0;
            let subTotalBill = 0

            cart.forEach(async cartProduct => {
                totalBill += ((cartProduct.price) * cartProduct.quantity)

                try {
                    let productInfo = await Product.findById(cartProduct.product)

                    productInfo.quantity = productInfo.quantity - cartProduct.quantity

                    if (productInfo.quantity <= 0) {
                        productInfo.quantity = 0
                    }

                    if (productInfo.quantity < 3) {
                        productInfo.isAvailable = false
                    }

                    await productInfo.save()
                    console.log("Purchase products")
                } catch (error) {
                    console.log(error)
                }
                //product.discount = product.product.discount * product.quantity
                //product.subtotal = parseFloat(((product.price - product.discount) * product.quantity).toFixed(2))
            })

            subTotalBill = totalBill
            totalBill = totalBill + Number(req.body.vat.toFixed(2))




            // let order_discount = 0;

            // if (detectFirstOrder.length === 0) {
            //     order_discount = (totalBill + req.body.vat) > req.body.order_discount.first_order_min_amount ? req.body.order_discount.first_order_discount : order_discount
            //     if (req.body.order_discount.flat_order_discount >= order_discount) {
            //         order_discount = (totalBill + req.body.vat) > req.body.order_discount.flat_order_min_amount ? req.body.order_discount.flat_order_discount : order_discount
            //     }
            // } else {
            //     order_discount = (totalBill + req.body.vat) > req.body.order_discount.flat_order_min_amount ? req.body.order_discount.flat_order_discount : order_discount
            // }

            //order_discount = parseFloat(((totalBill + req.body.vat) * (order_discount / 100)).toFixed(2))

            let dueAmount = totalBill - (req.body.order_discount.product + req.body.order_discount.others + req.body.pointDiscount)


            let paidAmount = 0

            req.body.payment.map(payment => {
                paidAmount += payment.amount
            })

            if (!(paidAmount >= dueAmount)) {
                return res.status(400).json({
                    errors: [{
                        msg: "Customer not paid the due amount"
                    }]
                });
            }



            OrderInformation.admin = user.id
            OrderInformation.orderType = req.body.orderType
            OrderInformation.products = cart
            OrderInformation.payment = req.body.payment
            OrderInformation.sub_total_bill = parseFloat(subTotalBill.toFixed(2))
            OrderInformation.vat = parseFloat(req.body.vat.toFixed(2))
            OrderInformation.discount = req.body.order_discount
            OrderInformation.used_ponits = req.body.used_ponits
            OrderInformation.total_bill = dueAmount

            await OrderInformation.save()

            res.status(200).json({
                auth: true,
                order_id: OrderInformation.orderID,
                msg: 'Order updated successfully'
            });
        })

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router