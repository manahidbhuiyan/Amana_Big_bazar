const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');


const config = require('config')

var isodate = require("isodate");

const {
    generateNextCode
} = require('../../../lib/helpers');

const {
    searchNotificationData
} = require('../notification/search');

const auth = require('../../../middleware/user/auth');
const Cart = require('../../../models/Cart');
const Order = require('../../../models/Order');
const Product = require('../../../models/Product');
const Branch = require('../../../models/Branch');
const CouponCode = require('../../../models/CouponCode');

// @route POST api/cart
// @description Add New Product On Cart
// @access Private
router.post('/', [auth,
    [
        check('branch', 'Branch id is required').not().isEmpty(),
        check('name', 'Delivery name is required').not().isEmpty(),
        check('phone', 'Delivery phone is required').not().isEmpty(),
        check('address', 'Delivery address is required').not().isEmpty(),
        check('division', 'Delivery division is required').not().isEmpty(),
        check('district', 'Delivery district is required').not().isEmpty(),
        check('thana', 'Delivery thana is required').not().isEmpty(),
        check('vat', 'Vat is required').not().isEmpty(),
        check('delivery_datetime', 'Delivery datetime is required').not().isEmpty(),
        check('delivery_charge', 'Delivery charge is required').not().isEmpty()
    ]
], async (req, res) => {
    try {

        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

        const user = await User.findById(req.user.id).select('-password').select('-forgot');

        const detectFirstOrder = await Order.find({
            user: req.user.id
        });

        let branchInfo = await Branch.findById(req.body.branch)

        // See if user exsist
        let cart = await Cart.find({
            user: user.id,
            branch: req.body.branch
        }).populate('product', ['discount'])

        if (cart.length == 0) {
            return res.status(400).json({
                errors: [{
                    msg: "You don't have any produt into the cart"
                }]
            });
        }

        const currentTotalOrders = await Order.countDocuments()
        const nextOrderID = generateNextCode(currentTotalOrders)

        let totalBill = 0;

        let cartArray = cart.map(product => {
            totalBill += ((product.price - product.product.discount) * product.quantity)
            product.discount = product.product.discount
            product.subtotal = parseFloat(((product.price - product.product.discount) * product.quantity).toFixed(2))
        })

        await Promise.all(cartArray)


        let order_discount = 0;
        let first_order_discount = 0
        let flat_order_discount = 0
        let coupon_discount = 0

        if (branchInfo.first_order.activity == true) {
            if (detectFirstOrder.length === 0) {
                branchInfo.first_order.data.map(discountInfo => {
                    if ((totalBill + req.body.vat) >= discountInfo.min_amount) {
                        if(discountInfo.isFlatAmount){
                            first_order_discount = discountInfo.discount
                        }else{
                            first_order_discount = (totalBill + req.body.vat) * (discountInfo.discount/100)
                        }   
                    }
                })
            }
        }

        if (branchInfo.flat_order.activity == true) {
            branchInfo.flat_order.data.map(discountInfo => {
                if ((totalBill + req.body.vat) >= discountInfo.min_amount) {
                    if(discountInfo.isFlatAmount){
                        flat_order_discount = discountInfo.discount
                    }else{
                        flat_order_discount = (totalBill + req.body.vat) * (discountInfo.discount/100)
                    }
                }
            })
        }

        if (flat_order_discount >= first_order_discount) {
            order_discount = flat_order_discount
        } else {
            order_discount = first_order_discount
        }

        let coupon_code = null

        if(req.body.coupon_code){
            let currentDateTime = new Date()
            currentDateTime.setHours(currentDateTime.getHours() - config.get("shopTimeZone").difference.hours)
            currentDateTime.setMinutes (currentDateTime.getMinutes() -  config.get("shopTimeZone").difference.munites);
            currentDateTime.setSeconds (currentDateTime.getSeconds() - config.get("shopTimeZone").difference.second);

            let couponCodeInfo = await CouponCode.findOne({
                code: req.body.coupon_code,
                isActive: true,
                validity_from:{
                    $lte: isodate(currentDateTime)
                },
                validity_to:{
                    $gte: isodate(currentDateTime)
                }
            }) 

            if(!couponCodeInfo){
                return res.status(400).json({
                    errors: [{
                        msg: "Your coupon code is not valid"
                    }]
                }); 
            }

            if(couponCodeInfo.total_order_amount_min > 0){
                if(totalBill < couponCodeInfo.total_order_amount_min){
                    return res.status(400).json({
                        errors: [{
                            msg: `Your coupon code is not valid. your have to purchange minimum ${+totalBill.toFixed(2)} amount.`
                        }]
                    }); 
                }
            }

            if(couponCodeInfo.isAssignedAllUser==false){
                if((couponCodeInfo.users).includes(req.user.id)==false){
                    return res.status(400).json({
                        errors: [{
                            msg: `Entered coupon code is not valid for you.`
                        }]
                    });
                }
            }


            if(couponCodeInfo.max_use_time>0){
                if(couponCodeInfo.use_count<=couponCodeInfo.max_use_time){
                    if((couponCodeInfo.users).includes(req.user.id)==false){
                        return res.status(400).json({
                            errors: [{
                                msg: `Your entered coupon already is maximum limit used`
                            }]
                        });
                    }
                }
            }
            
            let discountCalculation = 0
            if(couponCodeInfo.percentage>0){
               discountCalculation = totalBill * (couponCodeInfo.percentage/100)
               if(couponCodeInfo.max_amount < discountCalculation){
                  discountCalculation = couponCodeInfo.max_amount 
               }     
            }else{
                discountCalculation = couponCodeInfo.max_amount
            }

            coupon_discount = discountCalculation
            order_discount += coupon_discount

            couponCodeInfo.use_count += 1
            couponCodeInfo.used_by.push(req.user.id)

            coupon_code = req.body.coupon_code

            couponCodeInfo.save()
        }

        // if (detectFirstOrder.length === 0) {
        //     //order_discount = (totalBill + req.body.vat) > req.body.order_discount.first_order_min_amount ? req.body.order_discount.first_order_discount : order_discount
        //     // if (req.body.order_discount.flat_order_discount >= order_discount) {
        //     //     order_discount = (totalBill + req.body.vat) > req.body.order_discount.flat_order_min_amount ? req.body.order_discount.flat_order_discount : order_discount
        //     // }
        // } else {
        //     //order_discount = (totalBill + req.body.vat) > req.body.order_discount.flat_order_min_amount ? req.body.order_discount.flat_order_discount : order_discount
        // }

        let contact = {
            name: req.body.name,
            district: req.body.district,
            division: req.body.division,
            thana: req.body.thana,
            address: req.body.address,
            phone: req.body.phone,
            delivery_datetime: req.body.delivery_datetime
        }

        const OrderInformation = new Order({
            orderID: nextOrderID,
            branch: req.body.branch,
            user: user.id,
            products: cart,
            delivery: contact,
            flat_order_discount,
            first_order_discount,
            coupon_code: coupon_code,
            coupon_discount,
            order_phone: user.phone.number,
            order_status: 'Pending',
            payment_method: 'Cash On Delivery',
            sub_total_bill: parseFloat(totalBill.toFixed(2)),
            vat: parseFloat(req.body.vat.toFixed(2)),
            delivery_charge: req.body.delivery_charge,
            discount: order_discount,
            total_bill: parseFloat((totalBill + req.body.vat + req.body.delivery_charge - order_discount).toFixed(2))
        })

        cart.map(async productData=>{
            let productInfo = await Product.findById(productData.product._id)
            productInfo.quantity = productInfo.quantity - productData.quantity
            await productInfo.save()
        })

        await Cart.deleteMany({
            user: user.id,
            branch: req.body.branch
        })

        await OrderInformation.save()

        searchNotificationData(req.body.branch, nextOrderID);

        res.status(200).json({
            order_id: OrderInformation._id,
            success: 'Order placed successfully'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router