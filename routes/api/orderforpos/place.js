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
const Branch = require('../../../models/Branch');
const OrderForPos = require('../../../models/OrderForPos');
const OrderRefund = require('../../../models/PosOrderRefund');
const OrderExchange = require('../../../models/PosOrderExchange');
const Admin = require('../../../models/admin/Admin');
const Product = require('../../../models/Product');


const {
    getAdminRoleChecking
} = require('../../../lib/helpers');


let from = new Date()
from.setHours(0)
from.setMinutes (0);
from.setSeconds (0);
            
let to = new Date()
to.setHours(23)
to.setMinutes (59);
to.setSeconds (59);

// @route POST api/order
// @description Create Order
// @access Private
router.post('/', [auth,
    [
        check('branch', 'Branch id is required').not().isEmpty(),
        check('payment', 'Payment method is required').not().isEmpty(),
        check('vat', 'Vat is required').not().isEmpty(),
        check('order_discount', 'Order discount is required').not().isEmpty(),
        check('point_value', 'Point value is required').not().isEmpty(),
        check('used_points', 'Point used is required').not().isEmpty(),
        check('fractionalDiscount', 'Point used is required').not().isEmpty()
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

        let quantityCheckFlag = null

        for(let i=0; i < cart.length; i++){
            try {
                let productInfo = await Product.findById(cart[i].product)

                if(cart[i].is_second_price==true){
                    if(productInfo.second_price.quantity < cart[i].quantity){
                        quantityCheckFlag = productInfo.barcode
                        break;
                    }
                }else{
                    if(productInfo.quantity < cart[i].quantity){
                        quantityCheckFlag = productInfo.barcode
                        break;
                    }
                }
            } catch (error) {
                console.log(error)
            }
        }

        if(quantityCheckFlag != null) {
            return res.status(400).json({
                errors: [{
                    msg: quantityCheckFlag + " this product dont't have enough stock to sell please make receiving the product"
                }]
            });
        }

        const branchInfo = await Branch.findById(req.body.branch).select('serialNo')

        const currentTotalOrders = await OrderForPos.findOne({branch:req.body.branch}).countDocuments()
        const nextOrderID = String(branchInfo.serialNo) + generateNextCode(currentTotalOrders)

        let totalBill = 0;
        let subTotalBill = 0

        let cartProductPaymentLoop = cart.map(async product => {
            totalBill += (product.price * product.quantity)
        })

        await Promise.all(cartProductPaymentLoop)

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

        let dueAmount = totalBill - (req.body.order_discount.product + req.body.order_discount.others)

        let paidAmount = 0

        let cashIndex = null

        req.body.payment.map((payment,index) => {
            if(payment.method=="cash"){
                cashIndex = index
            }
            paidAmount += payment.amount
        })

        paidAmount = Number(paidAmount.toFixed(2))
        dueAmount = Number(dueAmount.toFixed(2))

        if (!(paidAmount >= dueAmount)) {
            return res.status(400).json({
                errors: [{
                    msg: "Customer not paid the due amount"
                }]
            });
        }

        if(cashIndex!=null){
            req.body.payment[cashIndex].amount -= (paidAmount-dueAmount)
        }

        let orderInfoData = {
            orderID: nextOrderID,
            branch: req.body.branch,
            admin: user.id,
            products: cart,
            customer: req.body.customer,
            payment: req.body.payment,
            sub_total_bill: parseFloat(subTotalBill.toFixed(2)),
            vat: parseFloat(req.body.vat.toFixed(2)),
            discount: req.body.order_discount,
            point_value: req.body.point_value,
            used_points: req.body.used_points,
            total_bill: dueAmount,
            earned_point: req.body.earned_point,
            fractionalDiscount: req.body.fractionalDiscount,
            orderDiscount: req.body.orderDiscount,
            paymentDiscountAmount: req.body.paymentDiscountAmount,
            specialDiscountAmount: req.body.specialDiscountAmount,
        }

        if(req.body.salesPerson){
            orderInfoData.salesPerson = req.body.salesPerson
        }

        if(req.body.special_discount_info){
            orderInfoData.special_discount_info = req.body.special_discount_info
        }

        if(req.body.nbrDeviceInfo){
            orderInfoData.nbrDeviceInfo = req.body.nbrDeviceInfo
        }
        
        if(req.body.discountPerson){
            orderInfoData.discountPerson = req.body.discountPerson
            orderInfoData.personalDiscountPercentage = req.body.personalDiscountPercentage
            orderInfoData.personalDiscountAmount = req.body.personalDiscountAmount
        }

        if(req.body.create){
            orderInfoData.create = new Date(req.body.create) 
        }

        const OrderInformation = new OrderForPos(orderInfoData)

        let cartProductAdjustLoop = cart.map(async product => {
            try {
                let productInfo = await Product.findById(product.product)

                if(product.is_second_price==true){
                    productInfo.second_price.quantity = productInfo.second_price.quantity - product.quantity
                }else{
                    productInfo.quantity = productInfo.quantity - product.quantity
                }

                let productInfoStockUpdate = await Product.findOne({
                    _id: product.product,
                    "daily_sell.date": {
                        $gte: from,
                        $lte: to 
                    }
                })

                if(!productInfoStockUpdate){
                    productInfo.daily_sell.push({
                        sell: product.quantity,
                        exchange: 0,
                        refund: 0
                    })
                }else{
                    productInfo.daily_sell[productInfo.daily_sell.length - 1].sell += product.quantity
                }

                // if (productInfo.quantity <= 0) {
                //     productInfo.quantity = 0
                // }

                if (productInfo.quantity < 1) {
                    productInfo.isAvailable = false
                }

                if(productInfo.quantity == 0 && productInfo.second_price.quantity > 0){
                    productInfo.quantity += productInfo.second_price.quantity
                    productInfo.price = {
                        purchase: productInfo.second_price.purchase,
                        sell: productInfo.second_price.sell
                    }

                    productInfo.second_price = {
                        quantity: 0,
                        sell: 0,
                        purchase: 0
                    }
                }

                await productInfo.save()
            } catch (error) {
                console.log(error)
            }
        })

        await Promise.all(cartProductAdjustLoop)

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

// @route PUT api/order
// @description Updated Order
// @access Private
router.put('/', [auth,
    [
        check('id', 'Order id is required').not().isEmpty(),
        check('cart', 'Cart product is required').not().isEmpty(),
        check('dueAmount', 'Due amount is required').not().isEmpty(),
        check('payment', 'Payment method is required').not().isEmpty(),
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

        let paidAmount = 0

        let cashIndex = null

        req.body.payment.map((payment,index) => {
            if(payment.method=="cash"){
                cashIndex = index
            }
            paidAmount += payment.amount
        })

        paidAmount = Number(paidAmount.toFixed(2))
        dueAmount = Number(req.body.dueAmount).toFixed(2)

        if (!(paidAmount >= dueAmount)) {
            return res.status(400).json({
                errors: [{
                    msg: "Payment is not adjusted to due amount."
                }]
            });
        }

        if(cashIndex!=null){
            req.body.payment[cashIndex].amount -= (paidAmount-dueAmount)
        }

        let OrderInformation = await OrderForPos.findById(req.body.id)

        if(req.body.customer){
            OrderInformation.customer = req.body.customer 
            OrderInformation.earned_point = req.body.earned_point 
        }

        OrderInformation.admin = user.id
        OrderInformation.payment = req.body.payment
        OrderInformation.discount = req.body.discount
        OrderInformation.total_bill = req.body.dueAmount
        OrderInformation.paymentDiscountAmount = req.body.paymentDiscountAmount
        OrderInformation.update = Date.now()

        await OrderInformation.save()

        res.status(200).json({
            auth: true,
            order_id: OrderInformation.orderID,
            msg: 'Order updated successfully'
        });
        

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


// @route POST api/order/refund
// @description Refund Product from order
// @access Private
router.post('/refund', [auth,
    [
        check('id', 'Order id is required').not().isEmpty(),
        check('branch', 'Branch id is required').not().isEmpty(),
        check('vat', 'Vat is required').not().isEmpty(),
        check('cart', 'Cart product is required').not().isEmpty(),
        check('order_discount', 'Order discount is required').not().isEmpty(),
        check('refundedProducts', 'Refunded product is required').not().isEmpty(),
        check('earned_point', 'Point value is required').not().isEmpty()
    ]
], async (req, res) => {
    try {

        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

        if(req.body.orderType != 'refund'){
            if(req.body.last_order_total > req.body.dueAmount){
                return res.status(400).json({
                    errors: [{
                        msg: "You need to take same amount product or more"
                    }]
                });
            }
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


        let subTotalBill = 0

        req.body.cart.map(product=>{
            subTotalBill += (product.price * product.quantity)
        });

        const branchInfo = await Branch.findById(req.body.branch).select('serialNo')

        const currentTotalOrdersRefunds = await OrderRefund.findOne({branch:req.body.branch}).countDocuments()
        const nextOrderRefundID = String(branchInfo.serialNo) + generateNextCode(currentTotalOrdersRefunds)


        let refundDetails = {
            serialNo: nextOrderRefundID,
            branch: req.body.branch,
            admin: user.id,
            products: req.body.cart,
            sub_total_bill: parseFloat(subTotalBill.toFixed(2)),
            vat: parseFloat(req.body.vat.toFixed(2)),
            discount: req.body.order_discount,
            used_points: req.body.used_points,
            total_bill: req.body.dueAmount,
            slip_point_removed: req.body.earned_point
        }

        if(req.body.customer){
            refundDetails.customer = req.body.customer
        }

        if(req.body.nbrDeviceInfo){
            refundDetails.nbrDeviceInfo = req.body.nbrDeviceInfo
        }

        if(req.body.type == 'refund-of-exchange'){
            refundDetails.posExchange = req.body.id
        }

        if(req.body.type == 'refund'){
            refundDetails.posOrder = req.body.id
        }

        const OrderRefundInformation = new OrderRefund(refundDetails)

        await OrderRefundInformation.save()

        
        if(req.body.type == 'refund-of-exchange'){
            let OrderInformation = await OrderExchange.findById(req.body.id)

            if(!OrderInformation.updateType.includes('refund')){
                OrderInformation.updateType.push('refund')
            } 
    
            OrderInformation.refundedProducts = req.body.refundedProducts
    
            await OrderInformation.save()
        }

        if(req.body.type == 'refund'){
            let OrderInformation = await OrderForPos.findById(req.body.id)

            if(!OrderInformation.updateType.includes('refund')){
                OrderInformation.updateType.push('refund')
            } 
    
            OrderInformation.refundedProducts = req.body.refundedProducts
    
            await OrderInformation.save()
        }

        let cartProductAdjustLoop = req.body.cart.map(async product=>{
            let productInfo = await Product.findById(product.product)
            
            productInfo.quantity = productInfo.quantity + product.quantity

            let productInfoStockUpdate = await Product.findOne({
                _id: product.product,
                "daily_sell.date": {
                    $gte: from,
                    $lte: to 
                }
            })

            if(!productInfoStockUpdate){
                productInfo.daily_sell.push({
                    sell: 0,
                    exchange: 0,
                    refund: product.quantity
                })
            }else{
                productInfo.daily_sell[productInfo.daily_sell.length - 1].refund += product.quantity
            }

            if (productInfo.quantity <= 0) {
                productInfo.quantity = 0
            }

            if (productInfo.quantity < 3) {
                productInfo.isAvailable = false
            }
            await productInfo.save()
        })

        await Promise.all(cartProductAdjustLoop)

        res.status(200).json({
            auth: true,
            serialNo: OrderRefundInformation.serialNo,
            msg: 'Refund completed successfully'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});


// @route POST api/cart
// @description Add New Product On Cart
// @access Private
router.post('/exchange', [auth,
    [
        check('id', 'Order id is required').not().isEmpty(),
        check('base_order_id', 'base order id is required').not().isEmpty(),
        check('type', 'exchange type is required').not().isEmpty(),
        check('branch', 'Branch id is required').not().isEmpty(),
        check('vat', 'Vat is required').not().isEmpty(),
        check('cart', 'Cart product is required').not().isEmpty(),
        check('order_discount', 'Order discount is required').not().isEmpty(),
        check('exchange_amount', 'Exchange amount is required').not().isEmpty(),
        check('exchangedProducts', 'Exchange product is required').not().isEmpty(),
        check('payment', 'Payment is required').not().isEmpty(),
        check('earned_point', 'Point value is required').not().isEmpty(),
        check('fractionalDiscount', 'Point used is required').not().isEmpty()
    ]
], async (req, res) => {
    try {

        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

        if(req.body.exchange_amount > req.body.dueAmount){
            return res.status(400).json({
                errors: [{
                    msg: "You need to take same amount product or more"
                }]
            });
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

        let quantityCheckFlag = null
        let exchangedToProductList = req.body.cart 

        for(let i=0; i < exchangedToProductList.length; i++){
            try {
                let productInfo = await Product.findById(exchangedToProductList[i].product)

                if(cart[i].is_second_price==true){
                    if(productInfo.second_price.quantity < cart[i].quantity){
                        quantityCheckFlag = productInfo.barcode
                        break;
                    }
                }else{
                    if(productInfo.quantity < cart[i].quantity){
                        quantityCheckFlag = productInfo.barcode
                        break;
                    }
                }
            } catch (error) {
                console.log(error)
            }
        }

        if(quantityCheckFlag != null) {
            return res.status(400).json({
                errors: [{
                    msg: quantityCheckFlag + " this product dont't have enough stock to sell please make receiving the product"
                }]
            });
        }

        let paidAmount = 0

        let cashIndex = null

        req.body.payment.map((payment,index) => {
            if(payment.method=="cash"){
                cashIndex = index
            }
            paidAmount += payment.amount
        })

        paidAmount = Number(paidAmount.toFixed(2))
        dueAmount = Number((req.body.dueAmount-req.body.exchange_amount).toFixed(2))

        if (!(paidAmount >= dueAmount)) {
            return res.status(400).json({
                errors: [{
                    msg: "Customer not paid the due amount"
                }]
            });
        }

        if(cashIndex!=null){
            req.body.payment[cashIndex].amount -= (paidAmount-dueAmount)
        }



        let subTotalBill = 0

        req.body.cart.map(product=>{
            subTotalBill += (product.price * product.quantity)
        });

        const branchInfo = await Branch.findById(req.body.branch).select('serialNo')

        const currentTotalOrdersExchange = await OrderExchange.findOne({branch:req.body.branch}).countDocuments()
        const nextOrderExchangeID = String(branchInfo.serialNo) + generateNextCode(currentTotalOrdersExchange)

        let orderDetails = {
            serialNo: nextOrderExchangeID,
            branch: req.body.branch,
            baseOrderDetails: req.body.base_order_id,
            admin: user.id,
            products: req.body.cart,
            sub_total_bill: parseFloat(subTotalBill.toFixed(2)),
            vat: parseFloat(req.body.vat.toFixed(2)),
            payment: req.body.payment,
            discount: req.body.order_discount,
            used_points: req.body.used_points,
            total_bill: req.body.dueAmount,
            slip_point: req.body.slip_point,
            exchange_amount: req.body.exchange_amount,
            exchangedBy: req.body.exchangedBy,
            fractionalDiscount: req.body.fractionalDiscount,
            orderDiscount: req.body.orderDiscount,
            paymentDiscountAmount: req.body.paymentDiscountAmount,
            specialDiscountAmount: req.body.specialDiscountAmount,
        }

        if(req.body.customer){
            orderDetails.customer = req.body.customer
        }

        if(req.body.special_discount_info){
            orderDetails.special_discount_info = req.body.special_discount_info
        }

        if(req.body.discountPerson){
            orderDetails.discountPerson = req.body.discountPerson
            orderDetails.personalDiscountPercentage = req.body.personalDiscountPercentage
            orderDetails.personalDiscountAmount = req.body.personalDiscountAmount
        }

        if(req.body.nbrDeviceInfo){
            orderDetails.nbrDeviceInfo = req.body.nbrDeviceInfo
        }

        if(req.body.type == 'exchange-of-exchange'){
            orderDetails.posExchange = req.body.id
        }

        if(req.body.type == 'exchange'){
            orderDetails.posOrder = req.body.id
        }

        const OrderExchangeInformation = new OrderExchange(orderDetails)

        await OrderExchangeInformation.save()

        if(req.body.type == 'exchange-of-exchange'){
            let OrderInformation = await OrderExchange.findById(req.body.id)

            if(!OrderInformation.updateType.includes('exchange')){
                OrderInformation.updateType.push('exchange')
            } 

            OrderInformation.exchangedProducts = req.body.exchangedProducts

            await OrderInformation.save()
        }

        if(req.body.type == 'exchange'){
            let OrderInformation = await OrderForPos.findById(req.body.id)

            if(!OrderInformation.updateType.includes('exchange')){
                OrderInformation.updateType.push('exchange')
            } 

            OrderInformation.exchangedProducts = req.body.exchangedProducts

            await OrderInformation.save()
        }

        let exchangedProductLoop = req.body.exchangedBy.map(async product=>{
            let productInfo = await Product.findById(product.product)

            productInfo.quantity = productInfo.quantity + product.quantity

            let productInfoStockUpdate = await Product.findOne({
                _id: product.product,
                "daily_sell.date": {
                    $gte: from,
                    $lte: to 
                }
            })

            if(!productInfoStockUpdate){
                productInfo.daily_sell.push({
                    sell: 0,
                    exchange: product.quantity,
                    refund: 0
                })
            }else{
                productInfo.daily_sell[productInfo.daily_sell.length - 1].exchange += product.quantity
            }

            if (productInfo.quantity <= 0) {
                productInfo.quantity = 0
            }

            if (productInfo.quantity < 3) {
                productInfo.isAvailable = false
            }

            await productInfo.save()
        })

        await Promise.all(exchangedProductLoop)

        let cartProductAdjustLoop = req.body.cart.map(async product=>{
            let productInfo = await Product.findById(product.product)

            productInfo.quantity = productInfo.quantity - product.quantity

            let productInfoStockUpdate = await Product.findOne({
                _id: product.product,
                "daily_sell.date": {
                    $gte: from,
                    $lte: to 
                }
            })

            if(!productInfoStockUpdate){
                productInfo.daily_sell.push({
                    sell: product.quantity,
                    exchange: 0,
                    refund: 0
                })
            }else{
                productInfo.daily_sell[productInfo.daily_sell.length - 1].sell += product.quantity
            }

            if (productInfo.quantity <= 0) {
                productInfo.quantity = 0
            }

            if (productInfo.quantity < 3) {
                productInfo.isAvailable = false
            }

            if(productInfo.quantity == 0 && productInfo.second_price.quantity > 0){
                productInfo.quantity += productInfo.second_price.quantity
                productInfo.price = {
                    purchase: productInfo.second_price.purchase,
                    sell: productInfo.second_price.sell
                }

                productInfo.second_price = {
                    quantity: 0,
                    sell: 0,
                    purchase: 0
                }
            }

            await productInfo.save()
        })

        await Promise.all(cartProductAdjustLoop)

        res.status(200).json({
            auth: true,
            serialNo: OrderExchangeInformation.serialNo,
            msg: 'Exchange completed successfully'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route POST api/cart
// @description Add New Product On Cart
// @access Private
router.put('/exchanges/update', [auth,
    [
        check('id', 'Order id is required').not().isEmpty(),
        check('cart', 'Cart product is required').not().isEmpty(),
        check('dueAmount', 'Due amount is required').not().isEmpty(),
        check('payment', 'Payment method is required').not().isEmpty()
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
        let paidAmount = 0

        let cashIndex = null

        req.body.payment.map((payment,index) => {
            if(payment.method=="cash"){
                cashIndex = index
            }
            paidAmount += payment.amount
        })

        paidAmount = Number(paidAmount.toFixed(2))
        dueAmount = Number(req.body.dueAmount - req.body.exchangeAmount).toFixed(2)

        if (!(paidAmount >= dueAmount)) {
            return res.status(400).json({
                errors: [{
                    msg: "Payment is not adjusted to due amount."
                }]
            });
        }

        if(cashIndex!=null){
            req.body.payment[cashIndex].amount -= (paidAmount-dueAmount)
        }

        let OrderInformation = await OrderExchange.findById(req.body.id)

        if(req.body.customer){
            OrderInformation.customer = req.body.customer 
            OrderInformation.slip_point = req.body.slip_point 
        }

        OrderInformation.admin = user.id
        OrderInformation.payment = req.body.payment
        OrderInformation.discount = req.body.discount
        OrderInformation.total_bill = req.body.dueAmount
        OrderInformation.paymentDiscountAmount = req.body.paymentDiscountAmount
        OrderInformation.update = Date.now()

        await OrderInformation.save()

        res.status(200).json({
            auth: true,
            order_id: OrderInformation.orderID,
            msg: 'Exchange updated successfully'
        });
        

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router