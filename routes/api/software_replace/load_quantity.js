const express = require('express');
const router = express.Router();
const slugify = require('slugify');

var webp = require('webp-converter');

const {
    check,
    validationResult
} = require('express-validator');

var isodate = require("isodate");

const auth = require('../../../middleware/admin/auth');
const ReceiveFromSupplier = require('../../../models/Tracking/Transaction/ReceiveFromSupplier');
const Product = require('../../../models/Product');

const {
    upload,
    removeNotvalidateFile,
    removeUploadedFile,
    removeUploadedImageFile,
    getAdminRoleChecking
} = require('../../../lib/helpers');

// @route PUT api/cart
// @description Update Single product into the cart
// @access Private
router.put('/', [auth,
    [
        check('category', 'Category is required').not().isEmpty(),
        check('totalQuantity', 'Total quantity is required').not().isEmpty(),
        check('totalAmount', 'Total amount is required').not().isEmpty(),
        check('products', 'Products is required').not().isEmpty(),
        check('branch', 'Branch is required').not().isEmpty()
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    const adminRoles = await getAdminRoleChecking(req.admin.id, 'software replace')

    if (!adminRoles) {
        return res.status(400).send({
            errors: [{
                msg: 'Account is not authorized to software replace'
            }]
        })
    }

    try {
        const {
            category,
            totalQuantity,
            totalAmount,
            products,
            branch,
        } = req.body

        let productLoopArray = products.map(async productInfo=>{
            let product = await Product.findById(productInfo.product._id)
            
            product.quantity += productInfo.product.quantity

            product.update = Date.now()

            await product.save()
        })

        await Promise.all(productLoopArray)

        res.status(200).json({
            msg: 'your product load request has been completed successfully',
            data: products
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid product'
                }]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});


module.exports = router