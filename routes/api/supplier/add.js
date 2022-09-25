const express = require('express');
const router = express.Router();

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../middleware/admin/auth');
const Supplier = require('../../../models/Supplier');

const { getAdminRoleChecking } = require('../../../lib/helpers');

// @route POST api/supplier
// @description Add new supplier
// @access Private
router.post('/', [auth, 
    [
        check('branch', 'Branch is required').not().isEmpty(),
        check('category', 'Category is required').not().isEmpty(),
        check('subcategory', 'Subcategory is required').not().isEmpty(),
        check('brand', 'Brand is required').not().isEmpty(),
        check('name', 'Supplier name required').not().isEmpty(),
        check('phone', 'Supplier phone required').not().isEmpty(),
        check('address', 'Supplier address required').not().isEmpty()
    ]
], async (req, res) => { 
    try {

        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

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

        let serialNo = 1000

        const lastSerialInfo = await Supplier.findOne().sort({create: -1})

            if(lastSerialInfo){
                serialNo = lastSerialInfo.serialNo + 1
            }else{
                serialNo = serialNo + 1
            }

        const { branch, category, subcategory, brand, name, phone, address, instantPayment, warehouseSupplier, activeSupplier } = req.body

        const addSupplierInfo = new Supplier({
            serialNo,
            branch,
            category,
            subcategory,
            brand,
            name: name.toLowerCase().trim(),
            "contact.phone": phone,
            "contact.address": address,
            instantPayment,
            warehouseSupplier,
            activeSupplier
        })

        await addSupplierInfo.save()
        res.status(200).json({
            msg: 'New supplier added successfully',
            data: addSupplierInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router