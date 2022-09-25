const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../middleware/admin/auth');
const RequisitionToSupplier = require('../../../../models/Tracking/Transaction/RequisitionToSupplier');

const { getAdminRoleChecking } = require('../../../../lib/helpers');

// @route POST api/supplier/product-requisition
// @description Add new request to supplier
// @access Private
router.post('/', [auth, 
    [
        check('supplier', 'Supplier is required').not().isEmpty(),
        check('totalQuantity', 'Total quantity is required').not().isEmpty(),
        check('totalAmount', 'Total amount is required').not().isEmpty(),
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


        const { products, supplier, totalQuantity, totalAmount, branch, toWarehouse } = req.body

        let serialNo =  Number(String(branch.serialNo)+100000)

        const lastSupplierRequisition = await RequisitionToSupplier.findOne({branch:branch.id}).sort({create: -1})

        if(lastSupplierRequisition){
            serialNo = lastSupplierRequisition.serialNo + 1
        }else{
            serialNo = serialNo + 1
        }

        const requisitionToSupplierInfo = new RequisitionToSupplier({
            serialNo,
            products,
            supplier,
            totalQuantity,
            totalAmount,
            admin: req.admin.id,
            branch: branch.id,
            toWarehouse
        })

        await requisitionToSupplierInfo.save()
        res.status(200).json({
            msg: 'New requisition to supplier added successfully',
            data: requisitionToSupplierInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router