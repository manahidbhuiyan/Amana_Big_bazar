const express = require('express');
const router = express.Router();
const slugify = require('slugify');

const {
    check,
    validationResult
} = require('express-validator');

var isodate = require("isodate");

const auth = require('../../../middleware/admin/auth');
const Inventory = require('../../../models/Inventory');
const Branch = require('../../../models/Branch');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');

// @route POST api/product
// @description Add new product
// @access Private
router.post('/add', [auth,
], async (req, res) => {
    try {
        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }


        const adminRoles = await getAdminRoleChecking(req.admin.id, 'inventory')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to inventory'
                }]
            })
        }


        req.body.map(async (inventoryProduct) => {

            const barcode = inventoryProduct.product.barcode
            const stock_quantity = inventoryProduct.inventoryStock + inventoryProduct.product.newAddQuantity
            const category = inventoryProduct.category

            await Inventory.updateOne({
                "barcode": barcode,
                "category": category
            }, {
                $set: { stock_quantity }
            })

        })



        res.status(200).json({
            msg: 'New product added successfully'
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router