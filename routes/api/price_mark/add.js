const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../middleware/admin/auth');
const PriceMarkUpDown = require('../../../models/Tracking/Transaction/PriceMarkUpDown');
const Product = require('../../../models/Product');

const { getAdminRoleChecking } = require('../../../lib/helpers');

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

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'price mark')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to price mark'
                    }
                ]
            })
        }


        const { products, reason, remarks, branch } = req.body

        let serialNo = Number(String(branch.serialNo) + 10000)

        const lastPriceMarkChangeInfo = await PriceMarkUpDown.findOne({ branch: branch.id }).sort({ create: -1 })

        if (lastPriceMarkChangeInfo) {
            serialNo = lastPriceMarkChangeInfo.serialNo + 1
        } else {
            serialNo = serialNo + 1
        }

        const priceMarkUpDownInfo = new PriceMarkUpDown({
            serialNo,
            products,
            reason,
            remarks,
            admin: req.admin.id,
            branch: branch.id
        })

        await priceMarkUpDownInfo.save()

        await products.map(async productInfo => {
            let productInfoData = await Product.findById(productInfo._id)

            productInfoData.price.sell = productInfo.price.sell
            productInfoData.price.purchase = productInfo.price.purchase
            productInfoData.second_price.purchase = productInfo.second_price.purchase
            productInfoData.second_price.sell = productInfo.second_price.sell

            await productInfoData.save()
        })

        res.status(200).json({
            msg: 'New price mark is added successfully',
            data: priceMarkUpDownInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router