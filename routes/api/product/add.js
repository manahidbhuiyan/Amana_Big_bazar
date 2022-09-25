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
        check('vat', 'Vat is required').not().isEmpty(),
        check('personalDiscountAvailable', 'personal discount availablity info is required').not().isEmpty()
    ]
], async (req, res) => {
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
            branch,
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
            vat,
            personalDiscountAvailable
        } = req.body

        if (Number(purchase)>=Number(selling)) {
            return res.status(400).send({
                errors: [{
                    msg: 'Selling price must be greated than purchase price'
                }]
            })
        }

        const existsBarcode = await Product.findOne({
            barcode: String(barcode).trim(),
            branch
        })

        if (existsBarcode) {
            return res.status(400).send({
                errors: [{
                    msg: 'barcode is already exists'
                }]
            })
        }

        const branchInfo = await Branch.findById(branch).select('serialNo')

        let serialNo =  Number(String(branchInfo.serialNo)+10000)

        const lastSerialInfo = await Product.findOne({
            branch: branch
        }).sort({create: -1})

        if(lastSerialInfo){
            serialNo = lastSerialInfo.serialNo + 1
        }else{
            serialNo = serialNo + 1
        } 

        let slug = slugify(name)

        const addProductInfo = new Product({
            serialNo,
            branch,
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
            personalDiscountAvailable,
            created_by: req.admin.id
        })

        if (returnNo > 0) {
            addProductInfo.returnNo = returnNo
        }

        if (sold) {
            addProductInfo.sold = sold
        }

        if (description) {
            addProductInfo.description = description
        }

        if(expireDate){
            let expireDateInfo = new Date(expireDate)
            addProductInfo.expireDate = isodate(expireDateInfo)
        }

        if (reorderLevel) {
            addProductInfo.reorderLevel = reorderLevel
        }

        if (weight) {
            addProductInfo.weight = weight
        }

        if (unitType) {
            addProductInfo.unitType = unitType
        }

        if (availableSize) {
            addProductInfo.availableSize = availableSize
        }

        // if (active) {
        //     addProductInfo.isAvailable = active
        // }
        
        if (pos_active) {
            addProductInfo.pos_active = pos_active
        }

        if (online_active) {
            addProductInfo.online_active = online_active
        }

        await addProductInfo.save()

        res.status(200).json({
            msg: 'New product added successfully',
            data: addProductInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router