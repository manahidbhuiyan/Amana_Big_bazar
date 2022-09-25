const express = require('express');
const router = express.Router();

const auth = require('../../../../middleware/admin/auth');
const SpecialDiscount = require('../../../../models/SpecialDiscount');
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

            

        let specialDiscount = await SpecialDiscount.find(condition).limit(dataList).skip(offset).sort({
            "_id": -1
        })

        

        let totalSpecialDiscountNumber = await SpecialDiscount.find(condition).countDocuments();

        res.status(200).json({
            data: specialDiscount,
            count: totalSpecialDiscountNumber
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
        let specialDiscountInfo = await SpecialDiscount.findById(req.params.itemID)

        return res.status(200).json({
            auth: true,
            data: specialDiscountInfo
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route GET api/product
// @description Get all the products
// @access Private
router.get('/active/list/all', auth, async (req, res) => {
    try {
        const user = await Admin.findById(req.admin.id).select('-password').select('-forgot');

        if (!user) {
            return res.status(400).send({
                errors: [{
                    msg: 'Invailid user.'
                }]
            })
        }  
        
        let condition = {
            active: true
        }

        let specialDiscount = await SpecialDiscount.find(condition)

        res.status(200).json({
            data: specialDiscount
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router