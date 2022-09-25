const express = require('express');
const router = express.Router();
const SSLCommerzPayment = require('sslcommerz')
const SSLCommerz = require('sslcommerz-nodejs');

const config = require('config')

const Order = require('../../../models/Order');

const auth = require('../../../middleware/user/auth');
const adminAuth = require('../../../middleware/admin/auth');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');

// @route GET api/order
// @description Get all the orders
// @access Private
router.get('/list/:pageNo', adminAuth, async (req, res) => {
    try {
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'online order')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to order'
                }]
            })
        }

        let dataList = 10
        let offset = (parseInt(req.params.pageNo) - 1) * 10

        let branch = req.query.branch

        let condition = {
            branch
        }

        if (req.query.type !== undefined) {
            let columnName = req.query.type
            let text = req.query.text

            if (columnName == 'order_phone') {
                condition = {
                    [columnName]: {
                        $regex: text,
                        $options: "i"
                    },
                    branch
                }
            } else if (columnName == 'order_status') {
                condition = {
                    [columnName]: {
                        $regex: text,
                        $options: "i"
                    },
                    branch
                }
            } else {
                condition = {
                    [columnName]: parseInt(text),
                    branch
                }
            }

        }

        let order = await Order.find(condition).populate('branch', ['name']).limit(dataList).skip(offset).sort({
            "_id": -1
        })


        res.status(200).json({
            data: order
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.get('/:branchID/notification/list', [adminAuth], async (req, res) => {
    try {
        //Check the role permission from the lib/helpers
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'online order')

        //If role is not permited
        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to get order notification',
                    type: 'error'
                }]
            })
        }

        let branch = req.params.branchID

        let condition = {
            branch
        }

        condition.progress = {
            pending: true,
            processing: false,
            shipping: false,
            delivered: false
        }

        condition.view_status = false

        let notificationOrdersNumber = await Order.find(condition).countDocuments()

        let notificationOrders = await Order.find(condition).limit(5).sort({
            "orderID": -1
        })

        res.status(200).json({
            count: notificationOrdersNumber,
            data: notificationOrders
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.get('/get_order_for_notification', async (req, res) => {

    try {
        let branch = req.query.branch

        let condition = {
            view_status: false,
            branch
        }

        let order = await Order.find(condition).limit(5).sort({
            "orderID": -1
        })

        res.status(200).json({
            data: order
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.get('/view/:id', adminAuth, async (req, res) => {
    try {
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'online order')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to order'
                }]
            })
        }

        let order = await Order.findById(req.params.id).populate('user', ['name', 'phone', 'contact'])
        order.view_status = true
        order.save()

        res.status(200).json({
            data: order
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid brand'
                }]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.get('/user/order-list/:pageNo', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password').select('-forgot');

        let dataList = 10
        let offset = (parseInt(req.params.pageNo) - 1) * 10

        let branch = req.query.branch

        let condition = {
            user: user.id,
            branch
        }

        if (req.query.text !== undefined && req.query.text) {
            let text = req.query.text
            condition = {
                user: user.id,
                orderID: text,
                branch
            }


        }

        // See if user exsist
        let order = await Order.find(condition).limit(dataList).skip(offset).sort({
            orderID: -1
        })

        if (order.length == 0) {
            return res.status(200).json([]);
        }

        res.json(order);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.get('/single/user-order/:id', auth, async (req, res) => {
    try {
        let order = await Order.findOne({
            _id: req.params.id,
            branch: req.query.branch,
            user: req.user.id
        })
        res.status(200).json({
            data: order
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.get('/user/card/payment/:id', auth, async (req, res) => {
    try {
        let order = await Order.findOne({
            _id: req.params.id,
            branch: req.query.branch,
            user: req.user.id
        })

        let settings = {
            isSandboxMode: config.get("sslCommerce").sandbox_mode, //false if live version
            store_id: config.get("sslCommerce").store_id,
            store_passwd: config.get("sslCommerce").store_secrect
        }

        let sslcommerz = new SSLCommerz(settings);
        let post_body = {};
        post_body['total_amount'] = order.total_bill;
        post_body['currency'] = "BDT";
        post_body['tran_id'] = order.orderID;
        post_body['success_url'] = config.get('redirectBack') + '/api/order/success';
        post_body['fail_url'] = config.get('redirectBack') + '/api/order/fail';
        post_body['cancel_url'] = config.get('redirectBack') + '/api/order/cancel';
        post_body['emi_option'] = 0;
        post_body['cus_name'] = order.delivery.name;
        post_body['cus_email'] = 'payment@gmail.com';
        post_body['cus_phone'] = order.delivery.phone;
        post_body['cus_add1'] = order.delivery.address;
        post_body['cus_city'] = order.delivery.city;
        post_body['cus_country'] = "Bangladesh";
        post_body['shipping_method'] = "NO";
        post_body['multi_card_name'] = ""
        post_body['num_of_item'] = 1;
        post_body['product_name'] = 'payment-amana-shop';
        post_body['product_category'] = 'payment';
        post_body['product_profile'] = "general";
        //console.log(post_body)
        sslcommerz.init_transaction(post_body).then(response => {
            res.status(200).json({
                data: response
            });
        }).catch(error => {
            res.status(500).send('Server error');
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});



module.exports = router