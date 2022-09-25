const express = require('express');
const router = express.Router();

const config = require('config');

const isodate = require('isodate')

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../middleware/admin/auth');
const userAuth = require('../../../middleware/user/auth');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');
const CouponCode = require('../../../models/CouponCode');
const User = require('../../../models/User');

// @route GET api/product
// @description Get all the products
// @access Private
router.get('/list/:pageNo', [auth], async (req, res) => {
    try {
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'coupon code')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to coupon code'
                }]
            })
        }

        let dataList = 30
        let offset = (parseInt(req.params.pageNo) - 1) * dataList

        let condition = {}

        if (req.query.type !== undefined) {
            let columnName = req.query.type
            let text = req.query.text

            if (columnName == "percentage" || columnName == "max_amount" || columnName == "total_order_amount_min" || columnName== "max_use_time") {
                condition = {
                    [columnName]: Number(text)
                }
            } else {
                condition = {
                    [columnName]: {
                        $regex: text,
                        $options: "i"
                    }
                }
            }
        }

        let couponCodeList = await CouponCode.find(condition).limit(dataList).skip(offset).sort({
            "_id": -1
        })

        let totalCouponNumber = await CouponCode.find(condition).countDocuments();

        res.status(200).json({
            data: couponCodeList,
            count: totalCouponNumber
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/product/:productID
// @description Get single product
// @access Private
router.get('/single/:couponCodeID', [auth], async (req, res) => {
    try {
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'coupon code')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to coupon code'
                }]
            })
        }
        
        let couponCodeInfo = await CouponCode.findById(req.params.couponCodeID)

        couponCodeInfo.validity_from.setHours(couponCodeInfo.validity_from.getHours() + config.get("shopTimeZone").difference.hours)
        couponCodeInfo.validity_from.setMinutes (couponCodeInfo.validity_from.getMinutes() +  config.get("shopTimeZone").difference.munites);
        couponCodeInfo.validity_from.setSeconds (couponCodeInfo.validity_from.getSeconds() + config.get("shopTimeZone").difference.second);

        couponCodeInfo.validity_to.setHours(couponCodeInfo.validity_to.getHours() + config.get("shopTimeZone").difference.hours)
        couponCodeInfo.validity_to.setMinutes (couponCodeInfo.validity_to.getMinutes() +  config.get("shopTimeZone").difference.munites);
        couponCodeInfo.validity_to.setSeconds (couponCodeInfo.validity_to.getSeconds() + config.get("shopTimeZone").difference.second);

        res.status(200).json({
            data: couponCodeInfo
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

// @route GET api/product/:productID
// @description Get single product
// @access Private
router.post('/single/:couponCodeID/apply', [userAuth], async (req, res) => {
    try {
        let currentDateTime = new Date()

        currentDateTime.setHours(currentDateTime.getHours() - config.get("shopTimeZone").difference.hours)
        currentDateTime.setMinutes (currentDateTime.getMinutes() -  config.get("shopTimeZone").difference.munites);
        currentDateTime.setSeconds (currentDateTime.getSeconds() - config.get("shopTimeZone").difference.second);

            let couponCodeInfo = await CouponCode.findOne({
                code: req.params.couponCodeID,
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
                if(Number(req.body.total_bill) <= couponCodeInfo.total_order_amount_min){
                    return res.status(400).json({
                        errors: [{
                            msg: `Your coupon code is not valid. your have to purchange minimum ${Number(couponCodeInfo.total_order_amount_min).toFixed(2)} amount.`
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
               discountCalculation = Number(req.body.total_bill) * (couponCodeInfo.percentage/100)
               if(couponCodeInfo.max_amount < discountCalculation){
                  discountCalculation = couponCodeInfo.max_amount 
               }     
            }else{
                discountCalculation = couponCodeInfo.max_amount
            }


        res.status(200).json({
            data: discountCalculation
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

// @route GET api/product/:productID
// @description Get single product
// @access Private
router.get('/phone', [auth], async (req, res) => {
    try {
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'coupon code')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to coupon code'
                }]
            })
        }
        let userIDs = req.query.userIds
        let userIDsArray = userIDs.split(',');

        let phone = []

        userIDsArray.map(async (userId) => {
            let users = await User.find({ _id: userId })

            phone.push(users[0].phone.number)

            if (phone.length >= userIDsArray.length) {
                res.status(200).json({                   
                    data: phone
                })
            }        
        })
    }catch (err) {
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


// @route GET api/product/:productID
// @description Get single product
// @access Private
router.get('/user/:phone', [auth], async (req, res) => {
    try {
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'coupon code')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to coupon code'
                }]
            })
        }

        let number = req.params.phone

        let user = await User.find({ "phone.number": number})

        if (user.length == 0) {
            return res.status(400).send({
                errors: [{
                    msg: 'User not found for ' + number + ', please provide a valid phone number'
                }]
            })
        } else {
            res.status(200).json({                  
                data: user
            })
        }

    }catch (err) {
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

module.exports = router