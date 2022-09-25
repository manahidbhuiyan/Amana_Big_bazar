const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../middleware/admin/auth');
const ProductDiscount = require('../../../../models/Tracking/Transaction/ProductDiscount');
const Product = require('../../../../models/Product');

const { getAdminRoleChecking } = require('../../../../lib/helpers');

// @route POST api/supplier/product-requisition
// @description Add new request to supplier
// @access Private
router.post('/', [auth, 
    [
        check('products', 'Products is required').not().isEmpty(),
        check('from', 'From date is required').not().isEmpty(),
        check('to', 'To date is required').not().isEmpty(),
        check('branch', 'Branch is required').not().isEmpty()
    ]
], async (req, res) => { 
    try {

        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'transaction')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to transaction'
                    }
                ]
            })
        }

        const { products, from, to, reason, remarks, branch, reactivated } = req.body

        let serialNo =  Number(String(branch.serialNo)+100000)

        const lastProductDiscountInfo = await ProductDiscount.findOne({branch:branch.id}).sort({create: -1})

        if(lastProductDiscountInfo){
            serialNo = lastProductDiscountInfo.serialNo + 1
        }else{
            serialNo = serialNo + 1
        }

        const productDiscountInfo = new ProductDiscount({
            serialNo,
            products,
            reason,
            remarks,
            admin: req.admin.id,
            branch: branch.id,
            discount_start: from,
            discount_stop: to,
            reactivated
        })

        let todaysDate = new Date();
        let month = ("0" + (todaysDate.getMonth() + 1)).slice(-2); 
        let date = ("0" + todaysDate.getDate()).slice(-2); 
        let year = todaysDate.getFullYear(); 

        let currentDate = year +'-'+ month +'-'+ date

        if(currentDate == from){
            productDiscountInfo.startDiscount = true
            await products.map(async productInfo=>{
                let productInfoData = await Product.findById(productInfo._id)
    
                productInfoData.discount = productInfo.discount
    
                await productInfoData.save()
            })
        }

        await productDiscountInfo.save()

        res.status(200).json({
            msg: 'Discounts are added successfully',
            data: productDiscountInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router