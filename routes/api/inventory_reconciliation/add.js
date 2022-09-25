const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../middleware/admin/auth');
const InventoryProductReconciliation = require('../../../models/InventoryReconciliation');
const Inventory = require('../../../models/Inventory');

const { getAdminRoleChecking } = require('../../../lib/helpers');

// @route POST api/inventory/reconciliation
// @description Add new inventory product reconciliation
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

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'inventory reconciliation')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to Inventory product Reconciliation'
                    }
                ]
            })
        }


        const { products, reason, remarks, branch } = req.body
        let serialNo = Number(String(branch.serialNo) + 100000)

        const lastProductDisposalInfo = await InventoryProductReconciliation.findOne({ branch: branch.id }).sort({ create: -1 })

        if (lastProductDisposalInfo) {
            serialNo = lastProductDisposalInfo.serialNo + 1
        } else {
            serialNo = serialNo + 1
        }

        const productReconciliationInfo = new InventoryProductReconciliation({
            serialNo,
            products,
            reason,
            remarks,
            admin: req.admin.id,
            branch: branch.id
        })

        await productReconciliationInfo.save()

        await products.map(async productInfo => {
            let productInfoData = await Inventory.findOne({
                product: productInfo._id
            })
            productInfoData.stock_quantity = Number(productInfo.reconciliation)

            await productInfoData.save()
        })

        res.status(200).json({
            msg: 'New Inventory Reconciliation are added successfully',
            data: productReconciliationInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router