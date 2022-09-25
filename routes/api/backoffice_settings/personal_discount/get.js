const express = require('express');
const router = express.Router();

const auth = require('../../../../middleware/admin/auth');
const PersonalDiscount = require('../../../../models/PersonalDiscount');
const Admin = require('../../../../models/admin/Admin');

const {
    getAdminRoleChecking
} = require('../../../../lib/helpers');


// @route GET api/product
// @description Get all the products
// @access Private
router.get('/list/:pageNo', auth, async (req, res) => {
    try {
        const user = await Admin.findById(req.admin.id).select('-password').select('-forgot');

        if (!user) {
            return res.status(400).send({
                errors: [{
                    msg: 'Invailid user.'
                }]
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'backoffice settings')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to backoffice settings'
                }]
            })
        }

        let dataList = 30
        let offset = (parseInt(req.params.pageNo) - 1) * dataList

        let condition = {
        }

        if (req.query.type !== undefined) {
            let columnName = req.query.type
            let text = req.query.text

            if(columnName=="personID"){
                condition = {
                    personID: text
                }
            }else{
                condition = {
                    [columnName]: {
                        $regex: text,
                        $options: "i"
                    }
                }
            }
        }

            

        let personalDiscounts = await PersonalDiscount.find(condition).limit(dataList).skip(offset).sort({
            "_id": -1
        })

        

        let totalPersonalDiscountNumber = await PersonalDiscount.find(condition).countDocuments();

        res.status(200).json({
            data: personalDiscounts,
            count: totalPersonalDiscountNumber
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/cart
// @description Get products according user cart
// @access Private
router.get('/single/:itemID', auth, async (req, res) => {
    try {
        const user = await Admin.findById(req.admin.id).select('-password').select('-forgot');

        if (!user) {
            return res.status(400).send({
                errors: [{
                    msg: 'Invailid user.'
                }]
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'backoffice settings')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to backoffice settings'
                }]
            })
        }

        // See if user exsist
        let personalDiscountInfo = await PersonalDiscount.findById(req.params.itemID)

        return res.status(200).json({
            auth: true,
            data: personalDiscountInfo
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/cart
// @description Get products according user cart
// @access Private
router.get('/search/:phone', auth, async (req, res) => {
    try {
        const user = await Admin.findById(req.admin.id).select('-password').select('-forgot');

        if (!user) {
            return res.status(400).send({
                errors: [{
                    msg: 'Invailid user.'
                }]
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'backoffice settings')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to backoffice settings'
                }]
            })
        }

        // See if user exsist
        let personalDiscountInfo = await PersonalDiscount.findOne({
            phone: req.params.phone
        })

        if (!personalDiscountInfo) {
            personalDiscountInfo = await PersonalDiscount.findOne({
                personID: req.params.phone
            })
        }

        let to = new Date()

        let from = new Date()
        from.setHours(0)
        from.setMinutes (0);
        from.setSeconds (0);
        from.setDate(from.getDate() - 7)

        let personalDiscountApplyOnOrder = await OrderForPos.find({
            discountPerson: personalDiscountInfo._id,
            create: {
                $gte: from.toISOString(),
                $lte: to.toISOString()
            }
        }).select('_id orderID total_bill')

        let totalPurchase = 0

        let childArray = personalDiscountApplyOnOrder.map(discountInfo=>{
            totalPurchase += discountInfo.total_bill
        })

        await Promise.all(childArray)

        if(personalDiscountInfo.max_purchase_amount!=null){
            if(personalDiscountInfo.max_purchase_amount <= totalPurchase){
                return res.status(400).send({
                    errors: [{
                        msg: 'You have already crossed your weekly purchasing limit'
                    }]
                })
            }
        }
        
        return res.status(200).json({
            auth: true,
            data: personalDiscountInfo
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router