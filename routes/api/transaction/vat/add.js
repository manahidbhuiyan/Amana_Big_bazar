const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../middleware/admin/auth');
const ProductVat = require('../../../../models/Tracking/Transaction/ProductVat');
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

        const { products, reason, remarks, branch } = req.body

        let serialNo =  Number(String(branch.serialNo)+100000)

        const lastProductVatInfo = await ProductVat.findOne({branch:branch.id}).sort({create: -1})

        if(lastProductVatInfo){
            serialNo = lastProductVatInfo.serialNo + 1
        }else{
            serialNo = serialNo + 1
        }

        const productVatInfo = new ProductVat({
            serialNo,
            products,
            reason,
            remarks,
            admin: req.admin.id,
            branch: branch.id
        })

        await productVatInfo.save()

        await products.map(async productInfo=>{
            let productInfoData = await Product.findById(productInfo._id)

            productInfoData.vat = productInfo.vat

            await productInfoData.save()
        })

        res.status(200).json({
            msg: 'New product vats are added successfully',
            data: productVatInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router