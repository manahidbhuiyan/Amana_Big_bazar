const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../middleware/admin/auth');
const RequisitionToSupplier = require('../../../../models/Tracking/Transaction/RequisitionToSupplier');

const { getAdminRoleChecking } = require('../../../../lib/helpers');

// @route PUT api/supplier
// @description Update single supplier
// @access Private
router.put('/', [auth,
    [
        check('requestID', 'Request id is required').not().isEmpty(),
        check('totalQuantity', 'Total quantity is required').not().isEmpty(),
        check('totalAmount', 'Total amount is required').not().isEmpty(),
        check('products', 'Products is required').not().isEmpty()
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    try {

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

        const { products, totalQuantity, totalAmount, toWarehouse } = req.body

        let requesitionToSupplierInfo = await RequisitionToSupplier.findById(req.body.requestID)

        requesitionToSupplierInfo.products = products
        requesitionToSupplierInfo.totalQuantity = totalQuantity
        requesitionToSupplierInfo.totalAmount = totalAmount
        requesitionToSupplierInfo.admin = req.admin.id
        requesitionToSupplierInfo.toWarehouse = toWarehouse
        requesitionToSupplierInfo.update = Date.now()
     
        await requesitionToSupplierInfo.save()
        res.status(200).json({
            msg: 'Supplier requisition information is updated successfully',
            data: requesitionToSupplierInfo
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Invalid supplier reqisition id'
                    }
                ]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router