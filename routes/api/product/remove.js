const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../middleware/admin/auth');
const Product = require('../../../models/Product');
const RequisitionToSupplier = require('../../../models/Tracking/Transaction/RequisitionToSupplier');
const ReceiveFromSupplier = require('../../../models/Tracking/Transaction/ReceiveFromSupplier');
const OrderForPos = require('../../../models/OrderForPos');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');

// @route DELETE api/product/:productID
// @description Remove specific product
// @access Private
router.delete('/:productID', auth, async (req, res) => {
    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'product')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to product'
                }]
            })
        }

        let requisitionToSupplier = await RequisitionToSupplier.findOne({
            "products.product._id": req.params.productID
        });

        if (requisitionToSupplier) {
            return res.status(400).send({
                errors: [{
                    msg: "Product requisition (" + requisitionToSupplier.serialNo + ") already placed to supplier. So this product can't be deleted."
                }]
            })
        }

        let receiveFromSupplier = await ReceiveFromSupplier.findOne({
            "products.product._id": req.params.productID
        });

        if (receiveFromSupplier) {
            return res.status(400).send({
                errors: [{
                    msg: "Product already received from supplier. So this product can't be deleted."
                }]
            })
        }


        let posOrderCheck = await OrderForPos.findOne({
            "products.product": req.params.productID
        });

        if (posOrderCheck) {
            return res.status(400).send({
                errors: [{
                    msg: 'Product already exsist in sell'
                }]
            })
        }



        // See if user exsist
        let product = await Product.findById(req.params.productID)

        if (!product) {
            return res.status(400).send({
                errors: [{
                    msg: 'Invalid product remove request'
                }]
            })
        }

        await product.remove()

        res.status(200).json({
            msg: 'Product removed successfully'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// @route DELETE /branch/category/wise/delete
// @description Remove specific product
// @access Private
router.post('/branch/category/wise/delete', [auth, [
    check('from_branch', 'From branch is required').not().isEmpty(),
    check('category', 'Category is required').not().isEmpty(),
]], async (req, res) => {
    try {

        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'product')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to product'
                }]
            })
        }

        const {
            from_branch,
            category
        } = req.body


        let product = await Product.deleteMany({
            branch: from_branch,
            category: {
                $in: category
            }
        })

        res.status(200).json({
            msg: 'Products removed successfully'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router