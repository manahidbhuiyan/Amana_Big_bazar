const express = require('express');
const router = express.Router();
const slugify = require('slugify');

const {
    check,
    validationResult
} = require('express-validator');

var isodate = require("isodate");

const auth = require('../../../middleware/admin/auth');
const Product = require('../../../models/Product');
const WarehouseProduct = require('../../../models/WarehouseProduct');
const Branch = require('../../../models/Branch');

const {
    getAdminRoleChecking
} = require('../../../lib/helpers');

// @route POST api/product
// @description Add new product
// @access Private
router.post('/', [auth,
    [
        check('category', 'Category is required').not().isEmpty(),
        check('subcategory', 'Subcategory is required').not().isEmpty(),
        check('brand', 'Brand is required').not().isEmpty(),
        check('supplier', 'Supplier is required').not().isEmpty(),
        check('barcode', 'Barcode is required').not().isEmpty(),
        check('name', 'Name is required').not().isEmpty(),
        check('selling', 'Selling price is required').not().isEmpty(),
        check('purchase', 'Purchase price is required').not().isEmpty(),
        check('unitType', 'Unit type is required').not().isEmpty(),
        check('vat', 'Vat is required').not().isEmpty()
    ]
], async (req, res) => {
    try {

        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'warehouse product')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized to warehouse product'
                }]
            })
        }

        

        const {
            category,
            subcategory,
            brand,
            supplier,
            barcode,
            name,
            sold,
            returnNo,
            description,
            expireDate,
            reorderLevel,
            weight,
            unitType,
            availableSize,
            newProduct,
            specialOffer,
            bestSell,
            pos_active,
            online_active,
            selling,
            purchase,
            vat
        } = req.body

        if (Number(purchase)>=Number(selling)) {
            return res.status(400).send({
                errors: [{
                    msg: 'Selling price must be greated than purchase price'
                }]
            })
        }

        const existsBarcode = await WarehouseProduct.findOne({
            barcode: String(barcode).trim()
        })

        if (existsBarcode) {
            return res.status(400).send({
                errors: [{
                    msg: 'barcode is already exists in warehouse'
                }]
            })
        }


        const existsBarcodeWithDiffrentSupplier = await Product.find({
            barcode: String(barcode).trim(),
            supplier: {$ne: supplier}
        })

        if (existsBarcodeWithDiffrentSupplier.length > 0) {
            return res.status(400).send({
                errors: [{
                    msg: 'same barcode for different suppplier is already exists in branch product'
                }]
            })
        }

        let serialNo = 10000

        const lastSerialInfo = await WarehouseProduct.findOne({}).sort({create: -1})


        if(lastSerialInfo){
            serialNo = lastSerialInfo.serialNo + 1
        }else{
            serialNo = serialNo + 1
        }
   


        let slug = slugify(name)

        const addWarehouseProductInfo = new WarehouseProduct({
            serialNo,
            category,
            subcategory,
            brand,
            supplier,
            barcode: String(barcode).trim(),
            name: name.toLowerCase().trim(),
            slug: slug.toLowerCase().trim(),
            newProduct,
            specialOffer,
            bestSell,
            "price.sell": selling,
            "price.purchase": purchase,
            vat,
            created_by: req.admin.id
        })

        if (returnNo > 0) {
            addWarehouseProductInfo.returnNo = returnNo
        }

        if (sold) {
            addWarehouseProductInfo.sold = sold
        }

        if (description) {
            addWarehouseProductInfo.description = description
        }

        if(expireDate){
            let expireDateInfo = new Date(expireDate)
            addWarehouseProductInfo.expireDate = isodate(expireDateInfo)
        }

        if (reorderLevel) {
            addWarehouseProductInfo.reorderLevel = reorderLevel
        }

        if (weight) {
            addWarehouseProductInfo.weight = weight
        }

        if (unitType) {
            addWarehouseProductInfo.unitType = unitType
        }

        if (availableSize) {
            addWarehouseProductInfo.availableSize = availableSize
        }

        // if (active) {
        //     addWarehouseProductInfo.isAvailable = active
        // }

        if (pos_active) {
            addWarehouseProductInfo.pos_active = pos_active
        }

        if (online_active) {
            addWarehouseProductInfo.online_active = online_active
        }

        await addWarehouseProductInfo.save()

        res.status(200).json({
            msg: 'New product added successfully',
            data: addWarehouseProductInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router