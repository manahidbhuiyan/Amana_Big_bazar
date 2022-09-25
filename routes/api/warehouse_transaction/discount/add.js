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

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'warehouse transaction')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to warehouse transaction'
                    }
                ]
            })
        }

        let serialNo = 100000

        const { products, reason, remarks, branch } = req.body

        const lastProductDiscountInfo = await ProductDiscount.findOne({branch:branch.id}).sort({create: -1})

        if(lastProductDiscountInfo){
            serialNo = lastProductDiscountInfo.serialNo + 1
        }else{
            serialNo = serialNo + 1
        }

        serialNo = Number(String(branch.serialNo)+serialNo)

        const productDiscountInfo = new ProductDiscount({
            serialNo,
            products,
            reason,
            remarks,
            admin: req.admin.id,
            branch: branch.id
        })


        await productDiscountInfo.save()

        await products.map(async productInfo=>{
            let productInfoData = await Product.findById(productInfo._id)

            productInfoData.discount = productInfo.discount

            await productInfoData.save()
        })

        res.status(200).json({
            msg: 'New price discounts are added successfully',
            data: productDiscountInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router