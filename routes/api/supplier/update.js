const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../middleware/admin/auth');
const Supplier = require('../../../models/Supplier');

const { getAdminRoleChecking } = require('../../../lib/helpers');

// @route PUT api/supplier
// @description Update single supplier
// @access Private
router.put('/', [auth,
    [
        check('supplier', 'Supplier id required').not().isEmpty(),
        check('branch', 'Branch is required').not().isEmpty(),
        check('category', 'Category is required').not().isEmpty(),
        check('subcategory', 'Subcategory is required').not().isEmpty(),
        check('brand', 'Brand is required').not().isEmpty(),
        check('name', 'Supplier name required').not().isEmpty(),
        check('phone', 'Supplier phone required').not().isEmpty(),
        check('address', 'Supplier address required').not().isEmpty()
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'supplier')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to supplier'
                    }
                ]
            })
        }
        
        const { branch, category, subcategory, brand, name, phone, address, instantPayment, warehouseSupplier, activeSupplier } = req.body

        let supplierData = await Supplier.findById(req.body.supplier)

        supplierData.branch = branch
        supplierData.category = category
        supplierData.subcategory = subcategory
        supplierData.brand = brand
        supplierData.name = name.toLowerCase().trim()
        supplierData.contact.phone = phone
        supplierData.contact.address = address
        supplierData.instantPayment = instantPayment
        supplierData.warehouseSupplier = warehouseSupplier
        supplierData.activeSupplier = activeSupplier
        supplierData.update = Date.now()
     
        await supplierData.save()
        res.status(200).json({
            msg: 'Supplier information updated successfully',
            data: supplierData
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Invalid supplier'
                    }
                ]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});


// @route PUT api/supplier/opening-balance
// @description Update single supplier
// @access Private
router.put('/opening-balance', [auth,
    [
        check('supplier', 'Supplier id required').not().isEmpty(),
        check('warehouse_opening_balance', 'Warehouse opening balance is required').not().isEmpty(),
        check('warehouse_supplier', 'Warehouse supply type is required').not().isEmpty(),
        check('instant_payment', 'payment type is required').not().isEmpty()
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'supplier opening balance')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to supplier opening balance'
                    }
                ]
            })
        }
        
        const { branch, branch_wise_opening_balance, warehouse_opening_balance, warehouse_supplier, instant_payment } = req.body

        let supplierData = await Supplier.findById(req.body.supplier)

        // supplierData.branch = branch
        supplierData.branchWiseOpeningBalance = branch_wise_opening_balance
        supplierData.warehouseOpeningBalance = warehouse_opening_balance
        supplierData.instantPayment = instant_payment
        supplierData.warehouseSupplier = warehouse_supplier
        supplierData.opening_balance_last_updated_by = req.admin.id
        supplierData.update = Date.now()
     
        await supplierData.save()

        res.status(200).json({
            msg: 'Supplier opening balance info updated successfully',
            data: supplierData
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Invalid supplier'
                    }
                ]
            })
        }
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router